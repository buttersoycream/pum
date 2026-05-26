"use server";

import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateCoupleForUser } from "@/lib/couple/queries";
import { createInviteForCouple } from "@/lib/couple/mutations";

export async function createInviteAction(): Promise<{
  token?: string;
  error?: string;
}> {
  const user = await requireUser();
  // With self-couple, every user already has a couple_id. We create (or reuse)
  // that couple and generate a fresh invite token pointing to it.
  try {
    const coupleId = await getOrCreateCoupleForUser(user.id);
    const { token } = await createInviteForCouple(coupleId, user.id);
    return { token };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "초대 생성 실패" };
  }
}
