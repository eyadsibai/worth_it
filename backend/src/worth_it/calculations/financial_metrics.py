"""
Financial metrics calculation functions.

This module provides standard financial analysis functions including
Internal Rate of Return (IRR), Net Present Value (NPV), and dilution calculations.
"""

from __future__ import annotations

import numpy as np
import numpy_financial as npf
import pandas as pd

from worth_it.calculations.base import annual_to_monthly_roi


def calculate_dilution_from_valuation(pre_money_valuation: float, amount_raised: float) -> float:
    """
    Calculate dilution percentage from a funding round.

    Uses the standard formula: dilution = amount_raised / post_money_valuation
    where post_money_valuation = pre_money_valuation + amount_raised

    Args:
        pre_money_valuation: Company valuation before investment (must be > 0)
        amount_raised: Investment amount (must be >= 0)

    Returns:
        Dilution as a decimal (e.g., 0.20 for 20%)

    Raises:
        ValueError: If pre_money_valuation <= 0 or amount_raised < 0

    Example:
        >>> calculate_dilution_from_valuation(10_000_000, 2_500_000)
        0.2  # 20% dilution
    """
    if pre_money_valuation <= 0:
        raise ValueError(f"pre_money_valuation must be positive, got {pre_money_valuation}")
    if amount_raised < 0:
        raise ValueError(f"amount_raised cannot be negative, got {amount_raised}")

    post_money_valuation = pre_money_valuation + amount_raised
    return amount_raised / post_money_valuation


def calculate_irr(monthly_surpluses: pd.Series, final_payout_value: float) -> float:
    """
    Calculates the annualized Internal Rate of Return (IRR) based on monthly cash flows.

    IRR is the discount rate that makes the NPV of all cash flows equal to zero.
    This function converts the monthly IRR to an annualized rate.

    Args:
        monthly_surpluses: Series of monthly salary surpluses (forgone income)
        final_payout_value: Expected payout value at the end of the period

    Returns:
        Annualized IRR as a percentage (e.g., 15.5 for 15.5%), or NaN if:
        - No cash flows provided
        - All cash flows have the same sign
        - IRR calculation fails to converge
    """
    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return float(np.nan)

    cash_flows.iloc[-1] += final_payout_value

    if not (any(cash_flows > 0) and any(cash_flows < 0)):
        return float(np.nan)

    try:
        monthly_irr = npf.irr(cash_flows)
        if pd.isna(monthly_irr):
            return float(np.nan)
        return float(((1 + monthly_irr) ** 12 - 1) * 100)
    except (ValueError, TypeError):
        return float(np.nan)


def calculate_npv(
    monthly_surpluses: pd.Series, annual_roi: float, final_payout_value: float
) -> float:
    """
    Calculates the Net Present Value of the investment.

    NPV discounts all future cash flows back to present value using
    the expected rate of return. A positive NPV indicates the startup
    opportunity is financially attractive compared to the alternative.

    Args:
        monthly_surpluses: Series of monthly salary surpluses (forgone income)
        annual_roi: Expected annual return on alternative investments
        final_payout_value: Expected payout value at the end of the period

    Returns:
        Net Present Value of the investment, or NaN if:
        - Invalid discount rate (monthly ROI <= -1)
        - No cash flows provided
        - Calculation fails
    """
    monthly_roi = annual_to_monthly_roi(annual_roi)
    if pd.isna(monthly_roi) or monthly_roi <= -1:
        return float(np.nan)

    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return float(np.nan)

    cash_flows.iloc[-1] += final_payout_value

    try:
        return float(npf.npv(monthly_roi, cash_flows))
    except (ValueError, TypeError):
        return float(np.nan)
