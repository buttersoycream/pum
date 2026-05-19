import Link from "next/link";
import { AreaBadge } from "./AreaBadge";

type Row = {
  id: string;
  title: string | null;
  visibility: string;
  area: string | null;
};

export function ChatList({ chats }: { chats: Row[] }) {
  if (chats.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">아직 대화가 없어요.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {chats.map((c) => (
        <li key={c.id}>
          <Link
            href={`/chat/${c.id}`}
            className="hover:bg-muted flex items-center justify-between rounded border p-3"
          >
            <span className="text-sm">{c.title ?? "새 대화"}</span>
            <span className="flex items-center gap-2">
              <AreaBadge area={c.area} />
              <span className="text-muted-foreground text-xs">
                {c.visibility === "pair" ? "함께" : "나만"}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
