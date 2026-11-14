import { expect, test, type Page } from "@playwright/test";

// Feedback while things load (#45).
//
// CI has no catalogue (placeholder Supabase), so each test starts with games in the browser's local
// catalogue. One has a picture from a host the test controls, so the picture can be made slow.
const SLOW_IMAGE = "https://slow-images.invalid/cover.png";
// A 1×1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const GAMES = [
  { id: "local-tap", title: "Tap Tap Tester", controls: ["touch", "mouse"], thumbnailUrl: SLOW_IMAGE },
  { id: "local-keys", title: "Keyboard Quester", controls: ["keyboard"], thumbnailUrl: "" },
].map((g) => ({ ...g, developer: "QA", description: "", playUrl: "/", screenshots: [], embeddable: false, tags: [], createdAt: "2026-11-14T00:00:00Z", playCount: 1, likeCount: 0, promotionBoost: 0 }));

async function holdImages(page: Page) {
  let release!: () => void;
  const released = new Promise<void>((r) => (release = r));
  await page.route(`${SLOW_IMAGE}*`, async (route) => {
    await released;
    await route.fulfill({ status: 200, contentType: "image/png", body: PNG });
  });
  return release;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((games) => {
    if (!localStorage.getItem("showcase.v1")) localStorage.setItem("showcase.v1", JSON.stringify({ registered: games }));
  }, GAMES);
});

test("a filter chip changes the games without asking the server for the page again", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const pageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.headers()["rsc"] || request.url().includes("_rsc=")) pageRequests.push(request.url());
  });

  const chips = page.getByRole("group", { name: "Plays on" });
  await chips.getByRole("button", { name: /Phone/ }).click();
  await expect(page).toHaveURL(/device=phone/);
  await expect(chips.getByRole("button", { name: /Phone/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Keyboard Quester")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page).not.toHaveURL(/device=/);
  await expect(page.getByText("Keyboard Quester").first()).toBeVisible();

  expect(pageRequests).toEqual([]);
});

test("a card shows it is opening, and a bar runs at the top until the game page is in", async ({ page }) => {
  const release = await holdImages(page);
  release();
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Make the game page slow, like it is from a phone far from the server.
  let open!: () => void;
  const opened = new Promise<void>((r) => (open = r));
  await page.route("**/game/local-tap*", async (route) => {
    await opened;
    await route.continue();
  });

  const card = page.getByRole("link", { name: "Tap Tap Tester", exact: true }).first();
  await card.click();
  await expect(card.locator("[data-pending]")).toHaveCount(1);
  await expect(page.locator("[data-nav-progress-bar]")).toHaveCount(1);

  open();
  await expect(page).toHaveURL(/\/game\/local-tap/);
  await expect(page.locator("[data-nav-progress-bar]")).toHaveCount(0);
});

test("a card picture shimmers until it arrives", async ({ page }) => {
  const release = await holdImages(page);
  // The held picture would keep the page's load event from firing.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const card = page.locator("article", { has: page.getByRole("link", { name: "Tap Tap Tester", exact: true }) }).first();
  await expect(card.locator("[data-image-wait]")).toHaveCount(1);

  release();
  await expect(card.locator("[data-image-wait]")).toHaveCount(0);
  await expect(card.locator(`img[src="${SLOW_IMAGE}"]`)).toHaveCSS("opacity", "1");
});
