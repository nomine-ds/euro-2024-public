import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads with hero, feature cards, and CTA", async ({ page }) => {
    await page.goto("/");

    // Hero heading
    await expect(
      page.getByRole("heading", { level: 1, name: /Context Zone/ }),
    ).toBeVisible();

    // Feature cards section
    await expect(
      page.getByRole("heading", { name: "Explore Data" }),
    ).toBeVisible();

    // At least one feature card link
    await expect(
      page.getByRole("link", { name: /Hudl Bot/ }).first(),
    ).toBeVisible();

    // CTA at bottom
    await expect(
      page.getByRole("link", { name: /Start Chat Now/ }),
    ).toBeVisible();
  });

  test("skip-link appears on first Tab and jumps to main", async ({ page }) => {
    await page.goto("/");

    // Focus body first
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: /Skip to main content/ });
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();

    await page.keyboard.press("Enter");

    // URL should have #main-content
    expect(page.url()).toContain("#main-content");
  });
});