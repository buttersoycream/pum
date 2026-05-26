"use client";

import { use, useState, useTransition } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { signupAction } from "../actions";
import Link from "next/link";

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_to?: string }>;
}) {
  const { redirect_to } = use(searchParams);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const loginHref = redirect_to
    ? `/login?redirect_to=${encodeURIComponent(redirect_to)}`
    : "/login";

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold">메일을 확인해주세요</h1>
          <p className="text-muted-foreground text-sm">
            가입을 마치려면 이메일 인증이 필요해요.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            방금 입력하신 이메일로 <strong>확인 링크</strong>를 보냈어요. 메일함을
            열어 링크를 누르면 가입이 완료됩니다.
          </Alert>
          <p className="text-muted-foreground text-sm">
            메일이 안 보이면 <strong>스팸함</strong>도 확인해주세요. 도착까지 몇
            분 걸릴 수 있어요.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href={loginHref}>로그인 화면으로</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-semibold">시작하기</h1>
        <p className="text-muted-foreground text-sm">
          품에 오신 것을 환영합니다.
        </p>
      </CardHeader>
      <form
        action={(fd) =>
          startTransition(async () => {
            if (redirect_to) fd.set("redirect_to", redirect_to);
            const r = await signupAction(fd);
            if (r?.error) setError(r.error);
            else if (r?.needsConfirmation) setSent(true);
          })
        }
      >
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "가입 중..." : "가입하고 시작"}
          </Button>
          <p className="text-muted-foreground text-sm">
            이미 계정이 있으신가요?{" "}
            <Link href={loginHref} className="underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
