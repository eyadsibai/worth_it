# CLAUDE.md

Development guide for Claude Code when working on the Worth It monorepo.

## Monorepo Structure

```
worth_it/
├── backend/          # FastAPI Python backend
└── frontend/         # Next.js TypeScript frontend
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
│   └── config.py         # Configuration management
└── tests/
    ├── test_calculations.py  # Unit tests (20 tests)
    ├── test_api.py          # API tests (11 tests)
    └── test_integration.py  # Integration tests (4 tests)
```

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
```

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
├── app/                      # Next.js App Router pages
├── components/
│   ├── charts/              # Recharts visualizations
│   ├── forms/               # React Hook Form components
│   ├── layout/              # Layout components (Header, Sidebar)
│   ├── results/             # Results dashboard
│   └── ui/                  # shadcn/ui base components
└── lib/
    ├── api-client.ts        # Type-safe API client with TanStack Query
    └── schemas.ts           # Zod validation schemas (match backend Pydantic)
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
- Covered by 20 unit tests

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
- Check Python version: `python --version` (need 3.13+)
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

## Important Files

- `backend/src/worth_it/api.py` - All API endpoints
- `backend/src/worth_it/calculations.py` - Core calculation logic
- `frontend/lib/api-client.ts` - API client with React Query hooks
- `frontend/lib/schemas.ts` - Zod schemas (must match backend Pydantic models)
- `frontend/app/page.tsx` - Main application page

## Testing Philosophy

- **Backend**: Unit tests for calculations, API tests for endpoints, integration tests for full workflows
- **Frontend**: TypeScript for compile-time safety, Zod for runtime validation
- **E2E**: Playwright tests (to be added)

## Resources

- **Backend API Docs**: http://localhost:8000/docs (when running)
- **Frontend**: http://localhost:3000 (when running)
- **shadcn/ui**: https://ui.shadcn.com/
- **TanStack Query**: https://tanstack.com/query/latest
- **FastAPI**: https://fastapi.tiangolo.com/
