import { getChat, getMessages } from "@/lib/chat/queries";
import { ChatThread } from "./thread";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const chat = await getChat(chatId);
  if (!chat) return <p className="py-8">대화를 찾을 수 없어요.</p>;
  const messages = await getMessages(chatId);
  return (
    <ChatThread
      chatId={chatId}
      initial={messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        guard: (m.guard_triggered as string[] | null) ?? null,
      }))}
    />
  );
}
