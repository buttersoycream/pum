import { createClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function makeUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "TestPass123!",
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user!.id, email };
}

async function signInAs(email: string) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: "TestPass123!",
  });
  if (error) throw error;
  return client;
}

/** Returns the auto-created self-couple id for a user (created by trigger). */
async function selfCoupleOf(userId: string): Promise<string> {
  const { data } = await admin
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.couple_id) throw new Error(`No self-couple found for ${userId}`);
  return data.couple_id;
}

/**
 * Moves `joinerUserId` from their self-couple into `targetCoupleId`.
 * Deletes their self-couple (CASCADE removes the member row) then inserts.
 */
async function joinCouple(joinerUserId: string, targetCoupleId: string) {
  const selfCouple = await selfCoupleOf(joinerUserId);
  await admin.from("couples").delete().eq("id", selfCouple);
  await admin
    .from("couple_members")
    .insert({ couple_id: targetCoupleId, user_id: joinerUserId });
}

describe("Couple RLS isolation", () => {
  let alice: { id: string; email: string };
  let bob: { id: string; email: string };
  let mallory: { id: string; email: string };
  let coupleId: string;

  beforeAll(async () => {
    const ts = Date.now();
    alice = await makeUser(`alice-${ts}@example.com`);
    bob = await makeUser(`bob-${ts}@example.com`);
    mallory = await makeUser(`mallory-${ts}@example.com`);

    // Use Alice's auto-created self-couple as the shared couple
    coupleId = await selfCoupleOf(alice.id);
    // Move Bob into Alice's couple (delete Bob's self-couple first)
    await joinCouple(bob.id, coupleId);
    // Mallory keeps her own self-couple (non-member)
  });

  it("Alice reads her own couple", async () => {
    const c = await signInAs(alice.email);
    const { data, error } = await c
      .from("couples")
      .select()
      .eq("id", coupleId)
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBe(coupleId);
  });

  it("Bob (member) reads the same couple", async () => {
    const c = await signInAs(bob.email);
    const { data } = await c
      .from("couples")
      .select()
      .eq("id", coupleId)
      .single();
    expect(data?.id).toBe(coupleId);
  });

  it("Mallory (non-member) cannot read the couple", async () => {
    const c = await signInAs(mallory.email);
    const { data } = await c
      .from("couples")
      .select()
      .eq("id", coupleId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("Mallory cannot insert Bob as a member of her own couple", async () => {
    const c = await signInAs(mallory.email);
    const malloryCoupleId = await selfCoupleOf(mallory.id);

    const { error } = await c.from("couple_members").insert({
      couple_id: malloryCoupleId,
      user_id: bob.id,
    });
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/row-level security/i);
  });

  it("Alice can read Bob's profile (couple mate)", async () => {
    const c = await signInAs(alice.email);
    const { data } = await c
      .from("profiles")
      .select("email")
      .eq("id", bob.id)
      .maybeSingle();
    expect(data?.email).toBe(bob.email);
  });

  it("Mallory cannot read Bob's profile", async () => {
    const c = await signInAs(mallory.email);
    const { data } = await c
      .from("profiles")
      .select("email")
      .eq("id", bob.id)
      .maybeSingle();
    expect(data).toBeNull();
  });
});
