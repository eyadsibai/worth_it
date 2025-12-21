# Backend Development Guide (FastAPI + Python)

## Quick Start

```bash
cd backend
uv sync
uv run uvicorn worth_it.api:app --reload --port 8000
```

Visit http://localhost:8000/docs for API documentation.

## Dependencies

Install with uv:
```bash
uv sync
```

**Dependency Management:**
- **Main dependencies**: Defined in `[project.dependencies]` in `pyproject.toml`
- **Dev dependencies**: Defined in `[dependency-groups].dev` (uv-specific pattern, preferred over `[project.optional-dependencies]`)
- **Install with dev dependencies**: `uv sync --group dev`

The `[dependency-groups]` pattern is a uv-specific feature that provides a cleaner way to manage development dependencies compared to the traditional `[project.optional-dependencies]` approach.

## Testing & Quality

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

**Total: 101 backend tests** (run `uv run pytest --collect-only -q` to verify)

### Pre-Commit Checklist

- [ ] `uv run ruff check --fix --unsafe-fixes src/ tests/`
- [ ] `uv run pytest -v`
- [ ] `uv run pyright src/`

## Running the API

```bash
# Development
uv run uvicorn worth_it.api:app --reload --port 8000

# Production
uv run uvicorn worth_it.api:app --host 0.0.0.0 --port 8000 --workers 4
```

## Project Structure

```
backend/
├── src/worth_it/
│   ├── calculations/           # Core financial calculations (framework-agnostic)
│   │   ├── __init__.py        # Re-exports for backward compatibility
│   │   ├── base.py            # EquityType enum, annual_to_monthly_roi
│   │   ├── opportunity_cost.py # create_monthly_data_grid, calculate_annual_opportunity_cost
│   │   ├── startup_scenario.py # calculate_startup_scenario
│   │   ├── dilution_engine.py  # DilutionPipeline, calculate_dilution_schedule (fluent pattern)
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

## Architecture

### 3-Tier Design (Backend Layers)

**Layer 1: API (FastAPI)**
- 9 REST endpoints for calculations
- 1 WebSocket endpoint for Monte Carlo simulations
- Pydantic models for request/response validation
- CORS configured for frontend
- Thin endpoint handlers that delegate to services

**Layer 2: Service Layer**
- `StartupService`: Orchestrates startup scenario calculations, IRR, NPV
- `CapTableService`: Handles cap table conversions, waterfall analysis, dilution
- `ResponseMapper`: Transforms internal data structures to API response formats
- Encapsulates business logic separate from HTTP concerns
- Handles EquityType enum conversion and column name mapping

**Layer 3: Core Logic (Pure Python)**
- Framework-agnostic financial calculations
- Modular package in `calculations/` with domain-specific modules
- Can be used standalone without web frameworks
- Covered by comprehensive test suite (101 tests)

## Adding a New API Endpoint

1. **Define Pydantic models** in `src/worth_it/models.py`
2. **Implement calculation** in `src/worth_it/calculations/` (choose appropriate domain module)
3. **Create service method** in `src/worth_it/services/` if orchestration is needed
4. **Create endpoint** in `src/worth_it/api.py`
5. **Add tests** in `tests/test_api.py`

## Configuration

Environment variables (`.env` in backend/):
```bash
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

## Troubleshooting

**Backend not starting?**
- Check Python version: `python --version` (requires 3.13+)
- Reinstall dependencies: `uv sync`
- Check port 8000 is free: `lsof -i :8000`

**WebSocket issues?**
- Check CORS settings in `src/worth_it/config.py`
- Ensure frontend is connecting to correct port

## Important Files

- `src/worth_it/api.py` - All API endpoints (thin handlers)
- `src/worth_it/services/` - Business logic orchestration
  - `startup_service.py` - StartupService for scenario calculations
  - `cap_table_service.py` - CapTableService for conversions and waterfall
  - `serializers.py` - ResponseMapper and column mapping
- `src/worth_it/calculations/` - Core calculation logic (modular package)
  - `opportunity_cost.py` - Monthly data grids, opportunity cost calculations
  - `startup_scenario.py` - RSU and Stock Option scenario analysis
  - `dilution_engine.py` - Fluent pipeline for dilution calculations (see pattern below)
  - `financial_metrics.py` - IRR, NPV, dilution calculations
  - `cap_table.py` - SAFE and Convertible Note conversions
  - `waterfall.py` - Exit proceeds distribution analysis
- `src/worth_it/models.py` - Pydantic validation models
- `src/worth_it/monte_carlo.py` - Monte Carlo simulation engine

## Testing Philosophy

- **Unit tests** for calculations - test pure functions in isolation
- **API tests** for endpoints - test request/response contracts
- **Integration tests** for full workflows - test end-to-end scenarios

## Fluent Pipeline Pattern

The backend uses an **immutable fluent pipeline pattern** for complex calculations. This pattern:
- **Readable**: Each step is explicit and self-documenting
- **Testable**: Intermediate states can be inspected
- **Composable**: Steps can be reordered or extended
- **Immutable**: No side effects, thread-safe

### Example: Dilution Engine

```python
from worth_it.calculations.dilution_engine import (
    DilutionPipeline,
    calculate_dilution_schedule,
)

# Full pipeline (explicit control)
result = (
    DilutionPipeline(years)
    .with_rounds(rounds)
    .classify()
    .apply_historical()
    .apply_safe_conversions()
    .apply_future_rounds()
    .build()
)

# Convenience function (simple API)
result = calculate_dilution_schedule(
    years=results_df.index,
    rounds=dilution_rounds,
    simulated_dilution=startup_params.get("simulated_dilution"),
)
```

### Pattern Guidelines

1. Use `@dataclass(frozen=True)` for immutable state
2. Each method returns a new instance via `dataclasses.replace()`
3. Provide both pipeline and convenience function APIs
4. Terminal method (e.g., `build()`) returns the final result type

### Modules Using This Pattern

- `dilution_engine.py` - Dilution schedule calculation

## Resources

- **API Docs**: http://localhost:8000/docs (when running)
- **FastAPI**: https://fastapi.tiangolo.com/
- **Pydantic**: https://docs.pydantic.dev/
- **uv**: https://docs.astral.sh/uv/
