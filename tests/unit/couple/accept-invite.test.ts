import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { generateInviteToken } from "@/lib/couple/invite-token";
import { acceptInvite } from "@/lib/couple/accept-invite";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

let seq = 0;
async function makeUser() {
  const email = `acc-${Date.now()}-${seq++}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "TestPass123!",
    email_confirm: true,
  });
  if (error) throw error;
  return data.user!.id;
}

async function createCoupleWithInvite(
  creatorId: string,
  opts: { expiresInMs?: number; accepted?: boolean } = {},
) {
  const { expiresInMs = 72 * 3600 * 1000, accepted = false } = opts;
  const { data: couple, error: cErr } = await admin
    .from("couples")
    .insert({ created_by: creatorId })
    .select()
    .single();
  if (cErr) throw cErr;
  const { error: mErr } = await admin
    .from("couple_members")
    .insert({ couple_id: couple.id, user_id: creatorId });
  if (mErr) throw mErr;
  const token = generateInviteToken();
  const { error: iErr } = await admin.from("couple_invites").insert({
    token,
    couple_id: couple.id,
    invited_by: creatorId,
    expires_at: new Date(Date.now() + expiresInMs).toISOString(),
    ...(accepted
      ? { accepted_at: new Date().toISOString(), accepted_by: creatorId }
      : {}),
  });
  if (iErr) throw iErr;
  return { coupleId: couple.id as string, token };
}

async function coupleOf(userId: string) {
  const { data } = await admin
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.couple_id ?? null;
}

async function coupleExists(coupleId: string) {
  const { data } = await admin
    .from("couples")
    .select("id")
    .eq("id", coupleId)
    .maybeSingle();
  return !!data;
}

describe("acceptInvite", () => {
  it("joins the inviter's couple with a valid invite", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const { coupleId, token } = await createCoupleWithInvite(alice);

    const r = await acceptInvite(admin, bob, token);

    expect(r.error).toBeUndefined();
    expect(r.coupleId).toBe(coupleId);
    expect(await coupleOf(bob)).toBe(coupleId);
    const { data: inv } = await admin
      .from("couple_invites")
      .select("accepted_by")
      .eq("token", token)
      .single();
    expect(inv?.accepted_by).toBe(bob);
  });

  it("auto-cleans an empty self-couple, then joins the real invite", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const bobOwn = await createCoupleWithInvite(bob);
    const { coupleId: aliceCouple, token } =
      await createCoupleWithInvite(alice);

    const r = await acceptInvite(admin, bob, token);

    expect(r.error).toBeUndefined();
    expect(r.coupleId).toBe(aliceCouple);
    expect(await coupleOf(bob)).toBe(aliceCouple);
    expect(await coupleExists(bobOwn.coupleId)).toBe(false);
  });

  it("blocks when already in a real two-person couple", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const carol = await makeUser();
    const real = await createCoupleWithInvite(carol);
    await admin
      .from("couple_members")
      .insert({ couple_id: real.coupleId, user_id: bob });
    const { token } = await createCoupleWithInvite(alice);

    const r = await acceptInvite(admin, bob, token);

    expect(r.error).toBeTruthy();
    expect(await coupleExists(real.coupleId)).toBe(true);
    expect(await coupleOf(bob)).toBe(real.coupleId);
  });

  it("rejects an expired invite", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const { token } = await createCoupleWithInvite(alice, {
      expiresInMs: -1000,
    });

    const r = await acceptInvite(admin, bob, token);

    expect(r.error).toBeTruthy();
  });

  it("rejects an already-used invite", async () => {
    const alice = await makeUser();
    const bob = await makeUser();
    const { token } = await createCoupleWithInvite(alice, { accepted: true });

    const r = await acceptInvite(admin, bob, token);

    expect(r.error).toBeTruthy();
  });

  it("rejects accepting your own invite", async () => {
    const alice = await makeUser();
    const { token } = await createCoupleWithInvite(alice);

    const r = await acceptInvite(admin, alice, token);

    expect(r.error).toBeTruthy();
  });

  it("rejects an unknown token", async () => {
    const bob = await makeUser();

    const r = await acceptInvite(admin, bob, "nonexistent-token-xyz");

    expect(r.error).toBeTruthy();
  });
});
