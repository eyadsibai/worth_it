"""Type definitions for dictionaries used throughout the application.

This module defines TypedDict classes to replace generic dict[str, Any]
usage and provide better type safety and IDE support.
"""

from __future__ import annotations

from typing import TypedDict

from worth_it.calculations import EquityType


class DilutionRound(TypedDict, total=False):
    """Configuration for a dilution funding round.

    Attributes:
        year: The year when the dilution round occurs (negative = years ago for completed rounds)
        dilution: Percentage of dilution (0.0 to 1.0)
        new_salary: New monthly salary after this round (optional)
        is_safe_note: Whether this is a SAFE note (optional)
        valuation_at_sale: Valuation at time of secondary sale (optional)
        percent_to_sell: Percentage of equity to sell (optional, 0.0 to 1.0)
        status: Round status - "completed" (past) or "upcoming" (future)
    """

    year: int
    dilution: float
    new_salary: float
    is_safe_note: bool
    valuation_at_sale: float
    percent_to_sell: float
    status: str  # "completed" | "upcoming"


class RSUParams(TypedDict, total=False):
    """Parameters for RSU (Restricted Stock Units) equity.

    Attributes:
        equity_pct: Initial equity percentage (0.0 to 1.0)
        target_exit_valuation: Expected company valuation at exit
        simulate_dilution: Whether to simulate dilution rounds
        dilution_rounds: List of dilution round configurations
        company_stage: Current stage of the company (pre-seed, seed, series-a, etc.)
    """

    equity_pct: float
    target_exit_valuation: float
    simulate_dilution: bool
    dilution_rounds: list[DilutionRound]
    company_stage: str | None  # "pre-seed" | "seed" | "series-a" | "series-b" | "series-c" | "series-d" | "pre-ipo"


class OptionsParams(TypedDict, total=False):
    """Parameters for stock options equity.

    Attributes:
        num_options: Number of stock options granted
        strike_price: Exercise price per option
        target_exit_price_per_share: Expected stock price at exit
        exercise_strategy: When to exercise options ("Exercise After Vesting", etc.)
        exercise_year: Year when options are exercised (if exercise_strategy is set)
    """

    num_options: int
    strike_price: float
    target_exit_price_per_share: float
    exercise_strategy: str
    exercise_year: int


class StartupParams(TypedDict, total=False):
    """Complete startup equity configuration.

    Attributes:
        equity_type: Type of equity (RSU or Stock Options)
        total_vesting_years: Total years for vesting schedule
        cliff_years: Years before cliff vesting occurs
        exit_year: Expected exit year
        rsu_params: RSU-specific parameters (required if equity_type is RSU)
        options_params: Options-specific parameters (required if equity_type is STOCK_OPTIONS)
        simulated_dilution: Simulated dilution value for Monte Carlo (optional)
    """

    equity_type: EquityType
    total_vesting_years: int
    cliff_years: int
    exit_year: int
    rsu_params: RSUParams
    options_params: OptionsParams
    simulated_dilution: float | None


class MonthlyDataRow(TypedDict):
    """A single row of monthly financial data.

    Attributes:
        Year: The year number
        CurrentJobSalary: Monthly salary at current job
        StartupSalary: Monthly salary at startup
        MonthlySurplus: Difference between current and startup salary
        InvestableSurplus: Positive surplus that can be invested
        ExerciseCost: Cost to exercise stock options (if applicable)
        CashFromSale: Cash received from equity sales
    """

    Year: int
    CurrentJobSalary: float
    StartupSalary: float
    MonthlySurplus: float
    InvestableSurplus: float
    ExerciseCost: float
    CashFromSale: float


class OpportunityCostRow(TypedDict, total=False):
    """A single row of opportunity cost calculation results.

    Attributes:
        Year: The year number
        Principal Forgone: Cumulative salary difference
        Salary Gain: Cumulative salary gain (when startup pays more)
        Opportunity Cost (Invested Surplus): Future value of invested surplus
        Cash From Sale (FV): Future value of cash from equity sales
        Investment Returns: Returns from investing the surplus
    """

    Year: int
    # Note: Either "Principal Forgone" or "Salary Gain" will be present, not both
    # Using total=False and the field names with spaces as they appear in the actual data


class StartupScenarioResultRow(TypedDict, total=False):
    """A single row of startup scenario calculation results.

    This extends OpportunityCostRow with additional startup-specific metrics.

    Attributes:
        Year: The year number
        Opportunity Cost (Invested Surplus): Cumulative opportunity cost
        Vested Equity (%): Percentage of vested equity
        Breakeven Value: Required valuation for breakeven
        CumulativeDilution: Cumulative dilution factor (1 - total dilution)
    """

    Year: int
    # OpportunityCostRow fields are inherited conceptually
    Vested_Equity: float  # Percentage
    Breakeven_Value: float
    CumulativeDilution: float


class ROIConfig(TypedDict):
    """Configuration for ROI in Monte Carlo simulation (Normal distribution).

    Attributes:
        mean: Mean ROI value
        std_dev: Standard deviation
    """

    mean: float
    std_dev: float


class PERTConfig(TypedDict):
    """Configuration for PERT distribution in Monte Carlo simulation.

    Attributes:
        min_val: Minimum value
        max_val: Maximum value
        mode: Most likely value (peak of distribution)
    """

    min_val: float
    max_val: float
    mode: float


class YearlyValuationConfig(TypedDict):
    """Configuration for yearly valuation in Monte Carlo simulation.

    Maps year (as string) to PERT distribution configuration.
    """

    # Dynamic keys for years, values are PERTConfig
    # Example: {"1": {...}, "2": {...}, "3": {...}}


class SimParamConfigs(TypedDict, total=False):
    """Configuration for all simulated parameters in Monte Carlo.

    Attributes:
        roi: ROI configuration (Normal distribution)
        valuation: Valuation configuration (PERT distribution)
        salary_growth: Salary growth configuration (PERT distribution)
        dilution: Dilution configuration (PERT distribution)
        exit_year: Exit year configuration (PERT distribution)
        yearly_valuation: Year-specific valuation configurations
    """

    roi: ROIConfig
    valuation: PERTConfig
    salary_growth: PERTConfig
    dilution: PERTConfig
    exit_year: PERTConfig
    yearly_valuation: dict[str, PERTConfig]


class BaseParams(TypedDict):
    """Base parameters for Monte Carlo simulation.

    Attributes:
        exit_year: Expected exit year
        current_job_monthly_salary: Monthly salary at current job
        startup_monthly_salary: Monthly salary at startup
        current_job_salary_growth_rate: Annual salary growth rate
        annual_roi: Annual return on investment
        investment_frequency: "Monthly" or "Annually"
        failure_probability: Probability of startup failure (0.0 to 1.0)
        startup_params: Startup equity configuration
    """

    exit_year: int
    current_job_monthly_salary: float
    startup_monthly_salary: float
    current_job_salary_growth_rate: float
    annual_roi: float
    investment_frequency: str
    failure_probability: float
    startup_params: StartupParams


class StartupScenarioResult(TypedDict, total=False):
    """Result of startup scenario calculation.

    Attributes:
        results_df: DataFrame with yearly breakdown (as list of dicts)
        final_payout_value: Final equity value
        final_opportunity_cost: Total opportunity cost
        payout_label: Label for payout metric
        breakeven_label: Label for breakeven metric
        total_dilution: Total dilution (for RSUs only)
        diluted_equity_pct: Final equity percentage (for RSUs only)
    """

    results_df: list[dict]  # Will be converted to DataFrame
    final_payout_value: float
    final_opportunity_cost: float
    payout_label: str
    breakeven_label: str
    total_dilution: float
    diluted_equity_pct: float
