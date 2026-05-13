"use client";

import { use, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "./actions";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function AcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onAccept = () =>
    startTransition(async () => {
      const r = await acceptInviteAction(token);
      if (r.error) {
        setError(r.error);
        return;
      }
      router.push("/dashboard");
    });

  return (
    <Card className="mt-8">
      <CardHeader>
        <h1 className="text-2xl font-semibold">배우자 초대 수락</h1>
        <p className="text-muted-foreground text-sm">
          이 링크를 보내준 사람과 페어가 됩니다. 수락 후 함께 시작합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}
      </CardContent>
      <CardFooter>
        <Button
          onClick={onAccept}
          disabled={pending || !!error}
          className="w-full"
        >
          {pending ? "수락 중..." : "수락하기"}
        </Button>
      </CardFooter>
    </Card>
  );
}
