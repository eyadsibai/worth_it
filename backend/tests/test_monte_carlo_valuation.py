# In backend/tests/test_monte_carlo_valuation.py
"""Tests for Monte Carlo valuation simulation layer."""

import numpy as np
import pytest

from worth_it.calculations.monte_carlo_valuation import (
    DistributionType,
    MonteCarloConfig,
    ParameterDistribution,
    run_monte_carlo_simulation,
    sample_distribution,
)


class TestParameterDistribution:
    """Tests for parameter distribution definitions."""

    def test_normal_distribution_creation(self) -> None:
        """Test creating a normal distribution parameter."""
        dist = ParameterDistribution(
            name="discount_rate",
            distribution_type=DistributionType.NORMAL,
            params={"mean": 0.25, "std": 0.05},
        )
        assert dist.name == "discount_rate"
        assert dist.distribution_type == DistributionType.NORMAL

    def test_uniform_distribution_creation(self) -> None:
        """Test creating a uniform distribution parameter."""
        dist = ParameterDistribution(
            name="exit_multiple",
            distribution_type=DistributionType.UNIFORM,
            params={"min": 3.0, "max": 8.0},
        )
        assert dist.distribution_type == DistributionType.UNIFORM

    def test_triangular_distribution_creation(self) -> None:
        """Test creating a triangular distribution parameter."""
        dist = ParameterDistribution(
            name="exit_value",
            distribution_type=DistributionType.TRIANGULAR,
            params={"min": 10_000_000, "mode": 25_000_000, "max": 50_000_000},
        )
        assert dist.distribution_type == DistributionType.TRIANGULAR

    def test_lognormal_distribution_creation(self) -> None:
        """Test creating a lognormal distribution."""
        dist = ParameterDistribution(
            name="revenue",
            distribution_type=DistributionType.LOGNORMAL,
            params={"mean": 14.0, "sigma": 0.5},  # log-space params
        )
        assert dist.distribution_type == DistributionType.LOGNORMAL


class TestSampleDistribution:
    """Tests for sampling from distributions."""

    def test_sample_normal(self) -> None:
        """Test sampling from normal distribution."""
        dist = ParameterDistribution(
            name="rate",
            distribution_type=DistributionType.NORMAL,
            params={"mean": 0.25, "std": 0.05},
        )
        samples = sample_distribution(dist, n_samples=1000, seed=42)
        assert len(samples) == 1000
        assert np.mean(samples) == pytest.approx(0.25, abs=0.01)

    def test_sample_uniform(self) -> None:
        """Test sampling from uniform distribution."""
        dist = ParameterDistribution(
            name="multiple",
            distribution_type=DistributionType.UNIFORM,
            params={"min": 3.0, "max": 8.0},
        )
        samples = sample_distribution(dist, n_samples=1000, seed=42)
        assert all(3.0 <= s <= 8.0 for s in samples)

    def test_sample_triangular(self) -> None:
        """Test sampling from triangular distribution."""
        dist = ParameterDistribution(
            name="value",
            distribution_type=DistributionType.TRIANGULAR,
            params={"min": 10, "mode": 25, "max": 50},
        )
        samples = sample_distribution(dist, n_samples=1000, seed=42)
        assert all(10 <= s <= 50 for s in samples)

    def test_reproducible_with_seed(self) -> None:
        """Test that same seed produces same samples."""
        dist = ParameterDistribution(
            name="test",
            distribution_type=DistributionType.NORMAL,
            params={"mean": 100, "std": 10},
        )
        samples1 = sample_distribution(dist, n_samples=100, seed=42)
        samples2 = sample_distribution(dist, n_samples=100, seed=42)
        assert np.array_equal(samples1, samples2)


class TestMonteCarloSimulation:
    """Tests for Monte Carlo simulation engine."""

    def test_simple_simulation(self) -> None:
        """Test running a simple simulation."""

        # Simple valuation function: value = base * multiplier
        def simple_valuation(base: float, multiplier: float) -> float:
            return base * multiplier

        config = MonteCarloConfig(
            valuation_function=simple_valuation,
            parameter_distributions=[
                ParameterDistribution(
                    name="base",
                    distribution_type=DistributionType.FIXED,
                    params={"value": 1_000_000},
                ),
                ParameterDistribution(
                    name="multiplier",
                    distribution_type=DistributionType.UNIFORM,
                    params={"min": 1.0, "max": 3.0},
                ),
            ],
            n_simulations=1000,
            seed=42,
        )

        result = run_monte_carlo_simulation(config)

        assert len(result.valuations) == 1000
        assert result.mean == pytest.approx(2_000_000, rel=0.1)  # ~2M average
        assert result.min >= 1_000_000
        assert result.max <= 3_000_000

    def test_percentile_calculation(self) -> None:
        """Test that percentiles are calculated correctly."""

        def identity(value: float) -> float:
            return value

        config = MonteCarloConfig(
            valuation_function=identity,
            parameter_distributions=[
                ParameterDistribution(
                    name="value",
                    distribution_type=DistributionType.UNIFORM,
                    params={"min": 0, "max": 100},
                ),
            ],
            n_simulations=10000,
            seed=42,
        )

        result = run_monte_carlo_simulation(config)

        assert result.percentile_10 == pytest.approx(10, abs=2)
        assert result.percentile_50 == pytest.approx(50, abs=2)
        assert result.percentile_90 == pytest.approx(90, abs=2)

    def test_with_first_chicago(self) -> None:
        """Test Monte Carlo with First Chicago valuation."""
        from worth_it.calculations.valuation import (
            FirstChicagoParams,
            FirstChicagoScenario,
            calculate_first_chicago,
        )

        def first_chicago_wrapper(
            best_prob: float,
            best_value: float,
            base_prob: float,
            base_value: float,
            worst_prob: float,
            worst_value: float,
            discount_rate: float,
            years: int,
        ) -> float:
            # Normalize probabilities
            total_prob = best_prob + base_prob + worst_prob
            params = FirstChicagoParams(
                scenarios=[
                    FirstChicagoScenario("Best", best_prob / total_prob, best_value, years),
                    FirstChicagoScenario("Base", base_prob / total_prob, base_value, years),
                    FirstChicagoScenario("Worst", worst_prob / total_prob, worst_value, years),
                ],
                discount_rate=discount_rate,
            )
            result = calculate_first_chicago(params)
            return result.present_value

        config = MonteCarloConfig(
            valuation_function=first_chicago_wrapper,
            parameter_distributions=[
                ParameterDistribution("best_prob", DistributionType.FIXED, {"value": 0.25}),
                ParameterDistribution(
                    "best_value",
                    DistributionType.TRIANGULAR,
                    {"min": 40_000_000, "mode": 50_000_000, "max": 80_000_000},
                ),
                ParameterDistribution("base_prob", DistributionType.FIXED, {"value": 0.50}),
                ParameterDistribution(
                    "base_value",
                    DistributionType.TRIANGULAR,
                    {"min": 15_000_000, "mode": 20_000_000, "max": 30_000_000},
                ),
                ParameterDistribution("worst_prob", DistributionType.FIXED, {"value": 0.25}),
                ParameterDistribution(
                    "worst_value",
                    DistributionType.TRIANGULAR,
                    {"min": 0, "mode": 5_000_000, "max": 10_000_000},
                ),
                ParameterDistribution(
                    "discount_rate",
                    DistributionType.NORMAL,
                    {"mean": 0.25, "std": 0.03},
                ),
                ParameterDistribution("years", DistributionType.FIXED, {"value": 5}),
            ],
            n_simulations=1000,
            seed=42,
        )

        result = run_monte_carlo_simulation(config)

        assert result.mean > 0
        assert result.percentile_10 < result.percentile_50 < result.percentile_90
