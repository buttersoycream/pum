const MENTAL_HEALTH_EMERGENCY_PATTERNS: RegExp[] = [
  /죽고\s*싶/,
  /죽을\s*것\s*같/,
  /죽음/,
  /끝내고\s*싶/,
  /끝내버리고\s*싶/,
  /못\s*견디겠/,
  /못\s*견디/,
  /버틸\s*수\s*없/,
  /버틸\s*수가?\s*없/,
  /포기하고\s*싶/,
  /포기해/,
  /이번이\s*마지막/,
  /이게\s*마지막\s*한\s*번/,
  /더\s*이상\s*못/,
  /더는\s*못/,
  /자해/,
  /자살/,
  /살고\s*싶지\s*않/,
  /번아웃/,
  /무너졌/,
  /내가\s*나한테\s*놀랐/,
];

export type MentalHealthGuardResult = {
  triggered: boolean;
  matched: string[];
};

export function detectMentalHealthEmergency(input: string): MentalHealthGuardResult {
  const matched: string[] = [];
  for (const pat of MENTAL_HEALTH_EMERGENCY_PATTERNS) {
    const m = input.match(pat);
    if (m) matched.push(m[0]);
  }
  return { triggered: matched.length > 0, matched };
}

export const MENTAL_HEALTH_ESCALATION_RESPONSE = `
지금 마음 너무 무거우시죠. 이 감정 혼자 안고 계시면 안 돼요.

- 자살예방상담전화: **1577-0199** (24시간)
- 정신건강위기상담: **1577-7129**
- 가까운 정신건강의학과: https://www.mentalhealth.go.kr/portal/center/centerListInfo.do

지금 바로 전화 한 통 부탁드릴 수 있을까요?

(AI는 정신건강 응급 상황을 판단할 수 없어요. 위 채널이 더 정확하게 도움드릴 수 있어요.)
`.trim();
