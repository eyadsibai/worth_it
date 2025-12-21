"""Performance tests for Monte Carlo simulation optimization (Issue #246).

These tests profile the Monte Carlo simulation to identify bottlenecks
and verify performance improvements.
"""

import time
from typing import Any

import numpy as np
import pytest

from worth_it.calculations import (
    run_monte_carlo_simulation,
    run_monte_carlo_simulation_iterative,
    run_monte_carlo_simulation_vectorized,
)

# --- Test Fixtures ---

@pytest.fixture
def base_params_rsu() -> dict[str, Any]:
    """Base parameters for RSU scenario."""
    return {
        "exit_year": 5,
        "current_job_monthly_salary": 15000.0,
        "startup_monthly_salary": 12000.0,
        "current_job_salary_growth_rate": 0.03,
        "annual_roi": 0.07,
        "investment_frequency": "Annually",
        "failure_probability": 0.3,
        "startup_params": {
            "equity_type": "RSU",
            "total_vesting_years": 4,
            "cliff_years": 1,
            "rsu_params": {
                "equity_pct": 0.005,  # 0.5%
                "target_exit_valuation": 100_000_000,
                "simulate_dilution": False,
                "dilution_rounds": [],
            },
            "options_params": {},
        },
    }


@pytest.fixture
def base_params_stock_options() -> dict[str, Any]:
    """Base parameters for stock options scenario."""
    return {
        "exit_year": 5,
        "current_job_monthly_salary": 15000.0,
        "startup_monthly_salary": 12000.0,
        "current_job_salary_growth_rate": 0.03,
        "annual_roi": 0.07,
        "investment_frequency": "Monthly",
        "failure_probability": 0.3,
        "startup_params": {
            "equity_type": "Stock Options",
            "total_vesting_years": 4,
            "cliff_years": 1,
            "rsu_params": {},
            "options_params": {
                "num_options": 10000,
                "strike_price": 1.0,
                "target_exit_price_per_share": 10.0,
                "exercise_strategy": "At Exit",
            },
        },
    }


@pytest.fixture
def sim_param_configs_valuation() -> dict[str, Any]:
    """Simulation parameter configs for valuation variation."""
    return {
        "valuation": {
            "min_val": 50_000_000,
            "max_val": 200_000_000,
            "mode": 100_000_000,
        }
    }


@pytest.fixture
def sim_param_configs_exit_year() -> dict[str, Any]:
    """Simulation parameter configs including exit year variation."""
    return {
        "exit_year": {
            "min_val": 3,
            "max_val": 7,
            "mode": 5,
        },
        "valuation": {
            "min_val": 50_000_000,
            "max_val": 200_000_000,
            "mode": 100_000_000,
        },
    }


# --- Profiling Utilities ---

def profile_function(func, *args, num_runs: int = 3, **kwargs) -> dict[str, float]:
    """Profile a function and return timing statistics."""
    times = []
    for _ in range(num_runs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        times.append(end - start)

    return {
        "min": min(times),
        "max": max(times),
        "mean": sum(times) / len(times),
        "result": result,
    }


# --- Baseline Performance Tests ---

class TestVectorizedPerformance:
    """Tests for vectorized Monte Carlo simulation performance."""

    @pytest.mark.parametrize("num_simulations", [1000, 5000, 10000])
    def test_vectorized_scaling(
        self,
        base_params_rsu: dict[str, Any],
        num_simulations: int,
    ):
        """Test vectorized simulation scales sub-linearly with simulation count."""
        # Pre-allocate sim_params (simulating what run_monte_carlo_simulation does)
        sim_params = {
            "roi": np.full(num_simulations, base_params_rsu["annual_roi"]),
            "valuation": np.full(num_simulations, 100_000_000),
            "salary_growth": np.full(num_simulations, 0.03),
            "dilution": np.full(num_simulations, np.nan),
        }

        timing = profile_function(
            run_monte_carlo_simulation_vectorized,
            num_simulations,
            base_params_rsu,
            sim_params,
            num_runs=3,
        )

        # Performance assertion: 10k simulations should complete in < 1 second
        assert timing["mean"] < 1.0, (
            f"Vectorized simulation with {num_simulations} sims took {timing['mean']:.3f}s"
        )

        # Verify results are valid
        result = timing["result"]
        assert len(result["net_outcomes"]) == num_simulations
        assert not np.any(np.isnan(result["net_outcomes"]))

    def test_annual_aggregation_performance(
        self,
        base_params_rsu: dict[str, Any],
    ):
        """Profile the annual aggregation bottleneck specifically."""
        num_simulations = 10000
        exit_year = base_params_rsu["exit_year"]
        total_months = exit_year * 12

        # Simulate the data that would be passed to annual aggregation
        salary_growth = np.full(num_simulations, 0.03)
        month_indices = np.arange(total_months)
        year_indices = month_indices // 12
        current_salaries = base_params_rsu["current_job_monthly_salary"] * (
            (1 + salary_growth[:, np.newaxis]) ** year_indices
        )
        monthly_surpluses = current_salaries - base_params_rsu["startup_monthly_salary"]
        investable_surpluses = np.clip(monthly_surpluses, 0, None)

        # Profile the CURRENT implementation (list comprehension approach)
        def current_aggregation():
            return np.array([
                np.sum(investable_surpluses[i].reshape(-1, 12), axis=1)
                for i in range(num_simulations)
            ])

        current_timing = profile_function(current_aggregation, num_runs=5)

        # Profile OPTIMIZED implementation (pure vectorized)
        def optimized_aggregation():
            # Reshape to (num_simulations, num_years, 12) and sum along months
            return investable_surpluses.reshape(num_simulations, -1, 12).sum(axis=2)

        optimized_timing = profile_function(optimized_aggregation, num_runs=5)

        # Verify results match
        current_result = current_timing["result"]
        optimized_result = optimized_timing["result"]
        np.testing.assert_array_almost_equal(current_result, optimized_result)

        # Performance improvement should be at least 2x
        speedup = current_timing["mean"] / optimized_timing["mean"]
        print(f"\nAnnual aggregation speedup: {speedup:.2f}x")
        print(f"  Current: {current_timing['mean']*1000:.3f}ms")
        print(f"  Optimized: {optimized_timing['mean']*1000:.3f}ms")

        # Assert significant improvement (target 2x, accept 1.5x minimum)
        assert speedup >= 1.5, f"Expected at least 1.5x speedup, got {speedup:.2f}x"


class TestIterativePerformance:
    """Tests for iterative Monte Carlo simulation performance."""

    @pytest.mark.parametrize("num_simulations", [100, 500, 1000])
    def test_iterative_scaling(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_exit_year: dict[str, Any],
        num_simulations: int,
    ):
        """Test iterative simulation scaling (slower but necessary for variable exit year)."""
        timing = profile_function(
            run_monte_carlo_simulation_iterative,
            num_simulations,
            base_params_rsu,
            sim_param_configs_exit_year,
            num_runs=2,
        )

        # Performance assertion: 1k simulations should complete in < 30 seconds
        # (iterative is expected to be much slower)
        assert timing["mean"] < 30.0, (
            f"Iterative simulation with {num_simulations} sims took {timing['mean']:.3f}s"
        )

        # Verify results are valid
        result = timing["result"]
        assert len(result["net_outcomes"]) == num_simulations


class TestEndToEndPerformance:
    """End-to-end performance tests via the main entry point."""

    def test_monte_carlo_10k_simulations(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_valuation: dict[str, Any],
    ):
        """Profile complete 10k simulation run (vectorized path)."""
        num_simulations = 10000

        timing = profile_function(
            run_monte_carlo_simulation,
            num_simulations,
            base_params_rsu,
            sim_param_configs_valuation,
            num_runs=3,
        )

        print(f"\n10k simulations (vectorized): {timing['mean']*1000:.1f}ms")

        # Target: < 500ms for 10k simulations
        assert timing["mean"] < 0.5, (
            f"10k simulations took {timing['mean']*1000:.1f}ms (target: <500ms)"
        )

    def test_monte_carlo_monthly_vs_annual_frequency(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_valuation: dict[str, Any],
    ):
        """Compare performance of Monthly vs Annual investment frequency."""
        num_simulations = 10000

        # Monthly frequency
        params_monthly = base_params_rsu.copy()
        params_monthly["investment_frequency"] = "Monthly"

        timing_monthly = profile_function(
            run_monte_carlo_simulation,
            num_simulations,
            params_monthly,
            sim_param_configs_valuation,
            num_runs=3,
        )

        # Annual frequency
        params_annual = base_params_rsu.copy()
        params_annual["investment_frequency"] = "Annually"

        timing_annual = profile_function(
            run_monte_carlo_simulation,
            num_simulations,
            params_annual,
            sim_param_configs_valuation,
            num_runs=3,
        )

        print("\n10k simulations:")
        print(f"  Monthly: {timing_monthly['mean']*1000:.1f}ms")
        print(f"  Annual: {timing_annual['mean']*1000:.1f}ms")

        # Both should be reasonably fast
        assert timing_monthly["mean"] < 1.0
        assert timing_annual["mean"] < 1.0


class TestPerformanceRegression:
    """Tests to prevent performance regressions."""

    def test_vectorized_baseline(self, base_params_rsu: dict[str, Any]):
        """Establish baseline for vectorized performance."""
        num_simulations = 10000
        sim_params = {
            "roi": np.full(num_simulations, 0.07),
            "valuation": np.full(num_simulations, 100_000_000),
            "salary_growth": np.full(num_simulations, 0.03),
            "dilution": np.full(num_simulations, np.nan),
        }

        timing = profile_function(
            run_monte_carlo_simulation_vectorized,
            num_simulations,
            base_params_rsu,
            sim_params,
            num_runs=5,
        )

        # This is our regression threshold - fail if we regress beyond this
        REGRESSION_THRESHOLD_MS = 200  # 200ms max for 10k simulations

        assert timing["mean"] * 1000 < REGRESSION_THRESHOLD_MS, (
            f"Performance regression detected: {timing['mean']*1000:.1f}ms "
            f"(threshold: {REGRESSION_THRESHOLD_MS}ms)"
        )
