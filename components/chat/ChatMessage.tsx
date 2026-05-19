export function ChatMessage({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const mine = role === "user";
  return (
    <div className={mine ? "text-right" : "text-left"}>
      <div
        className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          mine ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
