"""
Financial metrics calculation module.

Handles IRR, NPV, and ROI conversions.
"""

from __future__ import annotations

import numpy as np
import numpy_financial as npf
import pandas as pd


def annual_to_monthly_roi(annual_roi: float | np.ndarray) -> float | np.ndarray:
    """Converts an annual Return on Investment (ROI) to its monthly equivalent."""
    result = (1 + annual_roi) ** (1 / 12) - 1
    if isinstance(annual_roi, float):
        return float(result)
    return result


def calculate_irr(monthly_surpluses: pd.Series, final_payout_value: float) -> float:
    """
    Calculates the annualized Internal Rate of Return (IRR) based on monthly cash flows.
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
