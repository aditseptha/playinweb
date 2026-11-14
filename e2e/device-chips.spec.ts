import { expect, test } from "@playwright/test";

// Phone and Desktop chips in the homepage's filter sidebar (#38). On a phone the sidebar is a sheet
// behind the Filters button, which counts the chip. Nothing turns on by itself (#47).
//
// CI has no catalogue (placeholder Supabase), and the chips only appear once some game has its
// controls set, so each test starts with two games in the browser's local catalogue.
const GAMES = [
  { id: "local-tap", title: "Tap Tap Tester", developer: "QA", controls: ["touch", "mouse"] },
  { id: "local-keys", title: "Keyboard Quester", developer: "QA", controls: ["keyboard"] },
  // Phone rows show cards in pairs and hide a lone last one, so there are two phone games.
  { id: "local-swipe", title: "Swipe Sprinter", developer: "QA", controls: ["touch"] },
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

  test("a phone gets a Plays on your phone row and Best on desktop labels (#47)", async ({ page }) => {
    await page.goto("/");
    const row = page.locator("section", { has: page.getByRole("heading", { name: "Plays on your phone" }) });
    // Cards reveal as they scroll in.
    await row.scrollIntoViewIfNeeded();
    await expect(row.getByRole("link", { name: "Tap Tap Tester", exact: true })).toHaveCount(1);
    await expect(row.getByRole("link", { name: "Keyboard Quester", exact: true })).toHaveCount(0);
    // The keyboard game is still on the page, marked.
    const keys = page.locator("article", { has: page.getByRole("link", { name: "Keyboard Quester", exact: true }) }).first();
    await keys.scrollIntoViewIfNeeded();
    await expect(keys.getByText("Best on desktop")).toBeVisible();
    const tap = page.locator("article", { has: page.getByRole("link", { name: "Tap Tap Tester", exact: true }) }).first();
    await expect(tap.getByText("Best on desktop")).toHaveCount(0);
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

  test("no phone row and no Best on desktop labels on a computer", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Plays on your phone" })).toHaveCount(0);
    await expect(page.getByText("Best on desktop")).toHaveCount(0);
  });

  test("no chip turns on by itself, and picking one shows results without hiding the hero (#47)", async ({ page }) => {
    await page.goto("/");
    // Clicks before React hydrates do nothing, so let the page settle first.
    await page.waitForLoadState("networkidle");
    const chips = page.getByRole("group", { name: "Plays on" });
    await expect(chips).toBeVisible();
    await expect(chips.getByRole("button", { name: /Phone/ })).toHaveAttribute("aria-pressed", "false");
    await expect(page).not.toHaveURL(/device=/);

    // The hero keeps every game: its slide buttons stay the same.
    const heroSlides = page.locator('section[aria-labelledby="hero-title"] [role="tablist"] button');
    const heroBefore = await heroSlides.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));

    await chips.getByRole("button", { name: /Phone/ }).click();
    await expect(page).toHaveURL(/device=phone/);
    const results = page.locator("section[aria-live]");
    await expect(results.getByRole("heading", { name: /Plays on phone/ })).toBeVisible();
    await expect(results.getByRole("link", { name: "Tap Tap Tester", exact: true })).toHaveCount(1);
    await expect(results.getByRole("link", { name: "Keyboard Quester", exact: true })).toHaveCount(0);
    const heroAfter = await heroSlides.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    expect(heroAfter).toEqual(heroBefore);
    expect(heroBefore).toContain("Show Keyboard Quester");

    await chips.getByRole("button", { name: /Desktop/ }).click();
    await expect(page).toHaveURL(/device=desktop/);
    await expect(results.getByRole("heading", { name: /Plays on desktop/ })).toBeVisible();
    await expect(results.getByRole("link", { name: "Keyboard Quester", exact: true })).toHaveCount(1);
    await expect(chips.getByRole("button", { name: /Phone/ })).toHaveAttribute("aria-pressed", "false");
  });
});
