import AxeBuilder from "@axe-core/playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const URL = "/admin/design";

// Errors that come from the app shell around the page, not from the design system.
const IGNORED_ERRORS = [
  // Supabase rejects the key in local/CI environments.
  /Invalid API key/i,
  /status of 401/i,
  /Failed to fetch/i,
  // CI points Supabase at a placeholder host, so its requests fail to resolve.
  /net::ERR_/i,
  /Failed to preconnect/i,
  /ci-placeholder\.supabase\.co/i,
  /Load failed/i,
  /fetch failed/i,
  // The theme boot <script> in app/layout.tsx (WebKit warns about it on every page).
  /Encountered a script tag/i,
];

async function open(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORED_ERRORS.some((r) => r.test(m.text()))) errors.push(m.text());
  });
  await page.goto(URL);
  await expect(page.getByRole("heading", { level: 1, name: /one language/i })).toBeVisible();
  return errors;
}

async function setPreview(page: Page, theme: "Dark" | "Light") {
  await page.getByRole("button", { name: theme, exact: true }).click();
}

test.describe("design system page", () => {
  test("renders without errors", async ({ page }) => {
    const errors = await open(page);
    await expect(page.getByRole("heading", { name: "Components", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const theme of ["Dark", "Light"] as const) {
    test(`has no WCAG 2.2 AA violations (${theme.toLowerCase()})`, async ({ page }) => {
      await open(page);
      await setPreview(page, theme);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        // Next.js dev overlay, not our UI.
        .exclude("nextjs-portal")
        .analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length}× ${v.nodes[0]?.target.join(" ")}`);
      expect(summary).toEqual([]);
    });
  }

  test("no horizontal scroll on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    const overflow = await page.evaluate(() => {
      const root = document.querySelector("[data-scroll-root]") as HTMLElement;
      return root.scrollWidth - root.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("keyboard", () => {
  // Safari (WebKit) only moves Tab focus to buttons when "Full Keyboard Access" is on, so these
  // run in Chromium. WebKit still runs the accessibility and screenshot checks.
  test.skip(({ browserName }) => browserName === "webkit", "Keyboard focus tests run in Chromium.");

  test("dialog traps focus, closes on Esc, returns focus", async ({ page }) => {
    await open(page);
    const trigger = page.getByTestId("open-dialog");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Add to collection" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("delete confirmation unlocks only after typing the title", async ({ page }) => {
    await open(page);
    await page.getByTestId("open-confirm").click();
    const dialog = page.getByRole("dialog", { name: "Delete Ayam Kabur?" });
    const confirm = dialog.getByRole("button", { name: "Delete game" });
    await expect(confirm).toBeDisabled();
    await dialog.getByRole("textbox").fill("Ayam Kabur");
    await expect(confirm).toBeEnabled();
  });

  test("sheet closes on Esc and returns focus", async ({ page }) => {
    await open(page);
    const trigger = page.getByTestId("open-sheet");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("menu opens with Enter, moves with arrows, closes with Esc", async ({ page }) => {
    await open(page);
    const trigger = page.getByTestId("open-menu");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    // Arrow keys move between items; focus never leaves the menu.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("role"));
    expect(focused).toBe("menuitem");
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("popover closes on Esc and returns focus", async ({ page }) => {
    await open(page);
    const trigger = page.getByTestId("open-popover");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const panel = page.getByRole("dialog", { name: "Share Ayam Kabur" });
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("tabs move with arrow keys", async ({ page }) => {
    await open(page);
    const tabs = page.getByRole("tablist", { name: "Game categories" });
    await tabs.getByRole("tab", { name: "All games" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Horror" })).toHaveAttribute("aria-selected", "true");
  });
});

// Screenshot comparison runs on CI only (Linux baselines). When a baseline doesn't exist yet,
// the shot is saved for review instead, so a maintainer can commit it (see e2e/README.md).
const SHOT_DEMOS = ["Button", "GameCard", "Table"];
const SHOT_STYLE_PATH = join("e2e", "screenshot.css");

/** Lets the page grow to full height (it normally scrolls inside a container) and loads every image. */
async function prepareForShots(page: Page) {
  await page.evaluate(async () => {
    for (const el of [document.documentElement, document.body, document.querySelector("[data-scroll-root]")]) {
      if (el instanceof HTMLElement) Object.assign(el.style, { overflow: "visible", height: "auto" });
    }
    const images = [...document.images];
    images.forEach((img) => (img.loading = "eager"));
    await Promise.all(images.map((img) => (img.complete ? null : img.decode().catch(() => null))));
  });
}

test.describe("screenshots", () => {
  test.skip(!process.env.CI, "Screenshot baselines are compared on CI only.");

  for (const theme of ["Dark", "Light"] as const) {
    test(`key demos (${theme.toLowerCase()})`, async ({ page }, info) => {
      await open(page);
      await setPreview(page, theme);
      await prepareForShots(page);
      await page.waitForLoadState("networkidle");
      for (const demo of SHOT_DEMOS) {
        const target = page.locator(`[data-demo="${demo}"]`);
        const name = `${demo.toLowerCase()}-${theme.toLowerCase()}.png`;
        const baseline = join("e2e", "__screenshots__", info.project.name, name);
        if (existsSync(baseline)) {
          await expect(target).toHaveScreenshot(name, { stylePath: SHOT_STYLE_PATH });
        } else {
          // scale "css" matches what toHaveScreenshot compares against (WebKit runs at 2× pixel density).
          const body = await target.screenshot({
            animations: "disabled",
            scale: "css",
            style: readFileSync(SHOT_STYLE_PATH, "utf8"),
          });
          mkdirSync(join("test-results", "baselines", info.project.name), { recursive: true });
          writeFileSync(join("test-results", "baselines", info.project.name, name), body);
          await info.attach(name, { body, contentType: "image/png" });
          info.annotations.push({ type: "baseline missing", description: name });
        }
      }
    });
  }
});
