import { describe, it, expect } from "vitest";
import { classifyPersona } from "@/lib/ai/persona-router";

describe("classifyPersona", () => {
  describe("P1 — 초기 진단", () => {
    it.each([
      [
        "1년 정도 자연시도 했는데, 지금 시술로 넘어가는 게 맞나요?",
        { cycleCount: 0, yearsTrying: 0.5 },
        "P1" as const,
      ],
      ["AMH가 또래보다 낮다는데 어떤 의미예요?", { cycleCount: 0 }, "P1" as const],
      [
        "남편이 자꾸 조금만 더 기다리자고 하는데 답답해요",
        { cycleCount: 0 },
        "P1" as const,
      ],
    ])('"%s" → %s', (input, meta, expected) => {
      expect(classifyPersona(input, meta)).toBe(expected);
    });
  });

  describe("P2 — 반복 실패 ⚠️", () => {
    it.each([
      ["3차 실패했어요. 4차 갈까 멈출까", { cycleCount: 3 }, "P2" as const],
      ["이제 더 이상 못 견디겠어요", {}, "P2" as const],
      ["죽고 싶을 만큼 힘들어요", {}, "P2" as const],
      [
        "선생님 같으면 몇 차까지 하셨을 것 같으세요",
        { cycleCount: 3 },
        "P2" as const,
      ],
      ["이번이 마지막인지도 모르겠어요", {}, "P2" as const],
    ])('"%s" → %s', (input, meta, expected) => {
      expect(classifyPersona(input, meta)).toBe(expected);
    });
  });

  describe("P3 — 남편·정자 이슈", () => {
    it.each([
      [
        "정자 운동성·형태가 경계라고 들었어요",
        { maleFactor: true },
        "P3" as const,
      ],
      ["내 탓인 거 같아서 미안한데 말은 못 했어요", {}, "P3" as const],
      ["남편 정자 문제로 ICSI 했어요", {}, "P3" as const],
    ])('"%s" → %s', (input, meta, expected) => {
      expect(classifyPersona(input, meta)).toBe(expected);
    });
  });

  describe("P4 — 자연시도 1년+ 정보 과부하", () => {
    it.each([
      [
        "1년 자연시도 했는데 난임센터 가야 할까요",
        { cycleCount: 0, yearsTrying: 1 },
        "P4" as const,
      ],
      [
        "남편은 빨리 가자, 저는 정식 진단 받기 무서워요",
        { cycleCount: 0, yearsTrying: 1.5 },
        "P4" as const,
      ],
      [
        "영양제 종류만 10개째인데 뭘 먹어야 해요?",
        { cycleCount: 0, yearsTrying: 1.2 },
        "P4" as const,
      ],
    ])('"%s" → %s', (input, meta, expected) => {
      expect(classifyPersona(input, meta)).toBe(expected);
    });
  });

  describe("우선순위: P2 > P3 > P4 > P1", () => {
    it("cycleCount=3 + 정자 keyword → P2 (위험군 우선)", () => {
      expect(classifyPersona("정자 문제로 못 견디겠어요", { cycleCount: 3 })).toBe(
        "P2",
      );
    });
    it("maleFactor=true + cycleCount=0 → P3", () => {
      expect(
        classifyPersona("처음 검진 다녀왔어요", {
          cycleCount: 0,
          maleFactor: true,
        }),
      ).toBe("P3");
    });
    it("yearsTrying>=1 + cycleCount=0 → P4 (P1 보다 우선)", () => {
      expect(
        classifyPersona("아직 결정 못 했어요", {
          cycleCount: 0,
          yearsTrying: 2,
        }),
      ).toBe("P4");
    });
  });
});
