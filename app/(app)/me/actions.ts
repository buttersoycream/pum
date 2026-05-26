"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateCoupleForUser } from "@/lib/couple/queries";
import { setCycleStage } from "@/lib/personal-context/mutations";
import { createAdminClient } from "@/lib/supabase/admin";
import { CYCLE_STAGE_VALUES } from "@/lib/cycle/stages";

const admin = createAdminClient;

export async function setStageAction(formData: FormData): Promise<void> {
  const stage = String(formData.get("stage") ?? "");
  if (!CYCLE_STAGE_VALUES.includes(stage as never)) return;
  const user = await requireUser();
  const coupleId = await getOrCreateCoupleForUser(user.id);
  await setCycleStage(admin(), coupleId, stage);
  revalidatePath("/home");
}
