# Worth It - Startup Job Offer Financial Analyzer

A comprehensive tool for comparing startup job offers against your current job, with sophisticated financial modeling including equity valuation, dilution, and Monte Carlo simulation.

## 🎯 Features

- **Equity Analysis**: Support for both RSUs and Stock Options
- **Dilution Modeling**: Simulate multiple funding rounds and their impact
- **Secondary Sales**: Model selling equity during funding rounds
- **Monte Carlo Simulation**: Probabilistic analysis of outcomes
- **Opportunity Cost**: Calculate the true cost of lower startup salary
- **Financial Metrics**: IRR, NPV, and breakeven analysis

## 🏗️ Architecture

The project follows a modern microservices architecture with clear separation of concerns:

- **Backend (`api.py`)**: FastAPI REST API server providing calculation endpoints
- **Frontend (`app.py`)**: Streamlit web interface for user interaction
- **Core Logic (`calculations.py`)**: Pure Python calculation engine, framework-agnostic
- **API Client (`api_client.py`)**: Client library for frontend-backend communication
- **Models (`models.py`)**: Pydantic models for API request/response validation
- **Tests**: Comprehensive test suite for both backend (`test_api.py`) and calculations (`test_calculations.py`)

### Architecture Diagram

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
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Calculations       │
│ (calculations.py)   │
└─────────────────────┘
```

See [BACKEND.md](BACKEND.md) for detailed backend architecture documentation.

## 🚀 Quick Start

### Option 1: Using the Startup Script (Recommended)

**Linux/Mac:**
```bash
./start.sh
```

**Windows:**
```bash
start.bat
```

This will:
1. Create a virtual environment (if needed)
2. Install all dependencies
3. Start the FastAPI backend on http://localhost:8000
4. Start the Streamlit frontend on http://localhost:8501
5. Open the API documentation at http://localhost:8000/docs

### Option 2: Manual Setup

1. **Install dependencies:**
```bash
pip install numpy pandas scipy numpy-financial streamlit plotly pytest pydantic fastapi uvicorn httpx requests
```

2. **Start the FastAPI backend:**
```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

3. **In a new terminal, start the Streamlit frontend:**
```bash
streamlit run app.py
```

4. **Access the application:**
   - Streamlit UI: http://localhost:8501
   - FastAPI Backend: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🔌 API Endpoints

The FastAPI backend provides the following endpoints:

- `GET /health` - Health check
- `POST /api/monthly-data-grid` - Create monthly financial projections
- `POST /api/opportunity-cost` - Calculate opportunity cost
- `POST /api/startup-scenario` - Evaluate startup equity scenarios
- `POST /api/irr` - Calculate Internal Rate of Return
- `POST /api/npv` - Calculate Net Present Value
- `POST /api/monte-carlo` - Run Monte Carlo simulation
- `POST /api/sensitivity-analysis` - Run sensitivity analysis
- `POST /api/dilution` - Calculate dilution from valuation

See the interactive API documentation at http://localhost:8000/docs for details.

## 🧑‍💻 Using the Backend Independently

The backend can be used programmatically without the Streamlit UI:

```python
from calculations import (
    EquityType,
    create_monthly_data_grid,
    calculate_annual_opportunity_cost,
    calculate_startup_scenario,
)

# Your custom logic here - use calculations module directly
monthly_df = create_monthly_data_grid(
    exit_year=5,
    current_job_monthly_salary=30000,
    startup_monthly_salary=20000,
    current_job_salary_growth_rate=0.03,
)

# Calculate opportunity cost DataFrame
opportunity_cost_df = calculate_annual_opportunity_cost(monthly_df, annual_roi=0.054, investment_frequency="Monthly")

# Define your startup_params dictionary as needed
startup_params = {
    "equity_type": EquityType.RSU,
    "total_vesting_years": 4,
    "cliff_years": 1,
    "exit_year": 5,
    "rsu_params": {
        "equity_pct": 0.05,
        "target_exit_valuation": 25_000_000,
        "simulate_dilution": False,
    },
    "options_params": {},
}
# Calculate results
results = calculate_startup_scenario(opportunity_cost_df, startup_params)
```

Or use the API client programmatically:

```python
from api_client import APIClient

client = APIClient(base_url="http://localhost:8000")

# Check API health
health = client.health_check()

# Create monthly data
monthly_df = client.create_monthly_data_grid(
    exit_year=5,
    current_job_monthly_salary=30000,
    startup_monthly_salary=20000,
    current_job_salary_growth_rate=0.03,
)

# Calculate opportunity cost
opportunity_df = client.calculate_annual_opportunity_cost(
    monthly_df=monthly_df,
    annual_roi=0.054,
    investment_frequency="Monthly",
)

# Get startup scenario results
results = client.calculate_startup_scenario(opportunity_df, startup_params)
```

See [example_backend_usage.py](example_backend_usage.py) for a complete working example using the calculations module directly.

## 📚 Documentation

- [BACKEND.md](BACKEND.md) - Backend architecture and API reference
- [example_backend_usage.py](example_backend_usage.py) - Example of using calculations module directly
- API Documentation - Available at http://localhost:8000/docs when backend is running

## 🧪 Testing

Run the full test suite:

```bash
# Test the calculations module (20 tests)
pytest test_calculations.py -v

# Test the API endpoints (11 tests)
pytest test_api.py -v

# Run all tests
pytest -v
```

All 31 tests cover:
- Core financial calculations
- RSU and stock option scenarios
- Dilution modeling
- Secondary equity sales
- Monte Carlo simulation
- API endpoints and request/response validation
- Edge cases and error handling

## 🔧 Dependencies

- Python 3.10+
- **Backend:**
  - fastapi
  - uvicorn
  - pydantic
  - numpy
  - pandas
  - scipy
  - numpy-financial
- **Frontend:**
  - streamlit
  - plotly
  - requests
- **Testing:**
  - pytest
  - httpx

## 🌐 Environment Variables

- `API_BASE_URL` - Base URL for the FastAPI backend (default: http://localhost:8000)

## 📝 License

See repository for license information.

## 👨‍💻 Author

Made with ❤️ by Eyad Sibai (https://linkedin.com/in/eyadsibai)
