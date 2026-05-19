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

describe("ai_chats RLS", () => {
  let aliceId: string, bobId: string, coupleId: string;
  const ts = Date.now();
  const aliceEmail = `chat-a-${ts}@example.com`;
  const malloryEmail = `chat-m-${ts}@example.com`;

  beforeAll(async () => {
    aliceId = await makeUser(aliceEmail);
    bobId = await makeUser(`chat-b-${ts}@example.com`);
    await makeUser(malloryEmail);
    const { data: c } = await admin
      .from("couples").insert({ created_by: aliceId }).select().single();
    coupleId = c!.id;
    await admin.from("couple_members").insert([
      { couple_id: coupleId, user_id: aliceId },
      { couple_id: coupleId, user_id: bobId },
    ]);
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
