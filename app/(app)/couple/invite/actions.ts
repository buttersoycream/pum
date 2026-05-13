"use server";

import { requireUser } from "@/lib/auth/current-user";
import { getCoupleForUser } from "@/lib/couple/queries";
import { createCoupleAndInvite } from "@/lib/couple/mutations";

export async function createInviteAction(): Promise<{
  token?: string;
  error?: string;
}> {
  const user = await requireUser();
  const existing = await getCoupleForUser(user.id);
  if (existing) return { error: "이미 페어가 있습니다." };

  try {
    const { token } = await createCoupleAndInvite(user.id);
    return { token };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "초대 생성 실패" };
  }
}
