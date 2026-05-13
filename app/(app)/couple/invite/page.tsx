"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "./actions";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function InvitePage() {
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onClick = () =>
    startTransition(async () => {
      const r = await createInviteAction();
      if (r.error) {
        toast.error(r.error);
        return;
      }
      setToken(r.token ?? null);
    });

  const inviteUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/couple/accept/${token}`
      : "";

  return (
    <Card className="mt-8">
      <CardHeader>
        <h1 className="text-2xl font-semibold">배우자 초대</h1>
        <p className="text-muted-foreground text-sm">
          초대 링크를 만들어 배우자에게 보내세요. 72시간 동안 유효합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!token && (
          <Button onClick={onClick} disabled={pending}>
            {pending ? "생성 중..." : "초대 링크 만들기"}
          </Button>
        )}
        {token && (
          <>
            <p className="text-sm font-medium">초대 링크</p>
            <div className="bg-muted rounded p-3 text-xs break-all" data-testid="invite-url">
              {inviteUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast.success("복사되었습니다");
              }}
            >
              복사
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
