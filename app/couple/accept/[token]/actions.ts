"use server";

import { requireUser } from "@/lib/auth/current-user";
import { acceptInvite } from "@/lib/couple/accept-invite";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient;

export async function acceptInviteAction(
  token: string,
): Promise<{ coupleId?: string; error?: string }> {
  const user = await requireUser();
  return acceptInvite(admin(), user.id, token);
}
