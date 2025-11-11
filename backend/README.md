# Worth It - Backend API

FastAPI backend for the Worth It job offer financial analyzer.

## Quick Start

```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn worth_it.api:app --reload --port 8000

# Run tests
uv run pytest

# Lint code
uv run ruff check src/ tests/
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Architecture

**3-Tier Design:**
1. **Core Logic** ([src/worth_it/calculations.py](src/worth_it/calculations.py)) - Pure Python financial calculations
2. **REST API** ([src/worth_it/api.py](src/worth_it/api.py)) - FastAPI endpoints + WebSocket for Monte Carlo
3. **Data Models** ([src/worth_it/models.py](src/worth_it/models.py)) - Pydantic validation schemas

## Key Features

- 9 REST endpoints for scenario analysis
- WebSocket endpoint for real-time Monte Carlo simulations
- RSU and Stock Options equity modeling
- Dilution modeling across funding rounds
- IRR/NPV calculations
- Sensitivity analysis

## Configuration

Copy `.env.example` to `.env` and configure:
- `API_HOST` - API host (default: 0.0.0.0)
- `API_PORT` - API port (default: 8000)
- `CORS_ORIGINS` - Allowed CORS origins
- `LOG_LEVEL` - Logging level

## Testing

```bash
# Run all tests
uv run pytest -v

# Run with coverage
uv run pytest --cov=src --cov-report=html

# Type checking
uv run pyright src/
```
