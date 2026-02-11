import { test, expect } from '../fixtures/base';
import type { Page } from '@playwright/test';

const IS_MAC = process.platform === 'darwin';
const COMMAND_INPUT_PLACEHOLDER = 'Type a command or search...';

async function dispatchCommandShortcut(page: Page) {
  await page.evaluate((isMac) => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
        cancelable: true,
      })
    );
  }, IS_MAC);
}

async function openCommandPaletteWithShortcut(page: Page) {
  const commandInput = page.getByPlaceholder(COMMAND_INPUT_PLACEHOLDER);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await dispatchCommandShortcut(page);
    if (await commandInput.isVisible().catch(() => false)) {
      return;
    }
    await page.waitForTimeout(500);
  }
  await expect(commandInput).toBeVisible();
}

async function openCommandPalette(page: Page) {
  const commandInput = page.getByPlaceholder(COMMAND_INPUT_PLACEHOLDER);
  if (await commandInput.isVisible().catch(() => false)) {
    return;
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await dispatchCommandShortcut(page);
    if (await commandInput.isVisible().catch(() => false)) {
      return;
    }

    await page
      .getByRole('button', { name: /Search/i })
      .first()
      .click({ timeout: 1_000 })
      .catch(() => {});
    if (await commandInput.isVisible().catch(() => false)) {
      return;
    }

    await page.waitForTimeout(500);
  }
  await expect(commandInput).toBeVisible();
}

async function runCommand(
  page: Page,
  commandLabel: string,
  searchTerm: string = commandLabel
) {
  await openCommandPalette(page);

  const commandInput = page.getByPlaceholder(COMMAND_INPUT_PLACEHOLDER);
  await commandInput.fill(searchTerm);

  const commandItem = page.locator('[data-slot="command-item"]').filter({ hasText: commandLabel });
  await expect(commandItem.first()).toBeVisible();
  await commandItem.first().click();

  await expect(commandInput).toBeHidden();
}

test.describe('Command Palette Navigation', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('worth_it_onboarded', 'true');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Offer\s*Analysis|Cap Table\s*Modeling/i })).toBeVisible({
      timeout: 45_000,
    });
  });

  test('opens and closes with keyboard shortcut', async ({ page }) => {
    const commandInput = page.getByPlaceholder(COMMAND_INPUT_PLACEHOLDER);

    await openCommandPaletteWithShortcut(page);

    await page.keyboard.press('Escape');
    await expect(commandInput).toBeHidden();
  });

  test('navigates to about page and back to analysis', async ({ page }) => {
    await runCommand(page, 'Go to About');
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByText('Job Offer Financial Analyzer')).toBeVisible();

    await runCommand(page, 'Go to Analysis');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('tablist', { name: /Application mode/i })).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('[role="tablist"][aria-label="Application mode"] [role="tab"][aria-selected="true"]')
    ).toHaveCount(1);
  });

  test('switches app mode via command palette', async ({ page }) => {
    const founderTab = page.getByRole('tab', { name: /Model Cap Table/i });
    const employeeTab = page.getByRole('tab', { name: /Analyze Offer/i });

    await runCommand(page, 'Founder Mode');
    await expect(founderTab).toHaveAttribute('aria-selected', 'true', {
      timeout: 15_000,
    });

    await runCommand(page, 'Employee Mode');
    await expect(employeeTab).toHaveAttribute('aria-selected', 'true', {
      timeout: 15_000,
    });
  });

  test('applies theme commands via command palette', async ({ page }) => {
    await runCommand(page, 'Light Mode');
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('theme'))).toBe('light');

    await runCommand(page, 'Dark Mode');
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

    await runCommand(page, 'System Theme');
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('theme'))).toBe('system');
  });

  test('shows no results state for unmatched command search', async ({ page }) => {
    await openCommandPalette(page);
    await page.getByPlaceholder(COMMAND_INPUT_PLACEHOLDER).fill('zzzz-not-a-real-command');
    await expect(page.getByText('No results found.')).toBeVisible();
  });
});
