import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// The devlog (#40): the footer shows the live version and opens /devlog.

test("/devlog shows the live version and its release notes", async ({ page }) => {
  await page.goto("/devlog");
  await expect(page.getByRole("heading", { level: 1, name: "Devlog" })).toBeVisible();
  const live = page.getByText(/You're on v0\.\d+/);
  await expect(live).toBeVisible();
  const version = (await live.textContent())?.match(/v0\.\d+/)?.[0];
  // The newest release is first and marked Latest.
  const first = page.locator("ol > li").first();
  await expect(first.getByText("Latest")).toBeVisible();
  await expect(first.getByRole("link", { name: version })).toBeVisible();
});

test("the footer version opens the devlog", async ({ page }) => {
  await page.goto("/devlog");
  const link = page.getByRole("link", { name: /^Version 0\.\d+/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /\/devlog$/);
});

test("/devlogs redirects to /devlog", async ({ page }) => {
  await page.goto("/devlogs");
  await expect(page).toHaveURL(/\/devlog$/);
});

test("/devlog has no WCAG 2.2 AA violations", async ({ page }) => {
  await page.goto("/devlog");
  await expect(page.getByRole("heading", { level: 1, name: "Devlog" })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .include("main")
    .exclude("nextjs-portal")
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.length}× ${v.nodes[0]?.target.join(" ")}`);
  expect(summary).toEqual([]);
});
