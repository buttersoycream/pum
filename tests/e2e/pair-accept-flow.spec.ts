import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const TS = Date.now();
const PASS = "TestPass123!";

async function signupViaForm(page: Page, email: string) {
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASS);
  await page.click("button[type=submit]");
}

async function signupToDashboard(page: Page, email: string) {
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await signupViaForm(page, email);
  await page.waitForURL("**/home", { timeout: 15_000 });
}

async function createInviteUrl(page: Page): Promise<string> {
  // Navigate directly to the invite page (home auto-creates self-couple,
  // so dashboard invite button is conditionally hidden for coupled users)
  await page.goto("/couple/invite");
  await page.click("text=초대 링크 만들기");
  return page.locator('[data-testid="invite-url"]').innerText();
}

test("Unauthenticated invitee: welcome -> signup -> return -> accept", async ({
  browser,
}) => {
  const aliceCtx: BrowserContext = await browser.newContext();
  const alice: Page = await aliceCtx.newPage();
  await signupToDashboard(alice, `pa-alice-${TS}@example.com`);
  const inviteUrl = await createInviteUrl(alice);
  expect(inviteUrl).toContain("/couple/accept/");

  // Bob arrives unauthenticated via the invite link
  const bobCtx: BrowserContext = await browser.newContext();
  const bob: Page = await bobCtx.newPage();
  await bob.goto(inviteUrl);
  await expect(bob.locator("h1")).toHaveText("함께 가시겠어요?");
  await bob.click("text=가입하고 함께 시작");
  await bob.waitForURL("**/signup**");
  await signupViaForm(bob, `pa-bob-${TS}@example.com`);

  // signup returns Bob to the welcome screen, now authenticated
  await bob.waitForURL("**/couple/accept/**", { timeout: 15_000 });
  await bob.click("text=수락하기");
  await bob.waitForURL("**/home");
  // Verify partner is visible on dashboard
  await bob.goto("/dashboard");
  await expect(bob.locator('[data-testid="partner-email"]')).toHaveText(
    `pa-alice-${TS}@example.com`,
  );

  await aliceCtx.close();
  await bobCtx.close();
});

test("Recovery: invitee who already made an empty couple still joins", async ({
  browser,
}) => {
  const aliceCtx: BrowserContext = await browser.newContext();
  const alice: Page = await aliceCtx.newPage();
  await signupToDashboard(alice, `pa2-alice-${TS}@example.com`);
  const inviteUrl = await createInviteUrl(alice);

  const bobCtx: BrowserContext = await browser.newContext();
  const bob: Page = await bobCtx.newPage();
  await signupToDashboard(bob, `pa2-bob-${TS}@example.com`);
  // Bob mistakenly creates his own (empty) couple first
  await createInviteUrl(bob);
  // Bob then opens Alice's real invite — recovery should kick in
  await bob.goto(inviteUrl);
  await bob.click("text=수락하기");
  await bob.waitForURL("**/home");
  // Verify partner is visible on dashboard
  await bob.goto("/dashboard");
  await expect(bob.locator('[data-testid="partner-email"]')).toHaveText(
    `pa2-alice-${TS}@example.com`,
  );

  await aliceCtx.close();
  await bobCtx.close();
});
