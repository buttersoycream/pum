export type Area = "A" | "B" | "C" | "D" | "E" | "mixed";

const RULES: { area: Exclude<Area, "mixed">; kw: string[] }[] = [
  { area: "E", kw: ["결정", "그만둘지", "포기할지", "할지 말지", "비용", "돈", "지원금", "안 되면"] },
  { area: "D", kw: ["남편", "아내", "배우자", "싸웠", "싸움", "갈등", "서운", "오해"] },
  { area: "C", kw: ["우울", "불안", "무너", "힘들", "지쳐", "번아웃", "외로", "눈물"] },
  { area: "B", kw: ["AMH", "수치", "초음파", "난포", "정액검사", "혈액검사", "배아", "착상", "결과지", "호르몬"] },
  { area: "A", kw: ["먹어도", "마셔도", "커피", "음주", "운동", "음식", "영양제", "습관", "되나요", "괜찮을까"] },
];

/** 입력 첫 메시지 → 영역. 여러 영역 hit 또는 0 hit → "mixed". */
export function classifyArea(input: string): Area {
  const hits = RULES.filter((r) => r.kw.some((k) => input.includes(k)));
  if (hits.length === 1) return hits[0].area;
  return "mixed";
}
