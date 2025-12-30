"""WACC (Weighted Average Cost of Capital) calculator.

Provides WACC calculation for DCF valuations and CAPM-based
cost of equity estimation.

The WACC represents the average rate of return a company must earn
on its investments to satisfy all capital providers (debt and equity).

Key formulas:
- WACC = (E/V) × Re + (D/V) × Rd × (1 - T)
- CAPM: Re = Rf + β × (Rm - Rf)
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WACCParams:
    """Parameters for WACC calculation.

    Attributes:
        equity_value: Market value of equity
        debt_value: Market value of debt
        cost_of_equity: Required return on equity (from CAPM or other)
        cost_of_debt: Interest rate on debt (pre-tax)
        tax_rate: Corporate tax rate for tax shield calculation
    """

    equity_value: float
    debt_value: float
    cost_of_equity: float
    cost_of_debt: float
    tax_rate: float


@dataclass(frozen=True)
class WACCResult:
    """Result of WACC calculation.

    Attributes:
        wacc: Weighted average cost of capital
        equity_weight: E / (E + D) - proportion of equity financing
        debt_weight: D / (E + D) - proportion of debt financing
        after_tax_cost_of_debt: Rd × (1 - T) - tax-adjusted debt cost
    """

    wacc: float
    equity_weight: float
    debt_weight: float
    after_tax_cost_of_debt: float


def calculate_wacc(params: WACCParams) -> WACCResult:
    """Calculate WACC using the standard formula.

    WACC = (E/V) × Re + (D/V) × Rd × (1 - T)

    Where:
        E = Market value of equity
        D = Market value of debt
        V = E + D (total firm value)
        Re = Cost of equity
        Rd = Cost of debt
        T = Corporate tax rate

    The tax shield (1 - T) reflects that interest payments are
    tax-deductible, effectively reducing the cost of debt.

    Args:
        params: WACCParams with capital structure and rates

    Returns:
        WACCResult with WACC and component breakdown

    Raises:
        ValueError: If total value is zero
    """
    total_value = params.equity_value + params.debt_value

    if total_value == 0:
        raise ValueError("Total value (equity + debt) cannot be zero")

    equity_weight = params.equity_value / total_value
    debt_weight = params.debt_value / total_value
    after_tax_cost_of_debt = params.cost_of_debt * (1 - params.tax_rate)

    wacc = equity_weight * params.cost_of_equity + debt_weight * after_tax_cost_of_debt

    return WACCResult(
        wacc=wacc,
        equity_weight=equity_weight,
        debt_weight=debt_weight,
        after_tax_cost_of_debt=after_tax_cost_of_debt,
    )


def calculate_cost_of_equity_capm(
    risk_free_rate: float,
    beta: float,
    market_premium: float,
) -> float:
    """Calculate cost of equity using Capital Asset Pricing Model.

    Re = Rf + β × (Rm - Rf)

    Where:
        Rf = Risk-free rate (e.g., 10-year Treasury yield)
        β = Beta coefficient (systematic risk)
        Rm - Rf = Market risk premium (expected excess return)

    The CAPM assumes investors require compensation for:
    1. Time value of money (risk-free rate)
    2. Systematic market risk (beta × market premium)

    For startups, consider adding a size premium (2-4%) to account
    for additional risk of smaller, less diversified companies.

    Args:
        risk_free_rate: Current risk-free rate
        beta: Company's beta coefficient vs market
        market_premium: Expected market premium over risk-free

    Returns:
        Required cost of equity
    """
    return risk_free_rate + beta * market_premium
