"""
Tests for Comparable Transactions valuation method.

Values companies by analyzing revenue multiples from similar
M&A transactions or public company valuations.
"""

from __future__ import annotations

import pytest

from worth_it.calculations.comparables import (
    ComparablesParams,
    ComparablesResult,
    ComparableTransaction,
    calculate_comparable_valuation,
)

# ============================================================================
# Comparable Transactions Tests
# ============================================================================


class TestComparableTransactions:
    """Tests for Comparable Transactions Method."""

    def test_single_comparable(self) -> None:
        """Test valuation from single comparable transaction."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[
                ComparableTransaction(
                    name="Company A",
                    deal_value=50_000_000,
                    revenue=10_000_000,
                    industry="saas",
                    date="2024-01-15",
                ),
            ],
        )

        result = calculate_comparable_valuation(params)

        # Company A: 50M / 10M = 5x multiple
        # Target: 5M * 5x = 25M
        assert result.implied_valuation == pytest.approx(25_000_000, rel=0.01)
        assert result.median_multiple == pytest.approx(5.0, rel=0.01)

    def test_multiple_comparables_median(self) -> None:
        """Test median from multiple comparables."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[
                ComparableTransaction("A", 40_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("B", 60_000_000, 10_000_000, "saas", "2024-02"),
                ComparableTransaction("C", 80_000_000, 10_000_000, "saas", "2024-03"),
            ],
        )

        result = calculate_comparable_valuation(params)

        # Multiples: 4x, 6x, 8x -> Median = 6x
        # Target: 5M * 6x = 30M
        assert result.median_multiple == pytest.approx(6.0, rel=0.01)
        assert result.implied_valuation == pytest.approx(30_000_000, rel=0.01)

    def test_valuation_range_percentiles(self) -> None:
        """Test that result includes 25th/75th percentile range."""
        params = ComparablesParams(
            target_revenue=10_000_000,
            comparables=[
                ComparableTransaction("A", 30_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("B", 50_000_000, 10_000_000, "saas", "2024-02"),
                ComparableTransaction("C", 70_000_000, 10_000_000, "saas", "2024-03"),
                ComparableTransaction("D", 90_000_000, 10_000_000, "saas", "2024-04"),
            ],
        )

        result = calculate_comparable_valuation(params)

        assert result.low_valuation < result.implied_valuation < result.high_valuation

    def test_empty_comparables_raises(self) -> None:
        """Test that empty comparables list raises ValueError."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[],
        )

        with pytest.raises(ValueError, match="At least one comparable"):
            calculate_comparable_valuation(params)

    def test_zero_revenue_comparable_skipped(self) -> None:
        """Test that comparables with zero revenue are skipped."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[
                ComparableTransaction("Valid", 50_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("Invalid", 20_000_000, 0, "saas", "2024-01"),
            ],
        )

        result = calculate_comparable_valuation(params)

        # Only Valid should be used: 5x multiple
        assert result.median_multiple == pytest.approx(5.0, rel=0.01)
        assert len(result.multiples) == 1

    def test_comparable_transaction_frozen(self) -> None:
        """Test that ComparableTransaction is immutable."""
        from dataclasses import FrozenInstanceError

        comp = ComparableTransaction("Test", 100_000_000, 20_000_000, "tech", "2024-01")

        with pytest.raises(FrozenInstanceError):
            comp.deal_value = 200_000_000  # type: ignore

    def test_result_structure(self) -> None:
        """Test ComparablesResult has expected fields."""
        result = ComparablesResult(
            implied_valuation=50_000_000,
            median_multiple=5.0,
            mean_multiple=5.5,
            low_valuation=40_000_000,
            high_valuation=60_000_000,
            multiples=[4.0, 5.0, 6.0],
            comparable_count=3,
        )

        assert result.implied_valuation == 50_000_000
        assert result.median_multiple == 5.0
        assert result.comparable_count == 3

    def test_mean_vs_median_with_outlier(self) -> None:
        """Test that median is more robust to outliers than mean."""
        params = ComparablesParams(
            target_revenue=10_000_000,
            comparables=[
                ComparableTransaction("Normal1", 40_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("Normal2", 50_000_000, 10_000_000, "saas", "2024-02"),
                ComparableTransaction("Normal3", 60_000_000, 10_000_000, "saas", "2024-03"),
                ComparableTransaction("Outlier", 200_000_000, 10_000_000, "saas", "2024-04"),
            ],
        )

        result = calculate_comparable_valuation(params)

        # Multiples: 4x, 5x, 6x, 20x
        # Median = 5.5x (average of 5x and 6x)
        # Mean = (4+5+6+20)/4 = 8.75x
        assert result.median_multiple == pytest.approx(5.5, rel=0.01)
        assert result.mean_multiple > result.median_multiple  # Mean inflated by outlier

    def test_all_zero_revenue_comparables(self) -> None:
        """Test that all zero-revenue comparables raises error."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[
                ComparableTransaction("Zero1", 50_000_000, 0, "saas", "2024-01"),
                ComparableTransaction("Zero2", 30_000_000, 0, "saas", "2024-02"),
            ],
        )

        with pytest.raises(ValueError, match="At least one comparable"):
            calculate_comparable_valuation(params)

    def test_even_number_of_comparables(self) -> None:
        """Test median calculation with even number of comparables."""
        params = ComparablesParams(
            target_revenue=10_000_000,
            comparables=[
                ComparableTransaction("A", 40_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("B", 60_000_000, 10_000_000, "saas", "2024-02"),
            ],
        )

        result = calculate_comparable_valuation(params)

        # Multiples: 4x, 6x -> Median = 5x (average)
        assert result.median_multiple == pytest.approx(5.0, rel=0.01)

    def test_target_revenue_applies_to_valuation(self) -> None:
        """Test that target revenue correctly scales valuation."""
        params_low = ComparablesParams(
            target_revenue=1_000_000,
            comparables=[
                ComparableTransaction("A", 50_000_000, 10_000_000, "saas", "2024-01"),
            ],
        )

        params_high = ComparablesParams(
            target_revenue=20_000_000,
            comparables=[
                ComparableTransaction("A", 50_000_000, 10_000_000, "saas", "2024-01"),
            ],
        )

        result_low = calculate_comparable_valuation(params_low)
        result_high = calculate_comparable_valuation(params_high)

        # Same multiple (5x), but applied to different revenues
        assert result_low.implied_valuation == pytest.approx(5_000_000)
        assert result_high.implied_valuation == pytest.approx(100_000_000)
