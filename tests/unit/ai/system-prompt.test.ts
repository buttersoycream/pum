import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";

describe("buildSystemPrompt", () => {
  it("K1 Guard 1-5 모두 포함", () => {
    const p = buildSystemPrompt({ persona: "general", visibility: "pair" });
    expect(p).toContain("의학적 진단");
    expect(p).toContain("약물·보충제·시술·치료 방향 권장");
    expect(p).toContain("정상/이상/높다/낮다");
    expect(p).toContain("결과 보장");
    expect(p).toContain("출처 없는 통계");
  });

  it("P2 페르소나면 정신건강 escalation 포함", () => {
    const p = buildSystemPrompt({ persona: "P2", visibility: "private" });
    expect(p).toContain("1577-0199");
    expect(p).toContain("1577-7129");
    expect(p).toContain("자살예방상담");
  });

  it("pair mode 명시", () => {
    const p = buildSystemPrompt({ persona: "P1", visibility: "pair" });
    expect(p).toContain("pair: 부부 양쪽 모두에게 보임");
  });

  it("private mode 명시", () => {
    const p = buildSystemPrompt({ persona: "P1", visibility: "private" });
    expect(p).toContain("private: 본인만 보임");
  });

  it("personal_context 있으면 inject", () => {
    const p = buildSystemPrompt({
      persona: "P1",
      visibility: "pair",
      personalContext: { cycleNumber: 2, cycleStage: "자극 6일차" },
    });
    expect(p).toContain("2차");
    expect(p).toContain("자극 6일차");
    expect(p).toContain("다시 묻지 마세요");
  });

  it("personal_context 없으면 section 자체 없음", () => {
    const p = buildSystemPrompt({ persona: "P1", visibility: "pair" });
    expect(p).not.toContain("Personal context (per turn)");
  });

  it("각 페르소나 fragment 명시", () => {
    expect(buildSystemPrompt({ persona: "P1", visibility: "pair" })).toContain(
      "P1 (33세 초기 진단",
    );
    expect(buildSystemPrompt({ persona: "P2", visibility: "pair" })).toContain(
      "P2 (36세 반복 실패",
    );
    expect(buildSystemPrompt({ persona: "P3", visibility: "pair" })).toContain(
      "P3 (38세 남편 정자 이슈",
    );
    expect(buildSystemPrompt({ persona: "P4", visibility: "pair" })).toContain(
      "P4 (32세 자연시도",
    );
  });

  it("general persona는 fragment 없음", () => {
    const p = buildSystemPrompt({ persona: "general", visibility: "pair" });
    expect(p).not.toContain("# 페르소나:");
  });
});
