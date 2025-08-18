"""
Core calculation functions for financial analysis.

This module provides functions to calculate opportunity costs, startup equity
scenarios (RSUs and Stock Options), dilution, IRR, NPV, and run Monte Carlo simulations.
It is designed to be independent of the Streamlit UI.
"""

from typing import Any, Dict

import numpy as np
import numpy_financial as npf
import pandas as pd
from scipy import stats


def annual_to_monthly_roi(annual_roi: float) -> float:
    """Converts an annual Return on Investment (ROI) to its monthly equivalent."""
    return (1 + annual_roi) ** (1 / 12) - 1


def create_monthly_data_grid(
    exit_year: int,
    current_job_monthly_salary: float,
    startup_monthly_salary: float,
    current_job_salary_growth_rate: float,
) -> pd.DataFrame:
    """
    Creates a DataFrame with one row per month, calculating the monthly salary
    surplus which forms the basis of our cash flows.
    """
    if exit_year is None:
        exit_year = 0  # Prevents TypeError if slider returns None

    total_months = exit_year * 12
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
    if monthly_df.empty:
        return pd.DataFrame()

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
        initial_equity_pct = rsu_params["equity_pct"]
        diluted_equity_pct = initial_equity_pct
        total_dilution = 0.0

        if startup_params.get("simulated_dilution") is not None:
            total_dilution = startup_params["simulated_dilution"]
            diluted_equity_pct = initial_equity_pct * (1 - total_dilution)
            results_df["CumulativeDilution"] = 1 - total_dilution
        elif rsu_params.get("simulate_dilution") and rsu_params.get("dilution_rounds"):
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
            * (1 - total_dilution)
        )

        yearly_diluted_equity_pct = (
            initial_equity_pct * results_df["CumulativeDilution"]
        )
        breakeven_vesting_pct = (
            results_df["Vested Equity (%)"] / 100
        ) * yearly_diluted_equity_pct

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

        breakeven_price = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(vested_options_series)
            .replace([np.inf, -np.inf], 0)
        )
        results_df["Breakeven Value"] = (breakeven_price + strike_price).replace(
            strike_price, np.inf
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
    if pd.isna(monthly_roi) or monthly_roi <= -1:
        return np.nan

    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return np.nan

    cash_flows.iloc[-1] += final_payout_value

    try:
        return npf.npv(monthly_roi, cash_flows)
    except (ValueError, TypeError):
        return np.nan


def get_random_variates_pert(
    num_simulations: int, config: Dict, default_val: float
) -> np.ndarray:
    """Generates random numbers based on a PERT distribution."""
    if not config:
        return np.full(num_simulations, default_val)

    min_val, max_val, mode = config["min_val"], config["max_val"], config["mode"]

    # The 'gamma' parameter in PERT is typically 4, but can be adjusted.
    gamma = 4.0
    alpha = 1 + gamma * (mode - min_val) / (max_val - min_val)
    beta = 1 + gamma * (max_val - mode) / (max_val - min_val)

    return stats.beta.rvs(
        a=alpha, b=beta, scale=(max_val - min_val), loc=min_val, size=num_simulations
    )


def run_monte_carlo_simulation(
    num_simulations: int,
    base_params: Dict[str, Any],
    sim_param_configs: Dict[str, Any],
) -> Dict[str, np.ndarray]:
    """
    Runs a flexible, vectorized Monte Carlo simulation.
    """
    if "exit_year" in sim_param_configs:
        return run_monte_carlo_simulation_iterative(
            num_simulations, base_params, sim_param_configs
        )

    sim_params = {}
    sim_params["valuation"] = get_random_variates_pert(
        num_simulations,
        sim_param_configs.get("valuation"),
        base_params["startup_params"]["rsu_params"].get("target_exit_valuation")
        or base_params["startup_params"]["options_params"].get(
            "target_exit_price_per_share"
        ),
    )
    # Using a normal distribution for ROI
    if "roi" in sim_param_configs:
        roi_config = sim_param_configs["roi"]
        mean_roi = roi_config["mode"]
        # Approximate std dev from range
        std_dev_roi = (roi_config["max_val"] - roi_config["min_val"]) / 4
        sim_params["roi"] = stats.norm.rvs(
            loc=mean_roi, scale=std_dev_roi, size=num_simulations
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

    return run_monte_carlo_simulation_vectorized(
        num_simulations, base_params, sim_params
    )


def run_monte_carlo_simulation_vectorized(
    num_simulations: int, base_params: Dict[str, Any], sim_params: Dict[str, np.ndarray]
) -> Dict[str, np.ndarray]:
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

    startup_params = base_params["startup_params"]
    final_vested_pct = np.clip(
        (exit_year / startup_params["total_vesting_years"]), 0, 1
    )
    if exit_year < startup_params["cliff_years"]:
        final_vested_pct = 0

    if startup_params["equity_type"].value == "Equity (RSUs)":
        rsu_params = startup_params["rsu_params"]

        if not np.all(np.isnan(sim_params["dilution"])):
            cumulative_dilution = 1 - sim_params["dilution"]
        else:
            cumulative_dilution = 1.0
            if rsu_params.get("simulate_dilution") and rsu_params.get(
                "dilution_rounds"
            ):
                for r in sorted(rsu_params["dilution_rounds"], key=lambda r: r["year"]):
                    if r["year"] <= exit_year:
                        cumulative_dilution *= 1 - r.get("dilution", 0)

        final_equity_pct = rsu_params["equity_pct"] * cumulative_dilution
        final_payout_value = (
            sim_params["valuation"] * final_equity_pct * final_vested_pct
        )
    else:
        options_params = startup_params["options_params"]
        final_vested_options = options_params["num_options"] * final_vested_pct
        profit_per_share = np.maximum(
            0, sim_params["valuation"] - options_params["strike_price"]
        )
        final_payout_value = profit_per_share * final_vested_options

    # Incorporate failure probability
    failure_mask = (
        np.random.rand(num_simulations) < base_params["failure_probability"]
    )
    final_payout_value[failure_mask] = 0

    net_outcomes = final_payout_value - final_opportunity_cost

    return {
        "net_outcomes": net_outcomes,
        "simulated_valuations": sim_params["valuation"],
    }


def run_monte_carlo_simulation_iterative(
    num_simulations: int,
    base_params: Dict[str, Any],
    sim_param_configs: Dict[str, Any],
) -> Dict[str, np.ndarray]:
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
            config = yearly_valuation.get(
                year, list(yearly_valuation.values())[0]
            )  # Fallback to first config
            valuations.append(
                get_random_variates_pert(1, config, config["mode"])[0]
            )
        sim_params["valuation"] = np.array(valuations)
    else:
        sim_params["valuation"] = get_random_variates_pert(
            num_simulations,
            sim_param_configs.get("valuation"),
            base_params["startup_params"]["rsu_params"].get("target_exit_valuation")
            or base_params["startup_params"]["options_params"].get(
                "target_exit_price_per_share"
            ),
        )

    sim_params["roi"] = get_random_variates_pert(
        num_simulations, sim_param_configs.get("roi"), base_params["annual_roi"]
    )
    sim_params["salary_growth"] = get_random_variates_pert(
        num_simulations,
        sim_param_configs.get("salary_growth"),
        base_params["current_job_salary_growth_rate"],
    )
    sim_params["dilution"] = get_random_variates_pert(
        num_simulations, sim_param_configs.get("dilution"), np.nan
    )

    net_outcomes = []
    for i in range(num_simulations):
        exit_year = int(sim_params["exit_year"][i])
        monthly_df = create_monthly_data_grid(
            exit_year,
            base_params["current_job_monthly_salary"],
            base_params["startup_monthly_salary"],
            sim_params["salary_growth"][i],
        )

        opportunity_cost_df = calculate_annual_opportunity_cost(
            monthly_df, sim_params["roi"][i], base_params["investment_frequency"]
        )

        sim_startup_params = base_params["startup_params"].copy()
        sim_startup_params["exit_year"] = exit_year
        dilution_val = sim_params["dilution"][i]
        sim_startup_params["simulated_dilution"] = (
            dilution_val if not np.isnan(dilution_val) else None
        )

        if sim_startup_params["equity_type"].value == "Equity (RSUs)":
            sim_startup_params["rsu_params"] = sim_startup_params["rsu_params"].copy()
            sim_startup_params["rsu_params"]["target_exit_valuation"] = sim_params[
                "valuation"
            ][i]
        else:
            sim_startup_params["options_params"] = sim_startup_params[
                "options_params"
            ].copy()
            sim_startup_params["options_params"]["target_exit_price_per_share"] = (
                sim_params["valuation"][i]
            )

        results = calculate_startup_scenario(opportunity_cost_df, sim_startup_params)
        net_outcome = results["final_payout_value"] - results["final_opportunity_cost"]
        net_outcomes.append(net_outcome)

    net_outcomes = np.array(net_outcomes)

    # Incorporate failure probability
    failure_mask = (
        np.random.rand(num_simulations) < base_params["failure_probability"]
    )
    net_outcomes[failure_mask] = -final_opportunity_cost[failure_mask]


    return {
        "net_outcomes": net_outcomes,
        "simulated_valuations": sim_params["valuation"],
    }