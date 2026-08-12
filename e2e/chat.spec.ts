import { test, expect } from "@playwright/test";

test.describe("Chat E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("sends a message and receives a response", async ({ page }) => {
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 15000 });
    const input = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    await input.fill("Hello, Dusk!");
    await sendButton.click();

    await expect(page.locator("text=Hello, Dusk!")).toBeVisible({ timeout: 10000 });

    await expect(page.locator("text=Assistant is typing...")).toBeVisible({ timeout: 5000 });

    await expect(page.locator("text=I'm processing")).toBeVisible({ timeout: 15000 });
  });

  test("stops streaming response", async ({ page }) => {
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 15000 });
    const input = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    await input.fill("Trigger streaming");
    await sendButton.click();

    await expect(page.locator("text=Assistant is typing...")).toBeVisible({ timeout: 5000 });

    const stopButton = page.locator('[data-testid="stop-button"]');
    await expect(stopButton).toBeVisible({ timeout: 5000 });
    await stopButton.click();

    await expect(stopButton).toBeHidden({ timeout: 3000 });
  });

  test("does not send empty message", async ({ page }) => {
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 15000 });
    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    const messages = page.locator('[data-testid^="message-bubble-"]');
    await expect(messages).toHaveCount(0, { timeout: 3000 });
  });
});
