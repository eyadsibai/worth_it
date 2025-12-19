"""
Opportunity cost calculation functions.

This module handles the creation of monthly data grids and calculation
of opportunity costs for startup equity decisions.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from worth_it.calculations.base import EquityType, annual_to_monthly_roi


def create_monthly_data_grid(
    exit_year: int,
    current_job_monthly_salary: float,
    startup_monthly_salary: float,
    current_job_salary_growth_rate: float,
    dilution_rounds: list | None = None,
) -> pd.DataFrame:
    """
    Creates a DataFrame with one row per month, calculating salaries, surplus,
    and any cash injections from secondary sales.

    Args:
        exit_year: Expected exit year (determines total months in grid)
        current_job_monthly_salary: Monthly salary at current BigCorp job
        startup_monthly_salary: Monthly salary at startup
        current_job_salary_growth_rate: Annual salary growth rate at current job
        dilution_rounds: Optional list of funding rounds that may include salary changes

    Returns:
        DataFrame with columns: Year, CurrentJobSalary, StartupSalary,
        MonthlySurplus, InvestableSurplus, ExerciseCost, CashFromSale
    """
    if exit_year is None:
        exit_year = 0

    total_months = exit_year * 12
    df = pd.DataFrame(index=pd.RangeIndex(total_months, name="MonthIndex"))
    df["Year"] = df.index // 12 + 1

    # --- Calculate Current Job Salary (Vectorized) ---
    year_index = df.index // 12
    df["CurrentJobSalary"] = current_job_monthly_salary * (
        (1 + current_job_salary_growth_rate) ** year_index
    )

    # --- Calculate Startup Salary with Mid-stream Changes ---
    df["StartupSalary"] = startup_monthly_salary
    if dilution_rounds:
        sorted_rounds = sorted(dilution_rounds, key=lambda r: r["year"])
        for r in sorted_rounds:
            if "new_salary" in r and r["new_salary"] > 0:
                # Handle year 0 (inception): max ensures year 0 maps to month 0
                start_month = max(0, (r["year"] - 1) * 12)
                df.loc[start_month:, "StartupSalary"] = r["new_salary"]

    df["MonthlySurplus"] = df["CurrentJobSalary"] - df["StartupSalary"]
    df["InvestableSurplus"] = df["MonthlySurplus"].clip(lower=0)
    df["ExerciseCost"] = 0
    df["CashFromSale"] = 0

    return df


def calculate_annual_opportunity_cost(
    monthly_df: pd.DataFrame,
    annual_roi: float,
    investment_frequency: str,
    options_params: dict[str, Any] | None = None,
    startup_params: dict[str, Any] | None = None,
) -> pd.DataFrame:
    """
    Calculates the future value (opportunity cost) of the forgone surplus for each year.

    Handles stock option exercise costs and tracks cash from secondary sales separately.

    Cash from equity sales is NOT included in the opportunity cost calculation because
    it represents startup-side wealth, not foregone BigCorp earnings. Instead, it's
    tracked in a separate "Cash From Sale (FV)" column that gets added to the final
    payout value in calculate_startup_scenario().

    Args:
        monthly_df: DataFrame from create_monthly_data_grid
        annual_roi: Expected annual return on investments
        investment_frequency: "Monthly" or "Annually"
        options_params: Optional stock options parameters
        startup_params: Optional startup parameters including equity type and RSU details

    Returns:
        DataFrame with annual opportunity cost calculations
    """
    if monthly_df.empty:
        return pd.DataFrame()

    monthly_df_copy = monthly_df.copy()

    # --- Handle Cash from Equity Sales ---
    equity_type = startup_params.get("equity_type") if startup_params else None
    if equity_type and equity_type == EquityType.RSU and startup_params is not None:
        # Type guard for type checker - startup_params is guaranteed non-None here
        rsu_params = startup_params["rsu_params"]
        dilution_rounds = rsu_params.get("dilution_rounds", [])
        initial_equity_pct = rsu_params.get("equity_pct", 0)
        total_vesting_years = startup_params["total_vesting_years"]
        cliff_years = startup_params["cliff_years"]

        for r in dilution_rounds:
            if "percent_to_sell" in r and r["percent_to_sell"] > 0:
                sale_year = r["year"]
                # Calculate vested percentage at the time of sale
                vested_pct_at_sale = np.where(
                    sale_year >= cliff_years,
                    np.clip((sale_year / total_vesting_years), 0, 1),
                    0,
                )

                # Find cumulative dilution factor and cumulative sold equity factor up to the year *before* the sale
                cumulative_dilution_factor = 1.0
                cumulative_sold_factor = 1.0
                for prev_r in dilution_rounds:
                    if prev_r["year"] < sale_year:
                        cumulative_dilution_factor *= 1 - prev_r.get("dilution", 0)
                        if "percent_to_sell" in prev_r and prev_r["percent_to_sell"] > 0:
                            cumulative_sold_factor *= 1 - prev_r["percent_to_sell"]

                # percent_to_sell is a percentage of remaining equity at the time of sale
                # (after accounting for both dilution and previous equity sales)
                # Note: If you attempt to sell more than the vested portion, you only receive cash for the vested portion,
                # and the unvested portion of the attempted sale is forfeited. The remaining equity is reduced by the full
                # percent_to_sell amount, not just the vested portion that generated cash.
                equity_at_sale = (
                    initial_equity_pct * cumulative_dilution_factor * cumulative_sold_factor
                )
                # Ensure we only get cash for vested equity (percent_to_sell is limited by UI but we validate here too)
                effective_sell_pct = min(float(vested_pct_at_sale), r["percent_to_sell"])
                cash_from_sale = equity_at_sale * r.get("valuation_at_sale", 0) * effective_sell_pct

                # Handle year 0: sales at year 0 happen at month 0 (inception)
                # Other years: sale at end of year (last month of that year)
                sale_month_index = 0 if sale_year == 0 else (sale_year * 12) - 1
                if 0 <= sale_month_index < len(monthly_df_copy):
                    monthly_df_copy.loc[sale_month_index, "CashFromSale"] += cash_from_sale

    # --- Handle Stock Option Exercise Costs ---
    if options_params and options_params.get("exercise_strategy") == "Exercise After Vesting":
        exercise_year = options_params.get("exercise_year", 0)
        exercise_month_index = (exercise_year * 12) - 1
        num_options = options_params.get("num_options", 0)
        strike_price = options_params.get("strike_price", 0)
        total_exercise_cost = num_options * strike_price

        if 0 <= exercise_month_index < len(monthly_df_copy):
            monthly_df_copy.loc[exercise_month_index, "ExerciseCost"] = total_exercise_cost

    # --- Calculate Future Value of Cash Flows ---
    results_df = pd.DataFrame(
        index=pd.RangeIndex(1, monthly_df_copy["Year"].max() + 1, name="Year")
    )

    # Add yearly salary aggregates for display in the frontend table
    annual_startup_salary = monthly_df_copy.groupby("Year")["StartupSalary"].sum()
    annual_current_job_salary = monthly_df_copy.groupby("Year")["CurrentJobSalary"].sum()
    annual_surplus = monthly_df_copy.groupby("Year")["MonthlySurplus"].sum()

    results_df["StartupSalary"] = annual_startup_salary
    results_df["CurrentJobSalary"] = annual_current_job_salary
    results_df["MonthlySurplus"] = (
        annual_surplus  # Yearly surplus (misleading name kept for compat)
    )

    principal_col_label = "Principal Forgone" if annual_surplus.sum() >= 0 else "Salary Gain"

    results_df[principal_col_label] = annual_surplus.cumsum()

    opportunity_costs = []
    cash_from_sale_future_values = []
    monthly_roi = annual_to_monthly_roi(annual_roi)
    annual_investable_surplus = monthly_df_copy.groupby("Year")["InvestableSurplus"].sum()
    annual_exercise_cost = monthly_df_copy.groupby("Year")["ExerciseCost"].sum()
    annual_cash_from_sale = monthly_df_copy.groupby("Year")["CashFromSale"].sum()

    for year_end in results_df.index:
        current_df = monthly_df_copy[monthly_df_copy["Year"] <= year_end]

        # Calculate opportunity cost from foregone salary (without exercise costs)
        # Exercise costs are treated as additional outflow and added separately
        if investment_frequency == "Monthly":
            months_to_grow = (year_end * 12) - current_df.index - 1

            # Future value of foregone salary that could be invested
            fv_investable_surplus = (
                current_df["InvestableSurplus"] * (1 + monthly_roi) ** months_to_grow
            ).sum()

            # Future value of exercise costs (additional cash outflow)
            fv_exercise_cost = (
                current_df["ExerciseCost"] * (1 + monthly_roi) ** months_to_grow
            ).sum()

            # Total opportunity cost includes both foregone salary and exercise costs
            fv_opportunity = fv_investable_surplus + fv_exercise_cost

            # Calculate future value of cash from sale separately
            cash_flow = current_df["CashFromSale"]
            fv_cash_from_sale = (cash_flow * (1 + monthly_roi) ** months_to_grow).sum()
        else:  # Annually
            annual_investable = annual_investable_surplus.reindex(
                range(1, year_end + 1), fill_value=0
            )
            annual_exercise = annual_exercise_cost.reindex(range(1, year_end + 1), fill_value=0)
            years_to_grow = year_end - annual_investable.index

            # Future value of foregone salary that could be invested
            fv_investable_surplus = (annual_investable * (1 + annual_roi) ** years_to_grow).sum()

            # Future value of exercise costs (additional cash outflow)
            fv_exercise_cost = (annual_exercise * (1 + annual_roi) ** years_to_grow).sum()

            # Total opportunity cost includes both foregone salary and exercise costs
            fv_opportunity = fv_investable_surplus + fv_exercise_cost

            # Calculate future value of cash from sale separately
            annual_cash = annual_cash_from_sale.reindex(range(1, year_end + 1), fill_value=0)
            fv_cash_from_sale = (annual_cash * (1 + annual_roi) ** years_to_grow).sum()

        opportunity_costs.append(fv_opportunity)
        cash_from_sale_future_values.append(fv_cash_from_sale)

    results_df["Opportunity Cost (Invested Surplus)"] = opportunity_costs
    results_df["Cash From Sale (FV)"] = cash_from_sale_future_values
    results_df["Investment Returns"] = results_df["Opportunity Cost (Invested Surplus)"] - (
        results_df[principal_col_label].clip(lower=0)
        - annual_exercise_cost.reindex(results_df.index, fill_value=0).cumsum()
    )

    results_df["Year"] = results_df.index
    return results_df
