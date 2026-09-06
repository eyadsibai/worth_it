"""Reproducibility tests for the Monte Carlo entry points.

Simulations must be pinnable to an explicit seed so results can be reproduced,
diffed and regression-tested.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pytest

from worth_it.calculations.base import EquityType
from worth_it.monte_carlo import (
    run_monte_carlo_simulation,
    run_sensitivity_analysis,
)

NUM_SIMULATIONS = 100


@pytest.fixture
def base_params() -> dict[str, Any]:
    """Internal-format RSU base params with a non-zero failure probability."""
    return {
        "exit_year": 5,
        "current_job_monthly_salary": 15000.0,
        "startup_monthly_salary": 12000.0,
        "current_job_salary_growth_rate": 0.03,
        "annual_roi": 0.06,
        "investment_frequency": "Monthly",
        "failure_probability": 0.3,
        "startup_params": {
            "equity_type": EquityType.RSU,
            "total_vesting_years": 4,
            "cliff_years": 1,
            "rsu_params": {
                "equity_pct": 0.02,
                "target_exit_valuation": 50_000_000.0,
                "simulate_dilution": False,
                "dilution_rounds": [],
            },
            "options_params": {},
        },
    }


@pytest.fixture
def sim_param_configs() -> dict[str, Any]:
    return {
        "valuation": {"min_val": 25_000_000.0, "max_val": 75_000_000.0, "mode": 50_000_000.0},
        "roi": {"mean": 0.06, "std_dev": 0.02},
    }


def test_same_seed_reproduces_results(
    base_params: dict[str, Any], sim_param_configs: dict[str, Any]
):
    """Two runs with the same seed must be identical."""
    first = run_monte_carlo_simulation(
        NUM_SIMULATIONS, base_params, sim_param_configs, seed=20240730
    )
    second = run_monte_carlo_simulation(
        NUM_SIMULATIONS, base_params, sim_param_configs, seed=20240730
    )

    np.testing.assert_array_equal(first["net_outcomes"], second["net_outcomes"])
    np.testing.assert_array_equal(first["simulated_valuations"], second["simulated_valuations"])


def test_different_seeds_produce_different_results(
    base_params: dict[str, Any], sim_param_configs: dict[str, Any]
):
    """Different seeds must explore different draws."""
    first = run_monte_carlo_simulation(NUM_SIMULATIONS, base_params, sim_param_configs, seed=1)
    second = run_monte_carlo_simulation(NUM_SIMULATIONS, base_params, sim_param_configs, seed=2)

    assert not np.array_equal(first["net_outcomes"], second["net_outcomes"])
    assert not np.array_equal(first["simulated_valuations"], second["simulated_valuations"])


def test_seed_reproduces_iterative_path(base_params: dict[str, Any]):
    """The iterative (simulated exit year) path must honour the seed too."""
    sim_param_configs = {
        "exit_year": {"min_val": 3, "max_val": 7, "mode": 5},
        "valuation": {"min_val": 25_000_000.0, "max_val": 75_000_000.0, "mode": 50_000_000.0},
    }

    first = run_monte_carlo_simulation(25, base_params, sim_param_configs, seed=7)
    second = run_monte_carlo_simulation(25, base_params, sim_param_configs, seed=7)
    third = run_monte_carlo_simulation(25, base_params, sim_param_configs, seed=8)

    np.testing.assert_array_equal(first["net_outcomes"], second["net_outcomes"])
    assert not np.array_equal(first["net_outcomes"], third["net_outcomes"])


def test_seed_reproduces_sensitivity_analysis(
    base_params: dict[str, Any], sim_param_configs: dict[str, Any]
):
    """Sensitivity analysis is seedable through the same parameter."""
    first = run_sensitivity_analysis(base_params, sim_param_configs, seed=99)
    second = run_sensitivity_analysis(base_params, sim_param_configs, seed=99)

    np.testing.assert_array_equal(first["Impact"].to_numpy(), second["Impact"].to_numpy())


def test_unseeded_runs_stay_random(base_params: dict[str, Any], sim_param_configs: dict[str, Any]):
    """Omitting the seed preserves the previous non-deterministic behaviour."""
    first = run_monte_carlo_simulation(NUM_SIMULATIONS, base_params, sim_param_configs)
    second = run_monte_carlo_simulation(NUM_SIMULATIONS, base_params, sim_param_configs)

    assert len(first["net_outcomes"]) == NUM_SIMULATIONS
    assert not np.array_equal(first["net_outcomes"], second["net_outcomes"])
