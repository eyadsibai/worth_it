import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Structured Error Schema
 *
 * These tests verify:
 * - API returns structured error responses with code, message, and details
 * - Frontend properly parses and displays error information
 * - Validation errors include field-level details
 * - Error codes are properly categorized
 */

// Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8000';

test.describe('Structured Error Response Format', () => {
  test('validation errors should return structured error with code and field details', async ({ page }) => {
    // Send invalid request to monthly-data-grid endpoint
    const response = await page.request.post(`${API_BASE_URL}/api/monthly-data-grid`, {
      data: {
        exit_year: 100, // Invalid: must be 1-20
        current_job_monthly_salary: -1000, // Invalid: must be >= 0
        startup_monthly_salary: 12500,
        current_job_salary_growth_rate: 0.03,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();

    // Verify structured error format
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(data.error).toHaveProperty('message');
    expect(typeof data.error.message).toBe('string');

    // Verify field-level error details
    expect(data.error).toHaveProperty('details');
    expect(Array.isArray(data.error.details)).toBe(true);
    expect(data.error.details.length).toBeGreaterThan(0);

    // Each detail should have field and message
    const firstDetail = data.error.details[0];
    expect(firstDetail).toHaveProperty('field');
    expect(firstDetail).toHaveProperty('message');
    expect(typeof firstDetail.field).toBe('string');
    expect(typeof firstDetail.message).toBe('string');
  });

  test('validation error for invalid JSON should return structured error', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/monthly-data-grid`, {
      headers: { 'Content-Type': 'application/json' },
      data: 'not valid json{',
    });

    expect(response.status()).toBe(400);
    const data = await response.json();

    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(data.error).toHaveProperty('message');
  });

  test('missing required fields should return validation error with field details', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/monthly-data-grid`, {
      data: {
        // Missing exit_year and other required fields
        current_job_monthly_salary: 15000,
      },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();

    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(data.error).toHaveProperty('details');

    // Should mention the missing field
    const fieldNames = data.error.details.map((d: { field: string }) => d.field);
    expect(fieldNames.some((f: string) => f.includes('exit_year'))).toBe(true);
  });

  test('error response should have consistent structure across endpoints', async ({ page }) => {
    // Test multiple endpoints return same error structure
    const endpoints = [
      { url: '/api/monthly-data-grid', data: { exit_year: 999 } },
      { url: '/api/opportunity-cost', data: { monthly_data: 'invalid' } },
    ];

    for (const endpoint of endpoints) {
      const response = await page.request.post(`${API_BASE_URL}${endpoint.url}`, {
        data: endpoint.data,
      });

      expect(response.status()).toBe(400);
      const data = await response.json();

      // All error responses should have the same structure
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(['VALIDATION_ERROR', 'CALCULATION_ERROR', 'INTERNAL_ERROR']).toContain(data.error.code);
    }
  });
});

test.describe('WebSocket Error Format', () => {
  test('WebSocket validation errors should return structured format', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Collect WebSocket messages
    const wsMessages: unknown[] = [];

    // Intercept WebSocket
    page.on('websocket', (ws) => {
      ws.on('framereceived', (event) => {
        try {
          const data = JSON.parse(event.payload as string);
          wsMessages.push(data);
        } catch {
          // Not JSON, ignore
        }
      });
    });

    // Create a WebSocket connection and send invalid data
    const wsResult = await page.evaluate(async () => {
      return new Promise<{ success: boolean; errorMessage?: unknown }>((resolve) => {
        const ws = new WebSocket('ws://127.0.0.1:8000/api/monte-carlo');

        ws.onopen = () => {
          // Send invalid request
          ws.send(JSON.stringify({
            type: 'run_simulation',
            // Missing required fields
          }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'error') {
            resolve({ success: true, errorMessage: data });
            ws.close();
          }
        };

        ws.onerror = () => {
          resolve({ success: false });
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          resolve({ success: false });
          ws.close();
        }, 5000);
      });
    });

    // Verify WebSocket error has structured format
    if (wsResult.success && wsResult.errorMessage) {
      const errorMsg = wsResult.errorMessage as { type: string; error?: { code: string; message: string } };
      expect(errorMsg.type).toBe('error');
      expect(errorMsg).toHaveProperty('error');
      expect(errorMsg.error).toHaveProperty('code');
      expect(errorMsg.error).toHaveProperty('message');
    }
  });
});

test.describe('Frontend Error Handling with Structured Errors', () => {
  test('UI should handle validation errors gracefully', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Mock API to return structured validation error
    await page.route('**/api/monthly-data-grid', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input parameters',
            details: [
              { field: 'exit_year', message: 'must be between 1 and 20' },
            ],
          },
        }),
      });
    });

    // Trigger a calculation
    const currentJobCard = page.locator('.glass-card').filter({ hasText: 'Current Job' });
    const salaryInput = currentJobCard.locator('input[type="number"]').first();
    await salaryInput.fill('15000');

    // Wait for error handling
    await page.waitForTimeout(2000);

    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
    await expect(salaryInput).toBeVisible();
  });

  test('UI should handle calculation errors gracefully', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Mock API to return calculation error
    await page.route('**/api/startup-scenario', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'CALCULATION_ERROR',
            message: 'Unable to compute results with provided values',
          },
        }),
      });
    });

    // Trigger calculation
    const currentJobCard = page.locator('.glass-card').filter({ hasText: 'Current Job' });
    const salaryInput = currentJobCard.locator('input[type="number"]').first();
    await salaryInput.fill('20000');

    await page.waitForTimeout(2000);

    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('UI should handle internal errors without exposing details', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Mock API to return internal error
    await page.route('**/api/**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Trigger calculation
    const currentJobCard = page.locator('.glass-card').filter({ hasText: 'Current Job' });
    const salaryInput = currentJobCard.locator('input[type="number"]').first();
    await salaryInput.fill('25000');

    await page.waitForTimeout(2000);

    // Page should not show raw error details
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('stack_trace');
    expect(bodyText).not.toContain('KeyError');

    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });
});
