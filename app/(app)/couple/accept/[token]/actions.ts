"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/current-user";

const admin = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

export async function acceptInviteAction(
  token: string,
): Promise<{ coupleId?: string; error?: string }> {
  const user = await requireUser();
  const supabase = admin();

  // 1. Look up invite
  const { data: invite, error: iErr } = await supabase
    .from("couple_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (iErr) return { error: iErr.message };
  if (!invite) return { error: "초대 링크를 찾을 수 없습니다." };
  if (invite.accepted_at) return { error: "이미 사용된 초대 링크입니다." };
  if (new Date(invite.expires_at) < new Date())
    return { error: "초대 링크가 만료되었습니다." };
  if (invite.invited_by === user.id)
    return { error: "본인이 보낸 초대는 수락할 수 없습니다." };

  // 2. Check user is not already in a couple
  const { data: existing } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { error: "이미 페어에 속해 있습니다." };

  // 3. Add user as member
  const { error: mErr } = await supabase
    .from("couple_members")
    .insert({ couple_id: invite.couple_id, user_id: user.id });
  if (mErr) return { error: mErr.message };

  // 4. Mark invite as accepted
  const { error: uErr } = await supabase
    .from("couple_invites")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("token", token);
  if (uErr) return { error: uErr.message };

  return { coupleId: invite.couple_id };
}
