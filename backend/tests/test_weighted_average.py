"""
Tests for Weighted Average Valuation Synthesis.

Combines multiple valuation methods into a single triangulated value
using confidence-based weights.
"""

from __future__ import annotations

import pytest

from worth_it.calculations.weighted_average import (
    ValuationInput,
    WeightedAverageParams,
    WeightedAverageResult,
    calculate_weighted_average,
)

# ============================================================================
# Weighted Average Tests
# ============================================================================


class TestWeightedAverage:
    """Tests for Weighted Average valuation synthesis."""

    def test_equal_weights(self) -> None:
        """Test with approximately equal weights across methods."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("First Chicago", 10_000_000, 0.33),
                ValuationInput("DCF", 12_000_000, 0.33),
                ValuationInput("Comparables", 11_000_000, 0.34),
            ],
        )

        result = calculate_weighted_average(params)

        # Weighted avg ≈ 11M (normalized weights)
        expected = 10_000_000 * 0.33 + 12_000_000 * 0.33 + 11_000_000 * 0.34
        assert result.weighted_valuation == pytest.approx(expected, rel=0.01)

    def test_confidence_weighting_favors_high(self) -> None:
        """Test that higher confidence weights more heavily."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("High Confidence", 10_000_000, 0.80),
                ValuationInput("Low Confidence", 20_000_000, 0.20),
            ],
        )

        result = calculate_weighted_average(params)

        # More weight on 10M, should be closer to 10M than 20M
        assert result.weighted_valuation < 15_000_000
        assert result.normalized_weights["High Confidence"] == pytest.approx(0.80, rel=0.01)
        assert result.normalized_weights["Low Confidence"] == pytest.approx(0.20, rel=0.01)

    def test_weights_normalized_to_one(self) -> None:
        """Test that weights are normalized even if they don't sum to 1."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("A", 10_000_000, 2.0),  # Unnormalized weights
                ValuationInput("B", 20_000_000, 3.0),
            ],
        )

        result = calculate_weighted_average(params)

        # Weights should be normalized: 2/(2+3)=0.4, 3/(2+3)=0.6
        assert result.normalized_weights["A"] == pytest.approx(0.4, rel=0.01)
        assert result.normalized_weights["B"] == pytest.approx(0.6, rel=0.01)
        # Valuation: 10M * 0.4 + 20M * 0.6 = 16M
        assert result.weighted_valuation == pytest.approx(16_000_000, rel=0.01)

    def test_method_contributions(self) -> None:
        """Test that method contributions are calculated correctly."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("DCF", 10_000_000, 0.5),
                ValuationInput("Comps", 10_000_000, 0.5),
            ],
        )

        result = calculate_weighted_average(params)

        assert result.method_contributions["DCF"] == pytest.approx(5_000_000, rel=0.01)
        assert result.method_contributions["Comps"] == pytest.approx(5_000_000, rel=0.01)

    def test_empty_valuations_raises(self) -> None:
        """Test that empty valuations list raises ValueError."""
        params = WeightedAverageParams(valuations=[])

        with pytest.raises(ValueError, match="At least one valuation"):
            calculate_weighted_average(params)

    def test_zero_total_weight_raises(self) -> None:
        """Test that zero total weight raises ValueError."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("A", 10_000_000, 0.0),
            ],
        )

        with pytest.raises(ValueError, match="Total weight cannot be zero"):
            calculate_weighted_average(params)

    def test_single_valuation(self) -> None:
        """Test with single valuation returns that valuation."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("DCF", 15_000_000, 1.0),
            ],
        )

        result = calculate_weighted_average(params)

        assert result.weighted_valuation == pytest.approx(15_000_000, rel=0.01)
        assert result.normalized_weights["DCF"] == 1.0

    def test_valuation_input_frozen(self) -> None:
        """Test that ValuationInput is immutable."""
        from dataclasses import FrozenInstanceError

        val = ValuationInput("DCF", 10_000_000, 0.5)

        with pytest.raises(FrozenInstanceError):
            val.valuation = 20_000_000  # type: ignore

    def test_params_frozen(self) -> None:
        """Test that WeightedAverageParams is immutable."""
        from dataclasses import FrozenInstanceError

        params = WeightedAverageParams(valuations=[ValuationInput("DCF", 10_000_000, 0.5)])

        with pytest.raises(FrozenInstanceError):
            params.valuations = []  # type: ignore

    def test_result_structure(self) -> None:
        """Test WeightedAverageResult has expected fields."""
        result = WeightedAverageResult(
            weighted_valuation=15_000_000,
            method_contributions={"DCF": 7_500_000, "Comps": 7_500_000},
            normalized_weights={"DCF": 0.5, "Comps": 0.5},
        )

        assert result.weighted_valuation == 15_000_000
        assert result.method == "weighted_average"
        assert len(result.method_contributions) == 2
        assert len(result.normalized_weights) == 2

    def test_extreme_weight_disparity(self) -> None:
        """Test with very different weights."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("Dominant", 10_000_000, 0.99),
                ValuationInput("Minor", 100_000_000, 0.01),
            ],
        )

        result = calculate_weighted_average(params)

        # Should be very close to 10M (99% weight on 10M)
        assert result.weighted_valuation < 12_000_000
        assert result.weighted_valuation > 9_000_000
