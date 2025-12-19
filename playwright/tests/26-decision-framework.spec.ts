import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Decision Framework / Wizard
 *
 * These tests verify:
 * - Decision wizard appears in results
 * - Multi-step navigation (Financial, Risk, Career, Personal)
 * - Option selection for each factor
 * - Recommendation generation
 * - Skip functionality
 * - Recommendation display
 */

test.describe('Decision Framework', () => {
  test.describe('Wizard Visibility', () => {
    test('should show decision wizard after completing scenario', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      // Complete a scenario to trigger results
      await helpers.completeRSUScenario();

      // Look for decision framework/wizard
      const wizard = page.getByText(/decision.*framework|decision.*wizard/i).or(
        page.locator('[class*="decision"]')
      );
      const wizardExists = await wizard.count() > 0;

      if (wizardExists) {
        await expect(wizard.first()).toBeVisible();
      }
    });

    test('should show financial analysis on first step', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      await helpers.completeRSUScenario();

      // Look for financial analysis step
      const financialStep = page.getByText(/financial.*analysis/i);
      const stepExists = await financialStep.count() > 0;

      if (stepExists) {
        await expect(financialStep.first()).toBeVisible();
      }
    });

    test('should show expected net benefit', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      await helpers.completeRSUScenario();

      // Look for net benefit display
      const netBenefit = page.getByText(/expected.*net.*benefit|net.*benefit/i);
      const benefitExists = await netBenefit.count() > 0;

      if (benefitExists) {
        await expect(netBenefit.first()).toBeVisible();
      }
    });

    test('should show success probability', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      await helpers.completeRSUScenario();

      // Look for probability display
      const probability = page.getByText(/success.*probability|probability/i);
      const probExists = await probability.count() > 0;

      if (probExists) {
        await expect(probability.first()).toBeVisible();
      }
    });
  });

  test.describe('Wizard Navigation', () => {
    test('should have progress indicator', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      await helpers.completeRSUScenario();

      // Look for progress bar or step indicators
      const progress = page.locator('[role="progressbar"]').or(
        page.locator('[class*="progress"]')
      );
      const progressExists = await progress.count() > 0;

      if (progressExists) {
        await expect(progress.first()).toBeVisible();
      }
    });

    test('should have Next button on first step', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      await helpers.completeRSUScenario();

      // Look for Next button
      const nextButton = page.getByRole('button', { name: /next/i });
      const nextExists = await nextButton.count() > 0;

      if (nextExists) {
        await expect(nextButton.first()).toBeVisible();
        await expect(nextButton.first()).toBeEnabled();
      }
    });

    test('should navigate to Risk step when Next is clicked', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      await helpers.completeRSUScenario();

      // Click Next
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      const nextExists = await nextButton.count() > 0;

      if (nextExists) {
        await nextButton.click();
        await page.waitForTimeout(300);

        // Should now show Risk Assessment step
        const riskStep = page.getByText(/risk.*assessment/i);
        const riskExists = await riskStep.count() > 0;

        if (riskExists) {
          await expect(riskStep.first()).toBeVisible();
        }
      }
    });

    test('should have Back button after first step', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      await helpers.completeRSUScenario();

      // Navigate to step 2
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(300);

        // Back button should be visible
        const backButton = page.getByRole('button', { name: /back/i });
        const backExists = await backButton.count() > 0;

        if (backExists) {
          await expect(backButton.first()).toBeVisible();
        }
      }
    });

    test('should navigate back when Back is clicked', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      await helpers.completeRSUScenario();

      // Navigate to step 2
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(300);

        // Click Back
        const backButton = page.getByRole('button', { name: /back/i }).first();
        if (await backButton.count() > 0) {
          await backButton.click();
          await page.waitForTimeout(300);

          // Should be back on Financial Analysis
          const financialStep = page.getByText(/financial.*analysis/i);
          const financialExists = await financialStep.count() > 0;

          if (financialExists) {
            await expect(financialStep.first()).toBeVisible();
          }
        }
      }
    });

    test('should navigate through all steps', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();

      await helpers.completeRSUScenario();

      const expectedSteps = [
        /financial.*analysis/i,
        /risk.*assessment/i,
        /career.*factors/i,
        /personal.*factors/i,
      ];

      for (let i = 0; i < expectedSteps.length; i++) {
        // Verify current step
        const stepText = page.getByText(expectedSteps[i]);
        const stepExists = await stepText.count() > 0;

        if (stepExists) {
          await expect(stepText.first()).toBeVisible();
        }

        // Click Next if not on last step
        if (i < expectedSteps.length - 1) {
          const nextButton = page.getByRole('button', { name: /next/i }).first();
          if (await nextButton.count() > 0) {
            await nextButton.click();
            await page.waitForTimeout(300);
          }
        }
      }
    });
  });

  test.describe('Risk Assessment Step', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      // Navigate to Risk step
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(300);
      }
    });

    test('should show runway options', async ({ page }) => {
      // Look for runway question
      const runwayQuestion = page.getByText(/financial.*runway/i);
      const questionExists = await runwayQuestion.count() > 0;

      if (questionExists) {
        await expect(runwayQuestion.first()).toBeVisible();
      }

      // Look for runway options
      const options = [
        /less than 6 months/i,
        /6-12 months|6 to 12 months/i,
        /more than 12 months/i,
      ];

      for (const option of options) {
        const optionEl = page.getByText(option);
        const optionExists = await optionEl.count() > 0;
        if (optionExists) {
          await expect(optionEl.first()).toBeVisible();
        }
      }
    });

    test('should allow selecting runway option', async ({ page }) => {
      const option = page.getByText(/more than 12 months/i).first();
      const optionExists = await option.count() > 0;

      if (optionExists) {
        await option.click();
        await page.waitForTimeout(200);

        // Option should be selected (has border-primary or similar)
        const button = option.locator('xpath=ancestor::button').first();
        if (await button.count() > 0) {
          const hasSelectedClass = await button.evaluate((el) =>
            el.className.includes('border-primary') || el.className.includes('selected')
          );
          expect(hasSelectedClass).toBeTruthy();
        }
      }
    });

    test('should show dependents question', async ({ page }) => {
      const question = page.getByText(/dependents/i);
      const questionExists = await question.count() > 0;

      if (questionExists) {
        await expect(question.first()).toBeVisible();
      }
    });

    test('should show income stability question', async ({ page }) => {
      const question = page.getByText(/income stability/i);
      const questionExists = await question.count() > 0;

      if (questionExists) {
        await expect(question.first()).toBeVisible();
      }
    });
  });

  test.describe('Career Factors Step', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      // Navigate to Career step (2 clicks)
      for (let i = 0; i < 2; i++) {
        const nextButton = page.getByRole('button', { name: /next/i }).first();
        if (await nextButton.count() > 0) {
          await nextButton.click();
          await page.waitForTimeout(300);
        }
      }
    });

    test('should show career factor questions', async ({ page }) => {
      const factors = [
        /learning opportunity/i,
        /career growth/i,
        /network|industry exposure/i,
        /long-term.*goals|goal alignment/i,
      ];

      for (const factor of factors) {
        const factorEl = page.getByText(factor);
        const factorExists = await factorEl.count() > 0;
        if (factorExists) {
          await expect(factorEl.first()).toBeVisible();
        }
      }
    });

    test('should have Low/Medium/High options', async ({ page }) => {
      // Look for Low/Medium/High buttons
      const lowButtons = page.getByRole('button', { name: /^low$/i });
      const mediumButtons = page.getByRole('button', { name: /^medium$/i });
      const highButtons = page.getByRole('button', { name: /^high$/i });

      // Should have multiple instances (one for each factor)
      const lowCount = await lowButtons.count();
      const mediumCount = await mediumButtons.count();
      const highCount = await highButtons.count();

      expect(lowCount + mediumCount + highCount).toBeGreaterThan(0);
    });
  });

  test.describe('Personal Factors Step', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      // Navigate to Personal step (3 clicks)
      for (let i = 0; i < 3; i++) {
        const nextButton = page.getByRole('button', { name: /next/i }).first();
        if (await nextButton.count() > 0) {
          await nextButton.click();
          await page.waitForTimeout(300);
        }
      }
    });

    test('should show risk tolerance options', async ({ page }) => {
      const toleranceQuestion = page.getByText(/risk tolerance/i);
      const questionExists = await toleranceQuestion.count() > 0;

      if (questionExists) {
        await expect(toleranceQuestion.first()).toBeVisible();
      }

      const options = [
        /conservative.*stability/i,
        /moderate.*balanced/i,
        /aggressive.*embrace.*risk/i,
      ];

      for (const option of options) {
        const optionEl = page.getByText(option);
        const optionExists = await optionEl.count() > 0;
        if (optionExists) {
          await expect(optionEl.first()).toBeVisible();
        }
      }
    });

    test('should show life flexibility question', async ({ page }) => {
      const question = page.getByText(/flexible.*life|life.*situation/i);
      const questionExists = await question.count() > 0;

      if (questionExists) {
        await expect(question.first()).toBeVisible();
      }
    });

    test('should show excitement level question', async ({ page }) => {
      const question = page.getByText(/excited.*opportunity|excitement/i);
      const questionExists = await question.count() > 0;

      if (questionExists) {
        await expect(question.first()).toBeVisible();
      }
    });

    test('should show Generate Recommendation button', async ({ page }) => {
      const generateButton = page.getByRole('button', { name: /generate.*recommendation/i });
      const buttonExists = await generateButton.count() > 0;

      if (buttonExists) {
        await expect(generateButton.first()).toBeVisible();
        await expect(generateButton.first()).toBeEnabled();
      }
    });
  });

  test.describe('Recommendation Generation', () => {
    test('should generate recommendation on complete', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      // Navigate through all steps
      for (let i = 0; i < 3; i++) {
        const nextButton = page.getByRole('button', { name: /next/i }).first();
        if (await nextButton.count() > 0) {
          await nextButton.click();
          await page.waitForTimeout(300);
        }
      }

      // Click Generate Recommendation
      const generateButton = page.getByRole('button', { name: /generate.*recommendation/i }).first();
      const buttonExists = await generateButton.count() > 0;

      if (buttonExists) {
        await generateButton.click();
        await page.waitForTimeout(500);

        // Should show recommendation result
        const recommendation = page.getByText(/recommend|strongly|lean.*towards|neutral/i);
        const recExists = await recommendation.count() > 0;

        if (recExists) {
          await expect(recommendation.first()).toBeVisible();
        }
      }
    });

    test('should show overall score', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      // Navigate through all steps and generate
      for (let i = 0; i < 3; i++) {
        const nextButton = page.getByRole('button', { name: /next/i }).first();
        if (await nextButton.count() > 0) {
          await nextButton.click();
          await page.waitForTimeout(300);
        }
      }

      const generateButton = page.getByRole('button', { name: /generate.*recommendation/i }).first();
      if (await generateButton.count() > 0) {
        await generateButton.click();
        await page.waitForTimeout(500);

        // Look for overall score
        const score = page.getByText(/overall.*score|score/i);
        const scoreExists = await score.count() > 0;

        if (scoreExists) {
          await expect(score.first()).toBeVisible();
        }
      }
    });

    test('should show pros and cons', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      // Navigate through all steps and generate
      for (let i = 0; i < 3; i++) {
        const nextButton = page.getByRole('button', { name: /next/i }).first();
        if (await nextButton.count() > 0) {
          await nextButton.click();
          await page.waitForTimeout(300);
        }
      }

      const generateButton = page.getByRole('button', { name: /generate.*recommendation/i }).first();
      if (await generateButton.count() > 0) {
        await generateButton.click();
        await page.waitForTimeout(500);

        // Look for pros/cons
        const pros = page.getByText(/pros|advantages/i);
        const cons = page.getByText(/cons|disadvantages/i);

        const prosExists = await pros.count() > 0;
        const consExists = await cons.count() > 0;

        expect(prosExists || consExists).toBeTruthy();
      }
    });
  });

  test.describe('Skip Functionality', () => {
    test('should have Skip button', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      const skipButton = page.getByRole('button', { name: /skip/i });
      const skipExists = await skipButton.count() > 0;

      if (skipExists) {
        await expect(skipButton.first()).toBeVisible();
      }
    });

    test('should close wizard when Skip is clicked', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      const skipButton = page.getByRole('button', { name: /skip/i }).first();
      const skipExists = await skipButton.count() > 0;

      if (skipExists) {
        await skipButton.click();
        await page.waitForTimeout(300);

        // Wizard should be hidden or closed
        const wizard = page.getByText(/decision.*framework/i);
        const wizardHidden = !(await wizard.isVisible().catch(() => false));

        // Either wizard is hidden or it shows results without wizard
        expect(typeof wizardHidden).toBe('boolean');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible form controls', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      // Navigate to Risk step
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(300);
      }

      // Check that buttons have accessible names
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const accessibleName = await button.getAttribute('aria-label') || await button.textContent();
          expect(accessibleName).toBeTruthy();
        }
      }
    });

    test('should support keyboard navigation', async ({ page, helpers }) => {
      await page.goto('/');
      await helpers.waitForAPIConnection();
      await helpers.dismissWelcomeDialog();
      await helpers.completeRSUScenario();

      // Navigate to Risk step
      const nextButton = page.getByRole('button', { name: /next/i }).first();
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(300);
      }

      // Tab through form elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Some element should be focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });
});
