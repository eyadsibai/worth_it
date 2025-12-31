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


def _get_percentile(data: dict[str, float], percentile: int, default: float) -> float:
    """Get percentile value supporting both naming conventions.

    Supports:
    - Short form: 'p10', 'p25', 'p50', 'p75', 'p90'
    - Monte Carlo output: 'percentile_10', 'percentile_25', etc.
    """
    short_key = f"p{percentile}"
    long_key = f"percentile_{percentile}"
    return data.get(short_key, data.get(long_key, default))


def _has_required_percentiles(data: dict[str, float]) -> bool:
    """Check if dict has required percentile keys in either format."""
    required = [10, 25, 75, 90]
    for p in required:
        if f"p{p}" not in data and f"percentile_{p}" not in data:
            return False
    return True


def calculate_negotiation_range(
    valuation: float,
    monte_carlo_percentiles: dict[str, float] | None = None,
) -> NegotiationRange:
    """Calculate negotiation range for term sheet discussions.

    Uses Monte Carlo simulation percentiles when available for statistically-
    grounded boundaries. Falls back to standard variance multipliers otherwise.

    Args:
        valuation: Base valuation amount
        monte_carlo_percentiles: Optional dict with percentile keys. Supports both
            short form ('p10', 'p25', 'p50', 'p75', 'p90') and Monte Carlo output
            format ('percentile_10', 'percentile_25', etc.)

    Returns:
        NegotiationRange with floor, conservative, target, aggressive, ceiling
    """
    if monte_carlo_percentiles is not None:
        # Check for required percentiles in either naming format
        if _has_required_percentiles(monte_carlo_percentiles):
            return NegotiationRange(
                floor=_get_percentile(monte_carlo_percentiles, 10, valuation * FLOOR_MULTIPLIER),
                conservative=_get_percentile(
                    monte_carlo_percentiles, 25, valuation * CONSERVATIVE_MULTIPLIER
                ),
                target=_get_percentile(monte_carlo_percentiles, 50, valuation),
                aggressive=_get_percentile(
                    monte_carlo_percentiles, 75, valuation * AGGRESSIVE_MULTIPLIER
                ),
                ceiling=_get_percentile(
                    monte_carlo_percentiles, 90, valuation * CEILING_MULTIPLIER
                ),
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
