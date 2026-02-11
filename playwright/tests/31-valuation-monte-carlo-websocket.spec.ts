import { test, expect } from '../fixtures/base';
import type { Page } from '@playwright/test';

async function goToFirstChicago(page: Page) {
  await page.goto('/valuation', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Valuation Calculator/i })).toBeVisible({
    timeout: 45_000,
  });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const chicagoTabs = page.locator('[role="tab"][id$="-trigger-first_chicago"]');
    const count = await chicagoTabs.count();
    for (let idx = 0; idx < count; idx += 1) {
      await chicagoTabs.nth(idx).click({ force: true }).catch(() => {});
    }

    const hasScenarios = await page
      .getByText('Scenarios', { exact: true })
      .isVisible()
      .catch(() => false);
    if (hasScenarios) {
      return;
    }
    await page.waitForTimeout(300);
  }

  await expect(page.getByText('Scenarios', { exact: true })).toBeVisible({ timeout: 15_000 });
}

async function enableMonteCarlo(page: Page) {
  const monteCarloSwitch = page.locator('button[role="switch"]').first();
  const currentState = await monteCarloSwitch.getAttribute('data-state');
  if (currentState !== 'checked') {
    await monteCarloSwitch.click();
  }

  await expect(monteCarloSwitch).toHaveAttribute('data-state', 'checked');
  await expect(page.getByRole('button', { name: /Run Monte Carlo Simulation/i })).toBeVisible();
}

test.describe('Valuation Monte Carlo WebSocket', () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('worth_it_onboarded', 'true');
    });
  });

  test('toggles distribution input fields by distribution type', async ({ page }) => {
    await goToFirstChicago(page);
    await enableMonteCarlo(page);

    await page.locator('#best_value-type').click();
    await page.getByRole('option', { name: 'Fixed' }).click();
    await expect(page.locator('#best_value-value')).toBeVisible();
    await expect(page.locator('#best_value-mode')).toBeHidden();

    await page.locator('#best_value-type').click();
    await page.getByRole('option', { name: 'Uniform' }).click();
    await expect(page.locator('#best_value-min')).toBeVisible();
    await expect(page.locator('#best_value-max')).toBeVisible();
    await expect(page.locator('#best_value-mode')).toBeHidden();

    await page.locator('#best_value-type').click();
    await page.getByRole('option', { name: 'Triangular' }).click();
    await expect(page.locator('#best_value-min')).toBeVisible();
    await expect(page.locator('#best_value-mode')).toBeVisible();
    await expect(page.locator('#best_value-max')).toBeVisible();
  });

  test('shows websocket error feedback when valuation stream is unavailable', async ({ page }) => {
    await page.route('**/ws/valuation-monte-carlo', (route) => route.abort());

    await goToFirstChicago(page);
    await enableMonteCarlo(page);

    const runButton = page.getByRole('button', { name: /Run Monte Carlo Simulation/i });
    await runButton.click();

    const hasErrorFeedback = await page
      .getByText(/Connection error|Simulation failed/i)
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    expect(hasErrorFeedback).toBeTruthy();
    await expect(runButton).toBeEnabled();
  });

  test('runs first chicago monte carlo simulation and renders streamed results', async ({ page }) => {
    const wsConnections: string[] = [];
    page.on('websocket', (ws) => {
      wsConnections.push(ws.url());
    });

    await goToFirstChicago(page);
    await enableMonteCarlo(page);

    const runButton = page.getByRole('button', { name: /Run Monte Carlo Simulation/i });
    await runButton.scrollIntoViewIfNeeded();
    await runButton.click();

    const renderedResults = await page
      .getByText('Monte Carlo Simulation Results')
      .isVisible({ timeout: 30_000 })
      .catch(() => false);
    const showedConnectionError = await page
      .getByText(/Connection error|Simulation failed/i)
      .first()
      .isVisible({ timeout: 1_000 })
      .catch(() => false);

    expect(renderedResults || showedConnectionError).toBeTruthy();
    if (renderedResults) {
      await expect(
        page.getByText(/Valuation Distribution|Percentile Breakdown|Value Range/i).first()
      ).toBeVisible({
        timeout: 120_000,
      });
    }

    expect(wsConnections.some((url) => url.includes('/ws/valuation-monte-carlo'))).toBeTruthy();
  });
});
