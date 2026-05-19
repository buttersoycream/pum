"use client";

import { useState } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { BetaDisclaimer } from "@/components/safety/BetaDisclaimer";
import { EmergencyEscalation } from "@/components/safety/EmergencyEscalation";
import { MentalHealthEscalation } from "@/components/safety/MentalHealthEscalation";

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

  async function send(text: string) {
    setPending(true);
    setMsgs((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);

    const res = await fetch("/chat/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // visibility intentionally omitted — route reads it from DB
      body: JSON.stringify({ chatId, message: text }),
    });

    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = (await res.json()) as { escalation?: string };
      if (j.escalation) setEscalation(j.escalation);
      setPending(false);
      return;
    }

    // Text stream path
    const reader = res.body!.getReader();
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
    setPending(false);
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
      {!escalation && <ChatComposer onSend={send} pending={pending} />}
    </div>
  );
}
