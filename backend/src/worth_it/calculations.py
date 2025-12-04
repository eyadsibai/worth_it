"""
Core calculation functions for financial analysis.

This module provides functions to calculate opportunity costs, startup equity
scenarios (RSUs and Stock Options), dilution, IRR, NPV, and run Monte Carlo simulations.
It is designed to be independent of the Streamlit UI.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

import numpy as np
import numpy_financial as npf
import pandas as pd
from scipy import stats


class EquityType(str, Enum):
    """Enum for different types of equity."""

    RSU = "Equity (RSUs)"
    STOCK_OPTIONS = "Stock Options"


def annual_to_monthly_roi(annual_roi: float | np.ndarray) -> float | np.ndarray:
    """Converts an annual Return on Investment (ROI) to its monthly equivalent."""
    result = (1 + annual_roi) ** (1 / 12) - 1
    if isinstance(annual_roi, float):
        return float(result)
    return result


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
    options_params: dict | None = None,
    startup_params: dict | None = None,
) -> pd.DataFrame:
    """
    Calculates the future value (opportunity cost) of the forgone surplus for each year.
    Handles stock option exercise costs and tracks cash from secondary sales separately.

    Cash from equity sales is NOT included in the opportunity cost calculation because
    it represents startup-side wealth, not foregone BigCorp earnings. Instead, it's
    tracked in a separate "Cash From Sale (FV)" column that gets added to the final
    payout value in calculate_startup_scenario().
    """
    if monthly_df.empty:
        return pd.DataFrame()

    monthly_df_copy = monthly_df.copy()

    # --- Handle Cash from Equity Sales ---
    equity_type = startup_params.get("equity_type") if startup_params else None
    if equity_type and equity_type.value == "Equity (RSUs)" and startup_params is not None:
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
    annual_surplus = monthly_df_copy.groupby("Year")["MonthlySurplus"].sum()
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


def calculate_dilution_from_valuation(pre_money_valuation: float, amount_raised: float) -> float:
    """Calculates the dilution percentage from a fundraising round."""
    if pre_money_valuation <= 0 or amount_raised < 0:
        return 0.0
    post_money_valuation = pre_money_valuation + amount_raised
    return amount_raised / post_money_valuation


def calculate_startup_scenario(
    opportunity_cost_df: pd.DataFrame, startup_params: dict[str, Any]
) -> dict[str, Any]:
    """
    Calculates the financial outcomes for a given startup equity package.
    This function handles both RSU and Stock Option scenarios.

    Args:
        opportunity_cost_df: DataFrame from calculate_annual_opportunity_cost.
        startup_params: A dictionary containing all startup-related inputs.

    Returns:
        A dictionary containing the results DataFrame and key financial metrics.
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

    if equity_type.value == "Equity (RSUs)":
        rsu_params = startup_params["rsu_params"]
        initial_equity_pct = rsu_params.get("equity_pct", 0.0)
        diluted_equity_pct = initial_equity_pct
        total_dilution = 0.0

        if startup_params.get("simulated_dilution") is not None:
            total_dilution = startup_params["simulated_dilution"]
            diluted_equity_pct = initial_equity_pct * (1 - total_dilution)
            results_df["CumulativeDilution"] = 1 - total_dilution
            sorted_rounds = []
        elif rsu_params.get("simulate_dilution") and rsu_params.get("dilution_rounds"):
            sorted_rounds = sorted(rsu_params["dilution_rounds"], key=lambda r: r["year"])

            # Handle SAFE note conversion timing
            # SAFE notes don't dilute immediately - they convert at the next priced round

            # First, determine conversion timing for SAFE notes
            safe_conversion_year = {}  # Map SAFE rounds to their conversion year
            for r in sorted_rounds:
                if r.get("is_safe_note", False):
                    # Find the next priced round after this SAFE
                    conversion_year = None
                    for future_round in sorted_rounds:
                        if (
                            not future_round.get("is_safe_note", False)
                            and future_round["year"] >= r["year"]
                        ):
                            conversion_year = future_round["year"]
                            break
                    safe_conversion_year[id(r)] = conversion_year

            # Now calculate yearly dilution factors
            yearly_dilution_factors = []
            for year in results_df.index:
                cumulative_dilution_factor = 1.0

                # Apply dilution from all rounds that should affect this year
                for r in sorted_rounds:
                    is_safe = r.get("is_safe_note", False)
                    dilution = r.get("dilution", 0)

                    if is_safe:
                        # SAFE: only dilutes at conversion year
                        conversion_year = safe_conversion_year.get(id(r))
                        if conversion_year is not None and year >= conversion_year:
                            cumulative_dilution_factor *= 1 - dilution
                    else:
                        # Priced round: dilutes at its own year
                        if r["year"] <= year:
                            cumulative_dilution_factor *= 1 - dilution

                yearly_dilution_factors.append(cumulative_dilution_factor)

            results_df["CumulativeDilution"] = yearly_dilution_factors
            total_dilution = 1 - results_df["CumulativeDilution"].iloc[-1]
            diluted_equity_pct = initial_equity_pct * results_df["CumulativeDilution"].iloc[-1]
        else:
            results_df["CumulativeDilution"] = 1.0
            total_dilution = 0.0
            diluted_equity_pct = initial_equity_pct
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
        np.where(
            vested_options_series > 0,
            opportunity_cost / vested_options_series,
            np.inf,  # Breakeven not achievable when no options are vested
        )
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


def calculate_irr(monthly_surpluses: pd.Series, final_payout_value: float) -> float:
    """
    Calculates the annualized Internal Rate of Return (IRR) based on monthly cash flows.
    """
    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return float(np.nan)

    cash_flows.iloc[-1] += final_payout_value

    if not (any(cash_flows > 0) and any(cash_flows < 0)):
        return float(np.nan)

    try:
        monthly_irr = npf.irr(cash_flows)
        if pd.isna(monthly_irr):
            return float(np.nan)
        return float(((1 + monthly_irr) ** 12 - 1) * 100)
    except (ValueError, TypeError):
        return float(np.nan)


def calculate_npv(
    monthly_surpluses: pd.Series, annual_roi: float, final_payout_value: float
) -> float:
    """
    Calculates the Net Present Value of the investment.
    """
    monthly_roi = annual_to_monthly_roi(annual_roi)
    if pd.isna(monthly_roi) or monthly_roi <= -1:
        return float(np.nan)

    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return float(np.nan)

    cash_flows.iloc[-1] += final_payout_value

    try:
        return float(npf.npv(monthly_roi, cash_flows))
    except (ValueError, TypeError):
        return float(np.nan)


def get_random_variates_pert(
    num_simulations: int, config: dict | None, default_val: float
) -> np.ndarray:
    """Generates random numbers based on a PERT distribution."""
    if not config:
        return np.full(num_simulations, default_val)

    min_val, max_val, mode = config["min_val"], config["max_val"], config["mode"]

    # Handle the case where max_val equals min_val
    if max_val == min_val:
        return np.full(num_simulations, min_val)

    gamma = 4.0
    alpha = 1 + gamma * (mode - min_val) / (max_val - min_val)
    beta = 1 + gamma * (max_val - mode) / (max_val - min_val)

    result: np.ndarray = stats.beta.rvs(
        a=alpha, b=beta, scale=(max_val - min_val), loc=min_val, size=num_simulations
    )
    return result


def run_monte_carlo_simulation(
    num_simulations: int,
    base_params: dict[str, Any],
    sim_param_configs: dict[str, Any],
) -> dict[str, np.ndarray]:
    """
    Prepares parameters and runs the appropriate Monte Carlo simulation.
    """
    # If exit year is simulated, the calculation must be iterative.
    if "exit_year" in sim_param_configs:
        return run_monte_carlo_simulation_iterative(num_simulations, base_params, sim_param_configs)

    # --- Prepare a complete sim_params dictionary for vectorization ---
    sim_params = {}

    # Handle ROI (Normal distribution)
    if "roi" in sim_param_configs:
        roi_config = sim_param_configs["roi"]
        sim_params["roi"] = stats.norm.rvs(
            loc=roi_config["mean"], scale=roi_config["std_dev"], size=num_simulations
        )
    else:
        sim_params["roi"] = np.full(num_simulations, base_params["annual_roi"])

    # Handle Valuation (PERT distribution)
    if "valuation" in sim_param_configs:
        sim_params["valuation"] = get_random_variates_pert(
            num_simulations, sim_param_configs["valuation"], 0
        )
    else:
        default_valuation = base_params["startup_params"]["rsu_params"].get(
            "target_exit_valuation"
        ) or base_params["startup_params"]["options_params"].get("target_exit_price_per_share")
        sim_params["valuation"] = np.full(num_simulations, default_valuation)

    # Handle Salary Growth (PERT distribution)
    if "salary_growth" in sim_param_configs:
        sim_params["salary_growth"] = get_random_variates_pert(
            num_simulations, sim_param_configs["salary_growth"], 0
        )
    else:
        sim_params["salary_growth"] = np.full(
            num_simulations, base_params["current_job_salary_growth_rate"]
        )

    # Handle Dilution (PERT distribution)
    if "dilution" in sim_param_configs:
        sim_params["dilution"] = get_random_variates_pert(
            num_simulations, sim_param_configs["dilution"], np.nan
        )
    else:
        sim_params["dilution"] = np.full(num_simulations, np.nan)

    return run_monte_carlo_simulation_vectorized(num_simulations, base_params, sim_params)


def run_monte_carlo_simulation_vectorized(
    num_simulations: int, base_params: dict[str, Any], sim_params: dict[str, np.ndarray]
) -> dict[str, np.ndarray]:
    """
    Vectorized calculation for fixed exit year simulations.
    """
    exit_year = base_params["exit_year"]
    total_months = exit_year * 12

    month_indices = np.arange(total_months)
    year_indices = month_indices // 12
    current_salaries = base_params["current_job_monthly_salary"] * (
        (1 + sim_params["salary_growth"][:, np.newaxis]) ** year_indices
    )
    monthly_surpluses = current_salaries - base_params["startup_monthly_salary"]
    investable_surpluses = np.clip(monthly_surpluses, 0, None)

    # Calculate opportunity cost from investable surplus (without exercise costs)
    if base_params["investment_frequency"] == "Monthly":
        monthly_rois = (1 + sim_params["roi"]) ** (1 / 12) - 1
        months_to_grow = np.arange(total_months - 1, -1, -1)
        fv_factors = (1 + monthly_rois[:, np.newaxis]) ** months_to_grow
        final_opportunity_cost = (investable_surpluses * fv_factors).sum(axis=1)
    else:
        annual_investable_surpluses = np.array(
            [
                np.sum(investable_surpluses[i].reshape(-1, 12), axis=1)
                for i in range(num_simulations)
            ]
        )
        years_to_grow = exit_year - np.arange(1, exit_year + 1)
        fv_factors = (1 + sim_params["roi"][:, np.newaxis]) ** years_to_grow
        final_opportunity_cost = (annual_investable_surpluses * fv_factors).sum(axis=1)

    # Handle stock option exercise costs separately (as additional outflow)
    # Exercise costs should REDUCE the net outcome, not increase it
    exercise_costs_fv = np.zeros(num_simulations)
    options_params = base_params["startup_params"].get("options_params", {})

    if options_params and options_params.get("exercise_strategy") == "Exercise After Vesting":
        exercise_year = options_params.get("exercise_year", 0)
        if exercise_year <= exit_year:
            exercise_month_index = (exercise_year * 12) - 1
            if 0 <= exercise_month_index < total_months:
                num_options = options_params.get("num_options", 0)
                strike_price = options_params.get("strike_price", 0)
                total_exercise_cost = num_options * strike_price

                # Calculate future value of exercise cost
                if base_params["investment_frequency"] == "Monthly":
                    months_remaining = total_months - 1 - exercise_month_index
                    exercise_costs_fv = total_exercise_cost * (
                        (1 + monthly_rois) ** months_remaining
                    )
                else:
                    years_remaining = exit_year - exercise_year
                    exercise_costs_fv = total_exercise_cost * (
                        (1 + sim_params["roi"]) ** years_remaining
                    )

    startup_params = base_params["startup_params"]
    final_vested_pct = np.clip((exit_year / startup_params["total_vesting_years"]), 0, 1)
    if exit_year < startup_params["cliff_years"]:
        final_vested_pct = 0

    if startup_params["equity_type"].value == "Equity (RSUs)":
        rsu_params = startup_params["rsu_params"]

        if "dilution" in sim_params and not np.all(np.isnan(sim_params["dilution"])):
            cumulative_dilution: float | np.ndarray = 1 - sim_params["dilution"]
        else:
            cumulative_dilution = 1.0
            if rsu_params.get("simulate_dilution") and rsu_params.get("dilution_rounds"):
                for r in sorted(rsu_params["dilution_rounds"], key=lambda r: r["year"]):
                    if r["year"] <= exit_year:
                        cumulative_dilution *= 1 - r.get("dilution", 0)

        # Calculate remaining equity factor from secondary sales
        remaining_equity_factor = 1.0
        cash_from_sales_fv = 0.0

        if rsu_params.get("simulate_dilution") and rsu_params.get("dilution_rounds"):
            sorted_rounds = sorted(rsu_params["dilution_rounds"], key=lambda r: r["year"])
            initial_equity_pct = rsu_params.get("equity_pct", 0.0)

            for r in sorted_rounds:
                if "percent_to_sell" in r and r["percent_to_sell"] > 0:
                    sale_year = r["year"]

                    # Only process sales before or at exit year
                    if sale_year <= exit_year:
                        # Calculate vested percentage at sale time
                        vested_pct_at_sale = np.clip(
                            (sale_year / startup_params["total_vesting_years"]), 0, 1
                        )
                        if sale_year < startup_params["cliff_years"]:
                            vested_pct_at_sale = 0

                        # Calculate cumulative dilution factor before this sale
                        cumulative_dilution_before_sale = 1.0
                        cumulative_sold_before_sale = 1.0
                        for prev_r in sorted_rounds:
                            if prev_r["year"] < sale_year:
                                cumulative_dilution_before_sale *= 1 - prev_r.get("dilution", 0)
                                if "percent_to_sell" in prev_r and prev_r["percent_to_sell"] > 0:
                                    cumulative_sold_before_sale *= 1 - prev_r["percent_to_sell"]

                        # Calculate equity at sale
                        equity_at_sale = (
                            initial_equity_pct
                            * cumulative_dilution_before_sale
                            * cumulative_sold_before_sale
                        )

                        # Calculate cash from this sale
                        # Note: We only receive cash for the vested portion; anything beyond that is forfeited
                        # The UI slider limits percent_to_sell to vested_pct, but we validate here too
                        effective_sell_pct = min(vested_pct_at_sale, r["percent_to_sell"])
                        cash_from_sale = (
                            equity_at_sale * r.get("valuation_at_sale", 0) * effective_sell_pct
                        )

                        # Calculate future value of this cash
                        years_to_grow = exit_year - sale_year
                        if base_params["investment_frequency"] == "Monthly":
                            monthly_roi = annual_to_monthly_roi(sim_params["roi"][:, np.newaxis])
                            months_to_grow = years_to_grow * 12
                            fv_cash = cash_from_sale * ((1 + monthly_roi) ** months_to_grow)
                        else:  # Annually
                            fv_cash = cash_from_sale * (
                                (1 + sim_params["roi"][:, np.newaxis]) ** years_to_grow
                            )

                        cash_from_sales_fv += fv_cash.flatten()

                        # Update remaining equity factor
                        remaining_equity_factor *= 1 - r["percent_to_sell"]

        final_equity_pct = rsu_params.get("equity_pct", 0.0) * cumulative_dilution
        final_payout_value = (
            sim_params["valuation"] * final_equity_pct * final_vested_pct * remaining_equity_factor
        )

        # Add cash from equity sales
        final_payout_value = final_payout_value + cash_from_sales_fv
    else:
        options_params = startup_params["options_params"]
        final_vested_options = options_params.get("num_options", 0) * final_vested_pct
        profit_per_share = np.maximum(
            0, sim_params["valuation"] - options_params.get("strike_price", 0)
        )
        final_payout_value = profit_per_share * final_vested_options

    # Incorporate failure probability
    failure_mask = np.random.rand(num_simulations) < base_params["failure_probability"]
    final_payout_value[failure_mask] = 0

    # Calculate net outcomes: payout - opportunity cost - exercise costs
    # Exercise costs are subtracted to ensure spending money to exercise reduces the outcome
    net_outcomes = final_payout_value - final_opportunity_cost - exercise_costs_fv

    return {
        "net_outcomes": net_outcomes,
        "simulated_valuations": sim_params.get("valuation", np.array([])),
    }


def run_monte_carlo_simulation_iterative(
    num_simulations: int,
    base_params: dict[str, Any],
    sim_param_configs: dict[str, Any],
) -> dict[str, np.ndarray]:
    """
    Iterative (slower) version for when simulating the exit year.
    """
    sim_params = {}
    sim_params["exit_year"] = get_random_variates_pert(
        num_simulations, sim_param_configs.get("exit_year"), base_params["exit_year"]
    ).astype(int)

    if "yearly_valuation" in sim_param_configs:
        yearly_valuation = sim_param_configs["yearly_valuation"]
        valuations = []
        for year in sim_params["exit_year"]:
            # Ensure year is treated as a string key
            config = yearly_valuation.get(str(year), list(yearly_valuation.values())[0])
            valuations.append(get_random_variates_pert(1, config, config["mode"])[0])
        sim_params["valuation"] = np.array(valuations)
    elif "valuation" in sim_param_configs:
        sim_params["valuation"] = get_random_variates_pert(
            num_simulations, sim_param_configs["valuation"], 0
        )

    # Handle other variables
    if "roi" in sim_param_configs:
        roi_config = sim_param_configs["roi"]
        sim_params["roi"] = stats.norm.rvs(
            loc=roi_config["mean"], scale=roi_config["std_dev"], size=num_simulations
        )
    else:
        sim_params["roi"] = np.full(num_simulations, base_params["annual_roi"])

    sim_params["salary_growth"] = get_random_variates_pert(
        num_simulations,
        sim_param_configs.get("salary_growth"),
        base_params["current_job_salary_growth_rate"],
    )
    sim_params["dilution"] = get_random_variates_pert(
        num_simulations, sim_param_configs.get("dilution"), np.nan
    )

    net_outcomes_list: list[float] = []
    final_opportunity_costs_list: list[float] = []
    for i in range(num_simulations):
        exit_year_sim = int(sim_params["exit_year"][i])

        # Create sim_startup_params first so we can pass it to calculate_annual_opportunity_cost
        sim_startup_params = base_params["startup_params"].copy()
        sim_startup_params["exit_year"] = exit_year_sim
        dilution_val = sim_params["dilution"][i]
        sim_startup_params["simulated_dilution"] = (
            dilution_val if not np.isnan(dilution_val) else None
        )

        if sim_startup_params["equity_type"].value == "Equity (RSUs)":
            sim_startup_params["rsu_params"] = sim_startup_params["rsu_params"].copy()
            sim_startup_params["rsu_params"]["target_exit_valuation"] = sim_params["valuation"][i]
        else:
            sim_startup_params["options_params"] = sim_startup_params["options_params"].copy()
            sim_startup_params["options_params"]["target_exit_price_per_share"] = sim_params[
                "valuation"
            ][i]

        monthly_df = create_monthly_data_grid(
            exit_year_sim,
            base_params["current_job_monthly_salary"],
            base_params["startup_monthly_salary"],
            sim_params["salary_growth"][i],
            dilution_rounds=sim_startup_params.get("rsu_params", {}).get("dilution_rounds"),
        )

        opportunity_cost_df = calculate_annual_opportunity_cost(
            monthly_df,
            sim_params["roi"][i],
            base_params["investment_frequency"],
            options_params=sim_startup_params.get("options_params"),
            startup_params=sim_startup_params,
        )
        final_opportunity_costs_list.append(
            opportunity_cost_df["Opportunity Cost (Invested Surplus)"].iloc[-1]
        )

        results = calculate_startup_scenario(opportunity_cost_df, sim_startup_params)
        net_outcome = results["final_payout_value"] - results["final_opportunity_cost"]
        net_outcomes_list.append(net_outcome)

    net_outcomes: np.ndarray = np.array(net_outcomes_list)
    final_opportunity_costs: np.ndarray = np.array(final_opportunity_costs_list)

    # Incorporate failure probability
    failure_mask = np.random.rand(num_simulations) < base_params["failure_probability"]
    net_outcomes[failure_mask] = -final_opportunity_costs[failure_mask]

    return {
        "net_outcomes": net_outcomes,
        "simulated_valuations": sim_params.get("valuation", np.array([])),
    }


def run_sensitivity_analysis(base_params: dict, sim_param_configs: dict) -> pd.DataFrame:
    """Runs a sensitivity analysis on simulated variables."""
    impacts = []
    num_simulations_sensitivity = 500

    simulated_vars = {k: v for k, v in sim_param_configs.items() if v}  # Filter out empty configs

    for var, config in simulated_vars.items():
        # --- Determine low and high values based on distribution ---
        if "mean" in config:  # Normal distribution for ROI
            low_val = stats.norm.ppf(0.1, loc=config["mean"], scale=config["std_dev"])
            high_val = stats.norm.ppf(0.9, loc=config["mean"], scale=config["std_dev"])
        else:  # PERT distribution for others
            min_val, max_val, mode = config["min_val"], config["max_val"], config["mode"]
            if max_val == min_val:
                continue
            gamma = 4.0
            alpha = 1 + gamma * (mode - min_val) / (max_val - min_val)
            beta = 1 + gamma * (max_val - mode) / (max_val - min_val)
            low_val = stats.beta.ppf(0.1, a=alpha, b=beta, loc=min_val, scale=max_val - min_val)
            high_val = stats.beta.ppf(0.9, a=alpha, b=beta, loc=min_val, scale=max_val - min_val)

        # --- Base case (all others at mode/mean) ---
        base_case_sim_params = {}
        for other_var, other_config in simulated_vars.items():
            if "mean" in other_config:
                base_case_sim_params[other_var] = np.full(
                    num_simulations_sensitivity, other_config["mean"]
                )
            else:
                base_case_sim_params[other_var] = np.full(
                    num_simulations_sensitivity, other_config["mode"]
                )
        # Ensure all required keys are present, falling back to base_params if not simulated
        if "salary_growth" not in base_case_sim_params:
            base_case_sim_params["salary_growth"] = np.full(
                num_simulations_sensitivity,
                base_params["current_job_salary_growth_rate"],
            )

        # --- Run with low value ---
        low_sim_params = base_case_sim_params.copy()
        low_sim_params[var] = np.full(num_simulations_sensitivity, low_val)
        low_results = run_monte_carlo_simulation_vectorized(
            num_simulations_sensitivity, base_params, low_sim_params
        )
        low_mean_outcome = low_results["net_outcomes"].mean()

        # --- Run with high value ---
        high_sim_params = base_case_sim_params.copy()
        high_sim_params[var] = np.full(num_simulations_sensitivity, high_val)
        high_results = run_monte_carlo_simulation_vectorized(
            num_simulations_sensitivity, base_params, high_sim_params
        )
        high_mean_outcome = high_results["net_outcomes"].mean()

        impacts.append(
            {
                "Variable": var.replace("_", " ").title(),
                "Low": low_mean_outcome,
                "High": high_mean_outcome,
                "Impact": high_mean_outcome - low_mean_outcome,
            }
        )

    return pd.DataFrame(impacts).sort_values(by="Impact", ascending=False)
