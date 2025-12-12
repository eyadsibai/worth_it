"""
Response serializers and mappers for API responses.

This module handles transformation between backend data structures
and frontend-expected response formats. Centralizing these mappings
makes changes easier to track and test.
"""

from __future__ import annotations

from typing import Any, cast

import pandas as pd

from worth_it.calculations import EquityType

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
