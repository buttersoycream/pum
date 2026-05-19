"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatComposer({
  onSend,
  pending,
}: {
  onSend: (text: string) => void;
  pending: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSend(text);
        setText("");
      }}
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="무엇이든 편하게 적어주세요"
        disabled={pending}
        aria-label="메시지 입력"
      />
      <Button type="submit" disabled={pending || !text.trim()}>
        보내기
      </Button>
    </form>
  );
}
