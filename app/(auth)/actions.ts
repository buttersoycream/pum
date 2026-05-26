"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

function destination(formData: FormData): string {
  return (
    safeInternalPath(String(formData.get("redirect_to") ?? "")) ?? "/dashboard"
  );
}

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password)
    return { error: "이메일과 비밀번호를 입력해주세요." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // 이메일 확인이 켜져 있으면 세션이 없다 → 자동 로그인 대신 확인 메일을 안내.
  // (확인 링크는 /auth/confirm 가 처리; redirect 는 이메일 템플릿의 next 가 담당)
  if (!data.session) {
    return { needsConfirmation: true as const };
  }

  redirect(destination(formData));
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password)
    return { error: "이메일과 비밀번호를 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: error.message };

  redirect(destination(formData));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
