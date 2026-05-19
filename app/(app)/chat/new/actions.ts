"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getCoupleForUser } from "@/lib/couple/queries";
import { createChat } from "@/lib/chat/mutations";

const admin = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

export async function createChatAction(formData: FormData) {
  const user = await requireUser();
  const visibility =
    formData.get("visibility") === "private" ? "private" : "pair";
  const coupleId = await getCoupleForUser(user.id);
  if (!coupleId) return { error: "먼저 배우자와 연결해주세요." };
  const chat = await createChat(admin(), {
    coupleId,
    ownerUserId: user.id,
    visibility,
  });
  redirect(`/chat/${chat.id}`);
}
