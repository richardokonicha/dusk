import { test, expect } from "@playwright/test";

test.describe("Workspace E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("navigates to workspace view", async ({ page }) => {
    await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 15000 });
  });

  test("shows welcome message", async ({ page }) => {
    await expect(page.locator("text=Welcome to Dusk Work OS.")).toBeVisible({ timeout: 15000 });
  });

  test("sidebar can be toggled", async ({ page }) => {
    const collapseButton = page.locator("button:has-text('Collapse')");
    await expect(collapseButton).toBeVisible({ timeout: 10000 });
    await collapseButton.click();

    const expandButton = page.locator("button:has([data-icon='lucide:panel-left-open'])");
    await expect(expandButton).toBeVisible({ timeout: 5000 });
    await expandButton.click();

    await expect(collapseButton).toBeVisible({ timeout: 5000 });
  });

  test("settings nav item is present", async ({ page }) => {
    await expect(page.locator("text=Settings")).toBeVisible({ timeout: 15000 });
  });
});
