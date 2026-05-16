import Link from "next/link";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AcceptButton } from "./accept-button";

const admin = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

export default async function AcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Service-role read: an unauthenticated invitee isn't a couple member yet,
  // so RLS would hide the invite. The token itself is the bearer secret.
  // Only invite status is read here — no inviter identity (privacy, spec §6).
  const { data: invite } = await admin()
    .from("couple_invites")
    .select("accepted_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  let problem: string | null = null;
  if (!invite) {
    problem = "초대 링크를 찾을 수 없어요. 링크가 정확한지 확인해주세요.";
  } else if (invite.accepted_at) {
    problem = "이미 사용된 초대예요.";
  } else if (new Date(invite.expires_at) < new Date()) {
    problem =
      "이 초대는 만료됐어요 (유효기간 72시간). 배우자에게 새 링크를 요청해주세요.";
  }

  const user = await getCurrentUser();
  const next = `/couple/accept/${encodeURIComponent(token)}`;

  return (
    <main className="mx-auto max-w-md p-4">
      <Card className="mt-12">
        <CardHeader>
          <h1 className="text-2xl font-semibold">함께 가시겠어요?</h1>
          <p className="text-muted-foreground text-sm">
            배우자가 품에서 함께하자고 초대했어요. 품은 두 분이 같은 화면을
            보며 이 길을 함께 걷도록 만든 공간이에요.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {problem ? (
            <Alert variant="destructive">{problem}</Alert>
          ) : user ? (
            <AcceptButton token={token} />
          ) : (
            <p className="text-muted-foreground text-sm">
              함께 시작하려면 가입하거나 로그인하세요. 그다음 이 초대로
              자동으로 연결돼요.
            </p>
          )}
        </CardContent>
        {!problem && !user && (
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href={`/signup?redirect_to=${encodeURIComponent(next)}`}>
                가입하고 함께 시작
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/login?redirect_to=${encodeURIComponent(next)}`}>
                이미 회원이면 로그인
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
