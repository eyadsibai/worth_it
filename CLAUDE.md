# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Testing
```bash
pytest test_calculations.py -v
```

### Running the Streamlit App
```bash
streamlit run app.py
```

### Installing Dependencies
```bash
pip install -r requirements.txt
# OR using the pyproject.toml:
pip install -e .
```

## Architecture

This is a startup job offer financial analyzer with a clean separation between backend calculation logic and frontend presentation:

### Backend (`calculations.py`)
- **Pure Python module** with no framework dependencies
- Contains all financial calculation functions including:
  - Equity analysis (RSUs vs Stock Options via `EquityType` enum)
  - Dilution modeling across funding rounds
  - Monte Carlo simulations
  - IRR/NPV calculations
  - Opportunity cost analysis
- **Framework-agnostic**: Can be used with Flask, FastAPI, CLI tools, etc.
- See `example_backend_usage.py` for standalone usage patterns

### Frontend (`app.py`)
- **Streamlit web interface** that imports from `calculations.py`
- Handles user input and visualization only
- No calculation logic - purely presentation layer
- Uses Plotly for charts and financial visualizations

### Key Data Flow
1. `create_monthly_data_grid()` generates month-by-month financial projections
2. `calculate_annual_opportunity_cost()` processes the monthly data
3. `calculate_startup_scenario()` runs the complete analysis including Monte Carlo simulation

### Testing
- All tests in `test_calculations.py` focus on the backend calculation logic
- 20 comprehensive tests covering edge cases, RSU/stock options scenarios, dilution, and Monte Carlo simulation
- Tests are backend-only with no Streamlit dependencies

## Important Files
- `BACKEND.md` - Detailed backend architecture and API reference
- `example_backend_usage.py` - Complete working example of using calculations independently
- `pyproject.toml` - Dependencies and project configuration