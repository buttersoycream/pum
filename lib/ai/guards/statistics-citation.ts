const STAT_NUMBER_PATTERN = /(\d{1,3}(?:\.\d+)?)\s*(%|퍼센트|확률)/g;
const SOURCE_PATTERN = /\(출처[:\s]/;

export type StatGuardResult = {
  hasStats: boolean;
  hasSource: boolean;
  numbers: string[];
  warning?: string;
};

export function checkStatisticsCitation(text: string): StatGuardResult {
  const numbers = Array.from(text.matchAll(STAT_NUMBER_PATTERN)).map((m) => m[0]);
  const hasStats = numbers.length > 0;
  const hasSource = SOURCE_PATTERN.test(text);
  if (hasStats && !hasSource) {
    return {
      hasStats: true,
      hasSource: false,
      numbers,
      warning: "통계 수치는 있으나 출처 표기 없음 (K1 Guard-2 violation)",
    };
  }
  return { hasStats, hasSource, numbers };
}
