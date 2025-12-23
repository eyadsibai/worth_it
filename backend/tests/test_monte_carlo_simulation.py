"""Tests for Monte Carlo simulation Template Method pattern (Issue #280).

These tests verify the class-based Monte Carlo simulation implementation
using the Template Method pattern.
"""

from typing import Any

import numpy as np
import pytest

from worth_it.calculations import (
    IterativeMonteCarlo,
    MonteCarloResult,
    MonteCarloSimulation,
    VectorizedMonteCarlo,
    get_monte_carlo_simulation,
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
                "equity_pct": 0.005,
                "target_exit_valuation": 100_000_000,
                "simulate_dilution": False,
                "dilution_rounds": [],
            },
            "options_params": {},
        },
    }


@pytest.fixture
def sim_param_configs_fixed() -> dict[str, Any]:
    """Sim configs without exit_year (uses vectorized path)."""
    return {
        "valuation": {
            "min_val": 50_000_000,
            "max_val": 200_000_000,
            "mode": 100_000_000,
        }
    }


@pytest.fixture
def sim_param_configs_variable() -> dict[str, Any]:
    """Sim configs with exit_year (uses iterative path)."""
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


# --- MonteCarloResult Tests ---


class TestMonteCarloResult:
    """Tests for the MonteCarloResult dataclass."""

    def test_result_properties(self):
        """Verify result provides useful statistical properties."""
        outcomes = np.array([100, 200, 300, 400, 500])
        result = MonteCarloResult(
            net_outcomes=outcomes,
            simulated_valuations=np.array([1, 2, 3, 4, 5]),
            num_simulations=5,
        )

        assert result.mean_outcome == 300.0
        assert result.median_outcome == 300.0
        assert result.probability_positive == 1.0
        assert result.percentile(50) == 300.0

    def test_result_is_immutable(self):
        """Verify result is frozen (immutable)."""
        result = MonteCarloResult(
            net_outcomes=np.array([100]),
            simulated_valuations=np.array([1]),
            num_simulations=1,
        )
        with pytest.raises(AttributeError):
            result.num_simulations = 10  # type: ignore[misc]

    def test_probability_with_negatives(self):
        """Verify probability calculation with mixed outcomes."""
        outcomes = np.array([-100, -50, 0, 50, 100])
        result = MonteCarloResult(
            net_outcomes=outcomes,
            simulated_valuations=np.array([1, 2, 3, 4, 5]),
            num_simulations=5,
        )
        # Only 50 and 100 are positive (2 out of 5)
        assert result.probability_positive == 0.4


# --- Factory Function Tests ---


class TestFactoryFunction:
    """Tests for get_monte_carlo_simulation factory."""

    def test_returns_vectorized_for_fixed_exit(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_fixed: dict[str, Any],
    ):
        """Verify factory returns VectorizedMonteCarlo when exit_year is fixed."""
        sim = get_monte_carlo_simulation(base_params_rsu, sim_param_configs_fixed)
        assert isinstance(sim, VectorizedMonteCarlo)

    def test_returns_iterative_for_variable_exit(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_variable: dict[str, Any],
    ):
        """Verify factory returns IterativeMonteCarlo when exit_year varies."""
        sim = get_monte_carlo_simulation(base_params_rsu, sim_param_configs_variable)
        assert isinstance(sim, IterativeMonteCarlo)

    def test_both_are_subclasses_of_abc(self):
        """Verify both implementations inherit from ABC."""
        assert issubclass(VectorizedMonteCarlo, MonteCarloSimulation)
        assert issubclass(IterativeMonteCarlo, MonteCarloSimulation)


# --- VectorizedMonteCarlo Tests ---


class TestVectorizedMonteCarlo:
    """Tests for VectorizedMonteCarlo implementation."""

    def test_run_returns_result(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_fixed: dict[str, Any],
    ):
        """Verify run() returns MonteCarloResult."""
        sim = VectorizedMonteCarlo(base_params_rsu, sim_param_configs_fixed)
        result = sim.run(num_simulations=100)

        assert isinstance(result, MonteCarloResult)
        assert result.num_simulations == 100
        assert len(result.net_outcomes) == 100

    def test_generate_samples_creates_arrays(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_fixed: dict[str, Any],
    ):
        """Verify generate_samples creates proper numpy arrays."""
        sim = VectorizedMonteCarlo(base_params_rsu, sim_param_configs_fixed)
        samples = sim.generate_samples(1000)

        assert "roi" in samples
        assert "valuation" in samples
        assert "salary_growth" in samples
        assert len(samples["roi"]) == 1000
        assert len(samples["valuation"]) == 1000

    def test_valuations_within_range(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_fixed: dict[str, Any],
    ):
        """Verify sampled valuations are within PERT range."""
        sim = VectorizedMonteCarlo(base_params_rsu, sim_param_configs_fixed)
        samples = sim.generate_samples(10000)

        min_val = sim_param_configs_fixed["valuation"]["min_val"]
        max_val = sim_param_configs_fixed["valuation"]["max_val"]

        assert samples["valuation"].min() >= min_val
        assert samples["valuation"].max() <= max_val


# --- IterativeMonteCarlo Tests ---


class TestIterativeMonteCarlo:
    """Tests for IterativeMonteCarlo implementation."""

    def test_run_returns_result(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_variable: dict[str, Any],
    ):
        """Verify run() returns MonteCarloResult."""
        sim = IterativeMonteCarlo(base_params_rsu, sim_param_configs_variable)
        result = sim.run(num_simulations=50)  # Small for speed

        assert isinstance(result, MonteCarloResult)
        assert result.num_simulations == 50
        assert len(result.net_outcomes) == 50

    def test_generate_samples_includes_exit_year(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_variable: dict[str, Any],
    ):
        """Verify generate_samples creates exit_year samples."""
        sim = IterativeMonteCarlo(base_params_rsu, sim_param_configs_variable)
        samples = sim.generate_samples(100)

        assert "exit_year" in samples
        assert len(samples["exit_year"]) == 100
        assert samples["exit_year"].dtype == np.int64 or samples["exit_year"].dtype == int

    def test_exit_years_within_range(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_variable: dict[str, Any],
    ):
        """Verify sampled exit years are within PERT range."""
        sim = IterativeMonteCarlo(base_params_rsu, sim_param_configs_variable)
        samples = sim.generate_samples(1000)

        min_val = sim_param_configs_variable["exit_year"]["min_val"]
        max_val = sim_param_configs_variable["exit_year"]["max_val"]

        assert samples["exit_year"].min() >= min_val
        assert samples["exit_year"].max() <= max_val


# --- Template Method Pattern Tests ---


class TestTemplateMethodPattern:
    """Tests verifying Template Method pattern implementation."""

    def test_run_calls_generate_then_calculate(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_fixed: dict[str, Any],
    ):
        """Verify run() follows template: generate -> calculate -> aggregate."""

        class TrackedSimulation(VectorizedMonteCarlo):
            """Subclass that tracks method calls."""

            calls: list[str] = []

            def generate_samples(self, num_simulations: int) -> dict[str, np.ndarray]:
                self.calls.append("generate_samples")
                return super().generate_samples(num_simulations)

            def calculate_outcomes(
                self, num_simulations: int, samples: dict[str, np.ndarray]
            ) -> dict[str, np.ndarray]:
                self.calls.append("calculate_outcomes")
                return super().calculate_outcomes(num_simulations, samples)

            def aggregate_results(
                self,
                raw_results: dict[str, np.ndarray],
                samples: dict[str, np.ndarray],
                num_simulations: int,
            ) -> MonteCarloResult:
                self.calls.append("aggregate_results")
                return super().aggregate_results(raw_results, samples, num_simulations)

        TrackedSimulation.calls = []
        sim = TrackedSimulation(base_params_rsu, sim_param_configs_fixed)
        sim.run(100)

        assert TrackedSimulation.calls == [
            "generate_samples",
            "calculate_outcomes",
            "aggregate_results",
        ]

    def test_custom_aggregation_can_be_overridden(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_fixed: dict[str, Any],
    ):
        """Verify aggregation step can be customized."""

        class CustomAggregation(VectorizedMonteCarlo):
            """Subclass with custom aggregation."""

            def aggregate_results(
                self,
                raw_results: dict[str, np.ndarray],
                samples: dict[str, np.ndarray],
                num_simulations: int,
            ) -> MonteCarloResult:
                # Custom: set all outcomes to 42
                return MonteCarloResult(
                    net_outcomes=np.full(num_simulations, 42.0),
                    simulated_valuations=samples.get("valuation", np.array([])),
                    num_simulations=num_simulations,
                )

        sim = CustomAggregation(base_params_rsu, sim_param_configs_fixed)
        result = sim.run(100)

        assert np.all(result.net_outcomes == 42.0)


# --- Performance Comparison Tests ---


class TestPerformanceComparison:
    """Tests comparing class-based vs function-based performance."""

    def test_vectorized_class_matches_function_output(
        self,
        base_params_rsu: dict[str, Any],
        sim_param_configs_fixed: dict[str, Any],
    ):
        """Verify class produces similar distribution to function."""
        from worth_it.calculations import run_monte_carlo_simulation

        np.random.seed(42)
        func_result = run_monte_carlo_simulation(1000, base_params_rsu, sim_param_configs_fixed)

        np.random.seed(42)
        sim = VectorizedMonteCarlo(base_params_rsu, sim_param_configs_fixed)
        class_result = sim.run(1000)

        # Results should have similar statistical properties
        # (exact match not expected due to implementation differences)
        func_mean = func_result["net_outcomes"].mean()
        class_mean = class_result.mean_outcome

        # Within 50% - just checking they're in the same ballpark
        assert abs(func_mean - class_mean) / abs(func_mean) < 0.5
