"""
Cap table conversion calculation functions.

This module handles SAFE and Convertible Note conversions to equity,
including interest calculations, conversion price determination,
and stakeholder share allocation.
"""

from __future__ import annotations

from datetime import datetime


def calculate_interest(
    principal: float,
    annual_rate: float,
    months_elapsed: float,
    interest_type: str = "simple",
) -> float:
    """
    Calculate accrued interest for a convertible note.

    Supports both simple and compound interest calculations.

    Args:
        principal: The principal amount of the note
        annual_rate: Annual interest rate as percentage (e.g., 5 for 5%)
        months_elapsed: Number of months between note date and conversion date
        interest_type: "simple" or "compound"

    Returns:
        Accrued interest amount

    Example:
        >>> calculate_interest(50000, 5, 6, "simple")
        1250.0  # $50K * 5% * (6/12) = $1,250
    """
    if months_elapsed <= 0:
        return 0.0

    rate = annual_rate / 100
    years = months_elapsed / 12

    if interest_type == "compound":
        # Compound interest: P * ((1 + r)^t - 1)
        return float(principal * ((1 + rate) ** years - 1))
    else:
        # Simple interest: P * r * t
        return float(principal * rate * years)


def calculate_conversion_price(
    valuation_cap: float | None,
    discount_pct: float | None,
    round_price_per_share: float,
    pre_conversion_shares: int,
) -> tuple[float, str]:
    """
    Calculate the conversion price for a SAFE or Convertible Note.

    Uses the "best of both" rule: convert at whichever price is lower
    (giving the investor more shares).

    Args:
        valuation_cap: Maximum valuation for conversion (or None)
        discount_pct: Discount percentage (e.g., 20 for 20%) (or None)
        round_price_per_share: Price per share in the priced round
        pre_conversion_shares: Total shares before conversion

    Returns:
        Tuple of (conversion_price, price_source) where price_source is "cap" or "discount"

    Raises:
        ValueError: If neither cap nor discount is provided

    Example:
        >>> calculate_conversion_price(5_000_000, 20, 1.0, 10_000_000)
        (0.5, "cap")  # Cap price ($0.50) beats discount price ($0.80)
    """
    if valuation_cap is None and discount_pct is None:
        raise ValueError("Must have at least valuation_cap or discount_pct")

    cap_price = None
    discount_price = None

    if valuation_cap is not None and pre_conversion_shares > 0:
        cap_price = valuation_cap / pre_conversion_shares

    if discount_pct is not None:
        discount_price = round_price_per_share * (1 - discount_pct / 100)

    # Determine which price to use (lower = better for investor)
    if cap_price is not None and discount_price is not None:
        if cap_price <= discount_price:
            return (cap_price, "cap")
        else:
            return (discount_price, "discount")
    elif cap_price is not None:
        return (cap_price, "cap")
    else:
        # discount_price must be not None here due to initial validation
        return (discount_price, "discount")  # type: ignore[return-value]


def calculate_months_between_dates(start_date: str, end_date: str) -> float:
    """
    Calculate months between two ISO date strings.

    Uses actual day count for accuracy, avoiding the 30-day assumption
    that fails for month-end dates (e.g., Jan 31 to Feb 1).

    Args:
        start_date: Start date in ISO format (YYYY-MM-DD)
        end_date: End date in ISO format (YYYY-MM-DD)

    Returns:
        Number of months (can be fractional), minimum 0
    """
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)

    # Calculate actual days between dates
    delta = end - start
    total_days = delta.days

    if total_days <= 0:
        return 0.0

    # Convert days to months using average days per month (365.25 / 12)
    # This is more accurate than assuming 30 days per month
    avg_days_per_month = 365.25 / 12  # ~30.4375
    months = total_days / avg_days_per_month

    return months


# Re-export convert_instruments from the fluent pipeline implementation
# for backward compatibility
from worth_it.calculations.conversion_engine import convert_instruments  # noqa: E402

__all__ = [
    "calculate_interest",
    "calculate_conversion_price",
    "calculate_months_between_dates",
    "convert_instruments",
]
