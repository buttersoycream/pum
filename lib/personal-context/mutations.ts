import type { SupabaseClient } from "@supabase/supabase-js";

export async function setCycleStage(
  db: SupabaseClient, coupleId: string, stage: string,
) {
  const { error } = await db
    .from("personal_context")
    .upsert(
      { couple_id: coupleId, cycle_stage: stage, updated_at: new Date().toISOString() },
      { onConflict: "couple_id" },
    );
  if (error) throw error;
}
