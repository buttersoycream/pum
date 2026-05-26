import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { setCycleStage } from "@/lib/personal-context/mutations";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function makeCouple() {
  const { data: u } = await admin.auth.admin.createUser({
    email: `cs-${Date.now()}@example.com`, password: "TestPass123!", email_confirm: true,
  });
  const { data: c } = await admin.from("couples").insert({ created_by: u!.user!.id }).select().single();
  return c!.id as string;
}

describe("setCycleStage", () => {
  it("upsert 로 단계를 저장한다", async () => {
    const coupleId = await makeCouple();
    await setCycleStage(admin, coupleId, "stim");
    const { data } = await admin.from("personal_context").select("cycle_stage").eq("couple_id", coupleId).single();
    expect(data?.cycle_stage).toBe("stim");
  });
});
