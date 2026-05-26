import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const TS = Date.now();
const ALICE = `alice-e2e-${TS}@example.com`;
const BOB = `bob-e2e-${TS}@example.com`;
const PASS = "TestPass123!";

async function signup(page: Page, email: string) {
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASS);
  await page.click('button[type=submit]');
  await page.waitForURL("**/home", { timeout: 15_000 });
}

test("Full couple flow: Alice invites, Bob accepts, both see partner", async ({
  browser,
}) => {
  // Alice's session
  const aliceCtx: BrowserContext = await browser.newContext();
  const alice: Page = await aliceCtx.newPage();
  await signup(alice, ALICE);
  // Navigate directly to the invite page (home auto-creates self-couple,
  // so dashboard "배우자 초대하기" button is conditionally hidden)
  await alice.goto("/couple/invite");
  await alice.click("text=초대 링크 만들기");
  const inviteUrl = await alice.locator('[data-testid="invite-url"]').innerText();
  expect(inviteUrl).toContain("/couple/accept/");

  // Bob's session (separate context)
  const bobCtx: BrowserContext = await browser.newContext();
  const bob: Page = await bobCtx.newPage();
  await signup(bob, BOB);
  await bob.goto(inviteUrl);
  await bob.click("text=수락하기");
  await bob.waitForURL("**/dashboard");
  await expect(bob.locator('[data-testid="partner-email"]')).toHaveText(ALICE);

  // Alice refreshes — sees Bob
  await alice.goto("/dashboard");
  await expect(alice.locator('[data-testid="partner-email"]')).toHaveText(BOB);

  await aliceCtx.close();
  await bobCtx.close();
});
