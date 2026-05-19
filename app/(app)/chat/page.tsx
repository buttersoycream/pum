import Link from "next/link";
import { listChats } from "@/lib/chat/queries";
import { ChatList } from "@/components/chat/ChatList";
import { Button } from "@/components/ui/button";

export default async function ChatListPage() {
  const chats = await listChats();
  return (
    <div className="space-y-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AI 동반자</h1>
        <Button asChild>
          <Link href="/chat/new">새 대화</Link>
        </Button>
      </div>
      <ChatList chats={chats} />
    </div>
  );
}
