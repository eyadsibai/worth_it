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

The project follows a clean separation of concerns:

- **Backend (`calculations.py`)**: Pure Python calculation engine, framework-agnostic
- **Frontend (`app.py`)**: Streamlit web interface
- **Tests (`test_calculations.py`)**: Comprehensive test suite

See [BACKEND.md](BACKEND.md) for detailed backend architecture documentation.

## 🚀 Quick Start

### Using the Streamlit App

```bash
pip install streamlit numpy pandas plotly scipy numpy-financial
streamlit run app.py
```

### Using the Backend Independently

The backend can be used with any framework (Flask, FastAPI, CLI, etc.):

```python
from calculations import (
    EquityType,
    create_monthly_data_grid,
    calculate_annual_opportunity_cost,
    calculate_startup_scenario,
)

# Your custom logic here
monthly_df = create_monthly_data_grid(
    exit_year=5,
    current_job_monthly_salary=30000,
    startup_monthly_salary=20000,
    current_job_salary_growth_rate=0.03,
)

# Calculate results
results = calculate_startup_scenario(opportunity_cost_df, startup_params)
```

See [example_backend_usage.py](example_backend_usage.py) for a complete working example.

## 📚 Documentation

- [BACKEND.md](BACKEND.md) - Backend architecture and API reference
- [example_backend_usage.py](example_backend_usage.py) - Example of using backend independently

## 🧪 Testing

Run the test suite:

```bash
pytest test_calculations.py -v
```

All 20 tests cover:
- Core financial calculations
- RSU and stock option scenarios
- Dilution modeling
- Secondary equity sales
- Monte Carlo simulation
- Edge cases and validation

## 🔧 Dependencies

- Python 3.10+
- numpy
- pandas
- scipy
- numpy-financial
- streamlit (for web UI only)
- plotly (for web UI only)
- pytest (for testing)

## 📝 License

See repository for license information.

## 👨‍💻 Author

Made with ❤️ by Eyad Sibai (https://linkedin.com/in/eyadsibai)
