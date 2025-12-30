"""
Tests for WACC (Weighted Average Cost of Capital) Calculator.

Covers:
1. WACC calculation with various capital structures
2. CAPM cost of equity calculation
"""

from __future__ import annotations

import pytest

from worth_it.calculations.wacc import (
    WACCParams,
    WACCResult,
    calculate_cost_of_equity_capm,
    calculate_wacc,
)

# ============================================================================
# WACC Calculator Tests
# ============================================================================


class TestWACCCalculator:
    """Tests for WACC calculator."""

    def test_simple_wacc_equal_weights(self) -> None:
        """Test WACC with equal debt and equity weights."""
        params = WACCParams(
            equity_value=50_000_000,
            debt_value=50_000_000,
            cost_of_equity=0.12,
            cost_of_debt=0.06,
            tax_rate=0.25,
        )

        result = calculate_wacc(params)

        # WACC = (E/V)*Re + (D/V)*Rd*(1-T)
        # = 0.5 * 0.12 + 0.5 * 0.06 * 0.75
        # = 0.06 + 0.0225 = 0.0825
        assert result.wacc == pytest.approx(0.0825, rel=0.01)
        assert result.equity_weight == pytest.approx(0.5, rel=0.01)
        assert result.debt_weight == pytest.approx(0.5, rel=0.01)

    def test_all_equity_company(self) -> None:
        """Test WACC with no debt (startup typical structure)."""
        params = WACCParams(
            equity_value=100_000_000,
            debt_value=0,
            cost_of_equity=0.15,
            cost_of_debt=0.06,
            tax_rate=0.25,
        )

        result = calculate_wacc(params)
        assert result.wacc == pytest.approx(0.15, rel=0.01)
        assert result.equity_weight == 1.0
        assert result.debt_weight == 0.0

    def test_high_leverage(self) -> None:
        """Test WACC with high debt ratio."""
        params = WACCParams(
            equity_value=20_000_000,
            debt_value=80_000_000,
            cost_of_equity=0.18,
            cost_of_debt=0.08,
            tax_rate=0.30,
        )

        result = calculate_wacc(params)

        # WACC = 0.2 * 0.18 + 0.8 * 0.08 * 0.70
        # = 0.036 + 0.0448 = 0.0808
        assert result.wacc == pytest.approx(0.0808, rel=0.01)

    def test_zero_total_value_raises(self) -> None:
        """Test that zero total value raises ValueError."""
        params = WACCParams(
            equity_value=0,
            debt_value=0,
            cost_of_equity=0.12,
            cost_of_debt=0.06,
            tax_rate=0.25,
        )

        with pytest.raises(ValueError, match="cannot be zero"):
            calculate_wacc(params)

    def test_wacc_result_structure(self) -> None:
        """Test WACCResult has expected fields."""
        result = WACCResult(
            wacc=0.10,
            equity_weight=0.6,
            debt_weight=0.4,
            after_tax_cost_of_debt=0.05,
        )

        assert result.wacc == 0.10
        assert result.equity_weight == 0.6
        assert result.debt_weight == 0.4
        assert result.after_tax_cost_of_debt == 0.05

    def test_wacc_params_frozen(self) -> None:
        """Test WACCParams is immutable."""
        from dataclasses import FrozenInstanceError

        params = WACCParams(
            equity_value=50_000_000,
            debt_value=50_000_000,
            cost_of_equity=0.12,
            cost_of_debt=0.06,
            tax_rate=0.25,
        )

        with pytest.raises(FrozenInstanceError):
            params.equity_value = 100_000_000  # type: ignore

    def test_wacc_result_frozen(self) -> None:
        """Test WACCResult is immutable."""
        from dataclasses import FrozenInstanceError

        result = WACCResult(
            wacc=0.10,
            equity_weight=0.6,
            debt_weight=0.4,
            after_tax_cost_of_debt=0.05,
        )

        with pytest.raises(FrozenInstanceError):
            result.wacc = 0.15  # type: ignore

    def test_after_tax_cost_of_debt(self) -> None:
        """Test after-tax cost of debt calculation."""
        params = WACCParams(
            equity_value=60_000_000,
            debt_value=40_000_000,
            cost_of_equity=0.14,
            cost_of_debt=0.08,
            tax_rate=0.35,
        )

        result = calculate_wacc(params)

        # After-tax cost of debt = 0.08 * (1 - 0.35) = 0.08 * 0.65 = 0.052
        assert result.after_tax_cost_of_debt == pytest.approx(0.052, rel=0.01)


# ============================================================================
# CAPM Cost of Equity Tests
# ============================================================================


class TestCAPM:
    """Tests for CAPM cost of equity calculation."""

    def test_capm_standard_calculation(self) -> None:
        """Test CAPM: Re = Rf + Beta * Market Premium."""
        cost_of_equity = calculate_cost_of_equity_capm(
            risk_free_rate=0.04,
            beta=1.2,
            market_premium=0.06,
        )

        # Re = 0.04 + 1.2 * 0.06 = 0.04 + 0.072 = 0.112
        assert cost_of_equity == pytest.approx(0.112, rel=0.01)

    def test_capm_high_beta_tech_company(self) -> None:
        """Test CAPM for high-beta technology company."""
        cost_of_equity = calculate_cost_of_equity_capm(
            risk_free_rate=0.05,
            beta=1.8,  # High beta for volatile tech
            market_premium=0.055,
        )

        # Re = 0.05 + 1.8 * 0.055 = 0.05 + 0.099 = 0.149
        assert cost_of_equity == pytest.approx(0.149, rel=0.01)

    def test_capm_low_beta_utility(self) -> None:
        """Test CAPM for low-beta utility company."""
        cost_of_equity = calculate_cost_of_equity_capm(
            risk_free_rate=0.04,
            beta=0.5,  # Low beta for stable utility
            market_premium=0.06,
        )

        # Re = 0.04 + 0.5 * 0.06 = 0.04 + 0.03 = 0.07
        assert cost_of_equity == pytest.approx(0.07, rel=0.01)

    def test_capm_market_neutral(self) -> None:
        """Test CAPM with beta = 1 (market-neutral)."""
        cost_of_equity = calculate_cost_of_equity_capm(
            risk_free_rate=0.04,
            beta=1.0,
            market_premium=0.06,
        )

        # Re = 0.04 + 1.0 * 0.06 = 0.10
        assert cost_of_equity == pytest.approx(0.10, rel=0.01)

    def test_capm_zero_beta(self) -> None:
        """Test CAPM with zero beta (no systematic risk)."""
        cost_of_equity = calculate_cost_of_equity_capm(
            risk_free_rate=0.04,
            beta=0.0,
            market_premium=0.06,
        )

        # Re = 0.04 + 0 * 0.06 = 0.04 (just risk-free rate)
        assert cost_of_equity == pytest.approx(0.04, rel=0.01)

    def test_capm_with_size_premium(self) -> None:
        """Test CAPM can be extended with size premium."""
        # Standard CAPM
        base_cost = calculate_cost_of_equity_capm(
            risk_free_rate=0.04,
            beta=1.2,
            market_premium=0.06,
        )

        # Add size premium for small-cap (typically 2-4%)
        size_premium = 0.03
        adjusted_cost = base_cost + size_premium

        # Re = 0.112 + 0.03 = 0.142
        assert adjusted_cost == pytest.approx(0.142, rel=0.01)
