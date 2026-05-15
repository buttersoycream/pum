export type Persona = "P1" | "P2" | "P3" | "P4" | "general";

export type UserMeta = {
  cycleCount?: number;
  yearsTrying?: number;
  maleFactor?: boolean;
};

const P2_KEYWORDS = [
  "그만",
  "마지막",
  "포기",
  "끝내",
  "못 견디",
  "못해",
  "죽고 싶",
  "죽을",
  "안 되겠",
];

const P3_KEYWORDS = ["정자", "내 탓", "남편 탓", "남자 구실", "내가 발목"];

// P4 keyword는 P1보다 강한 신호여야 함. yearsTrying 정보 없이 keyword만으로 trigger.
// "1년", "2년" 단독 keyword는 너무 광범위 (P1 케이스도 "1년 자연시도" 표현 가능).
// → 더 명확한 "1년 넘게", "2년 넘게" 등으로.
const P4_KEYWORDS = ["1년 넘게", "1년 이상", "2년 넘게", "2년 이상", "난임센터 가야", "시술 진입"];

function hasKeyword(input: string, list: string[]): boolean {
  return list.some((kw) => input.includes(kw));
}

export function classifyPersona(input: string, meta: UserMeta = {}): Persona {
  // 우선순위: P2 (위험군) > P3 > P4 > P1
  if ((meta.cycleCount ?? 0) >= 3) return "P2";
  if (hasKeyword(input, P2_KEYWORDS)) return "P2";

  if (meta.maleFactor || hasKeyword(input, P3_KEYWORDS)) return "P3";

  if ((meta.cycleCount ?? 0) === 0 && (meta.yearsTrying ?? 0) >= 1) return "P4";
  if (hasKeyword(input, P4_KEYWORDS) && (meta.cycleCount ?? 0) === 0) return "P4";

  if ((meta.cycleCount ?? 0) === 0) return "P1";

  return "general";
}
