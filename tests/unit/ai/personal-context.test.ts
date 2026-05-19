import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { mapPersonalContext } from "@/lib/ai/personal-context";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

let seq = 0;
async function makeCouple() {
  const email = `pc-${Date.now()}-${seq++}@example.com`;
  const { data: u } = await admin.auth.admin.createUser({
    email, password: "TestPass123!", email_confirm: true,
  });
  const { data: c } = await admin
    .from("couples").insert({ created_by: u!.user!.id }).select().single();
  await admin.from("couple_members").insert({ couple_id: c!.id, user_id: u!.user!.id });
  return c!.id as string;
}

describe("mapPersonalContext", () => {
  it("returns empty object when no row exists", async () => {
    const coupleId = await makeCouple();
    expect(await mapPersonalContext(admin, coupleId)).toEqual({});
  });

  it("maps stored fields to PersonalContext shape", async () => {
    const coupleId = await makeCouple();
    await admin.from("personal_context").insert({
      couple_id: coupleId,
      cycle_stage: "stim",
      cycle_number: 2,
      recent_emotional_state: "지쳐 있음",
    });
    const pc = await mapPersonalContext(admin, coupleId);
    expect(pc.cycleStage).toBe("stim");
    expect(pc.cycleNumber).toBe(2);
    expect(pc.recentEmotionalState).toBe("지쳐 있음");
    expect(pc.currentMedications).toBeUndefined();
    expect(pc.recentCoupleIssues).toBeUndefined();
  });

  it("preserves cycle_number 0 (guard regression)", async () => {
    const coupleId = await makeCouple();
    await admin.from("personal_context").insert({
      couple_id: coupleId,
      cycle_number: 0,
    });
    const pc = await mapPersonalContext(admin, coupleId);
    expect(pc.cycleNumber).toBe(0);
  });
});
