"""Type definitions for the Worth It application.

This module contains TypedDict definitions that document the structure of
dictionaries used throughout the application, improving type safety and
documentation without breaking existing APIs.
"""

from __future__ import annotations

from typing import TypedDict

import numpy as np
import pandas as pd

from worth_it.calculations import EquityType

# --- Dilution and Funding Rounds ---


class DilutionRoundDict(TypedDict, total=False):
    """Type definition for a dilution round dictionary.

    Attributes:
        year: Year when the dilution/event occurs
        dilution: Dilution percentage (0-1)
        new_salary: New monthly salary after this round
        percent_to_sell: Percentage of equity to sell (0-1)
        valuation_at_sale: Company valuation at the time of equity sale
        is_safe_note: Whether this round is a SAFE note
    """

    year: int
    dilution: float
    new_salary: float
    percent_to_sell: float
    valuation_at_sale: float
    is_safe_note: bool


# --- Equity Parameters ---


class RSUParamsDict(TypedDict, total=False):
    """Type definition for RSU parameters dictionary.

    Attributes:
        equity_pct: Equity percentage (0-1)
        target_exit_valuation: Target exit valuation in dollars
        simulate_dilution: Whether to simulate dilution effects
        dilution_rounds: List of dilution/funding rounds
    """

    equity_pct: float
    target_exit_valuation: float
    simulate_dilution: bool
    dilution_rounds: list[DilutionRoundDict]


class OptionsParamsDict(TypedDict, total=False):
    """Type definition for stock options parameters dictionary.

    Attributes:
        num_options: Number of stock options
        strike_price: Strike price per share
        target_exit_price_per_share: Target exit price per share
        exercise_strategy: Exercise strategy (e.g., 'Exercise After Vesting')
        exercise_year: Year to exercise options
    """

    num_options: int
    strike_price: float
    target_exit_price_per_share: float
    exercise_strategy: str
    exercise_year: int


class StartupParamsDict(TypedDict, total=False):
    """Type definition for startup parameters dictionary.

    Attributes:
        equity_type: Type of equity: 'Equity (RSUs)' or 'Stock Options'
        total_vesting_years: Total vesting period in years
        cliff_years: Cliff period in years
        exit_year: Expected exit year
        rsu_params: RSU parameters if equity_type is RSUs
        options_params: Options parameters if equity_type is Stock Options
        simulated_dilution: Simulated dilution value for Monte Carlo simulations
    """

    equity_type: EquityType
    total_vesting_years: int
    cliff_years: int
    exit_year: int
    rsu_params: RSUParamsDict
    options_params: OptionsParamsDict
    simulated_dilution: float | None


# --- Simulation Parameters ---


class SimParamROIConfigDict(TypedDict):
    """Type definition for ROI simulation parameter (Normal distribution).

    Attributes:
        mean: Mean value for normal distribution
        std_dev: Standard deviation for normal distribution
    """

    mean: float
    std_dev: float


class SimParamPERTConfigDict(TypedDict):
    """Type definition for PERT distribution simulation parameters.

    Attributes:
        min_val: Minimum value
        max_val: Maximum value
        mode: Most likely value (mode)
    """

    min_val: float
    max_val: float
    mode: float


class SimParamConfigDict(TypedDict, total=False):
    """Type definition for simulation parameter configuration (can be ROI or PERT).

    This is a union type that can represent either ROI (Normal) or PERT distribution configs.

    Attributes:
        mean: For ROI (Normal distribution)
        std_dev: For ROI (Normal distribution)
        min_val: For PERT distribution
        max_val: For PERT distribution
        mode: For PERT distribution
    """

    mean: float
    std_dev: float
    min_val: float
    max_val: float
    mode: float


class SimParamConfigsDict(TypedDict, total=False):
    """Type definition for all simulation parameter configurations.

    Attributes:
        roi: ROI simulation config (Normal distribution)
        valuation: Valuation simulation config (PERT distribution)
        salary_growth: Salary growth simulation config (PERT distribution)
        dilution: Dilution simulation config (PERT distribution)
        exit_year: Exit year simulation config (PERT distribution)
        yearly_valuation: Yearly valuation configs (PERT distribution per year)
    """

    roi: SimParamROIConfigDict
    valuation: SimParamPERTConfigDict
    salary_growth: SimParamPERTConfigDict
    dilution: SimParamPERTConfigDict
    exit_year: SimParamPERTConfigDict
    yearly_valuation: dict[str, SimParamPERTConfigDict]


class MonteCarloBaseParamsDict(TypedDict):
    """Type definition for Monte Carlo base parameters.

    Attributes:
        exit_year: Expected exit year
        current_job_monthly_salary: Current job monthly salary
        startup_monthly_salary: Startup monthly salary
        current_job_salary_growth_rate: Annual salary growth rate (0-1)
        annual_roi: Annual return on investment (0-1)
        investment_frequency: Investment frequency ('Monthly' or 'Annually')
        failure_probability: Probability of startup failure (0-1)
        startup_params: Startup equity parameters
    """

    exit_year: int
    current_job_monthly_salary: float
    startup_monthly_salary: float
    current_job_salary_growth_rate: float
    annual_roi: float
    investment_frequency: str
    failure_probability: float
    startup_params: StartupParamsDict


# --- Result Types ---


class StartupScenarioResultDict(TypedDict, total=False):
    """Type definition for startup scenario calculation results.

    Attributes:
        results_df: DataFrame with yearly results
        final_payout_value: Final equity payout value
        final_opportunity_cost: Final opportunity cost of foregone salary
        payout_label: Label for the payout metric
        breakeven_label: Label for the breakeven metric
        total_dilution: Total dilution percentage (RSU only)
        diluted_equity_pct: Diluted equity percentage (RSU only)
    """

    results_df: pd.DataFrame
    final_payout_value: float
    final_opportunity_cost: float
    payout_label: str
    breakeven_label: str
    total_dilution: float
    diluted_equity_pct: float


class MonteCarloResultDict(TypedDict):
    """Type definition for Monte Carlo simulation results.

    Attributes:
        net_outcomes: Array of net outcome values across all simulations
        simulated_valuations: Array of simulated valuation values
    """

    net_outcomes: np.ndarray
    simulated_valuations: np.ndarray
