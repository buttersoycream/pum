import { describe, it, expect } from "vitest";
import { checkStatisticsCitation } from "@/lib/ai/guards/statistics-citation";

describe("checkStatisticsCitation", () => {
  it("수치 있고 출처 있으면 OK", () => {
    const r = checkStatisticsCitation("성공률은 40-50%입니다 (출처: SART 2022)");
    expect(r.hasStats).toBe(true);
    expect(r.hasSource).toBe(true);
    expect(r.warning).toBeUndefined();
  });

  it("수치 있고 출처 없으면 violation", () => {
    const r = checkStatisticsCitation("성공률은 약 45%입니다.");
    expect(r.hasStats).toBe(true);
    expect(r.hasSource).toBe(false);
    expect(r.warning).toBeDefined();
  });

  it("수치 없으면 hasStats false", () => {
    const r = checkStatisticsCitation("의사 선생님께 다음 진료 때 여쭤보세요.");
    expect(r.hasStats).toBe(false);
  });

  it("'퍼센트' 표기 detect", () => {
    const r = checkStatisticsCitation("약 30 퍼센트라고 알려져 있습니다.");
    expect(r.hasStats).toBe(true);
    expect(r.hasSource).toBe(false);
  });

  it("'확률' 표기 detect", () => {
    const r = checkStatisticsCitation("성공 확률 40에서 50% (출처: KSRM 2024)");
    expect(r.hasStats).toBe(true);
    expect(r.hasSource).toBe(true);
  });
});
