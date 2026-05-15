export function EmergencyEscalation({
  symptomNote,
}: {
  symptomNote?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-4 text-red-900">
      <div className="text-lg font-semibold mb-2">
        ⚠ 즉시 의료 도움이 필요할 수 있어요
      </div>
      {symptomNote ? <p className="mb-3 text-sm">{symptomNote}</p> : null}
      <div className="space-y-2">
        <a
          href="tel:119"
          className="block rounded-lg bg-red-600 px-4 py-3 text-center font-medium text-white"
        >
          119 응급실 — 바로 전화
        </a>
        <a
          href="#"
          className="block rounded-lg border border-red-300 bg-white px-4 py-3 text-center font-medium text-red-900"
        >
          시술받은 병원 응급 연락처 ↗
        </a>
      </div>
      <p className="mt-3 text-xs text-red-800">
        AI는 응급 상황을 판단할 수 없습니다. 위 증상은 의료진의 즉각적인 평가가 필요해요.
      </p>
    </div>
  );
}
