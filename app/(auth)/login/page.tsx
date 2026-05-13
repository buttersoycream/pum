"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { loginAction } from "../actions";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-semibold">로그인</h1>
      </CardHeader>
      <form
        action={(fd) =>
          startTransition(async () => {
            const r = await loginAction(fd);
            if (r?.error) setError(r.error);
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
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "로그인 중..." : "로그인"}
          </Button>
          <p className="text-muted-foreground text-sm">
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" className="underline">
              가입하기
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
