"""
Equity calculation module.

Handles RSU and Stock Option calculations, including vesting, dilution, and payouts.
"""

from __future__ import annotations

from enum import Enum

import numpy as np
import pandas as pd


class EquityType(str, Enum):
    """Enum for different types of equity."""
    RSU = "Equity (RSUs)"
    STOCK_OPTIONS = "Stock Options"


def calculate_dilution_from_valuation(pre_money_valuation: float, amount_raised: float) -> float:
    """
    Calculate dilution percentage from a funding round.
    """
    if pre_money_valuation <= 0:
        raise ValueError(f"pre_money_valuation must be positive, got {pre_money_valuation}")
    if amount_raised < 0:
        raise ValueError(f"amount_raised cannot be negative, got {amount_raised}")

    post_money_valuation = pre_money_valuation + amount_raised
    return amount_raised / post_money_valuation


def calculate_vested_equity(
    years: np.ndarray | pd.Index,
    total_vesting_years: float,
    cliff_years: float
) -> np.ndarray:
    """
    Calculates the percentage of equity vested at given time points.
    """
    return np.where(
        years >= cliff_years,
        np.clip((years / total_vesting_years), 0, 1),
        0,
    )
