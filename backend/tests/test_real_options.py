"""
Tests for Real Options valuation using Black-Scholes framework.

Applies option pricing theory to value strategic flexibility
in startups and corporate investments.
"""

from __future__ import annotations

import pytest

from worth_it.calculations.real_options import (
    OptionType,
    RealOptionParams,
    RealOptionResult,
    calculate_real_option_value,
)

# ============================================================================
# Real Options Tests
# ============================================================================


class TestRealOptions:
    """Tests for Real Options valuation using Black-Scholes."""

    def test_growth_option_positive_value(self) -> None:
        """Test that growth option (call-like) has positive value."""
        params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=10_000_000,  # Current project value
            exercise_price=8_000_000,  # Investment required
            time_to_expiry=3.0,  # Years until decision
            volatility=0.40,  # Annual volatility
            risk_free_rate=0.05,
        )

        result = calculate_real_option_value(params)

        assert result.option_value > 0
        assert result.total_value >= params.underlying_value

    def test_abandonment_option_in_the_money(self) -> None:
        """Test abandonment option when exit > continue value."""
        params = RealOptionParams(
            option_type=OptionType.ABANDONMENT,
            underlying_value=5_000_000,  # Continuing value (low)
            exercise_price=8_000_000,  # Salvage/exit value (high)
            time_to_expiry=2.0,
            volatility=0.35,
            risk_free_rate=0.05,
        )

        result = calculate_real_option_value(params)

        # Abandonment option has value because exit > continue
        assert result.option_value > 0

    def test_delay_option(self) -> None:
        """Test delay option (option to wait before investing)."""
        params = RealOptionParams(
            option_type=OptionType.DELAY,
            underlying_value=12_000_000,
            exercise_price=10_000_000,
            time_to_expiry=1.5,
            volatility=0.50,
            risk_free_rate=0.04,
        )

        result = calculate_real_option_value(params)
        assert result.option_value > 0

    def test_d1_d2_calculation(self) -> None:
        """Test that d1 and d2 are calculated correctly."""
        params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=100,
            exercise_price=100,
            time_to_expiry=1.0,
            volatility=0.20,
            risk_free_rate=0.05,
        )

        result = calculate_real_option_value(params)

        # d1 = [ln(100/100) + (0.05 + 0.5*0.04)*1] / (0.2*1)
        #    = [0 + 0.07] / 0.2 = 0.35
        # d2 = d1 - 0.2 = 0.15
        assert result.d1 == pytest.approx(0.35, rel=0.05)
        assert result.d2 == pytest.approx(0.15, rel=0.05)

    def test_option_value_floors_at_zero(self) -> None:
        """Test that option value is floored at zero."""
        params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=1_000_000,  # Low underlying
            exercise_price=10_000_000,  # High exercise (deep OTM)
            time_to_expiry=0.5,  # Short time
            volatility=0.10,  # Low volatility
            risk_free_rate=0.03,
        )

        result = calculate_real_option_value(params)
        assert result.option_value >= 0

    def test_switch_option(self) -> None:
        """Test switch option (option to change strategy)."""
        params = RealOptionParams(
            option_type=OptionType.SWITCH,
            underlying_value=8_000_000,
            exercise_price=10_000_000,
            time_to_expiry=2.0,
            volatility=0.30,
            risk_free_rate=0.04,
        )

        result = calculate_real_option_value(params)
        assert result.option_value >= 0

    def test_params_frozen(self) -> None:
        """Test that RealOptionParams is immutable."""
        from dataclasses import FrozenInstanceError

        params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=10_000_000,
            exercise_price=8_000_000,
            time_to_expiry=3.0,
            volatility=0.40,
            risk_free_rate=0.05,
        )

        with pytest.raises(FrozenInstanceError):
            params.underlying_value = 20_000_000  # type: ignore

    def test_result_frozen(self) -> None:
        """Test that RealOptionResult is immutable."""
        from dataclasses import FrozenInstanceError

        result = RealOptionResult(
            option_value=1_000_000,
            total_value=11_000_000,
            d1=0.35,
            d2=0.15,
        )

        with pytest.raises(FrozenInstanceError):
            result.option_value = 2_000_000  # type: ignore

    def test_higher_volatility_increases_option_value(self) -> None:
        """Test that higher volatility increases option value."""
        base_params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=10_000_000,
            exercise_price=10_000_000,
            time_to_expiry=2.0,
            volatility=0.20,
            risk_free_rate=0.05,
        )

        high_vol_params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=10_000_000,
            exercise_price=10_000_000,
            time_to_expiry=2.0,
            volatility=0.50,  # Higher volatility
            risk_free_rate=0.05,
        )

        low_vol_result = calculate_real_option_value(base_params)
        high_vol_result = calculate_real_option_value(high_vol_params)

        assert high_vol_result.option_value > low_vol_result.option_value

    def test_longer_time_increases_option_value(self) -> None:
        """Test that longer time to expiry increases option value."""
        short_params = RealOptionParams(
            option_type=OptionType.DELAY,
            underlying_value=10_000_000,
            exercise_price=10_000_000,
            time_to_expiry=0.5,
            volatility=0.30,
            risk_free_rate=0.05,
        )

        long_params = RealOptionParams(
            option_type=OptionType.DELAY,
            underlying_value=10_000_000,
            exercise_price=10_000_000,
            time_to_expiry=3.0,  # Longer time
            volatility=0.30,
            risk_free_rate=0.05,
        )

        short_result = calculate_real_option_value(short_params)
        long_result = calculate_real_option_value(long_params)

        assert long_result.option_value > short_result.option_value

    def test_at_the_money_option(self) -> None:
        """Test option value when S = K (at the money)."""
        params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=10_000_000,
            exercise_price=10_000_000,  # S = K
            time_to_expiry=1.0,
            volatility=0.25,
            risk_free_rate=0.05,
        )

        result = calculate_real_option_value(params)

        # ATM options still have positive time value
        assert result.option_value > 0

    def test_result_structure(self) -> None:
        """Test RealOptionResult has expected fields."""
        result = RealOptionResult(
            option_value=2_500_000,
            total_value=12_500_000,
            d1=0.45,
            d2=0.30,
        )

        assert result.option_value == 2_500_000
        assert result.total_value == 12_500_000
        assert result.d1 == 0.45
        assert result.d2 == 0.30
        assert result.method == "real_options"
