"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function AcceptButton({ token }: { token: string }) {
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
    <div className="space-y-3">
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button
        onClick={onAccept}
        disabled={pending || !!error}
        className="w-full"
      >
        {pending ? "수락 중..." : "수락하기"}
      </Button>
    </div>
  );
}
