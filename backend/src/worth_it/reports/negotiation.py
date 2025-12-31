"""Negotiation range calculator for term sheet discussions.

Provides data-driven negotiation boundaries using Monte Carlo percentiles
when available, or falling back to standard variance multipliers.
"""

from dataclasses import dataclass

# Standard variance multipliers when Monte Carlo data is unavailable
FLOOR_MULTIPLIER = 0.70  # Walk-away point
CONSERVATIVE_MULTIPLIER = 0.85  # Defensible lower bound
TARGET_MULTIPLIER = 1.00  # Base valuation
AGGRESSIVE_MULTIPLIER = 1.20  # Stretch goal
CEILING_MULTIPLIER = 1.50  # Maximum reasonable ask


@dataclass(frozen=True)
class NegotiationRange:
    """Immutable negotiation range for term sheet discussions.

    Attributes:
        floor: Absolute minimum - walk away below this
        conservative: Defensible lower bound
        target: Ideal negotiation target (base valuation)
        aggressive: Stretch goal
        ceiling: Maximum reasonable ask
    """

    floor: float
    conservative: float
    target: float
    aggressive: float
    ceiling: float


def calculate_negotiation_range(
    valuation: float,
    monte_carlo_percentiles: dict[str, float] | None = None,
) -> NegotiationRange:
    """Calculate negotiation range for term sheet discussions.

    Uses Monte Carlo simulation percentiles when available for statistically-
    grounded boundaries. Falls back to standard variance multipliers otherwise.

    Args:
        valuation: Base valuation amount
        monte_carlo_percentiles: Optional dict with keys 'p10', 'p25', 'p50',
            'p75', 'p90' representing Monte Carlo simulation percentiles

    Returns:
        NegotiationRange with floor, conservative, target, aggressive, ceiling
    """
    if monte_carlo_percentiles is not None:
        # Validate required keys before using Monte Carlo percentiles
        required_keys = {"p10", "p25", "p75", "p90"}
        if required_keys.issubset(monte_carlo_percentiles.keys()):
            return NegotiationRange(
                floor=monte_carlo_percentiles["p10"],
                conservative=monte_carlo_percentiles["p25"],
                target=monte_carlo_percentiles.get("p50", valuation),
                aggressive=monte_carlo_percentiles["p75"],
                ceiling=monte_carlo_percentiles["p90"],
            )
        # Fall through to standard multipliers if keys are missing

    # Fall back to standard variance multipliers
    return NegotiationRange(
        floor=valuation * FLOOR_MULTIPLIER,
        conservative=valuation * CONSERVATIVE_MULTIPLIER,
        target=valuation * TARGET_MULTIPLIER,
        aggressive=valuation * AGGRESSIVE_MULTIPLIER,
        ceiling=valuation * CEILING_MULTIPLIER,
    )
