"""
Core calculation functions for financial analysis.

This module provides functions to calculate opportunity costs, startup equity
scenarios (RSUs and Stock Options), dilution, IRR, NPV, and run Monte Carlo simulations.
It is designed to be independent of the Streamlit UI.
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
    if simulation_end_year is None:
        simulation_end_year = 0  # Prevents TypeError if slider returns None

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
    if pre_money_valuation <= 0 or amount_raised < 0:
        return 0.0
    post_money_valuation = pre_money_valuation + amount_raised
    if post_money_valuation == 0:
        return 0.0
    return amount_raised / post_money_valuation


def calculate_startup_scenario(
    opportunity_cost_df: pd.DataFrame, startup_params: Dict[str, Any]
) -> Dict[str, Any]:
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
        initial_equity_pct = rsu_params["equity_pct"]
        diluted_equity_pct = initial_equity_pct
        total_dilution = 0.0

        if rsu_params.get("simulate_dilution") and rsu_params.get("dilution_rounds"):
            sorted_rounds = sorted(
                rsu_params["dilution_rounds"], key=lambda r: r["year"]
            )
            yearly_dilution_factors = []
            for year in results_df.index:
                cumulative_dilution_factor = 1.0
                for r in sorted_rounds:
                    if r["year"] <= year:
                        cumulative_dilution_factor *= 1 - r.get("dilution", 0)
                yearly_dilution_factors.append(cumulative_dilution_factor)

            results_df["CumulativeDilution"] = yearly_dilution_factors
            total_dilution = 1 - results_df["CumulativeDilution"].iloc[-1]
            diluted_equity_pct = (
                initial_equity_pct * results_df["CumulativeDilution"].iloc[-1]
            )
        else:
            results_df["CumulativeDilution"] = 1.0
            total_dilution = 0.0
            diluted_equity_pct = initial_equity_pct

        final_vested_equity_pct = (
            results_df["Vested Equity (%)"].iloc[-1] / 100
        ) * initial_equity_pct
        final_payout_value = (
            rsu_params["target_exit_valuation"]
            * final_vested_equity_pct
            * results_df["CumulativeDilution"].iloc[-1]
        )

        yearly_diluted_equity_pct = (
            initial_equity_pct * results_df["CumulativeDilution"]
        )
        breakeven_vesting_pct = (
            results_df["Vested Equity (%)"] / 100
        ) * yearly_diluted_equity_pct

        # FIX: Calculate breakeven and handle division by zero correctly for this column only
        breakeven_value_series = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(breakeven_vesting_pct)
            .replace([np.inf, -np.inf], 0)
        )
        results_df["Breakeven Value"] = breakeven_value_series.replace(0, np.inf)

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
        num_options = options_params["num_options"]
        strike_price = options_params["strike_price"]

        vested_options_series = (results_df["Vested Equity (%)"] / 100) * num_options

        final_payout_value = (
            max(0, options_params["target_exit_price_per_share"] - strike_price)
            * vested_options_series.iloc[-1]
        )

        # FIX: Calculate breakeven and handle division by zero correctly for this column only
        breakeven_price = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(vested_options_series)
            .replace([np.inf, -np.inf], 0)
        )
        # A breakeven of exactly the strike price means 0 profit, so it should be inf
        results_df["Breakeven Value"] = (breakeven_price + strike_price).replace(
            strike_price, np.inf
        )

        output.update(
            {
                "payout_label": "Your Options Value",
                "breakeven_label": "Breakeven Price/Share (SAR)",
            }
        )

    # FIX: The incorrect global replace(0, np.inf) has been removed from here.

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

    # IRR requires both positive and negative cash flows to find a root
    if not (any(cash_flows > 0) and any(cash_flows < 0)):
        return np.nan

    try:
        monthly_irr = npf.irr(cash_flows)
        # npf.irr returns nan on failure, which is the desired behavior
        if pd.isna(monthly_irr):
            return np.nan
        return ((1 + monthly_irr) ** 12 - 1) * 100
    except (ValueError, TypeError):
        # Catches any other unexpected errors from the calculation
        return np.nan


def calculate_npv(
    monthly_surpluses: pd.Series, annual_roi: float, final_payout_value: float
) -> float:
    """
    Calculates the Net Present Value of the investment.
    """
    monthly_roi = annual_to_monthly_roi(annual_roi)
    if pd.isna(monthly_roi) or monthly_roi <= -1:
        return np.nan

    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return np.nan

    cash_flows.iloc[-1] += final_payout_value

    try:
        # npf.npv requires the rate and a series of values
        return npf.npv(monthly_roi, cash_flows)
    except (ValueError, TypeError):
        return np.nan


def run_monte_carlo_simulation(
    num_simulations: int,
    simulation_end_year: int,
    current_job_monthly_salary: float,
    startup_monthly_salary: float,
    current_job_salary_growth_rate: float,
    investment_frequency: str,
    startup_params: Dict[str, Any],
    valuation_range: List[float],
    roi_range: List[float],
) -> np.ndarray:
    """
    Runs a Monte Carlo simulation to model a range of potential outcomes.
    """
    net_outcomes = []

    # Pre-calculate the monthly data grid as it's constant for all simulations
    monthly_df = create_monthly_data_grid(
        simulation_end_year=simulation_end_year,
        current_job_monthly_salary=current_job_monthly_salary,
        startup_monthly_salary=startup_monthly_salary,
        current_job_salary_growth_rate=current_job_salary_growth_rate,
    )

    for _ in range(num_simulations):
        # Sample from uniform distributions for valuation and ROI
        simulated_valuation = np.random.uniform(
            valuation_range[0], valuation_range[1]
        )
        simulated_roi = np.random.uniform(roi_range[0], roi_range[1])

        # Create a deep copy of startup_params to avoid modifying the original dict
        sim_startup_params = startup_params.copy()

        # Update the simulation parameters with the sampled values
        if sim_startup_params["equity_type"].value == "Equity (RSUs)":
            sim_startup_params["rsu_params"] = sim_startup_params["rsu_params"].copy()
            sim_startup_params["rsu_params"][
                "target_exit_valuation"
            ] = simulated_valuation
        else:
            # For stock options, we need to handle the exit price per share
            # This is a simplification; a more complex model might link this to valuation
            # Here, we assume the provided range is for exit price per share
            sim_startup_params["options_params"] = sim_startup_params[
                "options_params"
            ].copy()
            sim_startup_params["options_params"][
                "target_exit_price_per_share"
            ] = simulated_valuation

        # Recalculate opportunity cost with the simulated ROI
        opportunity_cost_df = calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=simulated_roi,
            investment_frequency=investment_frequency,
        )

        # Calculate the startup scenario with the simulated parameters
        results = calculate_startup_scenario(opportunity_cost_df, sim_startup_params)
        final_payout_value = results["final_payout_value"]
        final_opportunity_cost = results["final_opportunity_cost"]
        net_outcome = final_payout_value - final_opportunity_cost
        net_outcomes.append(net_outcome)

    return np.array(net_outcomes)