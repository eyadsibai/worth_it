@POWERHORSE.md

## Monorepo Structure

```
worth_it/
├── backend/          # FastAPI Python backend (see backend/CLAUDE.md)
├── frontend/         # Next.js TypeScript frontend (see frontend/CLAUDE.md)
├── playwright/       # E2E tests (Playwright)
├── scripts/          # Utility scripts (run-e2e-tests.sh)
└── docs/             # Additional documentation
```

**Focused documentation:**
- **Backend work**: See `backend/CLAUDE.md`
- **Frontend work**: See `frontend/CLAUDE.md`

## Quick Start

```bash
# Backend (Terminal 1)
cd backend && uv sync && uv run uvicorn worth_it.api:app --reload --port 8000

# Frontend (Terminal 2)
cd frontend && npm install && npm run dev
```

- Backend API Docs: http://localhost:8000/docs
- Frontend: http://localhost:3000

## Core Principles

- **ALWAYS USE Test Driven Development** - this is not negotiable
- **Use shadcn MCP** when working with UI components
- **ALWAYS VIEW DESIGN REFERENCES** before any UI work - Read the images in `frontend/docs/design-references/` using the Read tool. Clone Fundcy exactly.

## Architecture Overview

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

### Schema Sync

Zod schemas in `frontend/lib/schemas.ts` must match Pydantic models in `backend/src/worth_it/models.py`.

## Cross-Stack Tasks

### Adding a New API Endpoint (Full Stack)

1. **Backend**: Define Pydantic models in `backend/src/worth_it/models.py`
2. **Backend**: Implement calculation in `backend/src/worth_it/calculations/`
3. **Backend**: Create endpoint in `backend/src/worth_it/api.py`
4. **Backend**: Add tests in `backend/tests/test_api.py`
5. **Frontend**: Update Zod schema in `frontend/lib/schemas.ts`
6. **Frontend**: Add API client method in `frontend/lib/api-client.ts`

## Pre-Commit Checklist

**Backend:**
```bash
cd backend && uv run ruff check --fix --unsafe-fixes src/ tests/
cd backend && uv run pytest -v
cd backend && uv run pyright src/
```

**Frontend:**
```bash
cd frontend && npm run type-check
cd frontend && npm run lint
cd frontend && npm run test:unit
```

## Pull Request Workflow

**IMPORTANT**: Always verify GitHub Actions workflows pass when creating or updating a PR.

1. **Before creating a PR**: Run the full pre-commit checklist above
2. **After pushing**: Check workflow status with `gh pr checks` or `gh pr view --web`
3. **If workflows fail**: Fix the issues and push again before requesting review

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
    ├── 08-ui-features.spec.ts       # Theme, accessibility tests
    ├── 09-waterfall-analysis.spec.ts # Waterfall distribution tests
    ├── 10-export-functionality.spec.ts # CSV/PDF export tests
    ├── 11-scenario-management.spec.ts # Scenario CRUD tests
    ├── 12-api-validation.spec.ts    # API input validation tests
    ├── 13-calculation-accuracy.spec.ts # Numerical accuracy tests
    ├── 14-websocket-integration.spec.ts # WebSocket Monte Carlo tests
    ├── 15-cross-feature.spec.ts     # Multi-feature integration tests
    └── 16-error-handling.spec.ts    # Error boundary tests
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

## Troubleshooting

**Playwright tests failing?**
- Ensure both backend and frontend are running
- Check selectors if UI changed (use `[role="slider"]` for Radix sliders, not `input`)
- Scope selectors to form containers to avoid duplicate element matches

**WebSocket not connecting?**
- Backend must be running on port 8000
- Check CORS settings in `backend/src/worth_it/config.py`
- Check browser console for connection errors

For stack-specific troubleshooting, see:
- `backend/CLAUDE.md` - Backend troubleshooting
- `frontend/CLAUDE.md` - Frontend troubleshooting
