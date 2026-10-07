import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures";

test.describe("Compare Teams page", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("loads teams into dropdowns", async ({ page }) => {
    await page.goto("/compare");

    const combos = page.locator("select");
    await expect(combos).toHaveCount(2, { timeout: 15_000 });

    // Wait for England option to appear
    await expect(
      combos.nth(0).locator('option[value="768"]'),
    ).toHaveCount(1, { timeout: 15_000 });
    await expect(
      combos.nth(1).locator('option[value="770"]'),
    ).toHaveCount(1, { timeout: 15_000 });
  });

  test("selects two teams and renders comparison", async ({ page }) => {
    await page.goto("/compare");

    const combos = page.locator("select");
    await expect(combos).toHaveCount(2, { timeout: 15_000 });

    // Wait for options load
    await expect(
      combos.nth(0).locator('option[value="768"]'),
    ).toHaveCount(1, { timeout: 15_000 });
    await expect(
      combos.nth(1).locator('option[value="770"]'),
    ).toHaveCount(1, { timeout: 15_000 });

    // Select by value (matches option value attribute)
    await combos.nth(0).selectOption("768");
    await combos.nth(1).selectOption("770");

    // Wait for Team Comparison heading (auto-triggered on selection)
    await expect(
      page.getByRole("heading", { name: /Team Comparison/i }),
    ).toBeVisible({ timeout: 20_000 });

    // Metrics
    await expect(
      page.getByText("Goals", { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});