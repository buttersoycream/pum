"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateCoupleForUser } from "@/lib/couple/queries";
import { setCycleStage } from "@/lib/personal-context/mutations";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { CYCLE_STAGE_VALUES } from "@/lib/cycle/stages";

const admin = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } });

export async function setStageAction(formData: FormData): Promise<void> {
  const stage = String(formData.get("stage") ?? "");
  if (!CYCLE_STAGE_VALUES.includes(stage as never)) return;
  const user = await requireUser();
  const coupleId = await getOrCreateCoupleForUser(user.id);
  await setCycleStage(admin(), coupleId, stage);
  revalidatePath("/home");
}
