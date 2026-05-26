export const CYCLE_STAGES = [
  { value: "pre", label: "준비 중" },
  { value: "stim", label: "난소자극" },
  { value: "retrieval", label: "채취 후" },
  { value: "transfer", label: "이식 후" },
  { value: "wait", label: "결과 대기" },
  { value: "result", label: "결과 확인" },
] as const;

export type CycleStage = (typeof CYCLE_STAGES)[number]["value"];

export const CYCLE_STAGE_VALUES = CYCLE_STAGES.map((s) => s.value);

/** 저장된 단계 값 → 한국어 라벨. 없으면 null. */
export function stageLabel(value: string | null): string | null {
  return CYCLE_STAGES.find((s) => s.value === value)?.label ?? null;
}
