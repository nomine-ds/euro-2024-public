import { test, expect } from "@playwright/test";

test.describe("Global search", () => {
  test("opens via search button and navigates to /search", async ({
    page,
  }) => {
    await page.goto("/");

    // Click the Search button in navbar (more reliable than keyboard shortcut)
    await page.getByRole("button", { name: "Search" }).first().click();

    // Overlay visible
    const input = page.getByPlaceholder(/Search players, matches, teams/);
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Type query and submit
    await input.fill("England");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/search\?q=England/, { timeout: 10_000 });
  });

  test("Escape closes search overlay", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Search" }).first().click();

    const input = page.getByPlaceholder(/Search players, matches, teams/);
    await expect(input).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");

    await expect(input).not.toBeVisible({ timeout: 5_000 });
  });
});