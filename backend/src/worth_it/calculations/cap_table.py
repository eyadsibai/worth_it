"""
Cap table conversion calculation functions.

This module handles SAFE and Convertible Note conversions to equity,
including interest calculations, conversion price determination,
and stakeholder share allocation.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any


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


def convert_instruments(
    cap_table: dict[str, Any],
    instruments: list[dict[str, Any]],
    priced_round: dict[str, Any],
) -> dict[str, Any]:
    """
    Convert all outstanding SAFEs and Convertible Notes to equity.

    This is the main conversion function that:
    1. Filters to only outstanding instruments
    2. Calculates conversion price for each (using "best of both" rule)
    3. For notes, includes accrued interest in conversion amount
    4. Creates new stakeholder entries for converted investors
    5. Updates total shares and recalculates ownership percentages

    Args:
        cap_table: Current cap table with stakeholders and total_shares
        instruments: List of SAFE and ConvertibleNote dictionaries
        priced_round: The priced round triggering conversion with:
            - price_per_share: Round price per share
            - date: Optional round date for interest calculation

    Returns:
        Dictionary with:
        - updated_cap_table: Cap table with new stakeholders
        - converted_instruments: Details of each conversion
        - summary: Aggregate conversion stats
    """
    # Extract data from inputs
    stakeholders = list(cap_table.get("stakeholders", []))
    total_shares = cap_table.get("total_shares", 10_000_000)
    option_pool_pct = cap_table.get("option_pool_pct", 10)

    round_price = priced_round["price_per_share"]
    round_date = priced_round.get("date")

    # Track conversion results
    converted_details = []
    total_new_shares = 0

    # Process each instrument
    for instrument in instruments:
        # Only convert outstanding instruments
        if instrument.get("status") != "outstanding":
            continue

        instrument_type = instrument.get("type")
        investor_name = instrument["investor_name"]
        instrument_id = instrument["id"]

        # Determine conversion amount (principal for SAFE, principal + interest for Note)
        if instrument_type == "CONVERTIBLE_NOTE":
            principal = instrument["principal_amount"]
            interest_rate = instrument.get("interest_rate", 0)
            interest_type = instrument.get("interest_type", "simple")
            note_date = instrument.get("date")

            # Calculate accrued interest
            if note_date and round_date:
                months_elapsed = calculate_months_between_dates(note_date, round_date)
            else:
                # Default to maturity_months if dates not provided
                months_elapsed = instrument.get("maturity_months", 12)

            accrued_interest = calculate_interest(
                principal, interest_rate, months_elapsed, interest_type
            )
            conversion_amount = principal + accrued_interest
        else:
            # SAFE - no interest
            conversion_amount = instrument["investment_amount"]
            accrued_interest = None

        # Calculate conversion price
        valuation_cap = instrument.get("valuation_cap")
        discount_pct = instrument.get("discount_pct")

        conversion_price, price_source = calculate_conversion_price(
            valuation_cap=valuation_cap,
            discount_pct=discount_pct,
            round_price_per_share=round_price,
            pre_conversion_shares=total_shares,
        )

        # Calculate shares issued
        shares_issued = int(conversion_amount / conversion_price)
        total_new_shares += shares_issued

        # Create new stakeholder for converted investor
        new_stakeholder = {
            "id": str(uuid.uuid4()),
            "name": investor_name,
            "type": "investor",
            "shares": shares_issued,
            "ownership_pct": 0,  # Will be recalculated after all conversions
            "share_class": "preferred",
            "vesting": None,
        }
        stakeholders.append(new_stakeholder)

        # Record conversion details
        converted_details.append(
            {
                "instrument_id": instrument_id,
                "instrument_type": instrument_type,
                "investor_name": investor_name,
                "investment_amount": conversion_amount,
                "conversion_price": conversion_price,
                "price_source": price_source,
                "shares_issued": shares_issued,
                "ownership_pct": 0,  # Will be recalculated
                "accrued_interest": accrued_interest,
            }
        )

    # Update total shares
    new_total_shares = total_shares + total_new_shares

    # Recalculate ownership percentages for all stakeholders
    for stakeholder in stakeholders:
        stakeholder["ownership_pct"] = (stakeholder["shares"] / new_total_shares) * 100

    # Update ownership_pct in converted_details
    for detail in converted_details:
        detail["ownership_pct"] = (detail["shares_issued"] / new_total_shares) * 100

    # Calculate dilution
    total_dilution_pct = (total_new_shares / new_total_shares) * 100

    return {
        "updated_cap_table": {
            "stakeholders": stakeholders,
            "total_shares": new_total_shares,
            "option_pool_pct": option_pool_pct,
        },
        "converted_instruments": converted_details,
        "summary": {
            "instruments_converted": len(converted_details),
            "total_shares_issued": total_new_shares,
            "total_dilution_pct": total_dilution_pct,
        },
    }
