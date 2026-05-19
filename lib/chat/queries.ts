import { createClient } from "@/lib/supabase/server";

export async function listChats() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_chats")
    .select("id, title, visibility, area, persona, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getChat(chatId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_chats").select("*").eq("id", chatId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMessages(chatId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, guard_triggered, sources, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}
