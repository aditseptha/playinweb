import { expect, test } from "@playwright/test";

// Phone and Desktop chips in the homepage's filter sidebar (#38). On a phone the sidebar is a sheet
// behind the Filters button, which counts the chip. Nothing turns on by itself (#47).
//
// CI has no catalogue (placeholder Supabase), and the chips only appear once some game has its
// controls set, so each test starts with two games in the browser's local catalogue.
const GAMES = [
  { id: "local-tap", title: "Tap Tap Tester", developer: "QA", controls: ["touch", "mouse"] },
  { id: "local-keys", title: "Keyboard Quester", developer: "QA", controls: ["keyboard"] },
].map((g) => ({ ...g, description: "", playUrl: "/", thumbnailUrl: "", screenshots: [], embeddable: false, tags: [], createdAt: "2026-11-14T00:00:00Z", playCount: 1, likeCount: 0, promotionBoost: 0 }));

test.beforeEach(async ({ page }) => {
  await page.addInitScript((games) => {
    if (!localStorage.getItem("showcase.v1")) localStorage.setItem("showcase.v1", JSON.stringify({ registered: games }));
  }, GAMES);
});

test.describe("on a phone", () => {
  // Chromium's mobile emulation reports a coarse pointer without hover, like a real phone.
  test.skip(({ browserName }) => browserName !== "chromium", "Touch emulation runs in Chromium.");
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("nothing turns on by itself, and every game shows until Phone is picked (#47)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const filters = page.getByRole("button", { name: "Open filters" });
    await expect(page.getByText("Keyboard Quester").first()).toBeVisible();
    await expect(page).not.toHaveURL(/device=/);
    await expect(filters).not.toContainText("1");

    await filters.click();
    const phone = page.getByRole("group", { name: "Plays on" }).getByRole("button", { name: /Phone/ });
    await expect(phone).toHaveAttribute("aria-pressed", "false");
    await phone.click();
    await expect(phone).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/device=phone/);
    await expect(filters).toContainText("1");
  });

  test("a link that picks Desktop keeps Desktop", async ({ page }) => {
    await page.goto("/?device=desktop");
    await page.getByRole("button", { name: "Open filters" }).click();
    const chips = page.getByRole("group", { name: "Plays on" });
    await expect(chips.getByRole("button", { name: /Desktop/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/device=desktop/);
  });
});

test.describe("on a computer", () => {
  test("the chips sit in the filter sidebar, not above the games", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByRole("complementary", { name: "Filter games" });
    await expect(sidebar.getByRole("group", { name: "Plays on" })).toBeVisible();
  });

  test("no chip turns on by itself, and picking one updates the link", async ({ page }) => {
    await page.goto("/");
    // Clicks before React hydrates do nothing, so let the page settle first.
    await page.waitForLoadState("networkidle");
    const chips = page.getByRole("group", { name: "Plays on" });
    await expect(chips).toBeVisible();
    await expect(chips.getByRole("button", { name: /Phone/ })).toHaveAttribute("aria-pressed", "false");
    await expect(page).not.toHaveURL(/device=/);

    await chips.getByRole("button", { name: /Phone/ }).click();
    await expect(page).toHaveURL(/device=phone/);
    await expect(page.getByText("Keyboard Quester")).toHaveCount(0);
    await chips.getByRole("button", { name: /Desktop/ }).click();
    await expect(page).toHaveURL(/device=desktop/);
    await expect(page.getByText("Keyboard Quester").first()).toBeVisible();
    await expect(chips.getByRole("button", { name: /Phone/ })).toHaveAttribute("aria-pressed", "false");
  });
});
