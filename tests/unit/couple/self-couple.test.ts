import { createClient } from "@supabase/supabase-js";
import { describe, it, expect } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

describe("self-couple on signup", () => {
  it("새 유저는 가입 즉시 자기 couple의 멤버다", async () => {
    const { data: u } = await admin.auth.admin.createUser({
      email: `self-${Date.now()}@example.com`,
      password: "TestPass123!",
      email_confirm: true,
    });
    const userId = u!.user!.id;
    const { data: m } = await admin
      .from("couple_members")
      .select("couple_id")
      .eq("user_id", userId)
      .maybeSingle();
    expect(m?.couple_id).toBeTruthy();
  });
});
