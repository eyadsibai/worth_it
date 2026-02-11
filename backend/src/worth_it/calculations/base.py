"""
Base utilities and shared types for calculations.

This module contains foundational types and utility functions used across
all calculation modules.
"""

from __future__ import annotations

from enum import StrEnum

import numpy as np

from worth_it.exceptions import CalculationError


class EquityType(StrEnum):
    """Enum for different types of equity.

    Values are standardized to match frontend schema values:
    - RSU: Restricted Stock Units
    - STOCK_OPTIONS: Stock Options (ISO/NSO)
    """

    RSU = "RSU"
    STOCK_OPTIONS = "STOCK_OPTIONS"


def annual_to_monthly_roi(annual_roi: float | np.ndarray) -> float | np.ndarray:
    """
    Converts an annual Return on Investment (ROI) to its monthly equivalent.

    Uses the compound interest formula: (1 + annual)^(1/12) - 1

    Args:
        annual_roi: Annual ROI as a decimal (e.g., 0.10 for 10%).
                    Must be >= -1 (i.e., loss cannot exceed 100%).

    Returns:
        Monthly ROI as a decimal

    Raises:
        CalculationError: If annual_roi < -1 (would produce complex numbers)
    """
    if isinstance(annual_roi, (int, float)) and annual_roi < -1:
        raise CalculationError(
            f"Annual ROI must be >= -1 (got {annual_roi}). "
            "A loss exceeding 100% is not meaningful."
        )
    if isinstance(annual_roi, np.ndarray) and np.any(annual_roi < -1):
        raise CalculationError(
            "All annual ROI values must be >= -1. "
            "A loss exceeding 100% is not meaningful."
        )
    result = (1 + annual_roi) ** (1 / 12) - 1
    if isinstance(annual_roi, (int, float)):
        return float(result)
    return result
