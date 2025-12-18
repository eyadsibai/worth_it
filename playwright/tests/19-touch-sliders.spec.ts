import { test, expect } from '../fixtures/base';

/**
 * E2E Tests for PR #220: Touch-Friendly Slider Controls
 *
 * Test Plan:
 * - [x] Verify stepper buttons increment/decrement values
 * - [x] Test tapping value opens input field
 * - [x] Test Enter commits value, Escape cancels
 * - [x] Verify boundaries are respected
 *
 * The SliderField component provides touch-friendly controls:
 * - Decrement button (-) with aria-label "Decrease {label}"
 * - Tappable value that opens direct input
 * - Increment button (+) with aria-label "Increase {label}"
 */

test.describe('PR #220: Touch-Friendly Sliders', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await page.waitForSelector('h1');
    await helpers.dismissWelcomeDialog();
  });

  test.describe('Stepper buttons', () => {
    test('should increment value when clicking + button', async ({ page }) => {
      // Find the Exit Year slider section (first slider on the page)
      const exitYearSlider = page.locator('[role="slider"]').first();

      // Get current value
      const initialValue = await exitYearSlider.getAttribute('aria-valuenow');

      // Find and click the increment button for Exit Year
      const incrementButton = page.getByRole('button', { name: /increase exit year/i });
      await incrementButton.click();

      // Verify value increased
      const newValue = await exitYearSlider.getAttribute('aria-valuenow');
      expect(Number(newValue)).toBeGreaterThan(Number(initialValue));
    });

    test('should decrement value when clicking - button', async ({ page }) => {
      // Find the Exit Year slider section - first increase so we can decrease
      const exitYearSlider = page.locator('[role="slider"]').first();

      // First increment a few times to have room to decrement
      const incrementButton = page.getByRole('button', { name: /increase exit year/i });
      await incrementButton.click();
      await incrementButton.click();

      // Get current value after incrementing
      const valueBefore = await exitYearSlider.getAttribute('aria-valuenow');

      // Now click decrement
      const decrementButton = page.getByRole('button', { name: /decrease exit year/i });
      await decrementButton.click();

      // Verify value decreased
      const valueAfter = await exitYearSlider.getAttribute('aria-valuenow');
      expect(Number(valueAfter)).toBeLessThan(Number(valueBefore));
    });

    test('should disable decrement button at minimum value', async ({ page }) => {
      // Find the Exit Year slider and go to minimum
      const exitYearSlider = page.locator('[role="slider"]').first();
      await exitYearSlider.press('Home'); // Go to minimum

      // The decrement button should be disabled
      const decrementButton = page.getByRole('button', { name: /decrease exit year/i });
      await expect(decrementButton).toBeDisabled();
    });

    test('should disable increment button at maximum value', async ({ page }) => {
      // Find the Exit Year slider and go to maximum
      const exitYearSlider = page.locator('[role="slider"]').first();
      await exitYearSlider.press('End'); // Go to maximum

      // The increment button should be disabled
      const incrementButton = page.getByRole('button', { name: /increase exit year/i });
      await expect(incrementButton).toBeDisabled();
    });
  });

  test.describe('Direct value editing', () => {
    test('should open input field when clicking on value', async ({ page }) => {
      // Find the "Edit Exit Year value" button (the tappable value display)
      const editButton = page.getByRole('button', { name: /edit exit year value/i });
      await editButton.click();

      // After clicking, an input should appear
      const input = page.locator('input[type="number"][aria-label*="Exit Year"]');
      await expect(input).toBeVisible();
    });

    test('should commit value on Enter key', async ({ page }) => {
      // Click on value to enter edit mode
      const editButton = page.getByRole('button', { name: /edit exit year value/i });
      await editButton.click();

      // Type a new value
      const input = page.locator('input[type="number"][aria-label*="Exit Year"]');
      await input.fill('7');
      await input.press('Enter');

      // Verify input is no longer visible (edit mode closed)
      await expect(input).not.toBeVisible();

      // Verify the slider value was updated
      const slider = page.locator('[role="slider"]').first();
      const value = await slider.getAttribute('aria-valuenow');
      expect(value).toBe('7');
    });

    test('should cancel edit on Escape key', async ({ page }) => {
      // Get initial value
      const slider = page.locator('[role="slider"]').first();
      const initialValue = await slider.getAttribute('aria-valuenow');

      // Click on value to enter edit mode
      const editButton = page.getByRole('button', { name: /edit exit year value/i });
      await editButton.click();

      // Type a different value
      const input = page.locator('input[type="number"][aria-label*="Exit Year"]');
      await input.fill('10');

      // Press Escape to cancel
      await input.press('Escape');

      // Verify input is no longer visible (edit mode closed)
      await expect(input).not.toBeVisible();

      // Verify the slider value was NOT changed
      const finalValue = await slider.getAttribute('aria-valuenow');
      expect(finalValue).toBe(initialValue);
    });

    test('should clamp value to boundaries when committing', async ({ page }) => {
      // Click on value to enter edit mode
      const editButton = page.getByRole('button', { name: /edit exit year value/i });
      await editButton.click();

      // Try to enter a value above maximum (Exit Year max is typically 10)
      const input = page.locator('input[type="number"][aria-label*="Exit Year"]');
      await input.fill('99');
      await input.press('Enter');

      // Verify the value was clamped to max
      const slider = page.locator('[role="slider"]').first();
      const value = await slider.getAttribute('aria-valuenow');
      const maxValue = await slider.getAttribute('aria-valuemax');
      expect(Number(value)).toBeLessThanOrEqual(Number(maxValue));
    });
  });

  test.describe('Boundary enforcement', () => {
    test('should respect min boundary on stepper buttons', async ({ page }) => {
      // Go to minimum using keyboard
      const slider = page.locator('[role="slider"]').first();
      await slider.press('Home');

      const minValue = await slider.getAttribute('aria-valuemin');
      const currentValue = await slider.getAttribute('aria-valuenow');

      // Value should be at or above minimum
      expect(Number(currentValue)).toBeGreaterThanOrEqual(Number(minValue));

      // Decrement button should be disabled at min
      const decrementButton = page.getByRole('button', { name: /decrease exit year/i });
      await expect(decrementButton).toBeDisabled();
    });

    test('should respect max boundary on stepper buttons', async ({ page }) => {
      // Go to maximum using keyboard
      const slider = page.locator('[role="slider"]').first();
      await slider.press('End');

      const maxValue = await slider.getAttribute('aria-valuemax');
      const currentValue = await slider.getAttribute('aria-valuenow');

      // Value should be at or below maximum
      expect(Number(currentValue)).toBeLessThanOrEqual(Number(maxValue));

      // Increment button should be disabled at max
      const incrementButton = page.getByRole('button', { name: /increase exit year/i });
      await expect(incrementButton).toBeDisabled();
    });
  });

  test.describe('Accessibility', () => {
    test('stepper buttons should have proper aria-labels', async ({ page }) => {
      // Find stepper buttons with proper labels
      const decrementButton = page.getByRole('button', { name: /decrease exit year/i });
      const incrementButton = page.getByRole('button', { name: /increase exit year/i });
      const editButton = page.getByRole('button', { name: /edit exit year value/i });

      await expect(decrementButton).toBeVisible();
      await expect(incrementButton).toBeVisible();
      await expect(editButton).toBeVisible();
    });

    test('input field should be focusable via keyboard', async ({ page }) => {
      // Click on value to enter edit mode
      const editButton = page.getByRole('button', { name: /edit exit year value/i });
      await editButton.click();

      // Input should automatically be focused
      const input = page.locator('input[type="number"][aria-label*="Exit Year"]');
      await expect(input).toBeFocused();
    });
  });
});
