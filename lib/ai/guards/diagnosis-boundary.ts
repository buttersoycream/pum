const DIAGNOSIS_VERDICTS: RegExp[] = [
  /정상\s*(범위|입니다|이에요|이네요)/,
  /이상\s*(소견|입니다|이에요)/,
  /낮은\s*편/,
  /높은\s*편/,
  /나쁘지\s*않/,
  /좋은\s*편/,
  /걱정\s*하지\s*마세요/,
  /괜찮을\s*거예요/,
];

export type DiagnosisGuardResult = {
  violations: string[];
};

export function checkDiagnosisBoundary(aiResponse: string): DiagnosisGuardResult {
  const violations: string[] = [];
  for (const pat of DIAGNOSIS_VERDICTS) {
    const m = aiResponse.match(pat);
    if (m) violations.push(m[0]);
  }
  return { violations };
}
