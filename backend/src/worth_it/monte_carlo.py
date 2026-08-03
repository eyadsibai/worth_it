"""
Monte Carlo simulation and sensitivity analysis functions.

This module provides probabilistic modeling capabilities for financial analysis,
including PERT distribution generation, vectorized and iterative Monte Carlo
simulations, and sensitivity analysis.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import stats

# Import core calculation functions from submodules to avoid circular import
# (calculations/__init__.py re-exports monte_carlo functions for backward compatibility)
from worth_it.calculations.base import EquityType, annual_to_monthly_roi
from worth_it.calculations.opportunity_cost import (
    calculate_annual_opportunity_cost,
    create_monthly_data_grid,
)
from worth_it.calculations.startup_scenario import calculate_startup_scenario


def get_random_variates_pert(
    num_simulations: int,
    config: dict[str, Any] | None,
    default_val: float,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    """
    Generates random numbers based on a PERT distribution.

    The PERT distribution is a modified beta distribution that uses
    minimum, maximum, and mode (most likely) values to define the shape.

    Args:
        num_simulations: Number of random values to generate
        config: Dictionary with 'min_val', 'max_val', and 'mode' keys.
                If None, returns array filled with default_val.
        default_val: Value to use if config is None
        rng: Optional Generator for reproducible draws. Uses the global
             NumPy random stream when omitted.

    Returns:
        NumPy array of random values from PERT distribution
    """
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
        a=alpha,
        b=beta,
        scale=(max_val - min_val),
        loc=min_val,
        size=num_simulations,
        random_state=rng,
    )
    return result


def _resolve_rng(seed: int | None, rng: np.random.Generator | None) -> np.random.Generator | None:
    """Explicit generator wins, a seed builds one, otherwise the global stream is used."""
    if rng is not None:
        return rng
    if seed is not None:
        return np.random.default_rng(seed)
    return None


def _uniform_draws(num_simulations: int, rng: np.random.Generator | None) -> np.ndarray:
    """Uniform [0, 1) draws from `rng`, or the global stream when unseeded."""
    if rng is None:
        return np.random.rand(num_simulations)
    return rng.random(num_simulations)


def _exit_price_key(startup_params: dict[str, Any]) -> str:
    """Sim-param key holding the exit price: whole-company for RSUs, per-share for options."""
    if startup_params["equity_type"] == EquityType.RSU:
        return "valuation"
    return "price_per_share"


def _default_exit_price(startup_params: dict[str, Any]) -> float:
    """Non-simulated exit price for the scenario's equity type."""
    if startup_params["equity_type"] == EquityType.RSU:
        return startup_params["rsu_params"].get("target_exit_valuation") or 0.0
    return startup_params["options_params"].get("target_exit_price_per_share") or 0.0


def _resolve_exit_price(
    num_simulations: int,
    startup_params: dict[str, Any],
    sim_params: dict[str, np.ndarray],
) -> np.ndarray:
    """Per-simulation exit price for the scenario's equity type."""
    samples = sim_params.get(_exit_price_key(startup_params))
    if samples is None:
        return np.full(num_simulations, _default_exit_price(startup_params))
    return np.asarray(samples)


def run_monte_carlo_simulation(
    num_simulations: int,
    base_params: dict[str, Any],
    sim_param_configs: dict[str, Any],
    seed: int | None = None,
) -> dict[str, np.ndarray]:
    """
    Prepares parameters and runs the appropriate Monte Carlo simulation.

    Routes to either vectorized (fast) or iterative (flexible) implementation
    based on whether exit year is being simulated.

    Args:
        num_simulations: Number of simulation iterations
        base_params: Base parameters for the scenario (salaries, equity, etc.)
        sim_param_configs: Configuration for simulated parameters (distributions)
        seed: Optional seed making the run reproducible

    Returns:
        Dictionary with 'net_outcomes' and 'simulated_valuations' arrays

    Raises:
        CalculationError: If num_simulations exceeds MAX_SIMULATIONS
    """
    # Deferred import to avoid circular dependency: config/exceptions import models
    from worth_it.config import Settings  # noqa: PLC0415
    from worth_it.exceptions import CalculationError  # noqa: PLC0415

    if num_simulations > Settings.MAX_SIMULATIONS:
        raise CalculationError(
            f"num_simulations ({num_simulations}) exceeds max allowed "
            f"({Settings.MAX_SIMULATIONS}). Reduce the number of simulations."
        )

    rng = _resolve_rng(seed, None)

    # If exit year is simulated, the calculation must be iterative.
    if "exit_year" in sim_param_configs:
        return run_monte_carlo_simulation_iterative(
            num_simulations, base_params, sim_param_configs, rng=rng
        )

    # --- Prepare a complete sim_params dictionary for vectorization ---
    sim_params = {}

    # Handle ROI (Normal distribution)
    if "roi" in sim_param_configs:
        roi_config = sim_param_configs["roi"]
        sim_params["roi"] = stats.norm.rvs(
            loc=roi_config["mean"],
            scale=roi_config["std_dev"],
            size=num_simulations,
            random_state=rng,
        )
    else:
        sim_params["roi"] = np.full(num_simulations, base_params["annual_roi"])

    # Handle the exit price (PERT distribution): whole-company valuation for
    # RSUs, price per share for stock options.
    price_key = _exit_price_key(base_params["startup_params"])
    if price_key in sim_param_configs:
        sim_params[price_key] = get_random_variates_pert(
            num_simulations, sim_param_configs[price_key], 0, rng
        )
    else:
        sim_params[price_key] = np.full(
            num_simulations, _default_exit_price(base_params["startup_params"])
        )

    # Handle Salary Growth (PERT distribution)
    if "salary_growth" in sim_param_configs:
        sim_params["salary_growth"] = get_random_variates_pert(
            num_simulations, sim_param_configs["salary_growth"], 0, rng
        )
    else:
        sim_params["salary_growth"] = np.full(
            num_simulations, base_params["current_job_salary_growth_rate"]
        )

    # Handle Dilution (PERT distribution)
    if "dilution" in sim_param_configs:
        sim_params["dilution"] = get_random_variates_pert(
            num_simulations, sim_param_configs["dilution"], np.nan, rng
        )
    else:
        sim_params["dilution"] = np.full(num_simulations, np.nan)

    return run_monte_carlo_simulation_vectorized(num_simulations, base_params, sim_params, rng=rng)


def run_monte_carlo_simulation_vectorized(  # noqa: C901 - inherently complex vectorized simulation with multiple equity type paths
    num_simulations: int,
    base_params: dict[str, Any],
    sim_params: dict[str, np.ndarray],
    seed: int | None = None,
    rng: np.random.Generator | None = None,
) -> dict[str, np.ndarray]:
    """
    Vectorized Monte Carlo simulation for fixed exit year scenarios.

    This is the fast path that uses NumPy broadcasting to compute all
    simulations simultaneously. Only works when exit year is fixed.

    Args:
        num_simulations: Number of simulation iterations
        base_params: Base parameters for the scenario
        sim_params: Pre-generated random parameters for each simulation
        seed: Optional seed making the run reproducible
        rng: Optional Generator, used in preference to `seed`

    Returns:
        Dictionary with 'net_outcomes' and 'simulated_valuations' arrays
    """
    rng = _resolve_rng(seed, rng)
    exit_year = base_params["exit_year"]
    total_months = exit_year * 12

    month_indices = np.arange(total_months)
    year_indices = month_indices // 12
    current_salaries = base_params["current_job_monthly_salary"] * (
        (1 + sim_params["salary_growth"][:, np.newaxis]) ** year_indices
    )
    monthly_surpluses = current_salaries - base_params["startup_monthly_salary"]
    investable_surpluses = np.clip(monthly_surpluses, 0, None)

    # Bound unconditionally: the exercise-cost branch below re-tests the same frequency
    # and would otherwise read this on a path a type checker cannot prove is reachable.
    monthly_rois = (1 + sim_params["roi"]) ** (1 / 12) - 1

    # Calculate opportunity cost from investable surplus (without exercise costs)
    if base_params["investment_frequency"] == "Monthly":
        months_to_grow = np.arange(total_months - 1, -1, -1)
        fv_factors = (1 + monthly_rois[:, np.newaxis]) ** months_to_grow
        final_opportunity_cost = (investable_surpluses * fv_factors).sum(axis=1)
    else:
        # Vectorized annual aggregation: reshape to (simulations, years, 12) and sum months
        # This is ~38x faster than the list comprehension approach
        annual_investable_surpluses = investable_surpluses.reshape(num_simulations, -1, 12).sum(
            axis=2
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
    exit_price = _resolve_exit_price(num_simulations, startup_params, sim_params)
    final_vested_pct = np.clip((exit_year / startup_params["total_vesting_years"]), 0, 1)
    if exit_year < startup_params["cliff_years"]:
        final_vested_pct = 0

    if startup_params["equity_type"] == EquityType.RSU:
        rsu_params = startup_params["rsu_params"]

        if "dilution" in sim_params and not np.all(np.isnan(sim_params["dilution"])):
            cumulative_dilution: float | np.ndarray = 1 - sim_params["dilution"]
        else:
            cumulative_dilution = 1.0
            if rsu_params.get("simulate_dilution") and rsu_params.get("dilution_rounds"):
                sorted_rounds = sorted(rsu_params["dilution_rounds"], key=lambda r: r["year"])
                for r in sorted_rounds:
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

                        # Calculate cash from this sale.
                        # Note: We only receive cash for the vested portion; anything
                        # beyond that is forfeited. The UI slider limits percent_to_sell
                        # to vested_pct, but we validate here too.
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
            exit_price * final_equity_pct * final_vested_pct * remaining_equity_factor
        )

        # Add cash from equity sales
        final_payout_value = final_payout_value + cash_from_sales_fv
    else:
        options_params = startup_params["options_params"]
        final_vested_options = options_params.get("num_options", 0) * final_vested_pct
        profit_per_share = np.maximum(0, exit_price - options_params.get("strike_price", 0))
        final_payout_value = profit_per_share * final_vested_options

    # Incorporate failure probability
    failure_mask = _uniform_draws(num_simulations, rng) < base_params["failure_probability"]
    final_payout_value[failure_mask] = 0

    # Calculate net outcomes: payout - opportunity cost - exercise costs
    # Exercise costs are subtracted to ensure spending money to exercise reduces the outcome
    net_outcomes = final_payout_value - final_opportunity_cost - exercise_costs_fv

    return {
        "net_outcomes": net_outcomes,
        "simulated_valuations": exit_price,
    }


def run_monte_carlo_simulation_iterative(
    num_simulations: int,
    base_params: dict[str, Any],
    sim_param_configs: dict[str, Any],
    seed: int | None = None,
    rng: np.random.Generator | None = None,
) -> dict[str, np.ndarray]:
    """
    Iterative Monte Carlo simulation for variable exit year scenarios.

    This is the flexible but slower path that runs each simulation
    individually. Required when exit year is being simulated.

    Args:
        num_simulations: Number of simulation iterations
        base_params: Base parameters for the scenario
        sim_param_configs: Configuration for simulated parameters
        seed: Optional seed making the run reproducible
        rng: Optional Generator, used in preference to `seed`

    Returns:
        Dictionary with 'net_outcomes' and 'simulated_valuations' arrays
    """
    rng = _resolve_rng(seed, rng)
    sim_params: dict[str, Any] = {}

    price_key = _exit_price_key(base_params["startup_params"])
    sim_params["exit_year"] = get_random_variates_pert(
        num_simulations, sim_param_configs.get("exit_year"), base_params["exit_year"], rng
    ).astype(int)

    if "yearly_valuation" in sim_param_configs:
        yearly_valuation = sim_param_configs["yearly_valuation"]
        valuations = []
        # Cache the default value outside the loop
        default_config = next(iter(yearly_valuation.values()))
        for year in sim_params["exit_year"]:
            # Ensure year is treated as a string key
            config = yearly_valuation.get(str(year), default_config)
            valuations.append(get_random_variates_pert(1, config, config["mode"], rng)[0])
        sim_params[price_key] = np.array(valuations)
    elif price_key in sim_param_configs:
        sim_params[price_key] = get_random_variates_pert(
            num_simulations, sim_param_configs[price_key], 0, rng
        )
    else:
        sim_params[price_key] = np.full(
            num_simulations, _default_exit_price(base_params["startup_params"])
        )

    # Handle other variables
    if "roi" in sim_param_configs:
        roi_config = sim_param_configs["roi"]
        sim_params["roi"] = stats.norm.rvs(
            loc=roi_config["mean"],
            scale=roi_config["std_dev"],
            size=num_simulations,
            random_state=rng,
        )
    else:
        sim_params["roi"] = np.full(num_simulations, base_params["annual_roi"])

    sim_params["salary_growth"] = get_random_variates_pert(
        num_simulations,
        sim_param_configs.get("salary_growth"),
        base_params["current_job_salary_growth_rate"],
        rng,
    )
    sim_params["dilution"] = get_random_variates_pert(
        num_simulations, sim_param_configs.get("dilution"), np.nan, rng
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

        if sim_startup_params["equity_type"] == EquityType.RSU:
            sim_startup_params["rsu_params"] = sim_startup_params["rsu_params"].copy()
            sim_startup_params["rsu_params"]["target_exit_valuation"] = sim_params[price_key][i]
        else:
            sim_startup_params["options_params"] = sim_startup_params["options_params"].copy()
            sim_startup_params["options_params"]["target_exit_price_per_share"] = sim_params[
                price_key
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
    failure_mask = _uniform_draws(num_simulations, rng) < base_params["failure_probability"]
    net_outcomes[failure_mask] = -final_opportunity_costs[failure_mask]

    return {
        "net_outcomes": net_outcomes,
        "simulated_valuations": sim_params[price_key],
    }


def run_sensitivity_analysis(
    base_params: dict[str, Any],
    sim_param_configs: dict[str, Any],
    seed: int | None = None,
) -> pd.DataFrame:
    """
    Runs a sensitivity analysis on simulated variables.

    Determines the impact of each variable on outcomes by running simulations
    at the 10th and 90th percentile values while holding others at their mode.

    Args:
        base_params: Base parameters for the scenario
        sim_param_configs: Configuration for simulated parameters
        seed: Optional seed making the run reproducible

    Returns:
        DataFrame with Variable, Low, High, and Impact columns, sorted by impact
    """
    rng = _resolve_rng(seed, None)
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
        base_case_sim_params: dict[str, np.ndarray] = {}
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
            num_simulations_sensitivity, base_params, low_sim_params, rng=rng
        )
        low_mean_outcome = low_results["net_outcomes"].mean()

        # --- Run with high value ---
        high_sim_params = base_case_sim_params.copy()
        high_sim_params[var] = np.full(num_simulations_sensitivity, high_val)
        high_results = run_monte_carlo_simulation_vectorized(
            num_simulations_sensitivity, base_params, high_sim_params, rng=rng
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
