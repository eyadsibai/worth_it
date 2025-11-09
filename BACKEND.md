# Backend Architecture

## Overview

The backend calculation logic has been separated from the Streamlit frontend, making it reusable with any other frontend framework.

## Structure

- **`calculations.py`**: Pure Python backend module with no Streamlit dependencies
  - Contains all financial calculation functions
  - Includes `EquityType` enum for type safety
  - Can be imported and used independently

- **`app.py`**: Streamlit frontend application
  - Handles user interface and input gathering
  - Imports and uses functions from `calculations.py`
  - No calculation logic - purely presentation

- **`test_calculations.py`**: Backend tests
  - Tests only import from `calculations.py`
  - No dependency on Streamlit or frontend code

## Using the Backend Independently

The backend can be used with any framework:

### Example with Flask/FastAPI

```python
from calculations import (
    EquityType,
    create_monthly_data_grid,
    calculate_annual_opportunity_cost,
    calculate_startup_scenario,
)

# Your API endpoint
def analyze_offer(request_data):
    monthly_df = create_monthly_data_grid(
        exit_year=request_data['exit_year'],
        current_job_monthly_salary=request_data['current_salary'],
        startup_monthly_salary=request_data['startup_salary'],
        current_job_salary_growth_rate=request_data['growth_rate'],
    )
    
    # ... rest of calculation logic
    
    return results
```

### Example with CLI

```python
from calculations import EquityType, calculate_startup_scenario

# Command-line tool
results = analyze_job_offer(cli_args)
print(f"Net Outcome: {results['net_outcome']}")
```

See `example_backend_usage.py` for a complete working example.

## Available Functions

### Core Functions
- `create_monthly_data_grid()` - Creates monthly financial projections
- `calculate_annual_opportunity_cost()` - Calculates opportunity cost of forgone salary
- `calculate_startup_scenario()` - Evaluates startup equity scenarios
- `calculate_dilution_from_valuation()` - Computes dilution from fundraising
- `calculate_irr()` - Computes Internal Rate of Return
- `calculate_npv()` - Computes Net Present Value

### Monte Carlo Simulation
- `run_monte_carlo_simulation()` - Runs probabilistic simulations
- `run_sensitivity_analysis()` - Analyzes variable sensitivity

### Types
- `EquityType` - Enum for equity types (RSU, STOCK_OPTIONS)

## Benefits

1. **Framework Agnostic**: Use with any Python web framework
2. **Testable**: Backend logic is easily testable without UI
3. **Reusable**: Same calculations for web, CLI, API, etc.
4. **Maintainable**: Clear separation of concerns
5. **Type Safe**: Uses enums and type hints
