const LABEL: Record<string, string> = {
  A: "일상",
  B: "검사·시술",
  C: "마음",
  D: "부부",
  E: "결정",
  mixed: "대화",
};

export function AreaBadge({ area }: { area: string | null }) {
  if (!area) return null;
  return (
    <span className="bg-muted rounded px-2 py-0.5 text-xs">
      {LABEL[area] ?? area}
    </span>
  );
}
