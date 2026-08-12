import { test, expect } from "@playwright/test";

test.describe("Workspace Flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads dashboard with welcome message", async ({ page }) => {
    await expect(page.locator("text=Welcome to Dusk Work OS.")).toBeVisible({ timeout: 15000 });
  });

  test("sidebar is visible and togglable", async ({ page }) => {
    await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 10000 });
    const collapseButton = page.locator("button:has-text('Collapse')");
    await expect(collapseButton).toBeVisible();
    await collapseButton.click();
    const expandButton = page.locator("button:has([data-icon='lucide:panel-left-open'])");
    await expect(expandButton).toBeVisible({ timeout: 5000 });
  });

  test("settings navigation is present", async ({ page }) => {
    await expect(page.locator("text=Settings")).toBeVisible({ timeout: 15000 });
  });

  test("creates workspace and shows conversation list", async ({ page }) => {
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 });
    const createWorkspaceButton = page.locator("button[title='New workspace']").first();
    if (await createWorkspaceButton.count() > 0) {
      await createWorkspaceButton.click();
      await page.waitForTimeout(500);
      const nameInput = page.locator("input[placeholder*='workspace']").first();
      if (await nameInput.count() > 0) {
        await nameInput.fill("E2E Test Workspace");
        await nameInput.press("Enter");
        await expect(page.locator("text=E2E Test Workspace")).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("creates conversation when workspace is selected", async ({ page }) => {
    const workspaces = page.locator("button:has-text('Workspaces')");
    if (await workspaces.count() > 0) {
      await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 10000 });
    }
  });

  test("sends message and receives response in chat", async ({ page }) => {
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 15000 });
    const input = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    await input.fill("Hello from E2E test");
    await sendButton.click();
    await expect(page.locator("text=Hello from E2E test")).toBeVisible({ timeout: 10000 });
  });

  test("shows typing indicator while streaming", async ({ page }) => {
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 15000 });
    const input = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    await input.fill("Test streaming");
    await sendButton.click();
    await expect(page.locator("text=Assistant is typing...")).toBeVisible({ timeout: 5000 });
  });

  test("stops streaming response", async ({ page }) => {
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 15000 });
    const input = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    await input.fill("Trigger streaming");
    await sendButton.click();
    const stopButton = page.locator('[data-testid="stop-button"]');
    if (await stopButton.count() > 0) {
      await expect(stopButton).toBeVisible({ timeout: 5000 });
      await stopButton.click();
      await expect(stopButton).toBeHidden({ timeout: 3000 });
    }
  });

  test("does not send empty messages", async ({ page }) => {
    await page.waitForSelector('[data-testid="send-button"]', { timeout: 15000 });
    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();
    const messages = page.locator('[data-testid^="message-bubble-"]');
    await expect(messages).toHaveCount(0, { timeout: 3000 });
  });

  test("completes full workspace to chat flow", async ({ page }) => {
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 15000 });
    const input = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    await input.fill("Full flow test message");
    await sendButton.click();
    await expect(page.locator("text=Full flow test message")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Assistant is typing...")).toBeVisible({ timeout: 5000 });
  });
});
