"""
Response serializers and mappers for API responses.

This module handles transformation between backend data structures
and frontend-expected response formats. Centralizing these mappings
makes changes easier to track and test.

It also provides conversion functions for transforming typed API models
to the internal format expected by calculation functions (Issue #248).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, cast

import pandas as pd

from worth_it.calculations import EquityType

if TYPE_CHECKING:
    from worth_it.models import (
        RSUParams,
        SimParamRange,
        StockOptionsParams,
        TypedBaseParams,
        VariableParam,
    )

# Column mapping from backend names to frontend-expected snake_case names
STARTUP_SCENARIO_COLUMN_MAPPING = {
    "Year": "year",
    "StartupSalary": "startup_monthly_salary",
    "CurrentJobSalary": "current_job_monthly_salary",
    "MonthlySurplus": "monthly_surplus",
    "Opportunity Cost (Invested Surplus)": "cumulative_opportunity_cost",
    "Principal Forgone": "principal_forgone",
    "Salary Gain": "salary_gain",
    "Cash From Sale (FV)": "cash_from_sale_fv",
    "Investment Returns": "investment_returns",
    "Vested Equity (%)": "vested_equity_pct",
    "CumulativeDilution": "cumulative_dilution",
    "Breakeven Value": "breakeven_value",
}


class ResponseMapper:
    """Handles transformation of calculation results to API response format."""

    @staticmethod
    def map_startup_scenario_df(results_df: pd.DataFrame) -> list[dict[str, Any]]:
        """
        Transform startup scenario DataFrame to frontend-expected format.

        Args:
            results_df: DataFrame from calculate_startup_scenario

        Returns:
            List of dicts with snake_case column names for JSON serialization
        """
        # Rename columns that exist in the DataFrame
        rename_cols = {
            k: v for k, v in STARTUP_SCENARIO_COLUMN_MAPPING.items()
            if k in results_df.columns
        }
        results_df_renamed = results_df.rename(columns=rename_cols)
        return cast(list[dict[str, Any]], results_df_renamed.to_dict(orient="records"))


def convert_equity_type_in_params(params: dict[str, Any]) -> dict[str, Any]:
    """
    Convert equity_type string to EquityType enum in startup_params.

    Creates a new dict with the converted equity_type to avoid
    mutating the original input.

    Args:
        params: Dictionary containing startup_params with potential string equity_type

    Returns:
        New dict with converted equity_type (or original if no conversion needed)
    """
    if "startup_params" not in params:
        return params

    startup_params = params["startup_params"]
    if "equity_type" not in startup_params:
        return params

    if isinstance(startup_params["equity_type"], str):
        # Create new dicts to avoid mutation
        new_params = params.copy()
        new_params["startup_params"] = startup_params.copy()
        new_params["startup_params"]["equity_type"] = EquityType(
            startup_params["equity_type"]
        )
        return new_params

    return params


def convert_equity_type_in_startup_params(
    startup_params: dict[str, Any] | None
) -> dict[str, Any] | None:
    """
    Convert equity_type string to EquityType enum in a startup_params dict.

    Args:
        startup_params: Dictionary with potential string equity_type

    Returns:
        New dict with converted equity_type (or original/None if no conversion needed)
    """
    if startup_params is None:
        return None

    if "equity_type" not in startup_params:
        return startup_params

    if isinstance(startup_params["equity_type"], str):
        new_params = startup_params.copy()
        new_params["equity_type"] = EquityType(startup_params["equity_type"])
        return new_params

    return startup_params


# --- Typed Model Conversion Functions (Issue #248) ---


# Mapping from VariableParam enum values to internal sim_param_configs keys
# Note: Both exit_valuation (RSU) and exit_price_per_share (stock options)
# map to "valuation" because the internal monte carlo code uses a single
# "valuation" key to represent the varying price parameter for both equity types.
_VARIABLE_PARAM_TO_INTERNAL_KEY: dict[str, str] = {
    "exit_valuation": "valuation",
    "exit_year": "exit_year",
    "failure_probability": "failure_probability",
    "current_job_monthly_salary": "current_job_monthly_salary",
    "startup_monthly_salary": "startup_monthly_salary",
    "current_job_salary_growth_rate": "salary_growth",
    "annual_roi": "roi",
    "total_equity_grant_pct": "equity_pct",
    "num_options": "num_options",
    "strike_price": "strike_price",
    "exit_price_per_share": "valuation",  # Maps to same key as exit_valuation
}


def convert_typed_base_params_to_internal(typed_params: TypedBaseParams) -> dict[str, Any]:
    """Convert TypedBaseParams to the internal dict format for calculations.

    The calculation functions (monte_carlo.py) expect a nested structure:
    - base_params["startup_params"]["equity_type"] = EquityType enum
    - base_params["startup_params"]["rsu_params"] = {...} for RSU
    - base_params["startup_params"]["options_params"] = {...} for stock options

    Args:
        typed_params: TypedBaseParams Pydantic model

    Returns:
        Dictionary in the internal format expected by calculation functions
    """
    startup = typed_params.startup_params

    # Build the nested startup_params structure
    internal_startup: dict[str, Any] = {
        "equity_type": EquityType(startup.equity_type),
        "total_vesting_years": startup.vesting_period,
        "cliff_years": startup.cliff_period,
    }

    if startup.equity_type == "RSU":
        rsu = cast("RSUParams", startup)
        internal_startup["rsu_params"] = {
            "equity_pct": rsu.total_equity_grant_pct / 100.0,  # Convert % to decimal
            "target_exit_valuation": rsu.exit_valuation,
            "simulate_dilution": rsu.simulate_dilution,
            "dilution_rounds": rsu.dilution_rounds,
        }
        # Options params empty but present for compatibility
        internal_startup["options_params"] = {}
    else:
        options = cast("StockOptionsParams", startup)
        internal_startup["options_params"] = {
            "num_options": options.num_options,
            "strike_price": options.strike_price,
            "target_exit_price_per_share": options.exit_price_per_share,
            "exercise_strategy": (
                "Exercise After Vesting" if options.exercise_strategy == "AFTER_VESTING" else "At Exit"
            ),
            "exercise_year": options.exercise_year,
        }
        # RSU params empty but present for compatibility
        internal_startup["rsu_params"] = {}

    return {
        "exit_year": typed_params.exit_year,
        "current_job_monthly_salary": typed_params.current_job_monthly_salary,
        "startup_monthly_salary": typed_params.startup_monthly_salary,
        "current_job_salary_growth_rate": typed_params.current_job_salary_growth_rate,
        "annual_roi": typed_params.annual_roi,
        "investment_frequency": typed_params.investment_frequency,
        "failure_probability": typed_params.failure_probability,
        "startup_params": internal_startup,
    }


def convert_sim_param_configs_to_internal(
    configs: dict[VariableParam, SimParamRange],
) -> dict[str, Any]:
    """Convert typed sim_param_configs to internal format for calculations.

    The calculation functions expect:
    - PERT distribution: {"min_val": x, "max_val": y, "mode": z}
    - Normal distribution (for ROI): {"mean": x, "std_dev": y}

    The typed API uses simple min/max ranges. We convert to PERT with
    mode = midpoint, and for ROI we use mean = midpoint with std_dev
    covering the range.

    Args:
        configs: Dictionary mapping VariableParam enum to SimParamRange

    Returns:
        Dictionary in the internal format expected by calculation functions
    """
    internal: dict[str, Any] = {}

    for param, range_val in configs.items():
        internal_key = _VARIABLE_PARAM_TO_INTERNAL_KEY.get(param.value, param.value)
        midpoint = (range_val.min + range_val.max) / 2.0

        if internal_key == "roi":
            # ROI uses Normal distribution
            # std_dev chosen so ~95% of values fall within the range (2 std devs)
            std_dev = (range_val.max - range_val.min) / 4.0
            internal[internal_key] = {
                "mean": midpoint,
                "std_dev": std_dev,
            }
        else:
            # All other params use PERT distribution
            internal[internal_key] = {
                "min_val": range_val.min,
                "max_val": range_val.max,
                "mode": midpoint,
            }

    return internal


def convert_typed_startup_params_to_internal(
    startup: RSUParams | StockOptionsParams,
) -> dict[str, Any]:
    """Convert typed startup params to internal format for calculate_startup_scenario.

    This is used by StartupScenarioRequest where we only have startup_params,
    not the full TypedBaseParams.

    Args:
        startup: RSUParams or StockOptionsParams Pydantic model

    Returns:
        Dictionary in the internal format expected by calculation functions
    """
    internal: dict[str, Any] = {
        "equity_type": EquityType(startup.equity_type),
        "total_vesting_years": startup.vesting_period,
        "cliff_years": startup.cliff_period,
    }

    if startup.equity_type == "RSU":
        rsu = cast("RSUParams", startup)
        internal["rsu_params"] = {
            "equity_pct": rsu.total_equity_grant_pct / 100.0,
            "target_exit_valuation": rsu.exit_valuation,
            "simulate_dilution": rsu.simulate_dilution,
            "dilution_rounds": rsu.dilution_rounds,
        }
        internal["options_params"] = {}
    else:
        options = cast("StockOptionsParams", startup)
        internal["options_params"] = {
            "num_options": options.num_options,
            "strike_price": options.strike_price,
            "target_exit_price_per_share": options.exit_price_per_share,
            "exercise_strategy": (
                "Exercise After Vesting" if options.exercise_strategy == "AFTER_VESTING" else "At Exit"
            ),
            "exercise_year": options.exercise_year,
        }
        internal["rsu_params"] = {}

    return internal
