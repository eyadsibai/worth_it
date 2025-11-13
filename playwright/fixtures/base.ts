import { test as base } from '@playwright/test';
import { WorthItHelpers } from '../utils/helpers';

/**
 * Extended test fixtures with Worth It helpers
 */
type WorthItFixtures = {
  helpers: WorthItHelpers;
};

export const test = base.extend<WorthItFixtures>({
  helpers: async ({ page }, use) => {
    const helpers = new WorthItHelpers(page);
    await use(helpers);
  },
});

export { expect } from '@playwright/test';
