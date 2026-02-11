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
)

# Scenario comparison calculations
from worth_it.calculations.comparison import (
    calculate_metric_diffs,
    generate_comparison_insights,
    get_comparison_metrics,
    identify_winner,
)

# Conversion engine (fluent pipeline)
from worth_it.calculations.conversion_engine import (
    ConversionPipeline,
    ConversionResult,
    convert_instruments,
)

# Dilution preview calculations
from worth_it.calculations.dilution import (
    DilutionParty,
    DilutionPreviewResult,
    calculate_dilution_preview,
)

# Dilution engine (fluent pipeline)
from worth_it.calculations.dilution_engine import (
    DilutionPipeline,
    DilutionResult,
    calculate_dilution_schedule,
)

# Financial metrics (IRR, NPV, dilution)
from worth_it.calculations.financial_metrics import (
    calculate_dilution_from_valuation,
    calculate_irr,
    calculate_npv,
)

# Investment frequency strategies (Strategy Pattern)
from worth_it.calculations.investment_strategies import (
    AnnualInvestmentStrategy,
    FutureValueResult,
    InvestmentFrequencyStrategy,
    MonthlyInvestmentStrategy,
    get_investment_strategy,
)

# Monte Carlo simulation classes (Template Method Pattern)
from worth_it.calculations.monte_carlo_simulation import (
    IterativeMonteCarlo,
    MonteCarloResult,
    MonteCarloSimulation,
    VectorizedMonteCarlo,
    get_monte_carlo_simulation,
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

# Valuation methods
from worth_it.calculations.valuation import (
    # Pre-revenue methods (Phase 2)
    BerkusParams,
    BerkusResult,
    # Core valuation
    DCFParams,
    FirstChicagoParams,
    FirstChicagoResult,
    FirstChicagoScenario,
    RevenueMultipleParams,
    RiskFactor,
    RiskFactorSummationParams,
    RiskFactorSummationResult,
    ScorecardFactor,
    ScorecardParams,
    ScorecardResult,
    ValuationComparison,
    ValuationResult,
    VCMethodParams,
    calculate_berkus,
    calculate_dcf,
    calculate_first_chicago,
    calculate_revenue_multiple,
    calculate_risk_factor_summation,
    calculate_scorecard,
    calculate_vc_method,
    compare_valuations,
)

# Waterfall analysis (fluent pipeline)
from worth_it.calculations.waterfall_engine import (
    WaterfallPipeline,
    WaterfallResult,
    calculate_waterfall,
)

# Re-export Monte Carlo functions for backward compatibility.
# These functions live in monte_carlo.py but were historically exported from calculations.
# NOTE: This creates a circular import (monte_carlo imports from calculations,
# calculations imports from monte_carlo), but it's safe because:
# 1. monte_carlo's imports from calculations are at the top (executed first)
# 2. This import is at the END of calculations __init__.py (all functions already defined)
# 3. Python handles this pattern correctly when calculations is imported first
from worth_it.monte_carlo import (
    get_random_variates_pert,
    run_monte_carlo_simulation,
    run_monte_carlo_simulation_iterative,
    run_monte_carlo_simulation_vectorized,
    run_sensitivity_analysis,
)

__all__ = [
    "AnnualInvestmentStrategy",
    # Pre-revenue valuation methods (Phase 2)
    "BerkusParams",
    "BerkusResult",
    # Conversion engine (fluent pipeline)
    "ConversionPipeline",
    "ConversionResult",
    "DCFParams",
    "DilutionParty",
    # Dilution engine (fluent pipeline)
    "DilutionPipeline",
    "DilutionPreviewResult",
    "DilutionResult",
    # Base
    "EquityType",
    "FirstChicagoParams",
    "FirstChicagoResult",
    "FirstChicagoScenario",
    "FutureValueResult",
    # Investment frequency strategies (Strategy Pattern)
    "InvestmentFrequencyStrategy",
    "IterativeMonteCarlo",
    "MonteCarloResult",
    # Monte Carlo simulation classes (Template Method Pattern)
    "MonteCarloSimulation",
    "MonthlyInvestmentStrategy",
    "RevenueMultipleParams",
    "RiskFactor",
    "RiskFactorSummationParams",
    "RiskFactorSummationResult",
    "ScorecardFactor",
    "ScorecardParams",
    "ScorecardResult",
    "VCMethodParams",
    "ValuationComparison",
    "ValuationResult",
    "VectorizedMonteCarlo",
    # Waterfall (fluent pipeline)
    "WaterfallPipeline",
    "WaterfallResult",
    "annual_to_monthly_roi",
    "calculate_annual_opportunity_cost",
    "calculate_berkus",
    "calculate_conversion_price",
    "calculate_dcf",
    # Financial metrics
    "calculate_dilution_from_valuation",
    # Dilution preview
    "calculate_dilution_preview",
    "calculate_dilution_schedule",
    "calculate_first_chicago",
    # Cap table
    "calculate_interest",
    "calculate_irr",
    "calculate_metric_diffs",
    "calculate_months_between_dates",
    "calculate_npv",
    # Valuation methods (revenue-based)
    "calculate_revenue_multiple",
    "calculate_risk_factor_summation",
    "calculate_scorecard",
    # Startup scenario
    "calculate_startup_scenario",
    "calculate_vc_method",
    "calculate_waterfall",
    "compare_valuations",
    "convert_instruments",
    # Opportunity cost
    "create_monthly_data_grid",
    "generate_comparison_insights",
    "get_comparison_metrics",
    "get_investment_strategy",
    "get_monte_carlo_simulation",
    # Monte Carlo (re-exported from monte_carlo.py)
    "get_random_variates_pert",
    # Scenario comparison
    "identify_winner",
    "run_monte_carlo_simulation",
    "run_monte_carlo_simulation_iterative",
    "run_monte_carlo_simulation_vectorized",
    "run_sensitivity_analysis",
]
