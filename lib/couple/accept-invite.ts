import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Accepts a couple invite on behalf of `userId` using a service-role client.
 * Caller is responsible for authentication (resolving `userId`).
 *
 * Recovery (spec §4): if the user is already in a couple that contains only
 * themselves (an empty couple created by mistake), that couples row is deleted
 * — ON DELETE CASCADE cleans members/invites/content — and the join proceeds.
 * A real two-person couple is never deleted and blocks the accept.
 */
export async function acceptInvite(
  admin: SupabaseClient,
  userId: string,
  token: string,
): Promise<{ coupleId?: string; error?: string }> {
  // 1. Look up invite + guards
  const { data: invite, error: iErr } = await admin
    .from("couple_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (iErr) return { error: iErr.message };
  if (!invite) return { error: "초대 링크를 찾을 수 없습니다." };
  if (invite.accepted_at) return { error: "이미 사용된 초대 링크입니다." };
  if (new Date(invite.expires_at) < new Date())
    return { error: "초대 링크가 만료되었습니다." };
  if (invite.invited_by === userId)
    return { error: "본인이 보낸 초대는 수락할 수 없습니다." };

  // 2. Existing membership: recover from an empty self-couple, else block.
  const { data: existing } = await admin
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    if (existing.couple_id === invite.couple_id) {
      return { coupleId: invite.couple_id };
    }
    const { count, error: cErr } = await admin
      .from("couple_members")
      .select("*", { count: "exact", head: true })
      .eq("couple_id", existing.couple_id);
    if (cErr) return { error: cErr.message };
    if ((count ?? 0) >= 2) {
      return { error: "이미 배우자와 연결되어 있어요." };
    }
    const { error: dErr } = await admin
      .from("couples")
      .delete()
      .eq("id", existing.couple_id);
    if (dErr) return { error: dErr.message };
  }

  // 3. Add the user to the inviter's couple
  const { error: mErr } = await admin
    .from("couple_members")
    .insert({ couple_id: invite.couple_id, user_id: userId });
  if (mErr) return { error: mErr.message };

  // 4. Mark the invite consumed
  const { error: uErr } = await admin
    .from("couple_invites")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq("token", token);
  if (uErr) return { error: uErr.message };

  return { coupleId: invite.couple_id };
}
