"""Monte Carlo simulation layer for valuation methods.

This module provides a generic Monte Carlo wrapper that can be applied to
ANY valuation function, enabling probabilistic analysis of valuation uncertainty.

Key concepts:
- ParameterDistribution: Defines how a parameter varies (normal, uniform, etc.)
- MonteCarloConfig: Configuration for running simulations
- MonteCarloResult: Results including percentiles and histogram data
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum

import numpy as np


class DistributionType(Enum):
    """Supported probability distribution types."""

    NORMAL = "normal"
    UNIFORM = "uniform"
    TRIANGULAR = "triangular"
    LOGNORMAL = "lognormal"
    FIXED = "fixed"  # For non-varying parameters


@dataclass(frozen=True)
class ParameterDistribution:
    """Definition of a parameter's probability distribution.

    Attributes:
        name: Parameter name (must match valuation function param)
        distribution_type: Type of distribution
        params: Distribution-specific parameters
            - NORMAL: {"mean": float, "std": float}
            - UNIFORM: {"min": float, "max": float}
            - TRIANGULAR: {"min": float, "mode": float, "max": float}
            - LOGNORMAL: {"mean": float, "sigma": float}
            - FIXED: {"value": float}
    """

    name: str
    distribution_type: DistributionType
    params: dict[str, float]


def validate_distribution_params(dist: ParameterDistribution) -> None:
    """Validate distribution parameters.

    Args:
        dist: Parameter distribution to validate

    Raises:
        ValueError: If parameters are invalid
    """
    match dist.distribution_type:
        case DistributionType.NORMAL:
            if dist.params.get("std", 0) < 0:
                raise ValueError(
                    f"Normal distribution '{dist.name}' has negative std: {dist.params['std']}"
                )
        case DistributionType.UNIFORM:
            if dist.params.get("min", 0) > dist.params.get("max", 0):
                raise ValueError(f"Uniform distribution '{dist.name}' has min > max: {dist.params}")
        case DistributionType.TRIANGULAR:
            min_val = dist.params.get("min", 0)
            mode_val = dist.params.get("mode", 0)
            max_val = dist.params.get("max", 0)
            if not (min_val <= mode_val <= max_val):
                raise ValueError(
                    f"Triangular distribution '{dist.name}' requires min <= mode <= max: {dist.params}"
                )
        case DistributionType.LOGNORMAL:
            if dist.params.get("sigma", 0) < 0:
                raise ValueError(
                    f"Lognormal distribution '{dist.name}' has negative sigma: {dist.params['sigma']}"
                )


def sample_distribution(
    dist: ParameterDistribution,
    n_samples: int,
    seed: int | None = None,
) -> np.ndarray:
    """Sample values from a parameter distribution.

    Args:
        dist: Parameter distribution definition
        n_samples: Number of samples to generate
        seed: Random seed for reproducibility

    Returns:
        Array of sampled values

    Raises:
        ValueError: If distribution parameters are invalid
    """
    validate_distribution_params(dist)
    rng = np.random.default_rng(seed)

    match dist.distribution_type:
        case DistributionType.NORMAL:
            return rng.normal(
                loc=dist.params["mean"],
                scale=dist.params["std"],
                size=n_samples,
            )
        case DistributionType.UNIFORM:
            return rng.uniform(
                low=dist.params["min"],
                high=dist.params["max"],
                size=n_samples,
            )
        case DistributionType.TRIANGULAR:
            return rng.triangular(
                left=dist.params["min"],
                mode=dist.params["mode"],
                right=dist.params["max"],
                size=n_samples,
            )
        case DistributionType.LOGNORMAL:
            return rng.lognormal(
                mean=dist.params["mean"],
                sigma=dist.params["sigma"],
                size=n_samples,
            )
        case DistributionType.FIXED:
            return np.full(n_samples, dist.params["value"])
        case _:
            raise ValueError(f"Unknown distribution type: {dist.distribution_type}")


@dataclass
class MonteCarloConfig:
    """Configuration for Monte Carlo simulation.

    Attributes:
        valuation_function: Function that takes parameters and returns valuation
        parameter_distributions: List of parameter distributions
        n_simulations: Number of simulations to run
        seed: Random seed for reproducibility
    """

    valuation_function: Callable[..., float]
    parameter_distributions: list[ParameterDistribution]
    n_simulations: int = 10000
    seed: int | None = None


@dataclass
class MonteCarloResult:
    """Result of Monte Carlo simulation.

    Attributes:
        valuations: All simulated valuations
        mean: Mean valuation
        std: Standard deviation
        min: Minimum valuation
        max: Maximum valuation
        percentile_10: 10th percentile (pessimistic)
        percentile_25: 25th percentile
        percentile_50: 50th percentile (median)
        percentile_75: 75th percentile
        percentile_90: 90th percentile (optimistic)
        histogram_bins: Bin edges for histogram
        histogram_counts: Counts per bin
    """

    valuations: np.ndarray
    mean: float
    std: float
    min: float
    max: float
    percentile_10: float
    percentile_25: float
    percentile_50: float
    percentile_75: float
    percentile_90: float
    histogram_bins: np.ndarray
    histogram_counts: np.ndarray


def run_monte_carlo_simulation(config: MonteCarloConfig) -> MonteCarloResult:
    """Run Monte Carlo simulation on a valuation function.

    Args:
        config: Simulation configuration

    Returns:
        MonteCarloResult with distribution statistics
    """
    # Sample all parameters
    # Derive a unique seed per parameter distribution to avoid unintended
    # correlation between parameters while keeping simulations reproducible.
    param_samples: dict[str, np.ndarray] = {}
    for idx, dist in enumerate(config.parameter_distributions):
        seed_for_param = None if config.seed is None else config.seed + idx
        param_samples[dist.name] = sample_distribution(
            dist,
            n_samples=config.n_simulations,
            seed=seed_for_param,
        )

    # Run simulations
    valuations = np.zeros(config.n_simulations)
    for i in range(config.n_simulations):
        params = {name: samples[i] for name, samples in param_samples.items()}
        # Convert numpy types to Python types for function compatibility
        params = {
            k: float(v)
            if isinstance(v, np.floating)
            else int(v)
            if isinstance(v, np.integer)
            else v
            for k, v in params.items()
        }
        valuations[i] = config.valuation_function(**params)

    # Calculate statistics
    histogram_counts, histogram_bins = np.histogram(valuations, bins=50)

    return MonteCarloResult(
        valuations=valuations,
        mean=float(np.mean(valuations)),
        std=float(np.std(valuations)),
        min=float(np.min(valuations)),
        max=float(np.max(valuations)),
        percentile_10=float(np.percentile(valuations, 10)),
        percentile_25=float(np.percentile(valuations, 25)),
        percentile_50=float(np.percentile(valuations, 50)),
        percentile_75=float(np.percentile(valuations, 75)),
        percentile_90=float(np.percentile(valuations, 90)),
        histogram_bins=histogram_bins,
        histogram_counts=histogram_counts,
    )
