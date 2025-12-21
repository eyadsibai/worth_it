"""
Startup equity scenario calculation functions.

This module handles the calculation of financial outcomes for startup
equity packages, supporting both RSU and Stock Option scenarios.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from worth_it.calculations.base import EquityType
from worth_it.calculations.dilution_engine import calculate_dilution_schedule


def calculate_startup_scenario(
    opportunity_cost_df: pd.DataFrame, startup_params: dict[str, Any]
) -> dict[str, Any]:
    """
    Calculates the financial outcomes for a given startup equity package.

    This function handles both RSU and Stock Option scenarios, computing:
    - Vested equity percentage over time
    - Dilution effects from funding rounds
    - Final payout value based on exit valuation
    - Breakeven values for the equity

    Args:
        opportunity_cost_df: DataFrame from calculate_annual_opportunity_cost
        startup_params: Dictionary containing all startup-related inputs including:
            - equity_type: EquityType enum
            - total_vesting_years: Total years for full vesting
            - cliff_years: Years before any vesting occurs
            - exit_year: Expected exit year
            - rsu_params or options_params: Type-specific parameters

    Returns:
        Dictionary containing:
        - results_df: DataFrame with yearly calculations
        - final_payout_value: Total value at exit
        - final_opportunity_cost: Total opportunity cost at exit
        - payout_label: Display label for payout
        - breakeven_label: Display label for breakeven
        - (RSU only) total_dilution, diluted_equity_pct
    """
    equity_type = startup_params["equity_type"]
    total_vesting_years = startup_params["total_vesting_years"]
    cliff_years = startup_params["cliff_years"]
    exit_year = startup_params.get("exit_year", 0)

    if opportunity_cost_df.empty:
        return {
            "results_df": pd.DataFrame(),
            "final_payout_value": 0,
            "final_opportunity_cost": 0,
            "payout_label": "Your Equity Value",
            "breakeven_label": "Breakeven Value",
        }

    results_df = opportunity_cost_df.copy()

    # Calculate vested percentage over time, respecting the cliff and capping at 100%
    years = results_df.index
    vested_equity_pct = np.where(
        years >= cliff_years,
        np.clip((years / total_vesting_years) * 100, 0, 100),
        0,
    )
    results_df["Vested Equity (%)"] = vested_equity_pct

    output = {}

    if equity_type == EquityType.RSU:
        rsu_params = startup_params["rsu_params"]
        initial_equity_pct = rsu_params.get("equity_pct", 0.0)
        diluted_equity_pct = initial_equity_pct
        total_dilution = 0.0

        # Calculate dilution using the dilution engine
        dilution_rounds = rsu_params.get("dilution_rounds") if rsu_params.get("simulate_dilution") else None
        dilution_result = calculate_dilution_schedule(
            years=results_df.index,
            rounds=dilution_rounds,
            simulated_dilution=startup_params.get("simulated_dilution"),
        )
        results_df["CumulativeDilution"] = dilution_result.yearly_factors
        total_dilution = dilution_result.total_dilution
        diluted_equity_pct = initial_equity_pct * dilution_result.yearly_factors[-1]

        # Build sorted_rounds for equity sale calculations
        if dilution_rounds:
            sorted_rounds = sorted(dilution_rounds, key=lambda r: r["year"])
        else:
            sorted_rounds = []

        # --- Account for Sold Equity ---
        # Only consider equity sales that happen before or at the exit year
        remaining_equity_factor = 1.0
        for r in sorted_rounds:
            if "percent_to_sell" in r and r["percent_to_sell"] > 0:
                if r["year"] <= exit_year:
                    remaining_equity_factor *= 1 - r["percent_to_sell"]

        final_vested_equity_pct = (
            results_df["Vested Equity (%)"].iloc[-1] / 100
        ) * initial_equity_pct
        final_payout_value = (
            rsu_params.get("target_exit_valuation", 0)
            * final_vested_equity_pct
            * (1 - total_dilution)
            * remaining_equity_factor
        )

        # Add the future value of cash from equity sales to the payout
        # This cash is startup-side wealth, not opportunity cost
        if "Cash From Sale (FV)" in results_df.columns:
            final_payout_value += results_df["Cash From Sale (FV)"].iloc[-1]

        yearly_diluted_equity_pct = initial_equity_pct * results_df["CumulativeDilution"]
        breakeven_vesting_pct = (results_df["Vested Equity (%)"] / 100) * yearly_diluted_equity_pct

        # Calculate breakeven value: opportunity_cost / vesting_pct
        # When vesting_pct is 0, breakeven is infinite (not achievable)
        opportunity_cost = results_df["Opportunity Cost (Invested Surplus)"]
        results_df["Breakeven Value"] = np.where(
            breakeven_vesting_pct > 0,
            opportunity_cost / breakeven_vesting_pct,
            np.inf,  # Breakeven not achievable when no equity is vested
        )

        results_df["Vested Equity (%)"] = (
            (results_df["Vested Equity (%)"] / 100) * yearly_diluted_equity_pct * 100
        )

        output.update(
            {
                "payout_label": "Your Equity Value (Post-Dilution)",
                "breakeven_label": "Breakeven Valuation (SAR)",
                "total_dilution": total_dilution,
                "diluted_equity_pct": diluted_equity_pct,
            }
        )

    else:  # Stock Options
        options_params = startup_params["options_params"]
        num_options = options_params.get("num_options", 0)
        strike_price = options_params.get("strike_price", 0)

        vested_options_series = (results_df["Vested Equity (%)"] / 100) * num_options

        final_payout_value = (
            max(0, options_params.get("target_exit_price_per_share", 0) - strike_price)
            * vested_options_series.iloc[-1]
        )

        # Calculate breakeven price per share: (opportunity_cost / vested_options) + strike_price
        # When vested_options is 0, breakeven is infinite (not achievable)
        opportunity_cost = results_df["Opportunity Cost (Invested Surplus)"]
        results_df["Breakeven Value"] = np.where(
            vested_options_series > 0,
            (opportunity_cost / vested_options_series) + strike_price,
            np.inf,
        )

        output.update(
            {
                "payout_label": "Your Options Value",
                "breakeven_label": "Breakeven Price/Share (SAR)",
            }
        )
    output.update(
        {
            "results_df": results_df,
            "final_payout_value": final_payout_value,
            "final_opportunity_cost": results_df["Opportunity Cost (Invested Surplus)"].iloc[-1],
        }
    )

    return output
