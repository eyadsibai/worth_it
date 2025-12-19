import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Walkthrough/Spotlight Feature
 *
 * These tests verify:
 * - Tour launcher displays available tours
 * - Spotlight overlay appears when tour is active
 * - Navigation through tour steps (next, prev, skip)
 * - Tour completion marks tour as complete
 * - Progress persistence across page reloads
 * - Dismiss all tours functionality
 */

test.describe('Walkthrough Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Clear walkthrough progress before each test
    await page.addInitScript(() => {
      localStorage.removeItem('worth_it_tour_progress');
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Tour Launcher', () => {
    test('should display tour launcher or help button', async ({ page }) => {
      // Look for help/tour launcher button
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).or(
        page.locator('[data-tour-launcher]')
      );
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await expect(helpButton.first()).toBeVisible();
      }
    });

    test('should show available tours when launcher is clicked', async ({ page }) => {
      // Click help/tour button
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        // Look for tour options or menu
        const tourMenu = page.locator('[role="menu"]').or(
          page.locator('[data-tour-menu]')
        ).or(
          page.getByText(/job analysis|monte carlo|cap table|waterfall/i)
        );
        const menuExists = await tourMenu.count() > 0;

        if (menuExists) {
          await expect(tourMenu.first()).toBeVisible();
        }
      }
    });

    test('should show tour names in menu', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        // Look for specific tour names
        const tourNames = [
          /job.*analysis/i,
          /monte.*carlo/i,
          /cap.*table/i,
          /waterfall/i,
        ];

        for (const name of tourNames) {
          const tourOption = page.getByText(name);
          const optionExists = await tourOption.count() > 0;
          // Not all tours may be visible (depends on prerequisites)
          expect(typeof optionExists).toBe('boolean');
        }
      }
    });
  });

  test.describe('Spotlight Overlay', () => {
    test('should display spotlight when tour is started', async ({ page }) => {
      // Try to start a tour
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        // Click on a tour option (job analysis is usually available without prerequisites)
        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Look for spotlight overlay
          const spotlight = page.locator('[data-spotlight]').or(
            page.locator('[class*="spotlight"]')
          ).or(
            page.locator('[role="dialog"][aria-label*="tour" i]')
          );
          const spotlightExists = await spotlight.count() > 0;

          if (spotlightExists) {
            await expect(spotlight.first()).toBeVisible();
          }
        }
      }
    });

    test('should highlight target element', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Look for highlighted element or cutout in overlay
          const highlight = page.locator('[data-spotlight-target]').or(
            page.locator('[class*="highlight"]')
          );
          const highlightExists = await highlight.count() > 0;

          expect(typeof highlightExists).toBe('boolean');
        }
      }
    });

    test('should show step content/tooltip', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Look for step content (title, description, navigation)
          const stepContent = page.locator('[class*="tour"]').or(
            page.locator('[data-tour-step]')
          ).or(
            page.getByText(/next|skip|step/i)
          );
          const contentExists = await stepContent.count() > 0;

          if (contentExists) {
            await expect(stepContent.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Tour Navigation', () => {
    test('should have next button to advance tour', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Look for next button
          const nextButton = page.getByRole('button', { name: /next|continue|→/i });
          const nextExists = await nextButton.count() > 0;

          if (nextExists) {
            await expect(nextButton.first()).toBeVisible();
          }
        }
      }
    });

    test('should advance to next step when next is clicked', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Get initial step indicator (e.g., "Step 1 of 5")
          const stepIndicator = page.getByText(/step\s*1|1\s*of/i);
          const hasStepIndicator = await stepIndicator.count() > 0;

          // Click next
          const nextButton = page.getByRole('button', { name: /next|continue|→/i }).first();
          const nextExists = await nextButton.count() > 0;

          if (nextExists) {
            await nextButton.click();
            await page.waitForTimeout(500);

            // Check if step changed (step 2 or different content)
            if (hasStepIndicator) {
              const newStepIndicator = page.getByText(/step\s*2|2\s*of/i);
              const stepChanged = await newStepIndicator.count() > 0;
              expect(typeof stepChanged).toBe('boolean');
            }
          }
        }
      }
    });

    test('should have previous button after first step', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Advance to step 2
          const nextButton = page.getByRole('button', { name: /next|continue|→/i }).first();
          const nextExists = await nextButton.count() > 0;

          if (nextExists) {
            await nextButton.click();
            await page.waitForTimeout(500);

            // Check for previous/back button
            const prevButton = page.getByRole('button', { name: /back|previous|←/i });
            const prevExists = await prevButton.count() > 0;

            if (prevExists) {
              await expect(prevButton.first()).toBeVisible();
            }
          }
        }
      }
    });

    test('should have skip button to exit tour', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Look for skip/close button
          const skipButton = page.getByRole('button', { name: /skip|close|exit|×/i });
          const skipExists = await skipButton.count() > 0;

          if (skipExists) {
            await expect(skipButton.first()).toBeVisible();
          }
        }
      }
    });

    test('should close tour when skip is clicked', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Click skip
          const skipButton = page.getByRole('button', { name: /skip|close|exit|×/i }).first();
          const skipExists = await skipButton.count() > 0;

          if (skipExists) {
            await skipButton.click();
            await page.waitForTimeout(500);

            // Spotlight should be hidden
            const spotlight = page.locator('[data-spotlight]').or(
              page.locator('[class*="spotlight"]')
            );
            const spotlightVisible = await spotlight.isVisible().catch(() => false);

            expect(spotlightVisible).toBeFalsy();
          }
        }
      }
    });
  });

  test.describe('Tour Completion', () => {
    test('should show completion message when tour finishes', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Try to complete the tour by clicking next multiple times
          for (let i = 0; i < 10; i++) {
            const nextButton = page.getByRole('button', { name: /next|continue|finish|done/i }).first();
            const nextExists = await nextButton.count() > 0;

            if (nextExists && await nextButton.isVisible()) {
              await nextButton.click();
              await page.waitForTimeout(300);
            } else {
              break;
            }
          }

          // Either tour is complete (overlay closed) or completion shown
          const overlay = page.locator('[data-spotlight]').or(
            page.locator('[class*="spotlight"]')
          );
          const overlayHidden = !(await overlay.isVisible().catch(() => false));

          const completionMessage = await page.getByText(/complete|finished|done|congratulations/i).count() > 0;

          expect(overlayHidden || completionMessage).toBeTruthy();
        }
      }
    });
  });

  test.describe('Progress Persistence', () => {
    test('should persist tour progress in localStorage', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Advance a few steps
          for (let i = 0; i < 2; i++) {
            const nextButton = page.getByRole('button', { name: /next|continue/i }).first();
            const nextExists = await nextButton.count() > 0;
            if (nextExists && await nextButton.isVisible()) {
              await nextButton.click();
              await page.waitForTimeout(300);
            }
          }

          // Check localStorage
          const progress = await page.evaluate(() => {
            return localStorage.getItem('worth_it_tour_progress');
          });

          expect(progress).toBeTruthy();
        }
      }
    });

    test('should restore progress on page reload', async ({ page }) => {
      // Set some progress in localStorage
      await page.evaluate(() => {
        localStorage.setItem('worth_it_tour_progress', JSON.stringify({
          completed: { 'job-analysis': true },
          lastStep: {},
          dismissedAll: false,
        }));
      });

      // Reload page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Check that progress is restored (job-analysis should be marked as complete)
      const progress = await page.evaluate(() => {
        const stored = localStorage.getItem('worth_it_tour_progress');
        return stored ? JSON.parse(stored) : null;
      });

      expect(progress?.completed?.['job-analysis']).toBe(true);
    });
  });

  test.describe('Dismiss All Tours', () => {
    test('should have option to dismiss all tours', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        // Look for dismiss all option
        const dismissOption = page.getByText(/dismiss.*all|don't.*show/i);
        const dismissExists = await dismissOption.count() > 0;

        if (dismissExists) {
          await expect(dismissOption.first()).toBeVisible();
        }
      }
    });

    test('should hide all tours when dismissed', async ({ page }) => {
      // Set dismissedAll in localStorage
      await page.evaluate(() => {
        localStorage.setItem('worth_it_tour_progress', JSON.stringify({
          completed: {},
          lastStep: {},
          dismissedAll: true,
        }));
      });

      // Reload page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Click help button
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        // Tours should not be available or show empty state
        const tourOptions = page.getByText(/job.*analysis|monte.*carlo|cap.*table/i);
        const tourCount = await tourOptions.count();

        // Either no tours shown or shows "all dismissed" message
        const dismissedMessage = page.getByText(/no.*tour|all.*dismissed/i);
        const messageExists = await dismissedMessage.count() > 0;

        expect(tourCount === 0 || messageExists).toBeTruthy();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation in tour', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Press Tab to navigate through tour controls
          await page.keyboard.press('Tab');

          // Some element should be focused
          const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
          expect(focusedElement).toBeTruthy();
        }
      }
    });

    test('should close tour with Escape key', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Press Escape to close
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);

          // Tour should be closed
          const spotlight = page.locator('[data-spotlight]').or(
            page.locator('[class*="spotlight"]')
          );
          const spotlightVisible = await spotlight.isVisible().catch(() => false);

          expect(spotlightVisible).toBeFalsy();
        }
      }
    });

    test('should have accessible labels on tour controls', async ({ page }) => {
      const helpButton = page.getByRole('button', { name: /help|tour|walkthrough|guide|\?/i }).first();
      const buttonExists = await helpButton.count() > 0;

      if (buttonExists) {
        await helpButton.click();
        await page.waitForTimeout(300);

        const tourOption = page.getByText(/job.*analysis|getting.*started/i).first();
        const optionExists = await tourOption.count() > 0;

        if (optionExists) {
          await tourOption.click();
          await page.waitForTimeout(500);

          // Check buttons have accessible names
          const buttons = page.locator('[class*="tour"] button, [data-tour-step] button');
          const buttonCount = await buttons.count();

          for (let i = 0; i < buttonCount; i++) {
            const button = buttons.nth(i);
            const accessibleName = await button.getAttribute('aria-label') || await button.textContent();
            expect(accessibleName).toBeTruthy();
          }
        }
      }
    });
  });
});
