import { test, expect, type Page } from "@playwright/test";

const TS = Date.now();
const PASS = "TestPass123!";

/**
 * Signs up a fresh user and waits for redirect to /home.
 * Mirrors the proven pattern from ai-companion.spec.ts / pair-accept-flow.spec.ts,
 * but targets /home (the post-signup destination since Task 7).
 */
async function signup(page: Page, email: string) {
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASS);
  await page.click("button[type=submit]");
  // signupAction redirects to /home; self-couple created by DB trigger.
  await page.waitForURL("**/home", { timeout: 15_000 });
}

test("혼자 가입 → 홈/글 접근, 사이클 단계 설정, 홈 반영, 페어 없이 대화 시작 가능", async ({
  page,
}) => {
  // 1. 가입 → /home 착지
  await signup(page, `solo-${TS}@example.com`);

  // 2. 홈 페이지 기본 인사 확인
  await expect(page.getByText("안녕하세요")).toBeVisible();

  // 3. 글 탭 → /articles ("이야기" h1 확인)
  // Tab links live inside <nav> — scope to avoid matching unrelated text on page
  await page.locator("nav").getByRole("link", { name: /글/ }).click();
  await page.waitForURL("**/articles", { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "이야기" })).toBeVisible();

  // 4. 나 탭 → /me, 사이클 단계 "난소자극" 클릭
  await page.locator("nav").getByRole("link", { name: /나/ }).click();
  await page.waitForURL("**/me", { timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "나" })).toBeVisible();

  // Stage chip is a <button name="stage" value="stim"> inside a form.
  // Click it and wait for the server action to complete + page to reload.
  await page.locator('button[name="stage"][value="stim"]').click();
  // Server action → redirect back to /me with updated state
  await page.waitForLoadState("networkidle");
  // Heading now shows "· 난소자극" as a <span class="text-primary">
  await expect(page.getByText(/난소자극/, { exact: false })).toBeVisible();

  // 5. 홈 탭 → /home, 사이클 단계 반영 확인
  await page.locator("nav").getByRole("link", { name: /홈/ }).click();
  await page.waitForURL("**/home", { timeout: 10_000 });
  // home page renders: `지금은 난소자극 시기예요. 오늘도 곁에 있을게요.`
  await expect(
    page.getByText(/지금은 난소자극 시기예요/, { exact: false }),
  ).toBeVisible({ timeout: 10_000 });

  // 6. /chat/new → 시작하기 → /chat/{id} (페어 없이도 진입 가능)
  await page.goto("/chat/new");
  await page.waitForLoadState("networkidle");
  // Submit button text confirmed in app/(app)/chat/new/page.tsx
  await page.click("text=시작하기");
  // Server action createChatAction → redirect("/chat/{id}")
  await page.waitForURL(/\/chat\/[^/]+$/, { timeout: 15_000 });
  // No pair-gate error text should be present
  await expect(page.getByText(/먼저 배우자와 연결해주세요/)).not.toBeVisible();
});
