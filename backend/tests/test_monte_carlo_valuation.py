# In backend/tests/test_monte_carlo_valuation.py
"""Tests for Monte Carlo valuation simulation layer."""

import numpy as np
import pytest

from worth_it.calculations.monte_carlo_valuation import (
    DistributionType,
    ParameterDistribution,
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
