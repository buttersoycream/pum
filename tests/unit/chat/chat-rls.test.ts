import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function makeUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "TestPass123!", email_confirm: true,
  });
  if (error) throw error;
  return data!.user!.id;
}
async function signInAs(email: string) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: "TestPass123!" });
  if (error) throw error;
  return c;
}

async function selfCoupleOf(userId: string): Promise<string> {
  const { data } = await admin
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.couple_id) throw new Error(`No self-couple found for ${userId}`);
  return data.couple_id;
}

async function joinCouple(joinerUserId: string, targetCoupleId: string) {
  const selfCouple = await selfCoupleOf(joinerUserId);
  await admin.from("couples").delete().eq("id", selfCouple);
  await admin
    .from("couple_members")
    .insert({ couple_id: targetCoupleId, user_id: joinerUserId });
}

describe("ai_chats RLS", () => {
  let aliceId: string, bobId: string, coupleId: string;
  const ts = Date.now();
  const aliceEmail = `chat-a-${ts}@example.com`;
  const malloryEmail = `chat-m-${ts}@example.com`;

  beforeAll(async () => {
    aliceId = await makeUser(aliceEmail);
    bobId = await makeUser(`chat-b-${ts}@example.com`);
    await makeUser(malloryEmail);
    // Use Alice's auto-created self-couple; move Bob into it
    coupleId = await selfCoupleOf(aliceId);
    await joinCouple(bobId, coupleId);
  });

  it("pair chat: partner can read", async () => {
    const { data: chat } = await admin
      .from("ai_chats")
      .insert({ couple_id: coupleId, owner_user_id: aliceId, visibility: "pair" })
      .select().single();
    const bob = await signInAs(`chat-b-${ts}@example.com`);
    const { data } = await bob
      .from("ai_chats").select().eq("id", chat!.id).maybeSingle();
    expect(data?.id).toBe(chat!.id);
  });

  it("private chat: partner cannot read", async () => {
    const { data: chat } = await admin
      .from("ai_chats")
      .insert({ couple_id: coupleId, owner_user_id: aliceId, visibility: "private" })
      .select().single();
    const bob = await signInAs(`chat-b-${ts}@example.com`);
    const { data } = await bob
      .from("ai_chats").select().eq("id", chat!.id).maybeSingle();
    expect(data).toBeNull();
  });

  it("non-member cannot read pair chat", async () => {
    const { data: chat } = await admin
      .from("ai_chats")
      .insert({ couple_id: coupleId, owner_user_id: aliceId, visibility: "pair" })
      .select().single();
    const mallory = await signInAs(malloryEmail);
    const { data } = await mallory
      .from("ai_chats").select().eq("id", chat!.id).maybeSingle();
    expect(data).toBeNull();
  });
});
