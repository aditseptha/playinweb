import { expect, test } from "@playwright/test";

// Donations and tips are not open yet (#53): the public pages must not promise them.
// CI has no database, so the Donations and Tips flags stay at their defaults (hidden).
// Notifications and the badge shelf need an account; lib/money-features.test.mjs covers those rules.

test("the Terms have no Tips section and no Polar", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tips" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Donations and payouts" })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Polar");
  await expect(page.locator("main")).not.toContainText(/tipping/i);
});

test("the Privacy Policy says we take no payments and names no payment provider", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("main")).toContainText("PlayInWeb does not take payments right now");
  await expect(page.locator("main")).not.toContainText("Polar");
  await expect(page.locator("main")).not.toContainText(/tip PlayInWeb|tips to PlayInWeb/i);
});

test("the devlog does not advertise the Supporter badge", async ({ page }) => {
  await page.goto("/devlog");
  await expect(page.getByRole("heading", { level: 1, name: "Devlog" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Supporter");
});

test("the menu shows neither Wallet nor Tip the developer", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("link", { name: "Tip the developer" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Wallet" })).toHaveCount(0);
});
