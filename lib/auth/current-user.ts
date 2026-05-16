import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Returns the signed-in user, or null. Does NOT redirect — use on public pages. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/** Returns the signed-in user, or redirects to /login. Use on protected pages. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
