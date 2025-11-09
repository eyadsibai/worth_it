# Backend Architecture

## Overview

The application now uses a **microservices architecture** with FastAPI as the backend API layer. The Streamlit frontend communicates with the backend via HTTP/REST instead of calling functions directly.

## Architecture

```
┌─────────────────────┐
│  Streamlit Frontend │  (Port 8501)
│     (app.py)        │
└──────────┬──────────┘
           │ HTTP/REST
           ▼
┌─────────────────────┐
│   API Client        │
│  (api_client.py)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  FastAPI Backend    │  (Port 8000)
│     (api.py)        │
│   - Request routing │
│   - Validation      │
│   - Error handling  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Calculations       │
│ (calculations.py)   │
│ - Pure Python logic │
│ - No dependencies   │
│   on web frameworks │
└─────────────────────┘
```

## Structure

### Backend Layer

- **`api.py`**: FastAPI application with REST endpoints
  - Exposes 8 API endpoints for all calculation functions
  - Handles request/response serialization
  - Converts string equity types to EquityType enums
  - Provides comprehensive error handling
  - Includes CORS middleware for cross-origin requests
  - Serves interactive API documentation at `/docs`

- **`models.py`**: Pydantic models for API validation
  - Request models with field validation
  - Response models with type safety
  - Ensures data integrity between frontend and backend

### Client Layer

- **`api_client.py`**: HTTP client for Streamlit app
  - Provides clean Python interface to the API
  - Handles HTTP communication details
  - Includes retry logic for resilience
  - Converts between pandas DataFrames and API JSON
  - Singleton instance for easy reuse

### Frontend Layer

- **`app.py`**: Streamlit web application
  - User interface and input gathering
  - Imports and uses `api_client` instead of `calculations`
  - No direct calculation logic
  - Purely presentation layer

### Core Logic Layer

- **`calculations.py`**: Pure Python calculation module
  - Contains all financial calculation functions
  - Framework-agnostic - no dependencies on Streamlit or FastAPI
  - Can be imported and used directly if needed
  - Includes `EquityType` enum for type safety

### Tests

- **`test_calculations.py`**: Backend logic tests (20 tests)
  - Tests only import from `calculations.py`
  - No dependency on API or frontend code
  
- **`test_api.py`**: API endpoint tests (11 tests)
  - Tests all API endpoints
  - Validates request/response handling
  - Tests error cases

## API Endpoints

### Core Calculation Endpoints

#### `GET /health`
Health check endpoint to verify API is running.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

#### `POST /api/monthly-data-grid`
Creates a DataFrame with monthly financial projections.

**Request:**
```json
{
  "exit_year": 5,
  "current_job_monthly_salary": 30000,
  "startup_monthly_salary": 20000,
  "current_job_salary_growth_rate": 0.03,
  "dilution_rounds": null
}
```

**Response:**
```json
{
  "data": [
    {
      "Year": 1,
      "CurrentJobSalary": 30000,
      "StartupSalary": 20000,
      "MonthlySurplus": 10000,
      ...
    },
    ...
  ]
}
```

#### `POST /api/opportunity-cost`
Calculates the opportunity cost of foregone salary.

**Request:**
```json
{
  "monthly_data": [...],
  "annual_roi": 0.054,
  "investment_frequency": "Monthly",
  "options_params": null,
  "startup_params": {...}
}
```

**Response:**
```json
{
  "data": [
    {
      "Year": 1,
      "Opportunity Cost (Invested Surplus)": 123456.78,
      ...
    },
    ...
  ]
}
```

#### `POST /api/startup-scenario`
Calculates financial outcomes for startup equity package.

**Request:**
```json
{
  "opportunity_cost_data": [...],
  "startup_params": {
    "equity_type": "Equity (RSUs)",
    "total_vesting_years": 4,
    "cliff_years": 1,
    "exit_year": 5,
    "rsu_params": {...},
    "options_params": {}
  }
}
```

**Response:**
```json
{
  "results_df": [...],
  "final_payout_value": 1250000.00,
  "final_opportunity_cost": 654321.00,
  "payout_label": "Your Equity Value (Post-Dilution)",
  "breakeven_label": "Breakeven Valuation (SAR)",
  "total_dilution": 0.30,
  "diluted_equity_pct": 0.035
}
```

#### `POST /api/irr`
Calculates Internal Rate of Return.

**Request:**
```json
{
  "monthly_surpluses": [10000, 10000, ...],
  "final_payout_value": 1250000.00
}
```

**Response:**
```json
{
  "irr": 15.67
}
```

#### `POST /api/npv`
Calculates Net Present Value.

**Request:**
```json
{
  "monthly_surpluses": [10000, 10000, ...],
  "annual_roi": 0.054,
  "final_payout_value": 1250000.00
}
```

**Response:**
```json
{
  "npv": 567890.12
}
```

#### `POST /api/monte-carlo`
Runs Monte Carlo simulation for probabilistic analysis.

**Request:**
```json
{
  "num_simulations": 1000,
  "base_params": {...},
  "sim_param_configs": {...}
}
```

**Response:**
```json
{
  "net_outcomes": [123456.78, 234567.89, ...],
  "simulated_valuations": [15000000, 18000000, ...]
}
```

#### `POST /api/sensitivity-analysis`
Runs sensitivity analysis to identify key variables.

**Request:**
```json
{
  "base_params": {...},
  "sim_param_configs": {...}
}
```

**Response:**
```json
{
  "data": [
    {
      "Variable": "Valuation",
      "Low": -500000,
      "High": 2500000,
      "Impact": 3000000
    },
    ...
  ]
}
```

#### `POST /api/dilution`
Calculates dilution percentage from fundraising round.

**Request:**
```json
{
  "pre_money_valuation": 10000000,
  "amount_raised": 2000000
}
```

**Response:**
```json
{
  "dilution": 0.1667
}
```

## Using the Backend

### Option 1: Via Streamlit Frontend

Simply run the Streamlit app - it automatically uses the API client:

```bash
# Terminal 1: Start backend
uvicorn api:app --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend
streamlit run app.py
```

### Option 2: Via API Client (Programmatic)

Use the API client in your own Python code:

```python
from api_client import APIClient

client = APIClient(base_url="http://localhost:8000")

# Check health
health = client.health_check()
print(health)  # {'status': 'healthy', 'version': '1.0.0'}

# Use calculation functions
monthly_df = client.create_monthly_data_grid(
    exit_year=5,
    current_job_monthly_salary=30000,
    startup_monthly_salary=20000,
    current_job_salary_growth_rate=0.03,
)
```

### Option 3: Direct HTTP Requests

Make HTTP requests to the API directly:

```bash
# Health check
curl http://localhost:8000/health

# Calculate dilution
curl -X POST http://localhost:8000/api/dilution \
  -H "Content-Type: application/json" \
  -d '{"pre_money_valuation": 10000000, "amount_raised": 2000000}'
```

### Option 4: Use Calculations Module Directly

For maximum performance or offline use, import the calculations module directly:

```python
from calculations import (
    EquityType,
    create_monthly_data_grid,
    calculate_startup_scenario,
)

monthly_df = create_monthly_data_grid(...)
results = calculate_startup_scenario(...)
```

See `example_backend_usage.py` for a complete example.

## Benefits of This Architecture

1. **Separation of Concerns**: Clear boundaries between UI, API, and business logic
2. **Scalability**: Backend can be scaled independently of frontend
3. **Flexibility**: Multiple frontends can use the same backend
4. **Testability**: Each layer can be tested independently
5. **Maintainability**: Changes to one layer don't require changes to others
6. **API Documentation**: Auto-generated docs at `/docs` endpoint
7. **Type Safety**: Pydantic models ensure data validation
8. **Framework Agnostic**: Core logic remains independent of web frameworks

## Development

### Running Tests

```bash
# Test calculations module
pytest test_calculations.py -v

# Test API endpoints  
pytest test_api.py -v

# Run all tests
pytest -v
```

### Interactive API Documentation

When the backend is running, visit http://localhost:8000/docs for:
- Interactive API exploration
- Request/response schemas
- Try out endpoints directly in browser
- Auto-generated OpenAPI specification

### Environment Variables

- `API_BASE_URL` - Base URL for the FastAPI backend (default: http://localhost:8000)
