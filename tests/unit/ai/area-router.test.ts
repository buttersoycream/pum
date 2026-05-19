import { describe, it, expect } from "vitest";
import { classifyArea } from "@/lib/ai/area-router";

describe("classifyArea", () => {
  it("A: 일상 do/don't", () => {
    expect(classifyArea("커피 마셔도 되나요")).toBe("A");
    expect(classifyArea("운동 해도 괜찮을까요")).toBe("A");
  });
  it("B: 시술·검사 해석", () => {
    expect(classifyArea("AMH 수치가 1.2 나왔는데")).toBe("B");
    expect(classifyArea("초음파 결과 난포가")).toBe("B");
  });
  it("C: 멘탈", () => {
    expect(classifyArea("요즘 너무 우울하고 불안해요")).toBe("C");
  });
  it("D: 부부 갈등", () => {
    expect(classifyArea("남편이랑 또 싸웠어요")).toBe("D");
  });
  it("E: 의사결정", () => {
    expect(classifyArea("이번에 시술 그만둘지 말지 결정 못 하겠어요")).toBe("E");
    expect(classifyArea("비용이 너무 부담돼서 계속해야 할지")).toBe("E");
  });
  it("mixed: 신호 없음/복합", () => {
    expect(classifyArea("안녕하세요")).toBe("mixed");
  });
});
