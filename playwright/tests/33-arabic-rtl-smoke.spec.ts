import { test, expect } from "@playwright/test";

test.describe("Arabic locale smoke", () => {
  test("the Arabic landing renders RTL with a verdict area", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { name: "تحليل العرض" })).toBeVisible();
    await expect(page.locator('[aria-live="polite"]').first()).toBeVisible();
  });
});
