"use client";

import { useState, useTransition } from "react";
import { createChatAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

export default function NewChatPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="mt-8 max-w-md">
      <CardHeader>
        <h1 className="text-xl font-semibold">새 대화 시작</h1>
        <p className="text-muted-foreground text-sm">
          이 대화를 배우자와 함께 볼지, 나만 볼지 정해주세요.
        </p>
      </CardHeader>
      <form
        action={(fd) =>
          startTransition(async () => {
            const r = await createChatAction(fd);
            if (r?.error) setError(r.error);
          })
        }
      >
        <CardContent className="space-y-3">
          {error && <Alert variant="destructive">{error}</Alert>}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              value="pair"
              defaultChecked
            />
            함께 보기 (배우자와 공유)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="visibility" value="private" />
            나만 보기
          </label>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "시작하는 중..." : "시작하기"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
