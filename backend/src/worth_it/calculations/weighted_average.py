"""Weighted Average synthesis of multiple valuation methods.

Combines valuations from different methods using confidence
weights to produce a blended final valuation.

This is the standard practice in professional valuations:
- No single method is perfect
- Different methods capture different aspects of value
- Triangulation provides a more robust estimate

Usage:
    >>> params = WeightedAverageParams(valuations=[
    ...     ValuationInput("DCF", 10_000_000, 0.4),
    ...     ValuationInput("Comparables", 12_000_000, 0.4),
    ...     ValuationInput("First Chicago", 11_000_000, 0.2),
    ... ])
    >>> result = calculate_weighted_average(params)
    >>> print(f"Blended valuation: ${result.weighted_valuation:,.0f}")
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class ValuationInput:
    """A single valuation method's result.

    Attributes:
        method: Name of valuation method (e.g., "DCF", "Comparables")
        valuation: Valuation result from that method
        weight: Confidence weight (will be normalized)
    """

    method: str
    valuation: float
    weight: float


@dataclass(frozen=True)
class WeightedAverageParams:
    """Parameters for weighted average valuation.

    Attributes:
        valuations: List of method valuations with weights
    """

    valuations: list[ValuationInput]


@dataclass(frozen=True)
class WeightedAverageResult:
    """Result of weighted average valuation.

    Attributes:
        weighted_valuation: Final weighted average valuation
        method_contributions: Each method's dollar contribution to final
        normalized_weights: Weights normalized to sum to 1.0
        method: Always "weighted_average"
    """

    weighted_valuation: float
    method_contributions: dict[str, float]
    normalized_weights: dict[str, float]
    method: Literal["weighted_average"] = field(default="weighted_average")


def calculate_weighted_average(params: WeightedAverageParams) -> WeightedAverageResult:
    """Calculate weighted average of multiple valuations.

    Normalizes weights to sum to 1.0, then computes weighted mean.
    Each method's contribution shows how much it affects the final value.

    The weighted average formula is:
        V_weighted = Σ(w_i × V_i) / Σ(w_i)

    Where:
        w_i = confidence weight for method i
        V_i = valuation from method i

    Args:
        params: WeightedAverageParams with valuations and weights

    Returns:
        WeightedAverageResult with combined valuation

    Raises:
        ValueError: If no valuations provided or total weight is zero
    """
    if not params.valuations:
        raise ValueError("At least one valuation required")

    # Calculate total weight for normalization
    total_weight = sum(v.weight for v in params.valuations)
    if total_weight == 0:
        raise ValueError("Total weight cannot be zero")

    normalized_weights: dict[str, float] = {}
    method_contributions: dict[str, float] = {}
    weighted_sum = 0.0

    for v in params.valuations:
        norm_weight = v.weight / total_weight
        normalized_weights[v.method] = norm_weight
        contribution = v.valuation * norm_weight
        method_contributions[v.method] = contribution
        weighted_sum += contribution

    return WeightedAverageResult(
        weighted_valuation=weighted_sum,
        method_contributions=method_contributions,
        normalized_weights=normalized_weights,
    )
