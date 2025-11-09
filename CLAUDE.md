# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Installing Dependencies
This project uses [uv](https://docs.astral.sh/uv/) for fast, reliable dependency management:
```bash
uv sync
```

### Testing
Run all tests:
```bash
uv run pytest
```

Run specific test file:
```bash
uv run pytest tests/test_calculations.py -v
```

Run with coverage:
```bash
uv run pytest --cov=src --cov-report=html
```

### Running the Application

#### Option 1: Full Stack (Recommended)
Use the startup scripts to run both API and frontend:
```bash
# Linux/Mac
./scripts/start.sh

# Windows
scripts\start.bat
```

#### Option 2: Run Components Separately
Backend API (FastAPI):
```bash
uv run uvicorn worth_it.api:app --reload --port 8000
```

Frontend (Streamlit):
```bash
uv run streamlit run src/worth_it/app.py
```

### API Documentation
Once the API is running, visit:
- Interactive docs: http://localhost:8000/docs
- OpenAPI schema: http://localhost:8000/openapi.json

## Architecture

This is a startup job offer financial analyzer built with a modern **3-tier microservices architecture**:

```
┌─────────────────────┐
│   Frontend (UI)     │  Streamlit (app.py)
│   Port: 8501        │  + API Client (api_client.py)
└──────────┬──────────┘
           │ HTTP/REST
           ▼
┌─────────────────────┐
│   Backend API       │  FastAPI (api.py)
│   Port: 8000        │  + Pydantic Models (models.py)
└──────────┬──────────┘
           │ Function Calls
           ▼
┌─────────────────────┐
│   Core Logic        │  Pure Python (calculations.py)
│   Framework-Agnostic│  No dependencies on web frameworks
└─────────────────────┘
```

### Layer 1: Core Logic (`calculations.py`)
- **Pure Python module** with no framework dependencies
- Contains all financial calculation functions:
  - Equity analysis (RSUs vs Stock Options via `EquityType` enum)
  - Dilution modeling across funding rounds
  - Monte Carlo simulations (vectorized & iterative)
  - IRR/NPV calculations
  - Opportunity cost analysis
  - Sensitivity analysis
- **Framework-agnostic**: Can be used with Flask, FastAPI, CLI tools, notebooks, etc.
- See `example_backend_usage.py` for standalone usage patterns

### Layer 2: REST API (`api.py` + `models.py`)
- **FastAPI** server exposing 9 RESTful endpoints
- **Pydantic validation** for all requests/responses
- CORS middleware for cross-origin requests
- Automatic OpenAPI/Swagger documentation
- Error handling and type conversion
- Runs on port 8000 by default

### Layer 3: Frontend (`app.py` + `api_client.py`)
- **Streamlit web interface** consuming the REST API
- **API Client** with retry logic and error handling
- Handles user input and visualization only
- Uses Plotly for interactive charts
- No calculation logic - purely presentation layer
- Runs on port 8501 by default

### Key Data Flow
1. User interacts with Streamlit UI ([app.py](app.py))
2. UI makes HTTP requests via API Client ([api_client.py](api_client.py))
3. FastAPI receives and validates request ([api.py](api.py), [models.py](models.py))
4. Core calculation functions process data ([calculations.py](calculations.py))
5. Results flow back through API → Client → UI

### Testing Strategy
- **Unit Tests** ([test_calculations.py](test_calculations.py)): 20 tests for core logic
- **API Tests** ([test_api.py](test_api.py)): 11 tests for REST endpoints
- **Integration Tests** ([test_integration.py](test_integration.py)): 9 end-to-end tests
- 40 total tests covering edge cases, RSU/options, dilution, Monte Carlo
- 100% pass rate with comprehensive coverage

## Important Files
- `BACKEND.md` - Detailed backend architecture and API reference
- `example_backend_usage.py` - Complete working example of using calculations independently
- `pyproject.toml` - Dependencies and project configuration