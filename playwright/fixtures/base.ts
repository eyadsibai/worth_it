import { test as base } from '@playwright/test';
import { WorthItHelpers } from '../utils/helpers';

/**
 * Extended test fixtures with Worth It helpers
 *
 * Automatically handles:
 * - Dismissing the welcome dialog on first visit
 * - Waiting for API connection before tests run
 */
type WorthItFixtures = {
  helpers: WorthItHelpers;
};

export const test = base.extend<WorthItFixtures>({
  helpers: async ({ page }, use) => {
    const helpers = new WorthItHelpers(page);

    // Override page.goto to auto-dismiss welcome dialog
    const originalGoto = page.goto.bind(page);
    page.goto = async (url: string, options?: Parameters<typeof page.goto>[1]) => {
      const result = await originalGoto(url, options);
      // Dismiss welcome dialog if present
      await helpers.dismissWelcomeDialog();
      return result;
    };

    await use(helpers);
  },
});

export { expect } from '@playwright/test';
