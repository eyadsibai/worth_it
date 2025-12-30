"""Comparable Transactions valuation method.

Values a company by analyzing revenue multiples from similar
M&A transactions or public company valuations.

This is one of the most common methods in investment banking,
as it provides market-based validation of valuations.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, median


@dataclass(frozen=True)
class ComparableTransaction:
    """A comparable transaction for benchmarking.

    Attributes:
        name: Company or deal name
        deal_value: Transaction value (enterprise or equity)
        revenue: Revenue at time of transaction
        industry: Industry category for filtering
        date: Transaction date (YYYY-MM-DD format)
    """

    name: str
    deal_value: float
    revenue: float
    industry: str
    date: str


@dataclass(frozen=True)
class ComparablesParams:
    """Parameters for Comparable Transactions valuation.

    Attributes:
        target_revenue: Target company's current revenue
        comparables: List of comparable transactions
    """

    target_revenue: float
    comparables: list[ComparableTransaction]


@dataclass(frozen=True)
class ComparablesResult:
    """Result of Comparable Transactions valuation.

    Attributes:
        implied_valuation: Valuation using median multiple
        median_multiple: Median revenue multiple from comparables
        mean_multiple: Mean revenue multiple
        low_valuation: 25th percentile valuation
        high_valuation: 75th percentile valuation
        multiples: Individual multiples from each comparable
        comparable_count: Number of valid comparables used
    """

    implied_valuation: float
    median_multiple: float
    mean_multiple: float
    low_valuation: float
    high_valuation: float
    multiples: list[float]
    comparable_count: int


def calculate_comparable_valuation(params: ComparablesParams) -> ComparablesResult:
    """Calculate valuation using Comparable Transactions method.

    This method:
    1. Calculates revenue multiple for each comparable (deal_value / revenue)
    2. Excludes comparables with zero revenue
    3. Uses median multiple for implied valuation (more robust than mean)
    4. Provides range using 25th and 75th percentiles

    The median is preferred over mean because it's more robust to
    outliers from unusual transactions.

    Args:
        params: ComparablesParams with target revenue and comparables list

    Returns:
        ComparablesResult with implied valuation and multiple analysis

    Raises:
        ValueError: If no valid comparables (all have zero revenue)
    """
    # Calculate multiples, filtering out zero-revenue comparables
    multiples: list[float] = []

    for comp in params.comparables:
        if comp.revenue > 0:
            multiple = comp.deal_value / comp.revenue
            multiples.append(multiple)

    if not multiples:
        raise ValueError("At least one comparable with positive revenue is required")

    # Calculate statistics
    median_mult = median(multiples)
    mean_mult = mean(multiples)

    # Sort for percentile calculation
    sorted_multiples = sorted(multiples)
    n = len(sorted_multiples)

    # Calculate percentiles
    if n == 1:
        p25_mult = p75_mult = sorted_multiples[0]
    elif n == 2:
        p25_mult = sorted_multiples[0]
        p75_mult = sorted_multiples[1]
    else:
        # Linear interpolation for percentiles
        p25_idx = 0.25 * (n - 1)
        p75_idx = 0.75 * (n - 1)

        p25_lower = int(p25_idx)
        p25_frac = p25_idx - p25_lower
        p25_mult = sorted_multiples[p25_lower] * (1 - p25_frac)
        if p25_lower + 1 < n:
            p25_mult += sorted_multiples[p25_lower + 1] * p25_frac

        p75_lower = int(p75_idx)
        p75_frac = p75_idx - p75_lower
        p75_mult = sorted_multiples[p75_lower] * (1 - p75_frac)
        if p75_lower + 1 < n:
            p75_mult += sorted_multiples[p75_lower + 1] * p75_frac

    # Apply multiples to target revenue
    implied_valuation = params.target_revenue * median_mult
    low_valuation = params.target_revenue * p25_mult
    high_valuation = params.target_revenue * p75_mult

    return ComparablesResult(
        implied_valuation=implied_valuation,
        median_multiple=median_mult,
        mean_multiple=mean_mult,
        low_valuation=low_valuation,
        high_valuation=high_valuation,
        multiples=multiples,
        comparable_count=len(multiples),
    )
