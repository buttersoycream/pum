const PHYSICAL_EMERGENCY_PATTERNS: RegExp[] = [
  /극심한 복통/,
  /참을 수 없는 복통/,
  /칼로 찌르는 듯/,
  /심한 출혈/,
  /피가 멈추지 않/,
  /다량의 출혈/,
  /호흡 곤란/,
  /숨이 안 쉬어/,
  /숨쉬기 힘들/,
  /의식이 흐릿/,
  /의식이 없/,
  /기절/,
  /OHSS/,
  /난소과자극/,
  /복부 팽창.*구토/,
  /소변이 안 나/,
  /소변도 안 나/,
  /고열.*복통/,
  /감염.*복통/,
];

export type EmergencyKeywordResult = {
  triggered: boolean;
  matched: string[];
};

export function detectPhysicalEmergency(input: string): EmergencyKeywordResult {
  const matched: string[] = [];
  for (const pat of PHYSICAL_EMERGENCY_PATTERNS) {
    if (pat.test(input)) matched.push(pat.source);
  }
  return { triggered: matched.length > 0, matched };
}
