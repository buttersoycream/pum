export function MentalHealthEscalation() {
  return (
    <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-4 text-red-900">
      <div className="text-lg font-semibold mb-2">지금 마음 너무 무거우시죠</div>
      <p className="mb-3 text-sm">
        이 감정 혼자 안고 계시면 안 돼요. 지금 바로 전문가 한 명과 연결되는 게 가장 도움이 됩니다.
      </p>
      <div className="space-y-2">
        <a
          href="tel:1577-0199"
          className="block rounded-lg bg-red-600 px-4 py-3 text-center font-medium text-white"
        >
          자살예방상담전화 1577-0199 (24시간)
        </a>
        <a
          href="tel:1577-7129"
          className="block rounded-lg border border-red-300 bg-white px-4 py-3 text-center font-medium text-red-900"
        >
          정신건강위기상담 1577-7129
        </a>
        <a
          href="https://www.mentalhealth.go.kr/portal/center/centerListInfo.do"
          target="_blank"
          rel="noopener"
          className="block rounded-lg border border-red-300 bg-white px-4 py-3 text-center text-sm text-red-900"
        >
          가까운 정신건강의학과 찾기 ↗
        </a>
      </div>
      <p className="mt-3 text-xs text-red-800">
        AI는 정신건강 응급 상황을 판단할 수 없습니다. 위 채널 중 하나로 지금 바로 연결되어보세요.
      </p>
    </div>
  );
}

export function MentalHealthFootnote() {
  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-xs text-red-900">
      마음 너무 힘드시면 —{" "}
      <a href="tel:1577-0199" className="font-medium underline">
        1577-0199 자살예방상담
      </a>{" "}
      ·{" "}
      <a href="tel:1577-7129" className="font-medium underline">
        1577-7129 정신건강위기
      </a>{" "}
      (24시간)
    </div>
  );
}
