# Worth It – Financial Journey Sandbox

This project compares the financial trajectory of your current job against a startup offer. It exposes a FastAPI backend that serves a bespoke dashboard built with vanilla HTML, CSS, and JavaScript.

The dashboard supports the full feature-set of the original Streamlit app:

- Deterministic projections comparing your current job and a startup path, including dilution-aware RSU modelling and stock option exercise strategies.
- A configurable Monte Carlo engine ("What-if" simulation) that can vary exit valuations, ROI, salary growth, exit year, and total dilution.
- Fundraising round modelling so you can capture dilution across Series A, B, C… with per-round percentages.
- Sensitivity analysis and distribution visualisations (histogram, probability density, ECDF, box plot, scatter) powered by Plotly.

## Getting Started

Install the dependencies and run the API using Uvicorn:

```bash
uv pip install -e .
uv run uvicorn worth_it.app:app --reload
```

The dashboard is available at [http://localhost:8000](http://localhost:8000).

## Using the dashboard

1. **Configure scenarios** – Provide your current salary, salary growth, investment cadence, and the details of the startup offer. Choose between RSUs and stock options. For RSUs you can add as many fundraising rounds as you like, specifying the year and dilution percentage for each round.
2. **Review projections** – The overview panel presents net outcome, NPV, IRR, equity value, opportunity cost, and a year-by-year table showing principal, investment returns, vested equity, and break-even valuations.
3. **Run Monte Carlo simulations** – Enable the "Run Monte Carlo simulation" toggle to specify distributions for exit valuation (or share price), ROI, salary growth, exit year, and total dilution. You can define PERT ranges globally or per-exit-year and set failure probabilities. The simulation panel surfaces distribution charts, summary statistics, and sensitivity analysis.

All inputs map directly to the FastAPI endpoints (`POST /calculate` and `POST /simulate`), enabling programmatic access if you need to automate scenario runs.

## Project Structure

```
src/
  worth_it/
    __init__.py
    calculations.py      # Core financial calculations
    app.py               # FastAPI app and REST endpoints
    static/              # Front-end assets (CSS + JavaScript)
    templates/           # Jinja2 templates for the dashboard shell
```

Unit tests focus on the calculation engine:

```bash
uv run pytest
```
