import { describe, it, expect } from "vitest";
import {
  detectMentalHealthEmergency,
  MENTAL_HEALTH_ESCALATION_RESPONSE,
} from "@/lib/ai/guards/mental-health-emergency";

describe("detectMentalHealthEmergency", () => {
  // K7 P2 typical 메시지 + 자해 표현 확장. false negative 0 critical.
  const TRIGGER_CASES = [
    "죽고 싶을 만큼 힘들어요",
    "이제 더 이상 못 견디겠어요",
    "나 이제 더 이상 못 하겠어요",
    "이게 마지막 한 번이라는 생각",
    "못 견디겠다",
    "죽고 싶다는 생각까지 했어요",
    "버틸 수가 없어요",
    "끝내버리고 싶어요",
    "포기하고 싶어요",
    "이번이 마지막인지도 모르겠어요",
    "자해까지 생각했어요",
    "번아웃이에요",
    "내가 나한테 놀랐어요",
    "살고 싶지 않다는 생각",
    "더는 못 해요",
  ];

  TRIGGER_CASES.forEach((input) => {
    it(`trigger: "${input}"`, () => {
      const r = detectMentalHealthEmergency(input);
      expect(r.triggered).toBe(true);
      expect(r.matched.length).toBeGreaterThan(0);
    });
  });

  // false positive 회피
  const NON_TRIGGER_CASES = [
    "오늘 진료 잘 받았어요",
    "AMH 1.2 나왔어요",
    "주사 시간 늦었어요",
    "커피 마셔도 되나요",
    "2차 갈지 결정 중이에요",
    "병원 옮길까 고민 중",
  ];

  NON_TRIGGER_CASES.forEach((input) => {
    it(`no trigger: "${input}"`, () => {
      expect(detectMentalHealthEmergency(input).triggered).toBe(false);
    });
  });

  it("escalation response에 핵심 채널 모두 포함", () => {
    expect(MENTAL_HEALTH_ESCALATION_RESPONSE).toContain("1577-0199");
    expect(MENTAL_HEALTH_ESCALATION_RESPONSE).toContain("1577-7129");
    expect(MENTAL_HEALTH_ESCALATION_RESPONSE).toContain("정신건강의학과");
    expect(MENTAL_HEALTH_ESCALATION_RESPONSE).toContain(
      "AI는 정신건강 응급 상황을 판단할 수 없",
    );
  });
});
