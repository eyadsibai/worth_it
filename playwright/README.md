# Playwright E2E Tests for Worth It

This directory contains end-to-end (E2E) tests for the Worth It job offer financial analyzer application using [Playwright](https://playwright.dev/).

## Overview

The test suite validates the complete user journey through the application, from form input to calculation results and Monte Carlo simulations. Tests cover both RSU and Stock Options equity types.

## Directory Structure

```
playwright/
├── fixtures/
│   └── base.ts              # Custom test fixtures with helpers
├── tests/
│   ├── 01-api-health.spec.ts              # API health checks
│   ├── 02-form-interactions.spec.ts       # Form input tests
│   ├── 03-rsu-form.spec.ts                # RSU-specific form tests
│   ├── 04-stock-options-form.spec.ts      # Stock Options form tests
│   ├── 05-rsu-scenario-flow.spec.ts       # Complete RSU flow
│   ├── 06-stock-options-scenario-flow.spec.ts  # Complete Stock Options flow
│   ├── 07-monte-carlo.spec.ts             # Monte Carlo simulations
│   └── 08-ui-features.spec.ts             # UI/UX and accessibility
├── utils/
│   ├── helpers.ts           # Helper functions for common actions
│   └── test-data.ts         # Test data constants and selectors
└── screenshots/             # Screenshots captured during tests
```

## Prerequisites

1. **Node.js**: Version 18 or higher
2. **Backend**: Python backend must be runnable on port 8000
3. **Frontend**: Next.js frontend must be runnable on port 3000

## Installation

From the **root** of the repository:

```bash
# Install Playwright and dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode (Recommended for Development)

```bash
npm run test:e2e:ui
```

This opens the Playwright UI where you can:
- See all tests
- Run individual tests
- Watch tests in real-time
- Time-travel through test execution
- Inspect the DOM at each step

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Debug Tests

```bash
npm run test:e2e:debug
```

This opens the Playwright Inspector for step-by-step debugging.

### View Test Report

After running tests, view the HTML report:

```bash
npm run test:e2e:report
```

### Run Specific Test File

```bash
npx playwright test playwright/tests/01-api-health.spec.ts
```

### Run Tests by Name Pattern

```bash
npx playwright test -g "RSU"
```

## Test Coverage

### 1. API Health Tests (`01-api-health.spec.ts`)
- ✅ Page loads successfully
- ✅ API connection status
- ✅ API version display
- ✅ Health endpoint returns 200

### 2. Form Interaction Tests (`02-form-interactions.spec.ts`)
- ✅ Global settings form (exit year)
- ✅ Current job form (salary, growth rate, ROI, investment frequency)
- ✅ Numeric input validation
- ✅ Decimal value support for percentages

### 3. RSU Form Tests (`03-rsu-form.spec.ts`)
- ✅ RSU equity type selection
- ✅ RSU-specific fields visibility
- ✅ Equity grant percentage input
- ✅ Exit valuation input
- ✅ Dilution simulation toggle
- ✅ Dilution rounds configuration
- ✅ Vesting and cliff period settings

### 4. Stock Options Form Tests (`04-stock-options-form.spec.ts`)
- ✅ Stock Options equity type selection
- ✅ Stock Options-specific fields visibility
- ✅ Number of options input
- ✅ Strike and exit price inputs
- ✅ Exercise strategy selection
- ✅ Switching between RSU and Stock Options

### 5. RSU Scenario Flow Tests (`05-rsu-scenario-flow.spec.ts`)
- ✅ Complete RSU scenario execution
- ✅ Final payout display
- ✅ Opportunity cost calculation
- ✅ Startup payout with equity value
- ✅ Calculation progress indicators
- ✅ Results update on form changes
- ✅ Screenshot capture

### 6. Stock Options Scenario Flow Tests (`06-stock-options-scenario-flow.spec.ts`)
- ✅ Complete Stock Options scenario execution
- ✅ Options profit calculation
- ✅ Exercise cost impact
- ✅ Early exercise strategy handling
- ✅ Comparison between RSU and Stock Options
- ✅ Screenshot capture

### 7. Monte Carlo Tests (`07-monte-carlo.spec.ts`)
- ✅ Monte Carlo form accessibility
- ✅ Parameter configuration (simulations, valuations)
- ✅ Simulation execution
- ✅ Visualization rendering
- ✅ Distribution type selection
- ✅ Both RSU and Stock Options support

### 8. UI/UX Features Tests (`08-ui-features.spec.ts`)
- ✅ Theme toggle functionality
- ✅ Dark/light mode switching
- ✅ Application title and description
- ✅ Sidebar layout
- ✅ Error handling for empty forms
- ✅ Ready state display
- ✅ Input validation
- ✅ Rapid form change handling
- ✅ Heading hierarchy
- ✅ Form labels
- ✅ Keyboard accessibility

## Test Data

Default test data is defined in `utils/test-data.ts`:

- **Exit Year**: 5 years
- **Current Job Salary**: $15,000/month ($180K/year)
- **Startup Salary**: $12,500/month ($150K/year)
- **Annual Growth Rate**: 3%
- **Annual ROI**: 7%
- **RSU Equity**: 0.5% with $100M exit
- **Stock Options**: 50,000 options at $1 strike, $10 exit price
- **Vesting**: 4 years with 1-year cliff

## Helper Functions

The `WorthItHelpers` class in `utils/helpers.ts` provides reusable functions:

- `waitForAPIConnection()` - Wait for backend API
- `fillGlobalSettings(exitYear)` - Fill global settings form
- `fillCurrentJobForm(params)` - Fill current job form
- `fillRSUForm(params)` - Fill RSU form
- `fillStockOptionsForm(params)` - Fill Stock Options form
- `completeRSUScenario()` - Complete full RSU flow
- `completeStockOptionsScenario()` - Complete full Stock Options flow
- `waitForScenarioResults()` - Wait for calculations
- `toggleTheme()` - Toggle dark/light mode
- `verifyAPIHealth()` - Check API health

## CI/CD Integration

The tests are designed to run in CI/CD pipelines. The `playwright.config.ts` includes:

- Automatic server startup (backend and frontend)
- Retry logic for flaky tests
- Screenshot and video capture on failure
- JSON and HTML report generation

### GitHub Actions

Tests can be integrated into GitHub Actions:

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run Playwright tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Debugging Tips

### 1. Use UI Mode for Development
```bash
npm run test:e2e:ui
```
Best for writing and debugging tests interactively.

### 2. Use Debug Mode for Failing Tests
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector for step-by-step execution.

### 3. Take Screenshots
```typescript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### 4. Use Trace Viewer
```bash
npx playwright show-trace trace.zip
```

### 5. Slow Down Execution
```typescript
await page.waitForTimeout(1000); // Add delays to observe
```

### 6. Console Logs
```typescript
page.on('console', msg => console.log(msg.text()));
```

## Configuration

Tests are configured in `playwright.config.ts` at the repository root:

- **Base URL**: http://localhost:3000
- **Test Timeout**: Default 30 seconds
- **Retries**: 2 on CI, 0 locally
- **Workers**: 1 on CI, undefined locally (parallel)
- **Browser**: Chromium (can be extended to Firefox, WebKit)
- **Screenshots**: On failure
- **Video**: On failure
- **Trace**: On first retry

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/base';

test.describe('My Feature', () => {
  test('should do something', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    
    // Your test logic here
    await expect(page.getByText('Something')).toBeVisible();
  });
});
```

### Using Helpers

```typescript
test('complete scenario', async ({ page, helpers }) => {
  await page.goto('/');
  await helpers.completeRSUScenario();
  
  // Verify results
  await expect(page.locator('[data-testid="results"]')).toBeVisible();
});
```

### Custom Assertions

```typescript
await expect(page.locator('input[name="salary"]')).toHaveValue('15000');
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
```

## Best Practices

1. **Use Page Object Model**: Leverage helpers for common actions
2. **Descriptive Test Names**: Clearly state what is being tested
3. **Independent Tests**: Each test should be able to run standalone
4. **Wait for Elements**: Always wait for elements before interacting
5. **Take Screenshots**: Capture important states for debugging
6. **Test Real User Flows**: Focus on end-to-end scenarios
7. **Clean Test Data**: Use constants from `test-data.ts`
8. **Handle Async**: Always await async operations

## Troubleshooting

### Backend/Frontend Not Starting
- Ensure dependencies are installed
- Check that ports 8000 and 3000 are available
- Verify backend can start: `cd backend && uvicorn worth_it.api:app`
- Verify frontend can start: `cd frontend && npm run dev`

### Tests Timing Out
- Increase timeout in test or config
- Check network requests in browser DevTools
- Ensure API is responding

### Element Not Found
- Use Playwright Inspector to verify selectors
- Check if element is in shadow DOM
- Verify element is visible (not hidden by CSS)

### Flaky Tests
- Add proper waits (`waitForSelector`, `waitForTimeout`)
- Use retry logic
- Avoid hardcoded sleeps (use waitFor conditions instead)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Test Assertions](https://playwright.dev/docs/test-assertions)

## Contributing

When adding new tests:

1. Follow existing naming conventions (`XX-feature-name.spec.ts`)
2. Add test data constants to `utils/test-data.ts`
3. Create reusable helpers in `utils/helpers.ts`
4. Update this README with new test coverage
5. Ensure tests pass in CI before merging

## License

Same as the main Worth It project (MIT).
