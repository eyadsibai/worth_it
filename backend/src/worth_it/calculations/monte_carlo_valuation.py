"""Monte Carlo simulation layer for valuation methods.

This module provides a generic Monte Carlo wrapper that can be applied to
ANY valuation function, enabling probabilistic analysis of valuation uncertainty.

Key concepts:
- ParameterDistribution: Defines how a parameter varies (normal, uniform, etc.)
- MonteCarloConfig: Configuration for running simulations
- MonteCarloResult: Results including percentiles and histogram data
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    pass


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
    """
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
