"use client";

import { useState } from "react";
import Link from "next/link";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { BetaDisclaimer } from "@/components/safety/BetaDisclaimer";
import { EmergencyEscalation } from "@/components/safety/EmergencyEscalation";
import { MentalHealthEscalation } from "@/components/safety/MentalHealthEscalation";
import { Alert } from "@/components/ui/alert";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  guard?: string[] | null;
};

export function ChatThread({
  chatId,
  initial,
}: {
  chatId: string;
  initial: Msg[];
}) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [pending, setPending] = useState(false);
  const [escalation, setEscalation] = useState<string | null>(
    initial.find((m) => m.guard?.length)?.guard?.[0] ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    setPending(true);
    setError(null);
    const userMsgId = crypto.randomUUID();
    setMsgs((m) => [...m, { id: userMsgId, role: "user", content: text }]);
    try {
      const res = await fetch("/chat/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // visibility intentionally omitted — route reads it from DB
        body: JSON.stringify({ chatId, message: text }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const j = (await res.json()) as { escalation?: string; error?: string };
        if (j.escalation) {
          setEscalation(j.escalation);
          return;
        }
        if (!res.ok) {
          setMsgs((m) => m.filter((x) => x.id !== userMsgId));
          setError(j.error ?? "오류가 발생했어요. 다시 시도해주세요.");
        }
        return;
      }
      if (!res.ok || !res.body) {
        setMsgs((m) => m.filter((x) => x.id !== userMsgId));
        setError("오류가 발생했어요. 다시 시도해주세요.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      const id = crypto.randomUUID();
      setMsgs((m) => [...m, { id, role: "assistant", content: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value);
        setMsgs((m) =>
          m.map((x) => (x.id === id ? { ...x, content: acc } : x)),
        );
      }
    } catch {
      setMsgs((m) => m.filter((x) => x.id !== userMsgId));
      setError("네트워크 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 py-6">
      <BetaDisclaimer />
      <div className="space-y-3">
        {msgs.map((m) => (
          <ChatMessage key={m.id} role={m.role} content={m.content} />
        ))}
      </div>
      {escalation === "mental_health_emergency" && <MentalHealthEscalation />}
      {escalation === "physical_emergency" && <EmergencyEscalation />}
      {escalation && (
        <Link
          href="/chat/new"
          className="text-muted-foreground inline-block text-sm underline"
        >
          새 대화 시작하기
        </Link>
      )}
      {error && <Alert variant="destructive">{error}</Alert>}
      {!escalation && <ChatComposer onSend={send} pending={pending} />}
    </div>
  );
}
