import type { ReactNode } from "react";

export function AmberDisclaimer({ children }: { children?: ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      ⚠ {children ?? "이 내용은 일반 안내입니다. 본인 상황은 담당 의료진에게 확인하세요."}
    </div>
  );
}
