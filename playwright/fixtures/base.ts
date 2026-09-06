import { test as base } from '@playwright/test';
import { WorthItHelpers } from '../utils/helpers';

/**
 * Extended test fixtures with Worth It helpers.
 */
type WorthItFixtures = {
  helpers: WorthItHelpers;
};

export const test = base.extend<WorthItFixtures>({
  helpers: async ({ page }, use) => {
    await use(new WorthItHelpers(page));
  },
});

export { expect } from '@playwright/test';
