"""Monte Carlo tests for the stock-options payout path.

Stock options are priced per share, RSUs are priced off the whole-company exit
valuation. The two quantities differ by orders of magnitude, so they must never
share a single internal simulation key.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from fastapi.testclient import TestClient

from worth_it.api import app
from worth_it.calculations.opportunity_cost import (
    calculate_annual_opportunity_cost,
    create_monthly_data_grid,
)
from worth_it.calculations.startup_scenario import calculate_startup_scenario
from worth_it.models import SimParamRange, TypedBaseParams, VariableParam
from worth_it.monte_carlo import run_monte_carlo_simulation
from worth_it.services.serializers import (
    convert_sim_param_configs_to_internal,
    convert_typed_base_params_to_internal,
)

NUM_SIMULATIONS = 200
# The iterative path rebuilds a monthly grid per simulation, so it gets a smaller
# sample. Unit assertions only need enough draws to span the configured range.
NUM_ITERATIVE_SIMULATIONS = 40
NUM_OPTIONS = 10_000
STRIKE_PRICE = 1.0
EXIT_PRICE_PER_SHARE = 50.0
EXIT_VALUATION = 50_000_000.0
ORDER_OF_MAGNITUDE = 10.0

# A simulation whose outcomes are all within this fraction of each other is a
# point mass, not a distribution. Float noise alone lands around 1e-16, so a
# bare `std > 0` assertion cannot tell the two apart.
MIN_RELATIVE_SPREAD = 0.05

# The Monte Carlo form turns its mean/std sliders into a simple min/max range
# using +/- 2 standard deviations, floored at zero, and defaults the standard
# deviation to half the expected exit price.
FORM_STD_DEV_FACTOR = 2
FORM_DEFAULT_STD_FRACTION = 0.5

# Direct simulation calls draw from the global NumPy stream unless a seed is
# given, which makes every assertion below depend on the run. The assertions
# hold for any seed - each was replayed across a sweep before these were pinned -
# so the seed buys reproducibility rather than a passing grade. Distinct values
# keep five tests from all riding on the luck of one draw.
SEED_OPTIONS_VS_VALUATION = 1_000_001
SEED_OPTIONS_PRICE_RANGE = 1_000_002
SEED_RSU_VALUATION = 1_000_003
SEED_ITERATIVE_OPTIONS = 1_000_004
SEED_ITERATIVE_RSU = 1_000_005


def _base_payload(startup_params: dict[str, Any]) -> dict[str, Any]:
    return {
        "exit_year": 5,
        "current_job_monthly_salary": 15000.0,
        "startup_monthly_salary": 12000.0,
        "current_job_salary_growth_rate": 0.03,
        "annual_roi": 0.06,
        "investment_frequency": "Monthly",
        "failure_probability": 0.0,
        "startup_params": startup_params,
    }


def _options_startup_params() -> dict[str, Any]:
    return {
        "equity_type": "STOCK_OPTIONS",
        "monthly_salary": 12000.0,
        "num_options": NUM_OPTIONS,
        "strike_price": STRIKE_PRICE,
        "vesting_period": 4,
        "cliff_period": 1,
        "exit_price_per_share": EXIT_PRICE_PER_SHARE,
        "exercise_strategy": "AT_EXIT",
        "exercise_year": None,
    }


def _rsu_startup_params() -> dict[str, Any]:
    return {
        "equity_type": "RSU",
        "monthly_salary": 12000.0,
        "total_equity_grant_pct": 2.0,
        "vesting_period": 4,
        "cliff_period": 1,
        "exit_valuation": EXIT_VALUATION,
        "simulate_dilution": False,
        "dilution_rounds": [],
    }


def _to_internal(startup_params: dict[str, Any]) -> dict[str, Any]:
    """Run the payload through the same typed conversion the API uses."""
    return convert_typed_base_params_to_internal(TypedBaseParams(**_base_payload(startup_params)))


def _deterministic_net_outcome(internal_base: dict[str, Any]) -> float:
    """Net outcome from the non-probabilistic scenario engine, used as reference."""
    startup_params = {
        **internal_base["startup_params"],
        "exit_year": internal_base["exit_year"],
    }
    monthly_df = create_monthly_data_grid(
        internal_base["exit_year"],
        internal_base["current_job_monthly_salary"],
        internal_base["startup_monthly_salary"],
        internal_base["current_job_salary_growth_rate"],
        dilution_rounds=startup_params.get("rsu_params", {}).get("dilution_rounds"),
    )
    opportunity_cost_df = calculate_annual_opportunity_cost(
        monthly_df,
        internal_base["annual_roi"],
        internal_base["investment_frequency"],
        options_params=startup_params.get("options_params"),
        startup_params=startup_params,
    )
    results = calculate_startup_scenario(opportunity_cost_df, startup_params)
    return float(results["final_payout_value"] - results["final_opportunity_cost"])


def _assert_is_a_distribution(values: np.ndarray, label: str) -> None:
    """Fail when `values` is a point mass dressed up as a simulation."""
    spread = float(values.max() - values.min())
    scale = float(np.abs(np.median(values))) or 1.0

    assert float(np.std(values)) > 0.0, f"{label} has zero standard deviation"
    assert spread / scale > MIN_RELATIVE_SPREAD, (
        f"{label} spans only {spread:,.6g} around a median of {scale:,.6g} "
        f"({spread / scale:.2%} relative spread) - every simulation is identical"
    )

    p5, p50, p95 = (float(v) for v in np.percentile(values, [5, 50, 95]))
    assert p5 < p50 < p95, f"{label} percentiles collapsed: p5={p5}, p50={p50}, p95={p95}"


def test_options_simulation_is_not_driven_by_company_valuation():
    """A simulated company exit valuation must not be used as a price per share."""
    internal_base = _to_internal(_options_startup_params())
    sim_param_configs = convert_sim_param_configs_to_internal(
        {VariableParam.EXIT_VALUATION: SimParamRange(min=25_000_000.0, max=75_000_000.0)}
    )

    results = run_monte_carlo_simulation(
        num_simulations=NUM_SIMULATIONS,
        base_params=internal_base,
        sim_param_configs=sim_param_configs,
        seed=SEED_OPTIONS_VS_VALUATION,
    )

    expected = _deterministic_net_outcome(internal_base)
    median_outcome = float(np.median(results["net_outcomes"]))

    assert expected > 0
    assert expected / ORDER_OF_MAGNITUDE < median_outcome < expected * ORDER_OF_MAGNITUDE, (
        f"Options median net outcome {median_outcome:,.0f} is not within an order of "
        f"magnitude of the deterministic outcome {expected:,.0f}"
    )


def test_options_simulation_varies_with_simulated_price_per_share():
    """The per-share exit price is the parameter that drives the options payout."""
    internal_base = _to_internal(_options_startup_params())
    min_price, max_price = 40.0, 60.0
    sim_param_configs = convert_sim_param_configs_to_internal(
        {VariableParam.EXIT_PRICE_PER_SHARE: SimParamRange(min=min_price, max=max_price)}
    )

    results = run_monte_carlo_simulation(
        num_simulations=NUM_SIMULATIONS,
        base_params=internal_base,
        sim_param_configs=sim_param_configs,
        seed=SEED_OPTIONS_PRICE_RANGE,
    )

    simulated = np.asarray(results["simulated_valuations"])
    assert len(simulated) == NUM_SIMULATIONS
    assert simulated.min() >= min_price
    assert simulated.max() <= max_price

    expected = _deterministic_net_outcome(internal_base)
    median_outcome = float(np.median(results["net_outcomes"]))
    assert expected / ORDER_OF_MAGNITUDE < median_outcome < expected * ORDER_OF_MAGNITUDE
    assert np.std(results["net_outcomes"]) > 0


def test_rsu_simulation_still_uses_company_valuation():
    """Regression guard: the RSU path must keep reading the whole-company valuation."""
    internal_base = _to_internal(_rsu_startup_params())
    min_valuation, max_valuation = 25_000_000.0, 75_000_000.0
    sim_param_configs = convert_sim_param_configs_to_internal(
        {VariableParam.EXIT_VALUATION: SimParamRange(min=min_valuation, max=max_valuation)}
    )

    results = run_monte_carlo_simulation(
        num_simulations=NUM_SIMULATIONS,
        base_params=internal_base,
        sim_param_configs=sim_param_configs,
        seed=SEED_RSU_VALUATION,
    )

    simulated = np.asarray(results["simulated_valuations"])
    assert len(simulated) == NUM_SIMULATIONS
    assert simulated.min() >= min_valuation
    assert simulated.max() <= max_valuation

    expected = _deterministic_net_outcome(internal_base)
    median_outcome = float(np.median(results["net_outcomes"]))

    assert expected > 0
    assert expected / ORDER_OF_MAGNITUDE < median_outcome < expected * ORDER_OF_MAGNITUDE, (
        f"RSU median net outcome {median_outcome:,.0f} regressed away from the "
        f"deterministic outcome {expected:,.0f}"
    )


# --- Units survive the switch to the iterative simulation path ---
#
# Simulating the exit year forces the per-simulation path, which rebuilds the
# exit price from a different branch than the vectorised one. `simulated_valuations`
# is reported straight back to the user, so both branches have to keep it in the
# units the scenario was written in. A branch that reads the wrong key does not
# raise - it falls back to the scenario's constant target price - so the range
# assertions below are paired with a spread assertion.


def test_iterative_options_simulation_reports_per_share_units():
    """A simulated exit year must not turn the per-share price into a valuation."""
    internal_base = _to_internal(_options_startup_params())
    min_price, max_price = 40.0, 60.0
    sim_param_configs = convert_sim_param_configs_to_internal(
        {
            VariableParam.EXIT_YEAR: SimParamRange(min=3.0, max=7.0),
            VariableParam.EXIT_PRICE_PER_SHARE: SimParamRange(min=min_price, max=max_price),
        }
    )

    results = run_monte_carlo_simulation(
        num_simulations=NUM_ITERATIVE_SIMULATIONS,
        base_params=internal_base,
        sim_param_configs=sim_param_configs,
        seed=SEED_ITERATIVE_OPTIONS,
    )

    simulated = np.asarray(results["simulated_valuations"])
    assert len(simulated) == NUM_ITERATIVE_SIMULATIONS
    assert simulated.min() >= min_price
    assert simulated.max() <= max_price
    assert (
        EXIT_PRICE_PER_SHARE / ORDER_OF_MAGNITUDE
        < float(np.median(simulated))
        < EXIT_PRICE_PER_SHARE * ORDER_OF_MAGNITUDE
    ), "iterative options simulated values are not in per-share units"
    _assert_is_a_distribution(simulated, "iterative options simulated price per share")


def test_iterative_rsu_simulation_reports_whole_company_units():
    """Control: the same path keeps RSU results in whole-company valuation units."""
    internal_base = _to_internal(_rsu_startup_params())
    min_valuation, max_valuation = 25_000_000.0, 75_000_000.0
    sim_param_configs = convert_sim_param_configs_to_internal(
        {
            VariableParam.EXIT_YEAR: SimParamRange(min=3.0, max=7.0),
            VariableParam.EXIT_VALUATION: SimParamRange(min=min_valuation, max=max_valuation),
        }
    )

    results = run_monte_carlo_simulation(
        num_simulations=NUM_ITERATIVE_SIMULATIONS,
        base_params=internal_base,
        sim_param_configs=sim_param_configs,
        seed=SEED_ITERATIVE_RSU,
    )

    simulated = np.asarray(results["simulated_valuations"])
    assert len(simulated) == NUM_ITERATIVE_SIMULATIONS
    assert simulated.min() >= min_valuation
    assert simulated.max() <= max_valuation
    assert (
        EXIT_VALUATION / ORDER_OF_MAGNITUDE
        < float(np.median(simulated))
        < EXIT_VALUATION * ORDER_OF_MAGNITUDE
    ), "iterative RSU simulated values are not in whole-company units"
    _assert_is_a_distribution(simulated, "iterative RSU simulated valuation")


# --- End-to-end guards on the payload the Monte Carlo form actually sends ---
#
# frontend/components/forms/monte-carlo-form.tsx picks the sim-param key from
# the scenario's equity type:
#     RSU            -> exit_valuation        (whole-company exit valuation)
#     STOCK_OPTIONS  -> exit_price_per_share  (per-share exit price)
# It seeds the mean slider from the scenario's own exit assumption, defaults the
# standard-deviation slider to half of it, and converts the pair into a min/max
# range using +/- 2 standard deviations floored at zero. `_form_sim_param_configs`
# mirrors that end to end so these tests pin the real wire contract instead of a
# hand-picked payload.

# Sim-param key the form sends for each equity type. In both cases the key also
# names the field the scenario itself carries, which is what makes the units
# line up.
FORM_EXIT_PRICE_KEY = {
    "RSU": "exit_valuation",
    "STOCK_OPTIONS": "exit_price_per_share",
}


def _form_range(mean: float, std_dev: float) -> dict[str, float]:
    """Min/max range the Monte Carlo form derives from a mean/std slider pair."""
    return {
        "min": max(0.0, mean - FORM_STD_DEV_FACTOR * std_dev),
        "max": mean + FORM_STD_DEV_FACTOR * std_dev,
    }


def _form_sim_param_configs(startup_params: dict[str, Any]) -> dict[str, dict[str, float]]:
    """The `sim_param_configs` the Monte Carlo form builds for this scenario."""
    key = FORM_EXIT_PRICE_KEY[startup_params["equity_type"]]
    center = float(startup_params[key])
    return {key: _form_range(center, center * FORM_DEFAULT_STD_FRACTION)}


def _post_monte_carlo(
    startup_params: dict[str, Any], sim_param_configs: dict[str, Any]
) -> dict[str, Any]:
    payload = {
        "num_simulations": NUM_SIMULATIONS,
        "base_params": _base_payload(startup_params),
        "sim_param_configs": sim_param_configs,
        "seed": 12345,
    }
    response = TestClient(app).post("/api/monte-carlo", json=payload)
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


def test_options_monte_carlo_endpoint_simulates_the_configured_price_range():
    """The options payload the form sends must produce a real spread of outcomes.

    A stock-options scenario configured with a per-share price range has to vary.
    The backend selects the driving parameter from `equity_type`, so a sim-param
    key that does not apply to the scenario is silently dropped and every
    simulation collapses onto the constant target price - a Monte Carlo that does
    not simulate, which is more dangerous than a wrong magnitude because it still
    looks plausible on a histogram.
    """
    startup_params = _options_startup_params()
    sim_param_configs = _form_sim_param_configs(startup_params)

    assert set(sim_param_configs) == {"exit_price_per_share"}, (
        "An options scenario must be driven by the per-share exit price; "
        f"the form built {sorted(sim_param_configs)} instead"
    )
    price_range = sim_param_configs["exit_price_per_share"]

    body = _post_monte_carlo(startup_params, sim_param_configs)
    simulated = np.asarray(body["simulated_valuations"])
    net_outcomes = np.asarray(body["net_outcomes"])

    assert len(net_outcomes) == NUM_SIMULATIONS
    assert len(simulated) == NUM_SIMULATIONS

    # Magnitude guard: the simulated quantity is a share price, not a company.
    max_conceivable_payout = EXIT_PRICE_PER_SHARE * NUM_OPTIONS
    assert float(np.median(net_outcomes)) > 0
    assert float(np.abs(net_outcomes).max()) < max_conceivable_payout * ORDER_OF_MAGNITUDE
    assert (
        EXIT_PRICE_PER_SHARE / ORDER_OF_MAGNITUDE
        < float(np.median(simulated))
        < EXIT_PRICE_PER_SHARE * ORDER_OF_MAGNITUDE
    ), "options simulated values are not in per-share units"

    # Variance guard: the simulated prices must honour the configured range...
    assert simulated.min() >= price_range["min"]
    assert simulated.max() <= price_range["max"]
    _assert_is_a_distribution(simulated, "options simulated price per share")
    # ...and that variation must reach the outcomes the user is shown.
    _assert_is_a_distribution(net_outcomes, "options net outcomes")


def test_rsu_monte_carlo_endpoint_simulates_the_configured_valuation_range():
    """Control: the RSU branch of the same form keeps varying the exit valuation."""
    startup_params = _rsu_startup_params()
    sim_param_configs = _form_sim_param_configs(startup_params)

    assert set(sim_param_configs) == {"exit_valuation"}, (
        "An RSU scenario must be driven by the whole-company exit valuation; "
        f"the form built {sorted(sim_param_configs)} instead"
    )
    valuation_range = sim_param_configs["exit_valuation"]

    body = _post_monte_carlo(startup_params, sim_param_configs)
    simulated = np.asarray(body["simulated_valuations"])
    net_outcomes = np.asarray(body["net_outcomes"])

    assert simulated.min() >= valuation_range["min"]
    assert simulated.max() <= valuation_range["max"]
    assert (
        EXIT_VALUATION / ORDER_OF_MAGNITUDE
        < float(np.median(simulated))
        < EXIT_VALUATION * ORDER_OF_MAGNITUDE
    ), "RSU simulated values are not in whole-company units"
    _assert_is_a_distribution(simulated, "RSU simulated valuation")
    _assert_is_a_distribution(net_outcomes, "RSU net outcomes")
