"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateCoupleForUser } from "@/lib/couple/queries";
import { createChat } from "@/lib/chat/mutations";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient;

export async function createChatAction(
  formData: FormData,
): Promise<{ error: string } | void> {
  const user = await requireUser();
  const visibility =
    formData.get("visibility") === "private" ? "private" : "pair";
  try {
    const coupleId = await getOrCreateCoupleForUser(user.id);
    const chat = await createChat(admin(), {
      coupleId,
      ownerUserId: user.id,
      visibility,
    });
    redirect(`/chat/${chat.id}`);
  } catch (e: unknown) {
    // Re-throw Next.js redirect — it must not be caught here
    if (
      e instanceof Error &&
      (e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    return {
      error: e instanceof Error ? e.message : "대화를 시작할 수 없습니다.",
    };
  }
}
