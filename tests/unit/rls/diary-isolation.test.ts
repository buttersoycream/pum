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

describe("diary_entries RLS isolation", () => {
  let alice: { id: string; email: string };
  let bob: { id: string; email: string };
  let mallory: { id: string; email: string };
  let coupleId: string;

  beforeAll(async () => {
    const ts = Date.now();
    alice = await makeUser(`alice-diary-${ts}@example.com`);
    bob = await makeUser(`bob-diary-${ts}@example.com`);
    mallory = await makeUser(`mallory-diary-${ts}@example.com`);

    const { data: couple } = await admin
      .from("couples")
      .insert({ created_by: alice.id })
      .select()
      .single();
    coupleId = couple!.id;
    await admin.from("couple_members").insert([
      { couple_id: coupleId, user_id: alice.id },
      { couple_id: coupleId, user_id: bob.id },
    ]);
  });

  it("Alice pair 일기 → Bob 보임", async () => {
    const alc = await signInAs(alice.email);
    const { data: entry } = await alc
      .from("diary_entries")
      .insert({
        couple_id: coupleId,
        author_user_id: alice.id,
        visibility: "pair",
        title: "shared diary",
        body: "오늘 함께 가는 길.",
      })
      .select()
      .single();

    const bc = await signInAs(bob.email);
    const { data } = await bc
      .from("diary_entries")
      .select()
      .eq("id", entry!.id)
      .maybeSingle();
    expect(data?.body).toBe("오늘 함께 가는 길.");
  });

  it("Alice private 일기 → Bob 안 보임", async () => {
    const alc = await signInAs(alice.email);
    const { data: entry } = await alc
      .from("diary_entries")
      .insert({
        couple_id: coupleId,
        author_user_id: alice.id,
        visibility: "private",
        title: "alice private diary",
        body: "혼자만 적는 내용.",
      })
      .select()
      .single();

    const bc = await signInAs(bob.email);
    const { data } = await bc
      .from("diary_entries")
      .select()
      .eq("id", entry!.id)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("Bob은 Alice 일기 edit 차단 (author=Alice)", async () => {
    const alc = await signInAs(alice.email);
    const { data: entry } = await alc
      .from("diary_entries")
      .insert({
        couple_id: coupleId,
        author_user_id: alice.id,
        visibility: "pair",
        title: "alice diary",
        body: "first version",
      })
      .select()
      .single();

    const bc = await signInAs(bob.email);
    const { error } = await bc
      .from("diary_entries")
      .update({ body: "Bob trying to modify" })
      .eq("id", entry!.id);
    // RLS update policy는 author_user_id=auth.uid()만 허용.
    // policy 위반 시 supabase는 보통 에러 또는 0 row 갱신.
    const alcRecheck = await alc
      .from("diary_entries")
      .select()
      .eq("id", entry!.id)
      .single();
    expect(alcRecheck.data?.body).toBe("first version"); // 수정 안 됨
  });

  it("Mallory (외부)는 Alice 일기 insert 차단 (couple_id not member)", async () => {
    const mc = await signInAs(mallory.email);
    const { error } = await mc.from("diary_entries").insert({
      couple_id: coupleId,
      author_user_id: mallory.id,
      visibility: "pair",
      title: "mallory trying",
      body: "should not work",
    });
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/row-level security/i);
  });

  it("Mallory는 Alice pair 일기 read 차단", async () => {
    const alc = await signInAs(alice.email);
    const { data: entry } = await alc
      .from("diary_entries")
      .insert({
        couple_id: coupleId,
        author_user_id: alice.id,
        visibility: "pair",
        title: "alice pair diary 2",
        body: "external isolation check",
      })
      .select()
      .single();

    const mc = await signInAs(mallory.email);
    const { data } = await mc
      .from("diary_entries")
      .select()
      .eq("id", entry!.id)
      .maybeSingle();
    expect(data).toBeNull();
  });
});
