import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";

test.describe("Players page", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("navigates from homepage and loads data", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Players" }).first().click();

    await expect(page).toHaveURL(/\/players/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /Euro 2024 Players/i }),
    ).toBeVisible({ timeout: 10_000 });

    // At least one player row
    await expect(page.locator("tbody tr").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("search filter narrows results", async ({ page }) => {
    await page.goto("/players");

    await expect(page.locator("tbody tr").first()).toBeVisible({
      timeout: 10_000,
    });

    const initialCount = await page.locator("tbody tr").count();

    await page.getByPlaceholder("Player name...").fill("Kane");
    await page.waitForTimeout(300);

    const filteredCount = await page.locator("tbody tr").count();
    expect(filteredCount).toBeLessThan(initialCount);
  });

  test("shows empty state when search has no matches", async ({ page }) => {
    await page.goto("/players");
    await expect(page.locator("tbody tr").first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByPlaceholder("Player name...").fill("zzzzzzzz");
    await page.waitForTimeout(300);

    await expect(
      page.getByText(/No players match the current filter/),
    ).toBeVisible();
  });
});