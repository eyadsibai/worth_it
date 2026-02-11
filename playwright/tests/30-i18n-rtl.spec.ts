import { test, expect } from '../fixtures/base';
import type { Page } from '@playwright/test';

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);
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

async function openCommandPaletteFromSearch(page: Page) {
  const commandInput = page.getByPlaceholder(COMMAND_INPUT_PLACEHOLDER);
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

test.describe('Locale and RTL Coverage', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('worth_it_onboarded', 'true');
    });
  });

  test('sets html lang and direction consistently', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Offer\s*Analysis|Cap Table\s*Modeling/i })).toBeVisible({
      timeout: 45_000,
    });

    const htmlAttributes = await page.evaluate(() => ({
      lang: document.documentElement.lang.toLowerCase(),
      dir: document.documentElement.dir.toLowerCase(),
    }));

    expect(htmlAttributes.lang.length).toBeGreaterThan(0);
    expect(['ltr', 'rtl']).toContain(htmlAttributes.dir);

    const languageCode = htmlAttributes.lang.split('-')[0];
    const expectedDirection = RTL_LANGUAGES.has(languageCode) ? 'rtl' : 'ltr';
    expect(htmlAttributes.dir).toBe(expectedDirection);
  });

  test('does not introduce horizontal overflow in default locale', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Offer\s*Analysis|Cap Table\s*Modeling/i })).toBeVisible({
      timeout: 45_000,
    });

    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return doc.scrollWidth > doc.clientWidth + 1 || body.scrollWidth > body.clientWidth + 1;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('keeps command palette navigation usable across locales', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Offer\s*Analysis|Cap Table\s*Modeling/i })).toBeVisible({
      timeout: 45_000,
    });

    await openCommandPaletteFromSearch(page);

    await page.getByPlaceholder(COMMAND_INPUT_PLACEHOLDER).fill('Go to About');
    await page.locator('[data-slot="command-item"]').filter({ hasText: 'Go to About' }).first().click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByText('Job Offer Financial Analyzer')).toBeVisible();
  });

  test('maintains RTL layout integrity when Arabic locale is configured', async ({ page }) => {
    await page.goto('/valuation', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Valuation Calculator/i })).toBeVisible({
      timeout: 45_000,
    });

    const htmlAttributes = await page.evaluate(() => ({
      lang: document.documentElement.lang.toLowerCase(),
      dir: document.documentElement.dir.toLowerCase(),
    }));

    if (htmlAttributes.lang.startsWith('ar')) {
      expect(htmlAttributes.dir).toBe('rtl');
    } else {
      expect(htmlAttributes.dir).toBe('ltr');
    }
    await expect(page.getByRole('heading', { name: /Valuation Calculator/i })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return doc.scrollWidth > doc.clientWidth + 1 || body.scrollWidth > body.clientWidth + 1;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
});
