"""
Calculations package for financial analysis.

This package provides modular calculation functions organized by domain:
- base: Shared types and utilities (EquityType, annual_to_monthly_roi)
- opportunity_cost: Monthly data grids and opportunity cost calculations
- startup_scenario: Equity scenario analysis for RSUs and Stock Options
- financial_metrics: IRR, NPV, and dilution calculations
- cap_table: SAFE and Convertible Note conversions
- waterfall: Exit proceeds distribution analysis

All functions are re-exported here for backward compatibility with existing
code that imports from `worth_it.calculations`.
"""

# Base types and utilities
from worth_it.calculations.base import (
    EquityType,
    annual_to_monthly_roi,
)

# Cap table conversion functions
from worth_it.calculations.cap_table import (
    calculate_conversion_price,
    calculate_interest,
    calculate_months_between_dates,
    convert_instruments,
)

# Financial metrics (IRR, NPV, dilution)
from worth_it.calculations.financial_metrics import (
    calculate_dilution_from_valuation,
    calculate_irr,
    calculate_npv,
)

# Opportunity cost calculations
from worth_it.calculations.opportunity_cost import (
    calculate_annual_opportunity_cost,
    create_monthly_data_grid,
)

# Startup scenario calculations
from worth_it.calculations.startup_scenario import (
    calculate_startup_scenario,
)

# Waterfall analysis
from worth_it.calculations.waterfall import (
    calculate_waterfall,
)

# Dilution preview calculations
from worth_it.calculations.dilution import (
    calculate_dilution_preview,
    DilutionParty,
    DilutionPreviewResult,
)

# Scenario comparison calculations
from worth_it.calculations.comparison import (
    identify_winner,
    calculate_metric_diffs,
    generate_comparison_insights,
    get_comparison_metrics,
)

# Re-export Monte Carlo functions for backward compatibility.
# These functions live in monte_carlo.py but were historically exported from calculations.
# NOTE: This creates a circular import (monte_carlo imports from calculations,
# calculations imports from monte_carlo), but it's safe because:
# 1. monte_carlo's imports from calculations are at the top (executed first)
# 2. This import is at the END of calculations __init__.py (all functions already defined)
# 3. Python handles this pattern correctly when calculations is imported first
from worth_it.monte_carlo import (  # noqa: E402
    get_random_variates_pert,
    run_monte_carlo_simulation,
    run_monte_carlo_simulation_iterative,
    run_monte_carlo_simulation_vectorized,
    run_sensitivity_analysis,
)

__all__ = [
    # Base
    "EquityType",
    "annual_to_monthly_roi",
    # Opportunity cost
    "create_monthly_data_grid",
    "calculate_annual_opportunity_cost",
    # Startup scenario
    "calculate_startup_scenario",
    # Financial metrics
    "calculate_dilution_from_valuation",
    "calculate_irr",
    "calculate_npv",
    # Cap table
    "calculate_interest",
    "calculate_conversion_price",
    "calculate_months_between_dates",
    "convert_instruments",
    # Waterfall
    "calculate_waterfall",
    # Dilution preview
    "calculate_dilution_preview",
    "DilutionParty",
    "DilutionPreviewResult",
    # Scenario comparison
    "identify_winner",
    "calculate_metric_diffs",
    "generate_comparison_insights",
    "get_comparison_metrics",
    # Monte Carlo (re-exported from monte_carlo.py)
    "get_random_variates_pert",
    "run_monte_carlo_simulation",
    "run_monte_carlo_simulation_iterative",
    "run_monte_carlo_simulation_vectorized",
    "run_sensitivity_analysis",
]
