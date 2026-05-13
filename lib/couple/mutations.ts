import { createClient } from "@/lib/supabase/server";
import { generateInviteToken, INVITE_EXPIRY_HOURS } from "./invite-token";

export async function createCoupleAndInvite(
  creatorId: string,
): Promise<{ token: string; coupleId: string }> {
  const supabase = await createClient();

  const { data: couple, error: cErr } = await supabase
    .from("couples")
    .insert({ created_by: creatorId })
    .select()
    .single();
  if (cErr) throw cErr;

  const { error: mErr } = await supabase
    .from("couple_members")
    .insert({ couple_id: couple.id, user_id: creatorId });
  if (mErr) throw mErr;

  const token = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000,
  );
  const { error: iErr } = await supabase.from("couple_invites").insert({
    token,
    couple_id: couple.id,
    invited_by: creatorId,
    expires_at: expiresAt.toISOString(),
  });
  if (iErr) throw iErr;

  return { token, coupleId: couple.id };
}
