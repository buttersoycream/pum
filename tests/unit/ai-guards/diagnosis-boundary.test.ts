import { describe, it, expect } from "vitest";
import { checkDiagnosisBoundary } from "@/lib/ai/guards/diagnosis-boundary";

describe("checkDiagnosisBoundary", () => {
  it("진단 verdict 없으면 violation 0", () => {
    const r = checkDiagnosisBoundary(
      "AMH 1.2 기록했어요. 일반 범위는 의사 선생님께 확인하세요.",
    );
    expect(r.violations).toHaveLength(0);
  });

  it("'정상 범위' verdict 포함 시 violation", () => {
    const r = checkDiagnosisBoundary("AMH 수치는 정상 범위입니다.");
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it("'이상 소견' verdict 포함 시 violation", () => {
    const r = checkDiagnosisBoundary("결과에 이상 소견은 없습니다.");
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it("'낮은 편' verdict 포함 시 violation", () => {
    const r = checkDiagnosisBoundary("AMH 1.2는 낮은 편이에요.");
    expect(r.violations.length).toBeGreaterThan(0);
  });

  it("'걱정하지 마세요' 가짜 위로 violation", () => {
    const r = checkDiagnosisBoundary("걱정하지 마세요, 괜찮을 거예요.");
    expect(r.violations.length).toBeGreaterThanOrEqual(2);
  });
});
