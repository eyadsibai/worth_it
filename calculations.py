"""
Core calculation functions for financial analysis.

This module provides functions to calculate opportunity costs, startup compensation
scenarios (RSUs and Stock Options), dilution, IRR, and NPV. It is designed to be
independent of the Streamlit UI.
"""

from typing import Any, Dict, List

import numpy as np
import numpy_financial as npf
import pandas as pd


def annual_to_monthly_roi(annual_roi: float) -> float:
    """Converts an annual Return on Investment (ROI) to its monthly equivalent."""
    return (1 + annual_roi) ** (1 / 12) - 1


def create_monthly_data_grid(
    simulation_end_year: int,
    current_job_monthly_salary: float,
    startup_monthly_salary: float,
    current_job_salary_growth_rate: float,
) -> pd.DataFrame:
    """
    Creates a DataFrame with one row per month, calculating the monthly salary
    surplus which forms the basis of our cash flows.
    """
    total_months = simulation_end_year * 12
    df = pd.DataFrame(index=pd.RangeIndex(total_months, name="MonthIndex"))
    df["Year"] = df.index // 12 + 1

    year_index = df.index // 12
    df["CurrentJobSalary"] = current_job_monthly_salary * (
        (1 + current_job_salary_growth_rate) ** year_index
    )
    df["MonthlySurplus"] = df["CurrentJobSalary"] - startup_monthly_salary
    df["InvestableSurplus"] = df["MonthlySurplus"].clip(lower=0)

    return df


def calculate_annual_opportunity_cost(
    monthly_df: pd.DataFrame, annual_roi: float, investment_frequency: str
) -> pd.DataFrame:
    """
    Calculates the future value (opportunity cost) of the forgone surplus for each year.
    """
    results_df = pd.DataFrame(
        index=pd.RangeIndex(1, monthly_df["Year"].max() + 1, name="Year")
    )
    annual_surplus = monthly_df.groupby("Year")["MonthlySurplus"].sum()
    principal_col_label = (
        "Principal Forgone" if annual_surplus.sum() >= 0 else "Salary Gain"
    )

    results_df[principal_col_label] = annual_surplus.cumsum()

    opportunity_costs = []
    monthly_roi = annual_to_monthly_roi(annual_roi)
    annual_investable_surplus = monthly_df.groupby("Year")["InvestableSurplus"].sum()

    for year_end in results_df.index:
        current_df = monthly_df[monthly_df["Year"] <= year_end]
        if investment_frequency == "Monthly":
            months_to_grow = (year_end * 12) - current_df.index - 1
            fv = (
                current_df["InvestableSurplus"] * (1 + monthly_roi) ** months_to_grow
            ).sum()
        else:  # Annually
            current_annual_investable = annual_investable_surplus.loc[1:year_end]
            years_to_grow = year_end - current_annual_investable.index
            fv = (current_annual_investable * (1 + annual_roi) ** years_to_grow).sum()
        opportunity_costs.append(fv)

    results_df["Opportunity Cost (Invested Surplus)"] = opportunity_costs
    results_df["Investment Returns"] = results_df[
        "Opportunity Cost (Invested Surplus)"
    ] - results_df[principal_col_label].clip(lower=0)
    results_df["Year"] = results_df.index
    return results_df


def calculate_dilution_from_valuation(
    pre_money_valuation: float, amount_raised: float
) -> float:
    """Calculates the dilution percentage from a fundraising round."""
    if pre_money_valuation < 0 or amount_raised < 0:
        return 0.0
    post_money_valuation = pre_money_valuation + amount_raised
    if post_money_valuation == 0:
        return 0.0
    return amount_raised / post_money_valuation


def _calculate_dilution(
    initial_equity_pct: float,
    dilution_rounds: List[Dict[str, Any]],
    simulation_end_year: int,
) -> Dict[str, float]:
    """
    Calculates the cumulative dilution factor over the simulation period.
    """
    cumulative_dilution_factor = 1.0
    if dilution_rounds:
        # Sort rounds by year to apply them chronologically
        dilution_rounds.sort(key=lambda r: r["year"])
        for r in dilution_rounds:
            # Only consider rounds within the simulation period
            if r["year"] <= simulation_end_year:
                cumulative_dilution_factor *= 1 - r.get("dilution", 0)

    diluted_equity_pct = initial_equity_pct * cumulative_dilution_factor
    total_dilution = 1 - cumulative_dilution_factor

    return {
        "diluted_equity_pct": diluted_equity_pct,
        "total_dilution": total_dilution,
    }


def calculate_startup_scenario(
    opportunity_cost_df: pd.DataFrame, startup_params: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculates the financial outcomes for a given startup compensation package.
    This function handles both RSU and Stock Option scenarios.

    Args:
        opportunity_cost_df: DataFrame from calculate_annual_opportunity_cost.
        startup_params: A dictionary containing all startup-related inputs.

    Returns:
        A dictionary containing the results DataFrame and key financial metrics.
    """
    comp_type = startup_params["comp_type"]
    total_vesting_years = startup_params["total_vesting_years"]
    cliff_years = startup_params["cliff_years"]
    simulation_end_year = startup_params["simulation_end_year"]

    results_df = opportunity_cost_df.copy()

    # Calculate vested percentage over time, respecting the cliff and vesting period
    years = results_df.index
    vested_comp_pct = np.where(
        years >= cliff_years,
        np.clip((years / total_vesting_years) * 100, 0, 100),
        0,
    )
    results_df["Vested Comp (%)"] = vested_comp_pct

    output = {}

    if comp_type.value == "Equity (RSUs)":
        rsu_params = startup_params["rsu_params"]
        initial_equity_pct = rsu_params["equity_pct"]
        diluted_equity_pct = initial_equity_pct
        total_dilution = 0.0

        # Calculate dilution if simulated
        if rsu_params.get("simulate_dilution") and rsu_params.get("dilution_rounds"):
            dilution_results = _calculate_dilution(
                initial_equity_pct, rsu_params["dilution_rounds"], simulation_end_year
            )
            diluted_equity_pct = dilution_results["diluted_equity_pct"]
            total_dilution = dilution_results["total_dilution"]

        # The final vested percentage is based on the DILUTED equity
        final_vested_comp_pct = (
            results_df["Vested Comp (%)"].iloc[-1] / 100
        ) * diluted_equity_pct
        final_payout_value = rsu_params["target_exit_valuation"] * final_vested_comp_pct

        # Breakeven calculation MUST use the diluted equity percentage for each year.
        breakeven_vesting_pct = (
            results_df["Vested Comp (%)"] / 100
        ) * diluted_equity_pct

        results_df["Breakeven Value"] = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(breakeven_vesting_pct)
            .replace(np.inf, 0)
        )

        # *** CHANGE: For RSUs, the "Vested Comp (%)" in the table should reflect the post-dilution reality ***
        results_df["Vested Comp (%)"] = (
            (results_df["Vested Comp (%)"] / 100) * diluted_equity_pct * 100
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
        num_options = options_params["num_options"]
        strike_price = options_params["strike_price"]

        vested_options_series = (results_df["Vested Comp (%)"] / 100) * num_options

        final_payout_value = (
            max(0, options_params["target_exit_price_per_share"] - strike_price)
            * vested_options_series.iloc[-1]
        )

        # Breakeven price is the cost per option plus the strike price
        breakeven_price = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(vested_options_series)
            .replace(np.inf, 0)
        )
        results_df["Breakeven Value"] = breakeven_price + strike_price

        output.update(
            {
                "payout_label": "Your Options Value",
                "breakeven_label": "Breakeven Price/Share (SAR)",
            }
        )

    # Fill infinite values from division by zero (e.g., during cliff) with np.inf for clarity in UI
    results_df.replace(0, np.inf, inplace=True)

    output.update(
        {
            "results_df": results_df,
            "final_payout_value": final_payout_value,
            "final_opportunity_cost": results_df[
                "Opportunity Cost (Invested Surplus)"
            ].iloc[-1],
        }
    )

    return output


def calculate_irr(monthly_surpluses: pd.Series, final_payout_value: float) -> float:
    """
    Calculates the annualized Internal Rate of Return (IRR) based on monthly cash flows.
    """
    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return np.nan

    cash_flows.iloc[-1] += final_payout_value

    # IRR requires at least one positive and one negative cash flow
    if not (any(cash_flows > 0) and any(cash_flows < 0)):
        return np.nan

    try:
        monthly_irr = npf.irr(cash_flows)
        if pd.isna(monthly_irr):
            return np.nan
        return ((1 + monthly_irr) ** 12 - 1) * 100
    except (ValueError, TypeError):
        return np.nan


def calculate_npv(
    monthly_surpluses: pd.Series, annual_roi: float, final_payout_value: float
) -> float:
    """
    Calculates the Net Present Value of the investment.
    """
    monthly_roi = annual_to_monthly_roi(annual_roi)
    if pd.isna(monthly_roi):
        return np.nan

    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return np.nan

    cash_flows.iloc[-1] += final_payout_value

    try:
        # npv function requires the rate and a series of values
        return npf.npv(monthly_roi, cash_flows)
    except (ValueError, TypeError):
        return np.nan
