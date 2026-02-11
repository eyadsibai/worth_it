import { test, expect } from '../fixtures/base';
import type { Page } from '@playwright/test';

async function goToValuation(page: Page) {
  await page.goto('/valuation', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Valuation Calculator/i })).toBeVisible({
    timeout: 45_000,
  });
}

async function selectMethodTab(page: Page, tabLabel: 'Berkus' | 'Scorecard' | 'Risk Factor') {
  const tabConfig = {
    Berkus: {
      trigger: 'berkus',
      calculateButton: /Calculate Berkus/i,
    },
    Scorecard: {
      trigger: 'scorecard',
      calculateButton: /Calculate Scorecard/i,
    },
    'Risk Factor': {
      trigger: 'risk_factor_summation',
      calculateButton: /Calculate Risk Factor/i,
    },
  } as const;

  const config = tabConfig[tabLabel];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const tabs = page.locator(`[role="tab"][id$="-trigger-${config.trigger}"]`);
    const count = await tabs.count();
    for (let idx = 0; idx < count; idx += 1) {
      await tabs.nth(idx).click({ force: true }).catch(() => {});
    }

    const hasCalculateButton = await page
      .getByRole('button', { name: config.calculateButton })
      .isVisible()
      .catch(() => false);
    if (hasCalculateButton) {
      return;
    }
    await page.waitForTimeout(300);
  }

  await expect(page.getByRole('button', { name: config.calculateButton })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('Pre-Revenue Valuation UI', () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('worth_it_onboarded', 'true');
    });
  });

  test('calculates Berkus valuation and shows criterion breakdown', async ({ page }) => {
    await goToValuation(page);
    await selectMethodTab(page, 'Berkus');
    await expect(page.getByRole('button', { name: /Calculate Berkus/i })).toBeVisible();
    await page.getByRole('button', { name: /Calculate Berkus/i }).click();

    await expect(page.getByText('Berkus Method', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Breakdown by Criterion')).toBeVisible();
  });

  test('supports scorecard add-factor and reset flows', async ({ page }) => {
    await goToValuation(page);
    await selectMethodTab(page, 'Scorecard');

    const factorNameInputs = page.getByPlaceholder('Factor name');
    await expect(factorNameInputs).toHaveCount(7);

    await page.getByRole('button', { name: /^Add Factor$/ }).click();
    await expect(factorNameInputs).toHaveCount(8);

    await page.getByRole('button', { name: /^Reset$/ }).click();
    await expect(factorNameInputs).toHaveCount(7);
    await expect(page.getByText(/Weight sum:\s*1\.00/i)).toBeVisible();
  });

  test('calculates scorecard valuation with default factors', async ({ page }) => {
    await goToValuation(page);
    await selectMethodTab(page, 'Scorecard');
    await expect(page.getByRole('button', { name: /Calculate Scorecard/i })).toBeVisible();
    await page.getByRole('button', { name: /Calculate Scorecard/i }).click();

    await expect(page.getByText('Scorecard Method', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Adjustment Factor')).toBeVisible();
  });

  test('calculates risk factor valuation and surfaces total adjustment', async ({ page }) => {
    await goToValuation(page);
    await selectMethodTab(page, 'Risk Factor');
    await expect(page.getByRole('button', { name: /Calculate Risk Factor Summation/i })).toBeVisible();
    await page.getByRole('button', { name: /Calculate Risk Factor Summation/i }).click();

    await expect(page.getByText('Risk Factor Summation', { exact: true }).last()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Total Adjustment', { exact: true })).toBeVisible();
  });

  test('switches between pre-revenue methods without stale result cards', async ({ page }) => {
    await goToValuation(page);

    await selectMethodTab(page, 'Berkus');
    await page.getByRole('button', { name: /Calculate Berkus/i }).click();
    await expect(page.getByText('Berkus Method', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });

    await selectMethodTab(page, 'Scorecard');
    await page.getByRole('button', { name: /Calculate Scorecard/i }).click();

    await expect(page.getByText('Scorecard Method', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
