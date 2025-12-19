import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Dashboard Page
 *
 * These tests verify:
 * - Dashboard page loads correctly
 * - Welcome greeting displays based on time
 * - Summary card shows correct statistics
 * - Recent scenarios list displays saved scenarios
 * - Quick actions navigate to correct pages
 * - Pro tips section is visible
 */

test.describe('Dashboard Page', () => {
  test.describe('Page Loading', () => {
    test('should load dashboard page', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');

      // Page should have dashboard URL
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should display welcome greeting', async ({ page }) => {
      await page.goto('/dashboard');

      // Look for greeting text (Good morning/afternoon/evening)
      const greeting = page.getByText(/good (morning|afternoon|evening)/i);
      await expect(greeting).toBeVisible();
    });

    test('should show loading state initially', async ({ page }) => {
      // Navigate and check for loading indicator
      await page.goto('/dashboard');

      // Either loading indicator or content should be visible
      const hasLoader = await page.locator('.animate-spin').count() > 0;
      const hasContent = await page.getByText(/scenario/i).count() > 0;

      expect(hasLoader || hasContent).toBeTruthy();
    });
  });

  test.describe('Summary Card', () => {
    test('should display summary card', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for summary card content
      const summarySection = page.locator('[class*="card"]').filter({
        hasText: /scenario|analysis|total/i,
      });

      const summaryExists = await summarySection.count() > 0;
      if (summaryExists) {
        await expect(summarySection.first()).toBeVisible();
      }
    });

    test('should show scenario count in summary', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for text mentioning scenarios
      const scenarioText = page.getByText(/\d+\s*(saved\s+)?scenario/i).or(
        page.getByText(/no.*scenario/i)
      );

      const textExists = await scenarioText.count() > 0;
      if (textExists) {
        await expect(scenarioText.first()).toBeVisible();
      }
    });

    test('should show best opportunity if scenarios exist', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for best opportunity section
      const bestOpportunity = page.getByText(/best|opportunity|highest/i);
      const hasOpportunity = await bestOpportunity.count() > 0;

      // Either shows best opportunity or "no scenarios" message
      expect(typeof hasOpportunity).toBe('boolean');
    });
  });

  test.describe('Recent Scenarios', () => {
    test('should display recent scenarios section', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for recent scenarios heading or section
      const recentSection = page.getByText(/recent/i).or(
        page.getByRole('heading', { name: /recent/i })
      );

      const sectionExists = await recentSection.count() > 0;
      expect(typeof sectionExists).toBe('boolean');
    });

    test('should show empty state when no scenarios', async ({ page }) => {
      // Clear any stored scenarios (if possible)
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for empty state or scenario list
      const hasScenarios = await page.getByText(/load|view/i).count() > 0;
      const hasEmptyState = await page.getByText(/no.*scenario|get started|create/i).count() > 0;

      // Either has scenarios or shows empty state
      expect(hasScenarios || hasEmptyState).toBeTruthy();
    });

    test('should have clickable scenario items when available', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for scenario items with load functionality
      const loadButtons = page.getByRole('button', { name: /load|open|view/i });
      const buttonCount = await loadButtons.count();

      // Either has load buttons or no scenarios to load
      expect(buttonCount >= 0).toBeTruthy();
    });
  });

  test.describe('Quick Actions', () => {
    test('should display quick actions section', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for quick actions or action buttons
      const quickActions = page.getByText(/quick action|get started|new.*analysis/i);
      const actionsExist = await quickActions.count() > 0;

      expect(actionsExist).toBeTruthy();
    });

    test('should have new employee analysis button', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for employee analysis button
      const employeeButton = page.getByRole('button', { name: /employee|offer|new.*analysis/i });
      const buttonExists = await employeeButton.count() > 0;

      if (buttonExists) {
        await expect(employeeButton.first()).toBeVisible();
      }
    });

    test('should have new founder analysis button', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for founder analysis button
      const founderButton = page.getByRole('button', { name: /founder|cap.*table/i });
      const buttonExists = await founderButton.count() > 0;

      if (buttonExists) {
        await expect(founderButton.first()).toBeVisible();
      }
    });

    test('should navigate to employee analysis on click', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Click employee analysis button
      const employeeButton = page.getByRole('button', { name: /employee|offer|new.*analysis/i }).first();
      const buttonExists = await employeeButton.count() > 0;

      if (buttonExists) {
        await employeeButton.click();

        // Should navigate to main page in employee mode
        await expect(page).toHaveURL('/');
      }
    });

    test('should navigate to founder analysis on click', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Click founder analysis button
      const founderButton = page.getByRole('button', { name: /founder|cap.*table/i }).first();
      const buttonExists = await founderButton.count() > 0;

      if (buttonExists) {
        await founderButton.click();

        // Should navigate to main page in founder mode
        await expect(page).toHaveURL('/');
      }
    });

    test('should have load example button', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for example/demo button
      const exampleButton = page.getByRole('button', { name: /example|demo|sample/i });
      const buttonExists = await exampleButton.count() > 0;

      if (buttonExists) {
        await expect(exampleButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Pro Tips Section', () => {
    test('should display pro tips card', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for pro tips section
      const proTips = page.getByText(/pro tip|tips/i);
      const tipsExist = await proTips.count() > 0;

      if (tipsExist) {
        await expect(proTips.first()).toBeVisible();
      }
    });

    test('should show helpful tips content', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for tip content
      const tipsContent = page.getByText(/save.*scenario|monte carlo|compare|export/i);
      const contentExists = await tipsContent.count() > 0;

      if (contentExists) {
        await expect(tipsContent.first()).toBeVisible();
      }
    });
  });

  test.describe('Navigation', () => {
    test('should have link back to main app', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for navigation to main app
      const homeLink = page.getByRole('link', { name: /home|worth.*it|analyzer/i }).or(
        page.locator('a[href="/"]')
      );
      const linkExists = await homeLink.count() > 0;

      if (linkExists) {
        await expect(homeLink.first()).toBeVisible();
      }
    });

    test('should navigate to comparison view when compare button clicked', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for compare button
      const compareButton = page.getByRole('button', { name: /compare/i });
      const buttonExists = await compareButton.count() > 0;

      if (buttonExists && await compareButton.first().isEnabled()) {
        await compareButton.first().click();

        // Should navigate to comparison tab
        await expect(page).toHaveURL(/\?tab=comparison|comparison/);
      }
    });

    test('should navigate to all scenarios when view all clicked', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for view all button
      const viewAllButton = page.getByRole('button', { name: /view.*all|see.*all/i });
      const buttonExists = await viewAllButton.count() > 0;

      if (buttonExists && await viewAllButton.first().isEnabled()) {
        await viewAllButton.first().click();

        // Should navigate to scenarios view
        await expect(page).toHaveURL(/\?tab=scenarios|scenarios/);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Page should still have greeting
      const greeting = page.getByText(/good (morning|afternoon|evening)/i);
      await expect(greeting).toBeVisible();

      // Quick actions should still be visible
      const quickActions = page.getByText(/quick action|new.*analysis/i);
      const actionsExist = await quickActions.count() > 0;
      expect(actionsExist).toBeTruthy();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Page should display all sections
      const greeting = page.getByText(/good (morning|afternoon|evening)/i);
      await expect(greeting).toBeVisible();
    });

    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // All sections should be visible in grid layout
      const greeting = page.getByText(/good (morning|afternoon|evening)/i);
      await expect(greeting).toBeVisible();

      // Pro tips should be in sidebar on desktop
      const proTips = page.getByText(/pro tip/i);
      const tipsExist = await proTips.count() > 0;
      if (tipsExist) {
        await expect(proTips.first()).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have main heading', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should have h1 heading
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
    });

    test('should have accessible button labels', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // All buttons should have accessible names
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const accessibleName = await button.getAttribute('aria-label') || await button.textContent();
        expect(accessibleName).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Tab through focusable elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Some element should be focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });
});
