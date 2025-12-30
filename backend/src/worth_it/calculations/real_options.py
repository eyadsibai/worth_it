"""Real Options valuation using Black-Scholes framework.

Applies option pricing theory to value strategic flexibility
in startups and corporate investments.

Real options recognize that business decisions often contain
embedded options - the right but not obligation to:
- Expand (growth option - call-like)
- Abandon (put-like)
- Delay investment
- Switch strategies

Key insight: Unlike NPV which assumes now-or-never decisions,
real options capture the value of flexibility and waiting.

Black-Scholes formula:
    d1 = [ln(S/K) + (r + σ²/2)T] / (σ√T)
    d2 = d1 - σ√T

    Call: C = S×N(d1) - K×e^(-rT)×N(d2)
    Put:  P = K×e^(-rT)×N(-d2) - S×N(-d1)

Where:
    S = Underlying value (current project/asset value)
    K = Exercise price (investment required)
    r = Risk-free rate
    T = Time to expiry (decision deadline)
    σ = Volatility of underlying value
    N() = Cumulative normal distribution
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum


class OptionType(Enum):
    """Types of real options in business decisions.

    GROWTH: Option to expand/invest (call-like)
        - Exercise by making follow-on investment
        - Value when expansion opportunity > investment cost

    ABANDONMENT: Option to exit/sell (put-like)
        - Exercise by selling assets or exiting market
        - Value when salvage value > continuing value

    DELAY: Option to wait before investing (call-like)
        - Exercise by investing when conditions are right
        - Value from resolving uncertainty over time

    SWITCH: Option to change strategy (put-like)
        - Exercise by pivoting to alternative approach
        - Value when alternative > current strategy
    """

    GROWTH = "growth"
    ABANDONMENT = "abandonment"
    DELAY = "delay"
    SWITCH = "switch"


@dataclass(frozen=True)
class RealOptionParams:
    """Parameters for Real Options valuation.

    Attributes:
        option_type: Type of real option being valued
        underlying_value: Current value of the project/asset (S)
        exercise_price: Cost to exercise the option (K)
        time_to_expiry: Years until decision must be made (T)
        volatility: Annual volatility of underlying value (σ)
        risk_free_rate: Risk-free interest rate (r)
    """

    option_type: OptionType
    underlying_value: float
    exercise_price: float
    time_to_expiry: float
    volatility: float
    risk_free_rate: float


@dataclass(frozen=True)
class RealOptionResult:
    """Result of Real Options valuation.

    Attributes:
        option_value: Value of the option alone
        total_value: Underlying value + option value
        d1: Black-Scholes d1 parameter
        d2: Black-Scholes d2 parameter
        method: Valuation method identifier
    """

    option_value: float
    total_value: float
    d1: float
    d2: float
    method: str = field(default="real_options")


def _norm_cdf(x: float) -> float:
    """Calculate cumulative distribution function of standard normal.

    Uses the error function approximation for numerical stability.

    Args:
        x: Value to evaluate CDF at

    Returns:
        Probability P(Z <= x) for standard normal Z
    """
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def calculate_real_option_value(params: RealOptionParams) -> RealOptionResult:
    """Calculate Real Option value using Black-Scholes framework.

    For GROWTH and DELAY options (call-like):
        C = S×N(d1) - K×e^(-rT)×N(d2)

    For ABANDONMENT and SWITCH options (put-like):
        P = K×e^(-rT)×N(-d2) - S×N(-d1)

    The option value is floored at zero (options are never worth less
    than nothing since exercise is optional).

    Args:
        params: RealOptionParams with option specifications

    Returns:
        RealOptionResult with option value and Black-Scholes parameters
    """
    s = params.underlying_value  # Current value
    k = params.exercise_price  # Exercise price
    t = params.time_to_expiry  # Time in years
    sigma = params.volatility  # Annual volatility
    r = params.risk_free_rate  # Risk-free rate

    # Handle edge case of zero time or volatility
    if t <= 0 or sigma <= 0:
        # At expiry, option value is intrinsic value only
        if params.option_type in (OptionType.GROWTH, OptionType.DELAY):
            intrinsic = max(s - k, 0)
        else:
            intrinsic = max(k - s, 0)
        return RealOptionResult(
            option_value=intrinsic,
            total_value=s + intrinsic,
            d1=0.0,
            d2=0.0,
        )

    # Calculate Black-Scholes d1 and d2
    sqrt_t = math.sqrt(t)

    # d1 = [ln(S/K) + (r + σ²/2)T] / (σ√T)
    d1 = (math.log(s / k) + (r + 0.5 * sigma**2) * t) / (sigma * sqrt_t)

    # d2 = d1 - σ√T
    d2 = d1 - sigma * sqrt_t

    # Calculate option value based on type
    discount_factor = math.exp(-r * t)

    if params.option_type in (OptionType.GROWTH, OptionType.DELAY):
        # Call option: C = S×N(d1) - K×e^(-rT)×N(d2)
        option_value = s * _norm_cdf(d1) - k * discount_factor * _norm_cdf(d2)
    else:
        # Put option: P = K×e^(-rT)×N(-d2) - S×N(-d1)
        option_value = k * discount_factor * _norm_cdf(-d2) - s * _norm_cdf(-d1)

    # Floor at zero (option can never have negative value)
    option_value = max(option_value, 0.0)

    return RealOptionResult(
        option_value=option_value,
        total_value=params.underlying_value + option_value,
        d1=d1,
        d2=d2,
    )
