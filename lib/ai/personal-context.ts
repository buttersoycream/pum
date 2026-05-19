import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalContext } from "@/lib/ai/system-prompt";

/**
 * couple의 personal_context 행 → PersonalContext. 행 없거나 모든 필드
 * null이면 {}. `db`는 RLS 적용 server client 또는 service client 모두 가능.
 */
export async function mapPersonalContext(
  db: SupabaseClient,
  coupleId: string,
): Promise<PersonalContext> {
  const { data, error } = await db
    .from("personal_context")
    .select(
      "cycle_stage, cycle_number, current_medications, recent_emotional_state, recent_couple_issues",
    )
    .eq("couple_id", coupleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return {};
  const pc: PersonalContext = {};
  if (data.cycle_stage) pc.cycleStage = data.cycle_stage;
  if (data.cycle_number != null) pc.cycleNumber = data.cycle_number;
  // jsonb — M3 트래커가 채울 때 런타임 narrowing(zod 등) 추가 예정
  if (data.current_medications)
    pc.currentMedications = data.current_medications as Record<string, unknown>;
  if (data.recent_emotional_state)
    pc.recentEmotionalState = data.recent_emotional_state;
  if (data.recent_couple_issues)
    pc.recentCoupleIssues = data.recent_couple_issues;
  return pc;
}
