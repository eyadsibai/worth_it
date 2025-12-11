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
│   ├── calculations.py    # Core financial calculations (framework-agnostic)
│   ├── api.py            # FastAPI endpoints + WebSocket
│   ├── models.py         # Pydantic validation models
│   ├── config.py         # Configuration management
│   ├── types.py          # TypedDict definitions for type safety
│   └── exceptions.py     # Custom exception hierarchy (WorthItError, CalculationError)
└── tests/
    ├── test_calculations.py  # Unit tests for core calculations
    ├── test_api.py          # API endpoint and WebSocket tests
    └── test_integration.py  # End-to-end workflow tests
```

**Total: ~50 backend tests** (run `uv run pytest --collect-only -q` to verify)

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

**Total: 146 frontend unit tests** covering:
- Zod schemas (64 tests)
- useDeepCompare hook (20 tests)
- export-utils (20 tests)
- API client & WebSocket hooks (17 tests)
- utils/cn function (13 tests)
- useDebounce hook (12 tests)

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

**Layer 3: Core Logic (Pure Python)**
- Framework-agnostic financial calculations
- Functions in `calculations.py`
- Can be used standalone without web frameworks
- Covered by comprehensive test suite (~50 tests)

### Data Flow

```
User Input → React Forms (Zod validation)
    ↓
TanStack Query → HTTP Request
    ↓
FastAPI Endpoint → Pydantic validation
    ↓
Core Calculations → Pure Python functions
    ↓
JSON Response ← Pydantic serialization
    ↓
React State Update ← TanStack Query cache
    ↓
Recharts Visualization
```

## Common Tasks

### Adding a New API Endpoint

1. **Define Pydantic models** in `backend/src/worth_it/models.py`
2. **Implement calculation** in `backend/src/worth_it/calculations.py`
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

- `backend/src/worth_it/api.py` - All API endpoints
- `backend/src/worth_it/calculations.py` - Core calculation logic
- `frontend/lib/api-client.ts` - API client with React Query hooks
- `frontend/lib/schemas.ts` - Zod schemas (must match backend Pydantic models)
- `frontend/app/page.tsx` - Main application page
- `frontend/vitest.config.ts` - Unit test configuration and coverage thresholds

## Testing Philosophy

- **Backend**: Unit tests for calculations, API tests for endpoints, integration tests for full workflows (~50 tests)
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

## Resources

- **Backend API Docs**: http://localhost:8000/docs (when running)
- **Frontend**: http://localhost:3000 (when running)
- **shadcn/ui**: https://ui.shadcn.com/
- **TanStack Query**: https://tanstack.com/query/latest
- **FastAPI**: https://fastapi.tiangolo.com/
- ALWAYS USE Test Driven Development .. this is not negotiable