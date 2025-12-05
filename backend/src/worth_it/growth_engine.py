"""
Startup Growth Engine.

This module simulates the fundamental business metrics of a startup to derive
valuations and financial health over time. It moves beyond simple financial
calculators into business modeling.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

import numpy as np
import pandas as pd


class MarketSentiment(str, Enum):
    """Market sentiment affecting valuations and fundraising."""
    BULL = "Bull Market"
    NORMAL = "Normal Market"
    BEAR = "Bear Market"


@dataclass
class GrowthConfig:
    """Configuration for startup growth simulation."""
    starting_arr: float
    starting_cash: float
    monthly_burn_rate: float
    mom_growth_rate: float  # Month-over-Month growth rate (decimal)
    churn_rate: float  # Monthly churn rate (decimal)
    market_sentiment: MarketSentiment = MarketSentiment.NORMAL


def get_market_multiple(sentiment: MarketSentiment) -> float:
    """Returns the ARR valuation multiple based on market sentiment."""
    if sentiment == MarketSentiment.BULL:
        return 15.0
    elif sentiment == MarketSentiment.BEAR:
        return 5.0
    else:
        return 8.0


def simulate_growth(
    months: int,
    config: GrowthConfig
) -> pd.DataFrame:
    """
    Simulates startup growth over a specified number of months.

    Args:
        months: Number of months to simulate.
        config: Growth configuration parameters.

    Returns:
        DataFrame containing monthly metrics:
        - ARR: Annual Recurring Revenue
        - MRR: Monthly Recurring Revenue
        - Cash: Cash balance
        - Valuation: Estimated company valuation
        - Runway: Estimated months of runway remaining
    """
    # Initialize arrays
    mrr = np.zeros(months)
    cash = np.zeros(months)
    valuation = np.zeros(months)

    current_mrr = config.starting_arr / 12
    current_cash = config.starting_cash
    multiple = get_market_multiple(config.market_sentiment)

    # Net growth rate = Growth - Churn
    net_growth_rate = config.mom_growth_rate - config.churn_rate

    for i in range(months):
        # Update Revenue
        mrr[i] = current_mrr

        # Update Cash (Revenue - Burn)
        # Assuming burn rate is net burn (Expenses - Revenue) or fixed burn?
        # Usually early startups have fixed burn + variable costs.
        # For simplicity in this v1, we'll assume 'monthly_burn_rate' is the NET burn
        # at the start, but maybe it should decrease as revenue grows?
        # Let's keep it simple: Cash = Previous Cash - Net Burn.
        # But if revenue grows, net burn might decrease if costs are fixed.
        # Let's assume 'monthly_burn_rate' is GROSS expenses for now to allow revenue to offset it?
        # Or just simple "Net Burn" input. The plan said "Burn Rate".
        # Let's assume the input is NET BURN for simplicity, but that's static.
        # Better model: Expenses = Burn + (Revenue * CostRatio).
        # Let's stick to the simplest interpretation: Cash decreases by burn_rate every month.
        # BUT, usually as you grow, you burn more.
        # Let's just use the input burn rate as a constant net burn for now.

        cash[i] = current_cash

        # Valuation based on ARR
        current_arr = current_mrr * 12
        valuation[i] = current_arr * multiple

        # Prepare for next month
        current_mrr = current_mrr * (1 + net_growth_rate)
        current_cash = current_cash - config.monthly_burn_rate

        # Stop if cash runs out? Or allow negative to show "Dead"?
        # Let's allow negative to show the gap.

    df = pd.DataFrame({
        "Month": range(1, months + 1),
        "MRR": mrr,
        "ARR": mrr * 12,
        "Cash": cash,
        "Valuation": valuation,
    })

    # Calculate Runway
    # Runway = Cash / Burn. If Burn <= 0 (profitable), Runway is infinite.
    if config.monthly_burn_rate > 0:
        df["Runway"] = df["Cash"] / config.monthly_burn_rate
    else:
        df["Runway"] = np.inf

    return df
