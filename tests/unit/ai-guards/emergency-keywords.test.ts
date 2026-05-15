import { describe, it, expect } from "vitest";
import { detectPhysicalEmergency } from "@/lib/ai/guards/emergency-keywords";

describe("detectPhysicalEmergency", () => {
  it.each<[string, boolean]>([
    ["배 너무 부풀고 토함, 소변도 안 나옴", true],
    ["극심한 복통이 있어요", true],
    ["숨이 안 쉬어져요", true],
    ["커피 마셔도 되나요?", false],
    ["주사 시간 늦었어요", false],
    ["OHSS 의심증상이 있는 것 같아요", true],
    ["고열에 복통까지 같이 와요", true],
    ["피가 멈추지 않아요", true],
    ["오늘 진료 잘 받았어요", false],
  ])('"%s" → triggered=%s', (input, expected) => {
    expect(detectPhysicalEmergency(input).triggered).toBe(expected);
  });
});
