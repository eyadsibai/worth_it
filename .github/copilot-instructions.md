# GitHub Copilot Instructions for Worth It

## Project Overview

**Worth It** is a Streamlit-based financial comparison tool that helps professionals evaluate startup job offers against their current job. It uses sophisticated financial modeling including equity valuation, dilution simulation, and Monte Carlo analysis to quantify financial trade-offs.

**Tech Stack**: Python 3.13+, FastAPI, Streamlit, NumPy, Pandas, SciPy, Plotly, Pydantic

## Architecture

The project follows a modern microservices architecture with clear separation of concerns:

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

### Key Files

- **`calculations.py`**: Pure Python calculation engine, framework-agnostic
- **`api.py`**: FastAPI REST API server providing calculation endpoints
- **`app.py`**: Streamlit web interface for user interaction
- **`api_client.py`**: Client library for frontend-backend communication
- **`models.py`**: Pydantic models for API request/response validation
- **`test_calculations.py`**: Unit tests for calculations module (20 tests)
- **`test_api.py`**: API endpoint tests (11 tests)
- **`test_integration.py`**: Integration tests (4 tests)

## Development Workflow

### Prerequisites

This project uses **`pip`** for Python package management. Follow the provided scripts (e.g., `start.sh`) for setup and dependency installation.

### Setup

```bash
# Run the application (starts both backend and frontend)
./start.sh  # Linux/Mac
start.bat   # Windows

# Or manually install dependencies
pip install numpy pandas scipy numpy-financial streamlit plotly pytest pydantic fastapi uvicorn httpx requests
```

### Running Services

```bash
# Start FastAPI backend
uvicorn api:app --host 0.0.0.0 --port 8000

# Start Streamlit frontend (in separate terminal)
streamlit run app.py
```

### Testing

```bash
# Run all tests
pytest -v

# Test calculations module only
pytest test_calculations.py -v

# Test API endpoints only
pytest test_api.py -v

# Test specific function
pytest test_calculations.py::test_name
```

### Important Commands

✅ **Use these:**
- `pytest` - Runs tests
- `streamlit run app.py` - Runs Streamlit app
- `uvicorn api:app` - Runs FastAPI backend
- `pip install <package>` - Install a new dependency
- `./start.sh` (or `start.bat`) - Start both services together

## Coding Standards

### General Principles

1. **Separation of Concerns**: Keep UI (app.py) separate from business logic (calculations.py)
2. **Framework Agnostic**: Core calculations should have no dependencies on web frameworks
3. **Type Safety**: Use Pydantic models for API validation
4. **Comprehensive Testing**: All new features must include tests

### Code Organization

- **Never add calculation logic to `app.py`** - all calculations belong in `calculations.py`
- **API endpoints** should be thin wrappers that delegate to calculations module
- **Use Pydantic models** for all API request/response schemas
- **Keep tests close to the code** they test

### Parameter Passing Pattern

The codebase uses nested dictionaries for parameters:

```python
startup_params = {
    "equity_type": EquityType.RSU,
    "total_vesting_years": 4,
    "cliff_years": 1,
    "exit_year": 5,
    "rsu_params": {
        "equity_pct": 0.05,
        "target_exit_valuation": 20_000_000,
        "simulate_dilution": True,
        "dilution_rounds": [...]
    },
    "options_params": {...}
}
```

### Critical Concepts

#### Equity Sales vs. Opportunity Cost

**Important**: Cash from equity sales is startup wealth, NOT foregone BigCorp earnings.

```python
# ✅ CORRECT: Track separately and add to final payout
results_df["Cash From Sale (FV)"] = cash_from_sales_fv
final_payout += cash_from_sales_fv

# ❌ WRONG: Don't subtract from opportunity cost
opportunity_cost -= cash_from_sales  # Never do this!
```

#### Sequential Sales Calculation

Each equity sale is a percentage of REMAINING equity after previous sales:

```python
# ✅ CORRECT: Cumulative factor approach
cumulative_sold_factor = 1.0
for sale in sales:
    equity_at_sale = initial_equity * dilution_factor * cumulative_sold_factor
    cash += equity_at_sale * valuation * sale_pct
    cumulative_sold_factor *= (1 - sale_pct)
```

#### Cliff Vesting

Vesting is ZERO before cliff period:

```python
# ✅ CORRECT: Check cliff first
vested_pct = np.where(
    years >= cliff_years,
    np.clip(years / total_vesting_years, 0, 1),
    0
)
```

## Testing Strategy

### Test Organization

- **Core Functions** (6 tests): Basic building blocks (monthly data grid, opportunity cost, IRR, NPV, startup scenarios)
- **RSU & Options Tests** (2 tests): RSU and stock options calculations
- **Advanced Features** (7 tests): Salary increases, equity sales, edge cases
- **Monte Carlo** (5 tests): Vectorized and iterative simulations
- **API Tests** (11 tests): All API endpoints
- **Integration Tests** (4 tests): Full stack validation

### When to Add Tests

**Always add tests when:**
- Adding a new calculation feature
- Fixing a bug (test should fail before fix, pass after)
- Changing calculation logic

**Test should cover:**
- Happy path (normal inputs)
- Edge cases (zero values, cliff boundaries, sales after exit)
- Different equity types (RSUs vs Options)
- Both investment frequencies (Monthly vs Annually)

### Test Development Workflow

```bash
# 1. Make changes to calculations.py or api.py
# 2. Run tests
pytest -v

# 3. If tests fail, debug
pytest test_calculations.py::test_name -v -s

# 4. If you changed behavior, update/add tests
# 5. Re-run all tests
pytest -v
```

## API Endpoints

All 9 API endpoints:

1. `GET /health` - Health check
2. `POST /api/monthly-data-grid` - Monthly financial projections
3. `POST /api/opportunity-cost` - Opportunity cost calculations
4. `POST /api/startup-scenario` - Startup equity analysis
5. `POST /api/irr` - Internal Rate of Return
6. `POST /api/npv` - Net Present Value
7. `POST /api/monte-carlo` - Monte Carlo simulation
8. `POST /api/sensitivity-analysis` - Sensitivity analysis
9. `POST /api/dilution` - Dilution calculations

See interactive API documentation at http://localhost:8000/docs when backend is running.

## Common Pitfalls to Avoid

### 1. Breaking Separation of Concerns
❌ Adding calculations to `app.py`
✅ Keep all calculation logic in `calculations.py`

### 2. Missing Monte Carlo Parameter Passing
```python
# ❌ WRONG (old bug)
opportunity_cost_df = calculate_annual_opportunity_cost(
    monthly_df, roi, frequency
)

# ✅ RIGHT
opportunity_cost_df = calculate_annual_opportunity_cost(
    monthly_df, roi, frequency,
    options_params=...,
    startup_params=...
)
```

### 3. Sales After Exit Year
Sales occurring after the exit year must be ignored:

```python
if r["year"] <= exit_year:  # ✅ Include sales AT exit year
    # Process sale
```

### 4. NumPy Broadcasting
Be careful with array shapes in Monte Carlo simulations:

```python
# Always verify shapes align
assert investable_surpluses.shape[0] == num_simulations
assert investable_surpluses.shape[1] == total_months
```

## Key Financial Concepts

### 1. Monthly Data Grid
Creates month-by-month salary comparison between current job and startup.

### 2. Opportunity Cost
Calculates future value of salary difference if invested at current job.

### 3. Equity Types

**RSUs (Restricted Stock Units)**:
- Direct equity percentage (e.g., 5%)
- Subject to dilution from funding rounds
- Can model secondary equity sales

**Stock Options**:
- Number of options + strike price
- Profit = (Exit Price - Strike Price) × Vested Options
- Exercise costs can be modeled

### 4. Dilution & Secondary Sales

**Dilution Rounds**: Model multiple funding rounds that dilute equity
- Can specify dilution % directly OR calculate from valuation
- Each round has: year, dilution %, optional new salary

**Secondary Sales**: Sell vested equity during funding rounds
- Percentage of vested equity at time of sale
- Cash from sale is invested (grows with opportunity cost returns)
- Remaining equity is reduced for final payout

### 5. Monte Carlo Simulations

**Vectorized (Fast)**:
- Used when exit year is FIXED
- All calculations done with NumPy arrays (parallelized)

**Iterative (Slower)**:
- Used when exit year is SIMULATED
- Runs full calculation for each simulation
- Necessary because exit year affects vesting, dilution timing

## Making Changes Safely

### Before Starting

1. **Read existing tests** - They document expected behavior
2. **Run tests to establish baseline**: `pytest -v`
3. **Understand the data flow** - Trace through the calculation chain

### Development Workflow

1. Make changes to the appropriate file
2. Run relevant tests immediately
3. Fix any test failures
4. Add/update tests for new behavior
5. Run full test suite before committing
6. Verify linting passes (if applicable)

### Git Workflow

```bash
# Check status
git status

# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "Type: Brief description

- Detailed change 1
- Detailed change 2
- Tests added/updated"

# Push changes
git push
```

## Documentation

All changes should maintain or improve documentation:

- **README.md**: Project overview and quick start
- **BACKEND.md**: Backend architecture and API reference
- **AGENT.md**: Legacy AI agent guide (predates FastAPI backend; see BACKEND.md for current architecture)
- **TESTING.md**: Testing and validation summary
- **Code comments**: Explain "why", not "what"
- **Docstrings**: Document parameters, return values, and examples

## Environment Variables

- `API_BASE_URL` - Base URL for the FastAPI backend (default: http://localhost:8000)

## Additional Resources

- **NumPy Broadcasting**: https://numpy.org/doc/stable/user/basics.broadcasting.html
- **PERT Distribution**: https://en.wikipedia.org/wiki/PERT_distribution
- **Streamlit Docs**: https://docs.streamlit.io
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Pydantic Docs**: https://docs.pydantic.dev

## Questions to Ask Before Making Changes

1. Does it handle both RSUs and Stock Options?
2. Does it work for both Monthly and Annual investment frequencies?
3. Does it ignore equity sales after exit year?
4. Does it properly account for the cliff period?
5. Does it track cash from sales separately from opportunity cost?
6. For Monte Carlo changes: does it work for both vectorized AND iterative modes?
7. Are array shapes compatible (for NumPy operations)?
8. Are there tests covering the new behavior?
9. Does it handle edge cases (zero values, equal min/max, etc.)?
10. Is the calculation documented with comments explaining the "why"?

## Summary

When working on this repository:

- ✅ **Use standard Python tools** (`pip`, `pytest`, `streamlit`, `uvicorn`)
- ✅ **Keep calculations separate** from UI code
- ✅ **Write tests first** or alongside code changes
- ✅ **Run tests frequently** to catch issues early
- ✅ **Document your changes** in code and commit messages
- ✅ **Follow the architecture** - don't mix concerns
- ✅ **Test both paths** when modifying Monte Carlo code
- ✅ **Verify edge cases** are handled correctly

The codebase is well-structured with comprehensive tests and documentation. Maintain this quality in all contributions.
