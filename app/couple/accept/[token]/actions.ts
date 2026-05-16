"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/current-user";
import { acceptInvite } from "@/lib/couple/accept-invite";

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
  return acceptInvite(admin(), user.id, token);
}
