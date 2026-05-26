import { test, expect, type Page } from "@playwright/test";

const TS = Date.now();
const PASS = "TestPass123!";
const HAS_KEY = !!process.env.AI_GATEWAY_API_KEY;

async function signup(page: Page, email: string) {
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASS);
  await page.click("button[type=submit]");
  await page.waitForURL("**/home", { timeout: 15_000 });
}

/**
 * Creates a solo couple via the self-couple trigger (getOrCreateCoupleForUser
 * runs on /home load). The user is already in couple_members after signup,
 * so getCoupleForUser returns a coupleId — sufficient for createChatAction.
 */
async function soloCouple(page: Page, email: string) {
  await signup(page, email);
  // /home calls getOrCreateCoupleForUser — self-couple is created on load.
  await page.waitForLoadState("networkidle");
}

test("physical emergency: escalation, no AI call (key not required)", async ({
  page,
}) => {
  // soloCouple: signup → create couple-invite → user is in couple_members
  // so /chat/new createChatAction succeeds without needing a second member.
  await soloCouple(page, `ai-e-${TS}@example.com`);

  await page.goto("/chat/new");
  // Submit button text: "시작하기" (confirmed in app/(app)/chat/new/page.tsx)
  await page.click("text=시작하기");
  await page.waitForURL("**/chat/**", { timeout: 10_000 });

  // Wait for ChatComposer to mount after useTransition + server-action navigation settles
  const composer = page.getByPlaceholder("무엇이든 편하게 적어주세요");
  await composer.waitFor({ timeout: 10_000 });
  // "소변이 안 나" matches /소변이 안 나/ in emergency-keywords.ts
  await composer.fill("소변이 안 나와요");
  // Send button text: "보내기" (confirmed in ChatComposer.tsx)
  await page.click("text=보내기");

  // EmergencyEscalation renders a tel:119 link with text "119 응급실 — 바로 전화".
  // Use getByRole to target the specific CTA link (avoids strict-mode violation
  // where /119|응급/ matches multiple elements in the escalation block).
  await expect(
    page.getByRole("link", { name: /119/ }),
  ).toBeVisible({ timeout: 10_000 });
});

test("chat golden path (requires AI_GATEWAY_API_KEY)", async ({ page }) => {
  test.skip(!HAS_KEY, "AI_GATEWAY_API_KEY 미설정 — 스트리밍 테스트 보류");

  await soloCouple(page, `ai-g-${TS}@example.com`);

  await page.goto("/chat/new");
  await page.click("text=시작하기");
  await page.waitForURL("**/chat/**", { timeout: 10_000 });

  // Wait for ChatComposer to mount after useTransition + server-action navigation settles
  const composer = page.getByPlaceholder("무엇이든 편하게 적어주세요");
  await composer.waitFor({ timeout: 10_000 });
  await composer.fill("커피 하루 한 잔은 괜찮을까요?");
  await page.click("text=보내기");

  // Assistant message: data-role="assistant" anchor (added to ChatMessage.tsx outermost div)
  // Stable against class-name refactors; consistent with repo's data-testid convention.
  await expect(page.locator('[data-role="assistant"]').last()).not.toBeEmpty({
    timeout: 20_000,
  });
});
