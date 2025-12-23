"""
Tests for Startup Valuation Calculator (#229)

Covers three core valuation methods:
1. Revenue Multiple - Comparable company analysis
2. DCF (Discounted Cash Flow) - Intrinsic value
3. VC Method - Investor perspective
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from worth_it.calculations.valuation import (
    DCFParams,
    RevenueMultipleParams,
    ValuationResult,
    VCMethodParams,
    calculate_dcf,
    calculate_revenue_multiple,
    calculate_vc_method,
    compare_valuations,
)

# ============================================================================
# Revenue Multiple Tests
# ============================================================================


class TestRevenueMultiple:
    """Tests for Revenue Multiple valuation method."""

    def test_basic_revenue_multiple(self):
        """Simple revenue × multiple = valuation."""
        params = RevenueMultipleParams(
            annual_revenue=1_000_000,
            revenue_multiple=10.0,
        )
        result = calculate_revenue_multiple(params)

        assert result.method == "revenue_multiple"
        assert result.valuation == 10_000_000
        assert result.confidence == pytest.approx(0.7, abs=0.1)  # Medium confidence

    def test_revenue_multiple_with_growth_adjustment(self):
        """Growth rate should increase the effective multiple."""
        params = RevenueMultipleParams(
            annual_revenue=1_000_000,
            revenue_multiple=10.0,
            growth_rate=0.5,  # 50% YoY growth
        )
        result = calculate_revenue_multiple(params)

        # Higher growth should yield higher valuation
        assert result.valuation > 10_000_000

    def test_revenue_multiple_with_industry_benchmark(self):
        """Industry benchmark provides context for the multiple."""
        params = RevenueMultipleParams(
            annual_revenue=2_000_000,
            revenue_multiple=8.0,
            industry_benchmark_multiple=6.0,
        )
        result = calculate_revenue_multiple(params)

        assert result.valuation == 16_000_000
        # Using multiple above industry benchmark
        assert "premium" in result.notes.lower() or result.inputs["multiple_vs_benchmark"] > 1

    def test_zero_revenue_returns_zero(self):
        """Zero revenue should return zero valuation."""
        params = RevenueMultipleParams(
            annual_revenue=0,
            revenue_multiple=10.0,
        )
        result = calculate_revenue_multiple(params)
        assert result.valuation == 0

    def test_negative_revenue_raises_error(self):
        """Negative revenue should raise validation error."""
        with pytest.raises(ValueError):
            RevenueMultipleParams(
                annual_revenue=-1_000_000,
                revenue_multiple=10.0,
            )

    def test_result_includes_breakdown(self):
        """Result should include calculation breakdown."""
        params = RevenueMultipleParams(
            annual_revenue=5_000_000,
            revenue_multiple=8.0,
        )
        result = calculate_revenue_multiple(params)

        assert "annual_revenue" in result.inputs
        assert "revenue_multiple" in result.inputs
        assert result.inputs["annual_revenue"] == 5_000_000


# ============================================================================
# DCF (Discounted Cash Flow) Tests
# ============================================================================


class TestDCF:
    """Tests for DCF valuation method."""

    def test_basic_dcf(self):
        """Simple DCF with constant cash flows."""
        params = DCFParams(
            projected_cash_flows=[100_000, 100_000, 100_000, 100_000, 100_000],
            discount_rate=0.10,  # 10% discount rate
            terminal_growth_rate=0.02,  # 2% perpetual growth
        )
        result = calculate_dcf(params)

        assert result.method == "dcf"
        assert result.valuation > 0
        # 5 years of 100k at 10% should be roughly 379k PV + terminal value
        assert result.valuation > 300_000

    def test_dcf_with_growing_cash_flows(self):
        """DCF should handle growing cash flows."""
        params = DCFParams(
            projected_cash_flows=[100_000, 120_000, 144_000, 172_800, 207_360],
            discount_rate=0.12,
            terminal_growth_rate=0.03,
        )
        result = calculate_dcf(params)

        assert result.valuation > 0
        assert "terminal_value" in result.inputs

    def test_dcf_without_terminal_value(self):
        """DCF can work without terminal value (finite horizon)."""
        params = DCFParams(
            projected_cash_flows=[100_000, 100_000, 100_000],
            discount_rate=0.10,
            terminal_growth_rate=None,  # No perpetuity
        )
        result = calculate_dcf(params)

        # Should just be PV of the 3 cash flows
        expected = 100_000 / 1.10 + 100_000 / 1.21 + 100_000 / 1.331
        assert result.valuation == pytest.approx(expected, rel=0.01)

    def test_dcf_high_discount_rate_lower_valuation(self):
        """Higher discount rate should yield lower valuation."""
        cash_flows = [100_000, 100_000, 100_000, 100_000, 100_000]

        params_low = DCFParams(
            projected_cash_flows=cash_flows,
            discount_rate=0.08,
            terminal_growth_rate=0.02,
        )
        params_high = DCFParams(
            projected_cash_flows=cash_flows,
            discount_rate=0.15,
            terminal_growth_rate=0.02,
        )

        result_low = calculate_dcf(params_low)
        result_high = calculate_dcf(params_high)

        assert result_low.valuation > result_high.valuation

    def test_dcf_negative_cash_flows_allowed(self):
        """DCF should handle negative cash flows (early-stage startups)."""
        params = DCFParams(
            projected_cash_flows=[-50_000, -20_000, 50_000, 150_000, 300_000],
            discount_rate=0.15,
            terminal_growth_rate=0.03,
        )
        result = calculate_dcf(params)

        # Should still produce a valuation (hockey stick growth)
        assert result.valuation > 0

    def test_dcf_discount_rate_must_exceed_growth(self):
        """Terminal growth must be less than discount rate."""
        with pytest.raises(ValueError, match="growth.*discount"):
            DCFParams(
                projected_cash_flows=[100_000],
                discount_rate=0.05,
                terminal_growth_rate=0.06,  # Growth > discount = invalid
            )

    def test_dcf_empty_cash_flows_raises_error(self):
        """Must have at least one cash flow projection."""
        with pytest.raises(ValueError):
            DCFParams(
                projected_cash_flows=[],
                discount_rate=0.10,
                terminal_growth_rate=0.02,
            )


# ============================================================================
# VC Method Tests
# ============================================================================


class TestVCMethod:
    """Tests for VC Method valuation."""

    def test_basic_vc_method(self):
        """Simple VC method: Exit Value / Target Return = Post-money."""
        params = VCMethodParams(
            projected_exit_value=100_000_000,
            exit_year=5,
            target_return_multiple=10.0,  # 10x return
        )
        result = calculate_vc_method(params)

        assert result.method == "vc_method"
        # Post-money = 100M / 10x = 10M
        assert result.valuation == 10_000_000

    def test_vc_method_with_discount_rate(self):
        """VC method using IRR instead of multiple."""
        params = VCMethodParams(
            projected_exit_value=100_000_000,
            exit_year=5,
            target_irr=0.50,  # 50% annual return
        )
        result = calculate_vc_method(params)

        # (1.5)^5 = 7.59x multiple implied
        # 100M / 7.59 ≈ 13.17M
        expected = 100_000_000 / (1.50**5)
        assert result.valuation == pytest.approx(expected, rel=0.01)

    def test_vc_method_with_dilution_adjustment(self):
        """Account for future dilution from follow-on rounds."""
        params = VCMethodParams(
            projected_exit_value=100_000_000,
            exit_year=5,
            target_return_multiple=10.0,
            expected_dilution=0.30,  # 30% dilution before exit
        )
        result = calculate_vc_method(params)

        # Need to adjust for dilution: Post-money = Exit / (Multiple / (1 - dilution))
        # Actually: Post = (Exit * (1 - dilution)) / Multiple = 100M * 0.7 / 10 = 7M
        assert result.valuation < 10_000_000
        assert result.valuation == pytest.approx(7_000_000, rel=0.01)

    def test_vc_method_pre_money_calculation(self):
        """Result should include pre-money given investment amount."""
        params = VCMethodParams(
            projected_exit_value=100_000_000,
            exit_year=5,
            target_return_multiple=10.0,
            investment_amount=2_000_000,
        )
        result = calculate_vc_method(params)

        # Post-money = 10M, Pre-money = 10M - 2M = 8M
        assert result.inputs["post_money_valuation"] == 10_000_000
        assert result.inputs["pre_money_valuation"] == 8_000_000

    def test_vc_method_multiple_or_irr_required(self):
        """Must provide either target multiple or IRR."""
        with pytest.raises(ValidationError, match="target_return_multiple.*target_irr"):
            VCMethodParams(
                projected_exit_value=100_000_000,
                exit_year=5,
                # Neither multiple nor IRR provided
            )

    def test_vc_method_exit_probability_adjustment(self):
        """Adjust valuation for probability of successful exit."""
        params = VCMethodParams(
            projected_exit_value=100_000_000,
            exit_year=5,
            target_return_multiple=10.0,
            exit_probability=0.20,  # 20% chance of this exit
        )
        result = calculate_vc_method(params)

        # Risk-adjusted: 100M * 0.2 = 20M expected value
        # Post-money = 20M / 10x = 2M
        assert result.valuation == pytest.approx(2_000_000, rel=0.01)


# ============================================================================
# Valuation Comparison Tests
# ============================================================================


class TestValuationComparison:
    """Tests for comparing multiple valuation methods."""

    def test_compare_two_methods(self):
        """Compare valuations from different methods."""
        results = [
            ValuationResult(
                method="revenue_multiple",
                valuation=10_000_000,
                confidence=0.7,
                inputs={"annual_revenue": 1_000_000, "revenue_multiple": 10.0},
                notes="",
            ),
            ValuationResult(
                method="dcf",
                valuation=12_000_000,
                confidence=0.6,
                inputs={"discount_rate": 0.10},
                notes="",
            ),
        ]

        comparison = compare_valuations(results)

        assert comparison.min_valuation == 10_000_000
        assert comparison.max_valuation == 12_000_000
        assert comparison.average_valuation == pytest.approx(11_000_000)
        assert comparison.range_pct == pytest.approx(0.20, rel=0.01)  # 20% range

    def test_weighted_average_by_confidence(self):
        """Weighted average should favor higher confidence methods."""
        results = [
            ValuationResult(
                method="revenue_multiple",
                valuation=10_000_000,
                confidence=0.9,  # High confidence
                inputs={},
                notes="",
            ),
            ValuationResult(
                method="vc_method",
                valuation=20_000_000,
                confidence=0.3,  # Low confidence
                inputs={},
                notes="",
            ),
        ]

        comparison = compare_valuations(results)

        # Weighted average should be closer to 10M (higher confidence)
        # (10M * 0.9 + 20M * 0.3) / (0.9 + 0.3) = 15M / 1.2 = 12.5M
        assert comparison.weighted_average == pytest.approx(12_500_000, rel=0.01)

    def test_comparison_identifies_outliers(self):
        """Flag valuations that deviate significantly from average."""
        results = [
            ValuationResult(
                method="revenue_multiple",
                valuation=10_000_000,
                confidence=0.7,
                inputs={},
                notes="",
            ),
            ValuationResult(
                method="dcf",
                valuation=12_000_000,
                confidence=0.7,
                inputs={},
                notes="",
            ),
            ValuationResult(
                method="vc_method",
                valuation=50_000_000,  # Outlier!
                confidence=0.5,
                inputs={},
                notes="",
            ),
        ]

        comparison = compare_valuations(results)

        assert len(comparison.outliers) >= 1
        assert "vc_method" in comparison.outliers

    def test_comparison_generates_insights(self):
        """Generate actionable insights from comparison."""
        results = [
            ValuationResult(
                method="revenue_multiple",
                valuation=10_000_000,
                confidence=0.8,
                inputs={},
                notes="",
            ),
            ValuationResult(
                method="dcf",
                valuation=8_000_000,
                confidence=0.7,
                inputs={},
                notes="",
            ),
        ]

        comparison = compare_valuations(results)

        assert len(comparison.insights) > 0
        # Should mention the range or recommend a value
        assert any("range" in i.lower() or "recommend" in i.lower() for i in comparison.insights)

    def test_single_result_comparison(self):
        """Single result should still produce valid comparison."""
        results = [
            ValuationResult(
                method="revenue_multiple",
                valuation=10_000_000,
                confidence=0.7,
                inputs={},
                notes="",
            ),
        ]

        comparison = compare_valuations(results)

        assert comparison.min_valuation == 10_000_000
        assert comparison.max_valuation == 10_000_000
        assert comparison.range_pct == 0.0

    def test_empty_results_raises_error(self):
        """Empty results should raise an error."""
        with pytest.raises(ValueError, match="at least one"):
            compare_valuations([])
