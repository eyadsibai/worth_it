# CLAUDE.md

Development guide for Claude Code when working on the Worth It monorepo.

## Monorepo Structure

```
worth_it/
├── backend/          # FastAPI Python backend
├── frontend/         # Next.js TypeScript frontend
├── playwright/       # E2E tests (Playwright)
├── scripts/          # Utility scripts (run-e2e-tests.sh)
└── docs/             # Additional documentation
```

## Quick Start

**Backend:**
```bash
cd backend
uv sync
uv run uvicorn worth_it.api:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Backend Development

### Dependencies
Install with uv:
```bash
cd backend
uv sync
```

**Backend Dependency Management:**
- **Main dependencies**: Defined in `[project.dependencies]` in `pyproject.toml`
- **Dev dependencies**: Defined in `[dependency-groups].dev` (uv-specific pattern, preferred over `[project.optional-dependencies]`)
- **Install with dev dependencies**: `uv sync --group dev`

The `[dependency-groups]` pattern is a uv-specific feature that provides a cleaner way to manage development dependencies compared to the traditional `[project.optional-dependencies]` approach.

### Testing & Quality
**IMPORTANT**: Always run tests and linting before committing.

**Test-Driven Development (TDD)**: Use TDD for all new features:
1. **Red**: Write a failing test first that describes the expected behavior
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up the code while keeping tests green

```bash
# Lint and auto-fix
uv run ruff check --fix --unsafe-fixes src/ tests/

# Run all tests
uv run pytest -v

# Type check
uv run pyright src/

# Coverage
uv run pytest --cov=src --cov-report=html
```

### Running the API
```bash
# Development
uv run uvicorn worth_it.api:app --reload --port 8000

# Production
uv run uvicorn worth_it.api:app --host 0.0.0.0 --port 8000 --workers 4
```

Visit http://localhost:8000/docs for API documentation.

### Project Structure
```
backend/
├── src/worth_it/
│   ├── calculations/           # Core financial calculations (framework-agnostic)
│   │   ├── __init__.py        # Re-exports for backward compatibility
│   │   ├── base.py            # EquityType enum, annual_to_monthly_roi
│   │   ├── opportunity_cost.py # create_monthly_data_grid, calculate_annual_opportunity_cost
│   │   ├── startup_scenario.py # calculate_startup_scenario
│   │   ├── financial_metrics.py # calculate_irr, calculate_npv, calculate_dilution_from_valuation
│   │   ├── cap_table.py       # calculate_interest, calculate_conversion_price, convert_instruments
│   │   └── waterfall.py       # calculate_waterfall
│   ├── services/              # Business logic orchestration layer
│   │   ├── __init__.py        # Re-exports StartupService, CapTableService, ResponseMapper
│   │   ├── startup_service.py # StartupService: scenario calculations, IRR, NPV
│   │   ├── cap_table_service.py # CapTableService: conversions, waterfall, dilution
│   │   └── serializers.py     # ResponseMapper, column mapping, type conversion
│   ├── api.py                 # FastAPI endpoints + WebSocket (thin handlers)
│   ├── monte_carlo.py         # Monte Carlo simulation & sensitivity analysis
│   ├── models.py              # Pydantic validation models
│   ├── config.py              # Configuration management
│   ├── types.py               # TypedDict definitions for type safety
│   └── exceptions.py          # Custom exception hierarchy (WorthItError, CalculationError)
└── tests/
    ├── test_calculations.py   # Unit tests for core calculations
    ├── test_api.py            # API endpoint and WebSocket tests
    └── test_integration.py    # End-to-end workflow tests
```

**Total: 96 backend tests** (run `uv run pytest --collect-only -q` to verify)

## Frontend Development

### Dependencies
Install with npm:
```bash
cd frontend
npm install
```

### Testing & Quality
```bash
# TypeScript type checking (REQUIRED before committing)
npm run type-check

# ESLint (REQUIRED before committing)
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Run unit tests
npm run test:unit

# Run unit tests with coverage
npm run test:unit:coverage

# Run unit tests in watch mode (during development)
npm run test:unit:watch
```

**Total: 262 frontend unit tests** covering:
- Zod schemas (64 tests)
- export-utils (20 tests)
- useDeepCompare hook (20 tests)
- API client & WebSocket hooks (17 tests)
- Zustand store (15 tests)
- utils/cn function (13 tests)
- useDebounce hook (12 tests)
- Form field helpers (10 tests)
- InformationBox component (5 tests)
- And more...

### Running the Frontend
```bash
# Development server (with Turbopack)
npm run dev

# Production build
npm run build
npm run start
```

Visit http://localhost:3000 once running.

### Project Structure
```
frontend/
├── __tests__/                # Unit tests (Vitest + React Testing Library)
│   ├── lib/                 # Tests for lib/ modules
│   │   ├── api-client.test.ts
│   │   ├── export-utils.test.ts
│   │   ├── hooks/use-debounce.test.ts
│   │   ├── schemas.test.ts
│   │   ├── use-deep-compare.test.ts
│   │   └── utils.test.ts
│   └── setup.ts             # Test setup (jsdom, mocks)
├── app/                      # Next.js App Router pages
├── components/
│   ├── charts/              # Recharts visualizations
│   │   └── monte-carlo/     # Monte Carlo specific charts (histogram, ECDF, etc.)
│   ├── forms/               # React Hook Form components
│   ├── layout/              # Layout components (Header, Sidebar)
│   ├── results/             # Results dashboard
│   └── ui/                  # shadcn/ui base components
├── lib/
│   ├── api-client.ts        # Type-safe API client with TanStack Query
│   ├── schemas.ts           # Zod validation schemas (match backend Pydantic)
│   ├── store.ts             # Zustand store for global state management
│   ├── export-utils.ts      # CSV/PDF export utilities with shared helpers
│   ├── hooks/               # Custom React hooks (use-debounce, etc.)
│   └── providers.tsx        # TanStack Query, Theme providers
└── vitest.config.ts          # Vitest configuration with coverage thresholds
```

## Architecture

### 3-Tier Design

**Layer 1: Frontend (Next.js)**
- User interface with shadcn/ui components
- Real-time form validation with Zod
- TanStack Query for API state management
- WebSocket connection for Monte Carlo progress

**Layer 2: Backend API (FastAPI)**
- 9 REST endpoints for calculations
- 1 WebSocket endpoint for Monte Carlo simulations
- Pydantic models for request/response validation
- CORS configured for frontend
- Thin endpoint handlers that delegate to services

**Layer 2.5: Service Layer**
- `StartupService`: Orchestrates startup scenario calculations, IRR, NPV
- `CapTableService`: Handles cap table conversions, waterfall analysis, dilution
- `ResponseMapper`: Transforms internal data structures to API response formats
- Encapsulates business logic separate from HTTP concerns
- Handles EquityType enum conversion and column name mapping

**Layer 3: Core Logic (Pure Python)**
- Framework-agnostic financial calculations
- Modular package in `calculations/` with domain-specific modules
- Can be used standalone without web frameworks
- Covered by comprehensive test suite (96 tests)

### Data Flow

```
User Input → React Forms (Zod validation)
    ↓
TanStack Query → HTTP Request
    ↓
FastAPI Endpoint → Pydantic validation
    ↓
Service Layer → Business logic orchestration
    ↓
Core Calculations → Pure Python functions
    ↓
ResponseMapper → Column mapping & serialization
    ↓
JSON Response ← Pydantic serialization
    ↓
React State Update ← TanStack Query cache
    ↓
Recharts Visualization
```

### State Management with Zustand

The app uses **Zustand** for global client state (form data, UI mode) and **TanStack Query** for server state (API responses).

**Store location**: `frontend/lib/store.ts`

```typescript
// Access store state and actions
const { appMode, setAppMode, globalSettings, setGlobalSettings } = useAppStore();

// Or use selector hooks for better performance
const appMode = useAppMode();
const capTable = useCapTable();
```

**State categories**:
- **App Mode**: `employee` | `founder` - toggles between two app modes
- **Employee Mode State**: Form data (`globalSettings`, `currentJob`, `equityDetails`)
- **Founder Mode State**: Cap table data (persisted to localStorage)
- **Results State**: Monte Carlo results, comparison scenarios

### Form Field Helpers

Reusable form field components reduce boilerplate in React Hook Form forms.

**Location**: `frontend/components/forms/form-fields.tsx`

```typescript
// Available helpers
import { NumberInputField, SliderField, SelectField, TextInputField, CheckboxField } from "@/components/forms/form-fields";

// Usage in a form
<TextInputField form={form} name="investor_name" label="Investor Name" />
<NumberInputField form={form} name="amount" label="Amount" prefix="$" />
<SelectField form={form} name="status" label="Status" options={statusOptions} />
<CheckboxField form={form} name="pro_rata" label="Pro-rata Rights" />
<SliderField form={form} name="discount" label="Discount %" min={0} max={50} />
```

### InformationBox Component

Styled container for form sections and previews.

**Location**: `frontend/components/ui/information-box.tsx`

```typescript
import { InformationBox } from "@/components/ui/information-box";

<InformationBox title="Preview" variant="muted">
  <p>Content here</p>
</InformationBox>
```

### Export Utilities

**Location**: `frontend/lib/export-utils.ts`

**Shared helpers**:
- `calculateTotalRaised(instruments)` - Sum funding from all instrument types
- `PDF_CONFIG` - Constants for PDF generation (colors, page breaks)
- `escapeCSV(value)` - RFC 4180 compliant CSV escaping

## Common Tasks

### Adding a New API Endpoint

1. **Define Pydantic models** in `backend/src/worth_it/models.py`
2. **Implement calculation** in `backend/src/worth_it/calculations/` (choose appropriate domain module)
3. **Create endpoint** in `backend/src/worth_it/api.py`
4. **Add tests** in `backend/tests/test_api.py`
5. **Update Zod schema** in `frontend/lib/schemas.ts`
6. **Add API client method** in `frontend/lib/api-client.ts`

### Adding a New Form Component

1. **Create Zod schema** in `frontend/lib/schemas.ts`
2. **Build form component** in `frontend/components/forms/`
3. **Use React Hook Form** with `zodResolver`
4. **Add to main page** in `frontend/app/page.tsx`
5. **Run type-check**: `npm run type-check`

### Adding a New Chart

1. **Create chart component** in `frontend/components/charts/`
2. **Use Recharts** components (BarChart, LineChart, etc.)
3. **Add to results dashboard** in `frontend/components/results/`
4. **Test with real data**

## Pre-Commit Checklist

**Backend:**
- [ ] `cd backend && uv run ruff check --fix --unsafe-fixes src/ tests/`
- [ ] `cd backend && uv run pytest -v`
- [ ] `cd backend && uv run pyright src/`

**Frontend:**
- [ ] `cd frontend && npm run type-check`
- [ ] `cd frontend && npm run lint`
- [ ] `cd frontend && npm run test:unit`

## Pull Request Workflow

**IMPORTANT**: Always verify GitHub Actions workflows pass when creating or updating a PR.

1. **Before creating a PR**: Run the full pre-commit checklist above
2. **After pushing**: Check workflow status with `gh pr checks` or `gh pr view --web`
3. **If workflows fail**: Fix the issues and push again before requesting review
4. **Useful commands**:
   ```bash
   # Check PR status and workflow results
   gh pr checks

   # View PR in browser (includes workflow status)
   gh pr view --web

   # View workflow run details
   gh run list --limit 5
   gh run view <run-id>
   ```

Do not consider a PR ready for review until all GitHub Actions workflows are passing.

## Configuration

**Backend** (`.env` in backend/):
```bash
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

**Frontend** (`.env.local` in frontend/):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Troubleshooting

**Backend not starting?**
- Check Python version: `python --version` (requires 3.13+)
- Reinstall dependencies: `cd backend && uv sync`
- Check port 8000 is free: `lsof -i :8000`

**Frontend not starting?**
- Check Node version: `node --version` (need 18+)
- Clear Next.js cache: `rm -rf frontend/.next`
- Reinstall dependencies: `cd frontend && rm -rf node_modules && npm install`

**WebSocket not connecting?**
- Backend must be running on port 8000
- Check CORS settings in `backend/src/worth_it/config.py`
- Check browser console for connection errors

**Playwright tests failing?**
- Ensure both backend and frontend are running
- Check selectors if UI changed (use `[role="slider"]` for Radix sliders, not `input`)
- Scope selectors to form containers to avoid duplicate element matches

## Important Files

- `backend/src/worth_it/api.py` - All API endpoints (thin handlers)
- `backend/src/worth_it/services/` - Business logic orchestration
  - `startup_service.py` - StartupService for scenario calculations
  - `cap_table_service.py` - CapTableService for conversions and waterfall
  - `serializers.py` - ResponseMapper and column mapping
- `backend/src/worth_it/calculations/` - Core calculation logic (modular package)
  - `opportunity_cost.py` - Monthly data grids, opportunity cost calculations
  - `startup_scenario.py` - RSU and Stock Option scenario analysis
  - `financial_metrics.py` - IRR, NPV, dilution calculations
  - `cap_table.py` - SAFE and Convertible Note conversions
  - `waterfall.py` - Exit proceeds distribution analysis
- `frontend/lib/api-client.ts` - API client with React Query hooks
- `frontend/lib/schemas.ts` - Zod schemas (must match backend Pydantic models)
- `frontend/lib/store.ts` - Zustand store for global state management
- `frontend/lib/export-utils.ts` - CSV/PDF export utilities
- `frontend/components/forms/form-fields.tsx` - Reusable form field helpers
- `frontend/app/page.tsx` - Main application page
- `frontend/vitest.config.ts` - Unit test configuration and coverage thresholds

## Testing Philosophy

- **Backend**: Unit tests for calculations, API tests for endpoints, integration tests for full workflows (96 tests)
- **Frontend**: Unit tests with Vitest + React Testing Library (146 tests), TypeScript for compile-time safety, Zod for runtime validation
- **E2E**: Playwright tests for end-to-end browser testing

### Frontend Unit Testing

Uses **Vitest** with **React Testing Library** and **@vitest/coverage-v8**.

**Coverage thresholds** (enforced in CI):
- Lines: 70%
- Functions: 65%
- Branches: 70%
- Statements: 70%

**Test patterns**:
- Place tests in `frontend/__tests__/` mirroring the source structure
- Use `.test.ts` or `.test.tsx` suffix
- Mock external dependencies (fetch, WebSocket, localStorage)
- Test hooks with `@testing-library/react` `renderHook`

## E2E Testing with Playwright

### Running E2E Tests

Use the convenience script that handles server startup/shutdown:
```bash
./scripts/run-e2e-tests.sh
```

Or run manually (requires both servers running):
```bash
# Terminal 1: Start backend
cd backend && uv run uvicorn worth_it.api:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Run tests
cd playwright && npx playwright test
```

### Playwright Test Structure
```
playwright/
├── fixtures/base.ts          # Test fixtures with WorthItHelpers
├── utils/
│   ├── helpers.ts            # Helper methods for form interactions
│   └── test-data.ts          # Test constants and selectors
└── tests/
    ├── 01-api-health.spec.ts        # API connection tests
    ├── 02-form-interactions.spec.ts # Form input tests
    ├── 03-rsu-form.spec.ts          # RSU equity form tests
    ├── 04-stock-options-form.spec.ts # Stock options form tests
    ├── 05-rsu-scenario-flow.spec.ts  # Full RSU scenario E2E
    ├── 06-stock-options-scenario-flow.spec.ts # Full options E2E
    ├── 07-monte-carlo.spec.ts       # Monte Carlo simulation tests
    └── 08-ui-features.spec.ts       # Theme, accessibility tests
```

### Writing E2E Tests

**Form interactions use Radix UI components**:
- **Sliders**: Use `[role="slider"]` with keyboard navigation (Home/ArrowRight)
- **Tabs**: Use `[role="tab"]` instead of radio buttons for equity type selection
- **Selects**: Use `[role="combobox"]` for dropdown menus
- **Checkboxes**: Use `[role="checkbox"]` for toggle options

**Important**: Always scope selectors to form containers to avoid matching duplicate elements:
```typescript
// Good - scoped to specific card
const currentJobCard = page.locator('.glass-card').filter({ hasText: 'Current Job' });
const salaryInput = currentJobCard.locator('input[name="monthly_salary"]');

// Bad - may match multiple elements
const salaryInput = page.locator('input[name="monthly_salary"]').first();
```

## Design System (Fundcy Clone)

The frontend implements an **exact Fundcy-style** design: clean white cards, very light gray background, multi-tone green palette, and subtle shadows.

### Color Palette (oklch)

**Light Mode:**
- **Background**: Very light cool gray (`oklch(97.5% 0.003 250)`) - #F7F8FA
- **Card**: Pure white (`oklch(100% 0 0)`) - #FFFFFF
- **Primary**: Dark forest green (`oklch(32% 0.08 155)`) - #1A3D2E
- **Accent**: Medium green (`oklch(42% 0.10 155)`) - #2D5A3D
- **Terminal/Success**: Lime green (`oklch(72% 0.18 115)`) - #9BC53D
- **Destructive**: Red (`oklch(55% 0.22 25)`) - for negative values

**Chart Palette** (multi-tone green):
- chart-1: Dark forest (`oklch(32% 0.08 155)`) - #1A3D2E
- chart-2: Medium green (`oklch(42% 0.10 155)`) - #2D5A3D
- chart-3: Lime (`oklch(72% 0.18 115)`) - #9BC53D
- chart-4: Teal/Mint (`oklch(70% 0.14 175)`) - #3DD9C1
- chart-5: Light mint (`oklch(85% 0.08 155)`)

### Component Patterns

**Cards (Fundcy style):**
- Pure white background (`bg-card`)
- NO borders (borderless)
- Very subtle shadow: `box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)`
- Large radius: 16px (`rounded-2xl`)
- Hover: Slightly elevated shadow

**Chart Tooltips:**
- Dark background (`hsl(220 15% 15%)`)
- White text
- No border, 12px radius
- Subtle shadow

### Typography

**Currency Display (Fundcy-style):**
- Large numbers with lighter decimals: `$74,503.00` where `.00` is muted
- Use `<CurrencyDisplay value={...} />` component
- The `.currency-decimal` class styles the decimal portion lighter

**General:**
- System fonts (no custom fonts)
- Tabular numbers for financial data (`tabular-nums`)
- Data labels: uppercase, small, muted (`data-label` class)

### Key CSS Classes
- `.terminal-card` / `.glass-card` - Fundcy-style white card with subtle shadow
- `.data-value` / `.data-value-lg` - Financial numbers
- `.currency-decimal` - Lighter decimal portion (.00)
- `.metric-positive` / `.metric-negative` - Success/error text colors

### Key Components
- `<CurrencyDisplay value={number} />` - Fundcy-style currency with lighter decimals
- `formatCurrencyWithDecimals(value)` - Returns `{ main, decimal }` for custom styling

## Resources

- **Backend API Docs**: http://localhost:8000/docs (when running)
- **Frontend**: http://localhost:3000 (when running)
- **shadcn/ui**: https://ui.shadcn.com/
- **TanStack Query**: https://tanstack.com/query/latest
- **FastAPI**: https://fastapi.tiangolo.com/
- ALWAYS USE Test Driven Development .. this is not negotiable
- Use shadcn mcp whenever you are doing UI components