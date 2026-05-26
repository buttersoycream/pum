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

describe("ai_chats RLS isolation", () => {
  let alice: { id: string; email: string };
  let bob: { id: string; email: string };
  let charlie: { id: string; email: string }; // 다른 페어
  let abCoupleId: string;
  let cdCoupleId: string;

  beforeAll(async () => {
    const ts = Date.now();
    alice = await makeUser(`alice-aichat-${ts}@example.com`);
    bob = await makeUser(`bob-aichat-${ts}@example.com`);
    charlie = await makeUser(`charlie-aichat-${ts}@example.com`);

    // Alice·Bob 페어: use Alice's self-couple, move Bob into it
    abCoupleId = await selfCoupleOf(alice.id);
    await joinCouple(bob.id, abCoupleId);

    // Charlie keeps his self-couple (외부 사용자)
    cdCoupleId = await selfCoupleOf(charlie.id);
  });

  it("Alice가 pair chat 만들면 Bob도 보임", async () => {
    const alc = await signInAs(alice.email);
    const { data: chat, error: insErr } = await alc
      .from("ai_chats")
      .insert({
        couple_id: abCoupleId,
        owner_user_id: alice.id,
        visibility: "pair",
        title: "shared chat",
      })
      .select()
      .single();
    expect(insErr).toBeNull();
    expect(chat?.id).toBeTruthy();

    const bobC = await signInAs(bob.email);
    const { data } = await bobC
      .from("ai_chats")
      .select()
      .eq("id", chat!.id)
      .maybeSingle();
    expect(data?.id).toBe(chat!.id);
  });

  it("Alice private chat은 Bob에게 안 보임", async () => {
    const alc = await signInAs(alice.email);
    const { data: chat } = await alc
      .from("ai_chats")
      .insert({
        couple_id: abCoupleId,
        owner_user_id: alice.id,
        visibility: "private",
        title: "alice private",
      })
      .select()
      .single();

    const bobC = await signInAs(bob.email);
    const { data } = await bobC
      .from("ai_chats")
      .select()
      .eq("id", chat!.id)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("Charlie (외부)는 Alice pair chat 안 보임", async () => {
    const alc = await signInAs(alice.email);
    const { data: chat } = await alc
      .from("ai_chats")
      .insert({
        couple_id: abCoupleId,
        owner_user_id: alice.id,
        visibility: "pair",
        title: "alice pair external isolation",
      })
      .select()
      .single();

    const ch = await signInAs(charlie.email);
    const { data } = await ch
      .from("ai_chats")
      .select()
      .eq("id", chat!.id)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("Bob은 Alice chat에 메시지 insert 차단 (owner=Alice)", async () => {
    const alc = await signInAs(alice.email);
    const { data: chat } = await alc
      .from("ai_chats")
      .insert({
        couple_id: abCoupleId,
        owner_user_id: alice.id,
        visibility: "pair",
        title: "alice chat",
      })
      .select()
      .single();

    const bobC = await signInAs(bob.email);
    const { error } = await bobC.from("ai_messages").insert({
      chat_id: chat!.id,
      role: "user",
      content: "Bob trying to insert into Alice's chat",
    });
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/row-level security/i);
  });

  it("Bob은 본인 pair chat의 메시지 read OK (visibility 상속)", async () => {
    const alc = await signInAs(alice.email);
    const { data: chat } = await alc
      .from("ai_chats")
      .insert({
        couple_id: abCoupleId,
        owner_user_id: alice.id,
        visibility: "pair",
        title: "alice pair chat for messages",
      })
      .select()
      .single();
    await alc.from("ai_messages").insert({
      chat_id: chat!.id,
      role: "user",
      content: "hello from Alice",
    });

    const bobC = await signInAs(bob.email);
    const { data: msgs } = await bobC
      .from("ai_messages")
      .select()
      .eq("chat_id", chat!.id);
    expect(msgs?.length).toBeGreaterThan(0);
    expect(msgs![0].content).toBe("hello from Alice");
  });

  it("Charlie는 Alice private chat의 메시지 read 차단", async () => {
    const alc = await signInAs(alice.email);
    const { data: chat } = await alc
      .from("ai_chats")
      .insert({
        couple_id: abCoupleId,
        owner_user_id: alice.id,
        visibility: "private",
        title: "alice private with msg",
      })
      .select()
      .single();
    await alc.from("ai_messages").insert({
      chat_id: chat!.id,
      role: "user",
      content: "private content",
    });

    const ch = await signInAs(charlie.email);
    const { data: msgs } = await ch
      .from("ai_messages")
      .select()
      .eq("chat_id", chat!.id);
    expect(msgs?.length ?? 0).toBe(0);
  });
});
