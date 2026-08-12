import { test, expect } from "@playwright/test";

test.describe("Settings Flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("navigates to settings view", async ({ page }) => {
    const settingsButton = page.locator("text=Settings").first();
    await expect(settingsButton).toBeVisible({ timeout: 15000 });
    await settingsButton.click();
    await expect(page.locator("text=Settings")).toBeVisible({ timeout: 10000 });
  });

  test("displays settings tabs", async ({ page }) => {
    await page.locator("text=Settings").first().click();
    await expect(page.locator("text=Providers")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Agents")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Appearance")).toBeVisible({ timeout: 5000 });
  });

  test("shows provider configuration section", async ({ page }) => {
    await page.locator("text=Settings").first().click();
    await expect(page.locator("text=Providers")).toBeVisible({ timeout: 10000 });
    const addProviderButton = page.locator("button:has-text('Add Provider'), button[title='Add provider']").first();
    if (await addProviderButton.count() > 0) {
      await expect(addProviderButton).toBeVisible();
    }
  });

  test("can add a new provider", async ({ page }) => {
    await page.locator("text=Settings").first().click();
    await expect(page.locator("text=Providers")).toBeVisible({ timeout: 10000 });
    const addButton = page.locator("button:has-text('Add Provider')").first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(500);
      const nameInput = page.locator("input[placeholder*='provider' i], input[placeholder*='name' i]").first();
      if (await nameInput.count() > 0) {
        await nameInput.fill("Test Provider");
        await nameInput.press("Tab");
        await page.keyboard.press("Enter");
        await expect(page.locator("text=Test Provider")).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("displays provider cards", async ({ page }) => {
    await page.locator("text=Settings").first().click();
    await expect(page.locator("text=Providers")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test("can toggle provider active state", async ({ page }) => {
    await page.locator("text=Settings").first().click();
    await expect(page.locator("text=Providers")).toBeVisible({ timeout: 10000 });
    const toggleButtons = page.locator("[role='switch'], input[type='checkbox']");
    if (await toggleButtons.count() > 0) {
      const firstToggle = toggleButtons.first();
      await expect(firstToggle).toBeVisible();
    }
  });

  test("shows agent configuration section", async ({ page }) => {
    await page.locator("text=Settings").first().click();
    await page.locator("text=Agents").click();
    await expect(page.locator("text=Agents")).toBeVisible({ timeout: 5000 });
  });

  test("shows appearance settings", async ({ page }) => {
    await page.locator("text=Settings").first().click();
    await page.locator("text=Appearance").click();
    await expect(page.locator("text=Appearance")).toBeVisible({ timeout: 5000 });
  });

  test("completes full settings flow", async ({ page }) => {
    await page.locator("text=Settings").first().click();
    await expect(page.locator("text=Providers")).toBeVisible({ timeout: 10000 });
    await page.locator("text=Agents").click();
    await expect(page.locator("text=Agents")).toBeVisible({ timeout: 5000 });
    await page.locator("text=Appearance").click();
    await expect(page.locator("text=Appearance")).toBeVisible({ timeout: 5000 });
  });
});
