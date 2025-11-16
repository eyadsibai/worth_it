import { test, expect } from '@playwright/test';

test.describe('Basic UI Tests', () => {
  test('should load the application', async ({ page }) => {
    // Navigate to the app
    const response = await page.goto('/');
    
    // Check that page loads successfully
    expect(response?.status()).toBeLessThan(400);
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Check that main content is visible
    const mainContent = page.locator('main, #root, #__next, .container').first();
    await expect(mainContent).toBeVisible();
  });

  test('should have a title', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should render form elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for input elements
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();
    
    // Should have at least some form inputs
    expect(inputCount).toBeGreaterThan(0);
  });

  test('should have interactive buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for buttons
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    
    // Should have at least one button
    expect(buttonCount).toBeGreaterThan(0);
    
    // Check first button is enabled
    const firstButton = buttons.first();
    const isEnabled = await firstButton.isEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('/');
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    const desktopContent = page.locator('main, #root, #__next').first();
    await expect(desktopContent).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(desktopContent).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(desktopContent).toBeVisible();
  });

  test('should handle user input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find first text input
    const textInput = page.locator('input[type="text"], input[type="number"]').first();
    
    if (await textInput.isVisible()) {
      // Type into input
      await textInput.fill('test value');
      
      // Check value was entered
      const value = await textInput.inputValue();
      expect(value).toBeTruthy();
    }
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should not have any console errors
    expect(errors).toHaveLength(0);
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    
    // Check for description meta tag (optional but good practice)
    const description = await page.locator('meta[name="description"]').count();
    expect(description).toBeGreaterThanOrEqual(0);
  });

  test('should navigate without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that navigation doesn't cause errors
    const links = page.locator('a[href^="/"]');
    const linkCount = await links.count();
    
    if (linkCount > 0) {
      // Click first internal link
      const firstLink = links.first();
      const href = await firstLink.getAttribute('href');
      
      if (href && href !== '/' && href !== '#') {
        await firstLink.click();
        await page.waitForLoadState('networkidle');
        
        // Should navigate successfully
        const url = page.url();
        expect(url).toContain(href);
      }
    }
  });

  test('should display text content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for any text content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(10);
    
    // Check for headings
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });
});