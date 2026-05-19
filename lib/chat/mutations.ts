import type { SupabaseClient } from "@supabase/supabase-js";

export async function createChat(
  db: SupabaseClient,
  args: {
    coupleId: string;
    ownerUserId: string;
    visibility: "pair" | "private";
    title?: string;
    area?: string | null;
    persona?: string | null;
  },
) {
  const { data, error } = await db
    .from("ai_chats")
    .insert({
      couple_id: args.coupleId,
      owner_user_id: args.ownerUserId,
      visibility: args.visibility,
      title: args.title ?? null,
      area: args.area ?? null,
      persona: args.persona ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addMessage(
  db: SupabaseClient,
  args: {
    chatId: string;
    role: "user" | "assistant" | "system";
    content: string;
    guardTriggered?: string[];
    sources?: unknown;
  },
) {
  const { error } = await db.from("ai_messages").insert({
    chat_id: args.chatId,
    role: args.role,
    content: args.content,
    guard_triggered: args.guardTriggered ?? null,
    sources: args.sources ?? null,
  });
  if (error) throw error;
}
