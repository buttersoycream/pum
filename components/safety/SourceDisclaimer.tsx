export type Source = {
  org: string;
  publishDate?: string;
  url?: string;
};

export function SourceDisclaimer({
  sources,
  note,
}: {
  sources: Source[];
  note?: string;
}) {
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      <div className="font-medium mb-1">출처</div>
      <ul className="space-y-0.5">
        {sources.map((s, i) => (
          <li key={i}>
            • {s.org}
            {s.publishDate ? ` (${s.publishDate} 기준)` : ""}
            {s.url ? ` — ${s.url}` : ""}
          </li>
        ))}
      </ul>
      {note ? <div className="mt-2 text-amber-800">{note}</div> : null}
    </div>
  );
}
