"""
Base utilities and shared types for calculations.

This module contains foundational types and utility functions used across
all calculation modules.
"""

from __future__ import annotations

from enum import Enum

import numpy as np


class EquityType(str, Enum):
    """Enum for different types of equity."""

    RSU = "Equity (RSUs)"
    STOCK_OPTIONS = "Stock Options"


def annual_to_monthly_roi(annual_roi: float | np.ndarray) -> float | np.ndarray:
    """
    Converts an annual Return on Investment (ROI) to its monthly equivalent.

    Uses the compound interest formula: (1 + annual)^(1/12) - 1

    Args:
        annual_roi: Annual ROI as a decimal (e.g., 0.10 for 10%)

    Returns:
        Monthly ROI as a decimal
    """
    result = (1 + annual_roi) ** (1 / 12) - 1
    if isinstance(annual_roi, float):
        return float(result)
    return result
