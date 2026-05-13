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

  // Step 1: find the partner's user_id
  const { data: member, error: mErr } = await supabase
    .from("couple_members")
    .select("user_id")
    .eq("couple_id", coupleId)
    .neq("user_id", currentUserId)
    .maybeSingle();
  if (mErr) throw mErr;
  if (!member) return null;

  // Step 2: fetch their profile
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", member.user_id)
    .maybeSingle();
  if (pErr) throw pErr;

  return profile ? { user_id: member.user_id, profiles: profile } : null;
}
