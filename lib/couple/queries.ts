import { createClient } from "@/lib/supabase/server";

export async function getCoupleForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.couple_id ?? null;
}

export async function getPartner(coupleId: string, currentUserId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("couple_members")
    .select("user_id, profiles!inner ( email, display_name )")
    .eq("couple_id", coupleId)
    .neq("user_id", currentUserId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
