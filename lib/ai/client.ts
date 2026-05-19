// lib/ai/client.ts
import type { GatewayProviderOptions } from "@ai-sdk/gateway";

/**
 * Vercel AI Gateway 모델 ID. AI SDK v6는 plain string + AI_GATEWAY_API_KEY
 * 환경변수면 자동으로 Gateway 경유. 모델 교체는 이 상수만 변경(M6 a/b).
 * 정확한 모델 ID 목록: vercel.com/docs/ai-gateway/models-and-providers
 */
export const CHAT_MODEL = "anthropic/claude-sonnet-4.6";

/** 의료 민감 대화 → 프롬프트 학습 비허용 (K4 개인정보 정합). */
export const CHAT_PROVIDER_OPTIONS = {
  gateway: { disallowPromptTraining: true },
} satisfies { gateway: GatewayProviderOptions };
