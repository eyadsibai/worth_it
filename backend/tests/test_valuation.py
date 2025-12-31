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
    FirstChicagoParams,
    FirstChicagoResult,
    FirstChicagoScenario,
    RevenueMultipleParams,
    ValuationResult,
    VCMethodParams,
    calculate_dcf,
    calculate_first_chicago,
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


# ============================================================================
# First Chicago Method Tests
# ============================================================================


class TestFirstChicagoScenario:
    """Tests for FirstChicagoScenario dataclass."""

    def test_scenario_creation(self) -> None:
        """Test creating a scenario with all required fields."""
        scenario = FirstChicagoScenario(
            name="Base Case",
            probability=0.5,
            exit_value=10_000_000,
            years_to_exit=5,
        )
        assert scenario.name == "Base Case"
        assert scenario.probability == 0.5
        assert scenario.exit_value == 10_000_000
        assert scenario.years_to_exit == 5

    def test_scenario_probability_bounds(self) -> None:
        """Test that probability must be between 0 and 1."""
        # Valid probabilities should work
        scenario = FirstChicagoScenario(
            name="Test",
            probability=0.0,
            exit_value=1_000_000,
            years_to_exit=3,
        )
        assert scenario.probability == 0.0


class TestFirstChicagoParams:
    """Tests for FirstChicagoParams dataclass."""

    def test_params_creation_with_three_scenarios(self) -> None:
        """Test creating params with standard three scenarios."""
        best = FirstChicagoScenario("Best", 0.25, 50_000_000, 5)
        base = FirstChicagoScenario("Base", 0.50, 20_000_000, 5)
        worst = FirstChicagoScenario("Worst", 0.25, 5_000_000, 5)

        params = FirstChicagoParams(
            scenarios=[best, base, worst],
            discount_rate=0.25,
        )

        assert len(params.scenarios) == 3
        assert params.discount_rate == 0.25

    def test_params_with_optional_current_investment(self) -> None:
        """Test params with current investment amount."""
        scenario = FirstChicagoScenario("Base", 1.0, 10_000_000, 3)
        params = FirstChicagoParams(
            scenarios=[scenario],
            discount_rate=0.20,
            current_investment=1_000_000,
        )
        assert params.current_investment == 1_000_000


class TestFirstChicagoResult:
    """Tests for FirstChicagoResult dataclass."""

    def test_result_creation(self) -> None:
        """Test creating a result with all fields."""
        result = FirstChicagoResult(
            weighted_value=15_000_000,
            present_value=5_859_375,
            scenario_values={"Best": 50_000_000, "Base": 20_000_000, "Worst": 5_000_000},
            scenario_present_values={"Best": 19_531_250, "Base": 7_812_500, "Worst": 1_953_125},
            method="first_chicago",
        )
        assert result.weighted_value == 15_000_000
        assert result.present_value == 5_859_375
        assert result.method == "first_chicago"


class TestCalculateFirstChicago:
    """Tests for calculate_first_chicago function."""

    def test_basic_three_scenario_valuation(self) -> None:
        """Test standard three-scenario First Chicago calculation."""
        # Standard Best/Base/Worst with 25/50/25 probability split
        params = FirstChicagoParams(
            scenarios=[
                FirstChicagoScenario("Best", 0.25, 50_000_000, 5),
                FirstChicagoScenario("Base", 0.50, 20_000_000, 5),
                FirstChicagoScenario("Worst", 0.25, 5_000_000, 5),
            ],
            discount_rate=0.25,
        )

        result = calculate_first_chicago(params)

        # Weighted value = 0.25*50M + 0.50*20M + 0.25*5M = 12.5M + 10M + 1.25M = 23.75M
        assert result.weighted_value == pytest.approx(23_750_000, rel=0.01)

        # Present value = 23.75M / (1.25)^5 = 23.75M / 3.0517578125 ≈ 7,782,387
        assert result.present_value == pytest.approx(7_782_387, rel=0.01)

        assert result.method == "first_chicago"
        assert "Best" in result.scenario_values
        assert "Base" in result.scenario_values
        assert "Worst" in result.scenario_values

    def test_single_scenario(self) -> None:
        """Test with just one scenario (100% probability)."""
        params = FirstChicagoParams(
            scenarios=[
                FirstChicagoScenario("Only", 1.0, 10_000_000, 3),
            ],
            discount_rate=0.20,
        )

        result = calculate_first_chicago(params)

        # Weighted = 10M, PV = 10M / 1.2^3 = 10M / 1.728 ≈ 5,787,037
        assert result.weighted_value == pytest.approx(10_000_000, rel=0.01)
        assert result.present_value == pytest.approx(5_787_037, rel=0.01)

    def test_different_time_horizons(self) -> None:
        """Test scenarios with different exit timelines."""
        params = FirstChicagoParams(
            scenarios=[
                FirstChicagoScenario("Quick Exit", 0.30, 15_000_000, 3),
                FirstChicagoScenario("Normal Exit", 0.50, 30_000_000, 5),
                FirstChicagoScenario("Long Exit", 0.20, 60_000_000, 7),
            ],
            discount_rate=0.25,
        )

        result = calculate_first_chicago(params)

        # Each scenario discounted separately, then weighted
        # Quick: 15M / 1.25^3 = 7,680,000 * 0.30 = 2,304,000
        # Normal: 30M / 1.25^5 = 9,830,400 * 0.50 = 4,915,200
        # Long: 60M / 1.25^7 = 12,582,912 * 0.20 = 2,516,582
        # Total PV ≈ 9,735,782
        assert result.present_value == pytest.approx(9_735_782, rel=0.02)

    def test_probabilities_sum_to_one_validation(self) -> None:
        """Test that probabilities should sum close to 1.0."""
        params = FirstChicagoParams(
            scenarios=[
                FirstChicagoScenario("A", 0.25, 10_000_000, 5),
                FirstChicagoScenario("B", 0.25, 20_000_000, 5),
                # Probabilities sum to 0.5, not 1.0
            ],
            discount_rate=0.20,
        )

        # Should still calculate but may want to add warning in future
        result = calculate_first_chicago(params)
        assert result is not None


# ============================================================================
# Berkus Method Tests
# ============================================================================


class TestBerkusMethod:
    """Tests for Berkus Method valuation."""

    def test_berkus_params_creation(self) -> None:
        """Test creating Berkus params with all criteria."""
        from worth_it.calculations.valuation import BerkusParams

        params = BerkusParams(
            sound_idea=400_000,  # 0-500K
            prototype=300_000,  # 0-500K
            quality_team=500_000,  # 0-500K
            strategic_relationships=200_000,  # 0-500K
            product_rollout=100_000,  # 0-500K
        )
        assert params.sound_idea == 400_000
        assert params.quality_team == 500_000

    def test_berkus_result_creation(self) -> None:
        """Test Berkus result structure."""
        from worth_it.calculations.valuation import BerkusResult

        result = BerkusResult(
            valuation=1_500_000,
            breakdown={
                "sound_idea": 400_000,
                "prototype": 300_000,
                "quality_team": 500_000,
                "strategic_relationships": 200_000,
                "product_rollout": 100_000,
            },
            method="berkus",
        )
        assert result.valuation == 1_500_000
        assert result.method == "berkus"


class TestCalculateBerkus:
    """Tests for calculate_berkus function."""

    def test_full_score_valuation(self) -> None:
        """Test maximum valuation (all criteria at max)."""
        from worth_it.calculations.valuation import BerkusParams, calculate_berkus

        params = BerkusParams(
            sound_idea=500_000,
            prototype=500_000,
            quality_team=500_000,
            strategic_relationships=500_000,
            product_rollout=500_000,
        )
        result = calculate_berkus(params)
        assert result.valuation == 2_500_000
        assert result.method == "berkus"

    def test_partial_score_valuation(self) -> None:
        """Test partial scoring."""
        from worth_it.calculations.valuation import BerkusParams, calculate_berkus

        params = BerkusParams(
            sound_idea=400_000,
            prototype=300_000,
            quality_team=500_000,
            strategic_relationships=200_000,
            product_rollout=100_000,
        )
        result = calculate_berkus(params)
        assert result.valuation == 1_500_000

    def test_breakdown_included(self) -> None:
        """Test that breakdown shows each criterion."""
        from worth_it.calculations.valuation import BerkusParams, calculate_berkus

        params = BerkusParams(
            sound_idea=100_000,
            prototype=200_000,
            quality_team=300_000,
            strategic_relationships=400_000,
            product_rollout=500_000,
        )
        result = calculate_berkus(params)
        assert result.breakdown["sound_idea"] == 100_000
        assert result.breakdown["prototype"] == 200_000
        assert result.breakdown["quality_team"] == 300_000

    def test_zero_valuation(self) -> None:
        """Test with all zeros."""
        from worth_it.calculations.valuation import BerkusParams, calculate_berkus

        params = BerkusParams(
            sound_idea=0,
            prototype=0,
            quality_team=0,
            strategic_relationships=0,
            product_rollout=0,
        )
        result = calculate_berkus(params)
        assert result.valuation == 0


# ============================================================================
# Scorecard Method Tests
# ============================================================================


class TestScorecardMethod:
    """Tests for Scorecard Method valuation."""

    def test_scorecard_factor_creation(self) -> None:
        """Test creating a scorecard factor."""
        from worth_it.calculations.valuation import ScorecardFactor

        factor = ScorecardFactor(
            name="Team",
            weight=0.30,
            score=1.25,  # 25% above average
        )
        assert factor.name == "Team"
        assert factor.weight == 0.30
        assert factor.score == 1.25

    def test_scorecard_params_creation(self) -> None:
        """Test creating scorecard params."""
        from worth_it.calculations.valuation import ScorecardFactor, ScorecardParams

        params = ScorecardParams(
            base_valuation=2_000_000,  # Average pre-money in region
            factors=[
                ScorecardFactor("Team", 0.30, 1.25),
                ScorecardFactor("Market Size", 0.25, 1.10),
                ScorecardFactor("Product", 0.15, 1.00),
                ScorecardFactor("Competition", 0.10, 0.90),
                ScorecardFactor("Marketing", 0.10, 1.00),
                ScorecardFactor("Need for Funding", 0.05, 1.00),
                ScorecardFactor("Other", 0.05, 1.00),
            ],
        )
        assert params.base_valuation == 2_000_000
        assert len(params.factors) == 7


class TestCalculateScorecard:
    """Tests for calculate_scorecard function."""

    def test_average_company_valuation(self) -> None:
        """Test company matching average (all scores = 1.0)."""
        from worth_it.calculations.valuation import (
            ScorecardFactor,
            ScorecardParams,
            calculate_scorecard,
        )

        params = ScorecardParams(
            base_valuation=2_000_000,
            factors=[
                ScorecardFactor("Team", 0.30, 1.0),
                ScorecardFactor("Market", 0.25, 1.0),
                ScorecardFactor("Product", 0.20, 1.0),
                ScorecardFactor("Competition", 0.15, 1.0),
                ScorecardFactor("Other", 0.10, 1.0),
            ],
        )
        result = calculate_scorecard(params)
        # All 1.0 scores = 100% of base
        assert result.valuation == pytest.approx(2_000_000, rel=0.01)

    def test_above_average_company(self) -> None:
        """Test company scoring above average."""
        from worth_it.calculations.valuation import (
            ScorecardFactor,
            ScorecardParams,
            calculate_scorecard,
        )

        params = ScorecardParams(
            base_valuation=2_000_000,
            factors=[
                ScorecardFactor("Team", 0.30, 1.50),  # +50%
                ScorecardFactor("Market", 0.25, 1.25),  # +25%
                ScorecardFactor("Product", 0.20, 1.10),  # +10%
                ScorecardFactor("Competition", 0.15, 1.00),
                ScorecardFactor("Other", 0.10, 1.00),
            ],
        )
        result = calculate_scorecard(params)
        # Weighted sum: 0.30*1.5 + 0.25*1.25 + 0.20*1.10 + 0.15*1.0 + 0.10*1.0
        # = 0.45 + 0.3125 + 0.22 + 0.15 + 0.10 = 1.2325
        # Valuation = 2M * 1.2325 = 2,465,000
        assert result.valuation == pytest.approx(2_465_000, rel=0.01)

    def test_below_average_company(self) -> None:
        """Test company scoring below average."""
        from worth_it.calculations.valuation import (
            ScorecardFactor,
            ScorecardParams,
            calculate_scorecard,
        )

        params = ScorecardParams(
            base_valuation=2_000_000,
            factors=[
                ScorecardFactor("Team", 0.30, 0.75),  # -25%
                ScorecardFactor("Market", 0.25, 0.80),  # -20%
                ScorecardFactor("Product", 0.20, 1.00),
                ScorecardFactor("Competition", 0.15, 0.90),
                ScorecardFactor("Other", 0.10, 1.00),
            ],
        )
        result = calculate_scorecard(params)
        # Weighted sum < 1.0, so valuation < base
        assert result.valuation < 2_000_000


# ============================================================================
# Risk Factor Summation Method Tests
# ============================================================================


class TestRiskFactorSummation:
    """Tests for Risk Factor Summation Method."""

    def test_risk_factor_creation(self) -> None:
        """Test creating a risk factor with adjustment."""
        from worth_it.calculations.valuation import RiskFactor

        factor = RiskFactor(
            name="Management Risk",
            adjustment=250_000,  # Positive = reduces risk, adds value
        )
        assert factor.name == "Management Risk"
        assert factor.adjustment == 250_000

    def test_params_with_12_factors(self) -> None:
        """Test creating params with standard 12 factors."""
        from worth_it.calculations.valuation import RiskFactor, RiskFactorSummationParams

        factors = [
            RiskFactor("Management", 250_000),
            RiskFactor("Stage of Business", 0),
            RiskFactor("Legislation/Political", -250_000),
            RiskFactor("Manufacturing", 0),
            RiskFactor("Sales and Marketing", 250_000),
            RiskFactor("Funding/Capital", 0),
            RiskFactor("Competition", -500_000),
            RiskFactor("Technology", 250_000),
            RiskFactor("Litigation", 0),
            RiskFactor("International", 0),
            RiskFactor("Reputation", 250_000),
            RiskFactor("Exit Potential", 500_000),
        ]
        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=factors,
        )
        assert len(params.factors) == 12


class TestCalculateRiskFactorSummation:
    """Tests for calculate_risk_factor_summation function."""

    def test_neutral_factors(self) -> None:
        """Test with all neutral (0) adjustments."""
        from worth_it.calculations.valuation import (
            RiskFactor,
            RiskFactorSummationParams,
            calculate_risk_factor_summation,
        )

        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=[
                RiskFactor("Management", 0),
                RiskFactor("Stage", 0),
                RiskFactor("Competition", 0),
            ],
        )
        result = calculate_risk_factor_summation(params)
        assert result.valuation == 2_000_000

    def test_positive_adjustments(self) -> None:
        """Test with positive adjustments (risk reducers)."""
        from worth_it.calculations.valuation import (
            RiskFactor,
            RiskFactorSummationParams,
            calculate_risk_factor_summation,
        )

        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=[
                RiskFactor("Management", 500_000),  # Very strong team
                RiskFactor("Technology", 250_000),  # Strong tech
            ],
        )
        result = calculate_risk_factor_summation(params)
        assert result.valuation == 2_750_000

    def test_negative_adjustments(self) -> None:
        """Test with negative adjustments (risk increasers)."""
        from worth_it.calculations.valuation import (
            RiskFactor,
            RiskFactorSummationParams,
            calculate_risk_factor_summation,
        )

        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=[
                RiskFactor("Competition", -500_000),  # High competition
                RiskFactor("Funding", -250_000),  # Funding challenges
            ],
        )
        result = calculate_risk_factor_summation(params)
        assert result.valuation == 1_250_000

    def test_mixed_adjustments(self) -> None:
        """Test with mixed positive and negative adjustments."""
        from worth_it.calculations.valuation import (
            RiskFactor,
            RiskFactorSummationParams,
            calculate_risk_factor_summation,
        )

        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=[
                RiskFactor("Management", 500_000),
                RiskFactor("Competition", -500_000),
                RiskFactor("Technology", 250_000),
            ],
        )
        result = calculate_risk_factor_summation(params)
        # 2M + 500K - 500K + 250K = 2.25M
        assert result.valuation == 2_250_000

    def test_minimum_valuation_floor(self) -> None:
        """Test that valuation doesn't go negative."""
        from worth_it.calculations.valuation import (
            RiskFactor,
            RiskFactorSummationParams,
            calculate_risk_factor_summation,
        )

        params = RiskFactorSummationParams(
            base_valuation=1_000_000,
            factors=[
                RiskFactor("Risk1", -500_000),
                RiskFactor("Risk2", -500_000),
                RiskFactor("Risk3", -500_000),
            ],
        )
        result = calculate_risk_factor_summation(params)
        # Should floor at 0, not go negative
        assert result.valuation >= 0


# ============================================================================
# Enhanced DCF (Multi-Stage Growth) Tests
# ============================================================================


class TestEnhancedDCF:
    """Tests for Enhanced DCF with multi-stage growth modeling."""

    def test_dcf_stage_creation(self):
        """DCFStage is a frozen dataclass for growth stages."""
        from worth_it.calculations.valuation import DCFStage

        stage = DCFStage(
            name="Hypergrowth",
            years=3,
            growth_rate=0.50,
            margin=0.10,
        )

        assert stage.name == "Hypergrowth"
        assert stage.years == 3
        assert stage.growth_rate == 0.50
        assert stage.margin == 0.10

    def test_dcf_stage_is_frozen(self):
        """DCFStage should be immutable."""
        from dataclasses import FrozenInstanceError

        from worth_it.calculations.valuation import DCFStage

        stage = DCFStage(name="Growth", years=2, growth_rate=0.25, margin=0.15)

        with pytest.raises(FrozenInstanceError):
            stage.years = 5  # type: ignore

    def test_enhanced_dcf_params_validation(self):
        """EnhancedDCFParams validates input parameters."""
        from worth_it.calculations.valuation import DCFStage, EnhancedDCFParams

        stages = [
            DCFStage(name="Hypergrowth", years=3, growth_rate=0.50, margin=0.10),
            DCFStage(name="Growth", years=3, growth_rate=0.25, margin=0.20),
            DCFStage(name="Mature", years=4, growth_rate=0.08, margin=0.25),
        ]

        params = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=stages,
            discount_rate=0.12,
            terminal_growth_rate=0.03,
        )

        assert params.base_revenue == 1_000_000
        assert len(params.stages) == 3
        assert params.discount_rate == 0.12

    def test_enhanced_dcf_params_requires_stages(self):
        """EnhancedDCFParams requires at least one growth stage."""
        from worth_it.calculations.valuation import EnhancedDCFParams

        with pytest.raises(ValidationError):
            EnhancedDCFParams(
                base_revenue=1_000_000,
                stages=[],  # Empty stages
                discount_rate=0.12,
            )

    def test_enhanced_dcf_params_terminal_growth_validation(self):
        """Terminal growth must be less than discount rate."""
        from worth_it.calculations.valuation import DCFStage, EnhancedDCFParams

        stages = [DCFStage(name="Growth", years=5, growth_rate=0.20, margin=0.15)]

        # Use values that pass field validation (terminal_growth < 0.1)
        # but fail model validation (terminal_growth >= discount_rate)
        with pytest.raises(ValidationError, match="(?i)terminal.*discount"):
            EnhancedDCFParams(
                base_revenue=1_000_000,
                stages=stages,
                discount_rate=0.05,  # 5% discount rate
                terminal_growth_rate=0.08,  # 8% > 5% (violates growth < discount)
            )

    def test_enhanced_dcf_result_structure(self):
        """EnhancedDCFResult is a frozen dataclass with proper structure."""
        from worth_it.calculations.valuation import EnhancedDCFResult

        result = EnhancedDCFResult(
            valuation=10_000_000,
            pv_cash_flows=6_000_000,
            terminal_value=8_000_000,
            pv_terminal_value=4_000_000,
            year_by_year=[
                {"year": 1, "revenue": 1_500_000, "cash_flow": 150_000, "pv": 133_929},
            ],
            total_projection_years=10,
            confidence=0.7,
        )

        assert result.valuation == 10_000_000
        assert result.pv_cash_flows == 6_000_000
        assert len(result.year_by_year) == 1

    def test_calculate_enhanced_dcf_single_stage(self):
        """Calculate DCF with single growth stage."""
        from worth_it.calculations.valuation import (
            DCFStage,
            EnhancedDCFParams,
            calculate_enhanced_dcf,
        )

        stages = [DCFStage(name="Growth", years=5, growth_rate=0.20, margin=0.15)]

        params = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=stages,
            discount_rate=0.12,
            terminal_growth_rate=0.03,
        )

        result = calculate_enhanced_dcf(params)

        assert result.valuation > 0
        assert result.total_projection_years == 5
        assert len(result.year_by_year) == 5

    def test_calculate_enhanced_dcf_multi_stage(self):
        """Calculate DCF with multiple growth stages."""
        from worth_it.calculations.valuation import (
            DCFStage,
            EnhancedDCFParams,
            calculate_enhanced_dcf,
        )

        stages = [
            DCFStage(name="Hypergrowth", years=2, growth_rate=0.50, margin=0.05),
            DCFStage(name="Growth", years=3, growth_rate=0.25, margin=0.15),
            DCFStage(name="Mature", years=5, growth_rate=0.08, margin=0.22),
        ]

        params = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=stages,
            discount_rate=0.15,
            terminal_growth_rate=0.03,
        )

        result = calculate_enhanced_dcf(params)

        assert result.valuation > 0
        assert result.total_projection_years == 10  # 2 + 3 + 5
        assert len(result.year_by_year) == 10
        # Verify year-by-year has correct structure
        assert "year" in result.year_by_year[0]
        assert "revenue" in result.year_by_year[0]
        assert "cash_flow" in result.year_by_year[0]
        assert "pv" in result.year_by_year[0]
        assert "stage" in result.year_by_year[0]

    def test_enhanced_dcf_revenue_grows_through_stages(self):
        """Revenue should compound through each stage."""
        from worth_it.calculations.valuation import (
            DCFStage,
            EnhancedDCFParams,
            calculate_enhanced_dcf,
        )

        stages = [
            DCFStage(name="Fast", years=2, growth_rate=1.0, margin=0.10),  # 100% growth
            DCFStage(name="Slow", years=2, growth_rate=0.10, margin=0.20),  # 10% growth
        ]

        params = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=stages,
            discount_rate=0.15,
        )

        result = calculate_enhanced_dcf(params)

        # Year 1: 1M * 2.0 = 2M
        # Year 2: 2M * 2.0 = 4M
        # Year 3: 4M * 1.1 = 4.4M
        # Year 4: 4.4M * 1.1 = 4.84M
        assert result.year_by_year[0]["revenue"] == pytest.approx(2_000_000)
        assert result.year_by_year[1]["revenue"] == pytest.approx(4_000_000)
        assert result.year_by_year[2]["revenue"] == pytest.approx(4_400_000)
        assert result.year_by_year[3]["revenue"] == pytest.approx(4_840_000)

    def test_enhanced_dcf_margin_affects_cash_flow(self):
        """Cash flow should be revenue × margin for each stage."""
        from worth_it.calculations.valuation import (
            DCFStage,
            EnhancedDCFParams,
            calculate_enhanced_dcf,
        )

        stages = [
            DCFStage(name="Low Margin", years=2, growth_rate=0.10, margin=0.05),
            DCFStage(name="High Margin", years=2, growth_rate=0.10, margin=0.25),
        ]

        params = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=stages,
            discount_rate=0.12,
        )

        result = calculate_enhanced_dcf(params)

        # Year 1: 1.1M revenue * 5% margin = 55k cash flow
        # Year 3: ~1.33M revenue * 25% margin = ~333k cash flow
        year1_cf = result.year_by_year[0]["cash_flow"]
        year3_cf = result.year_by_year[2]["cash_flow"]

        assert year3_cf > year1_cf * 4  # Higher margin should increase cash flow significantly

    def test_enhanced_dcf_without_terminal_value(self):
        """Enhanced DCF can work without terminal value."""
        from worth_it.calculations.valuation import (
            DCFStage,
            EnhancedDCFParams,
            calculate_enhanced_dcf,
        )

        stages = [DCFStage(name="Growth", years=5, growth_rate=0.15, margin=0.20)]

        params = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=stages,
            discount_rate=0.12,
            terminal_growth_rate=None,  # No perpetuity
        )

        result = calculate_enhanced_dcf(params)

        assert result.valuation > 0
        assert result.terminal_value == 0
        assert result.pv_terminal_value == 0
        assert result.valuation == result.pv_cash_flows

    def test_enhanced_dcf_higher_discount_lowers_valuation(self):
        """Higher discount rate should lower valuation."""
        from worth_it.calculations.valuation import (
            DCFStage,
            EnhancedDCFParams,
            calculate_enhanced_dcf,
        )

        stages = [DCFStage(name="Growth", years=5, growth_rate=0.20, margin=0.15)]

        params_low = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=stages,
            discount_rate=0.10,
            terminal_growth_rate=0.03,
        )

        params_high = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=stages,
            discount_rate=0.20,
            terminal_growth_rate=0.03,
        )

        result_low = calculate_enhanced_dcf(params_low)
        result_high = calculate_enhanced_dcf(params_high)

        assert result_low.valuation > result_high.valuation

    def test_enhanced_dcf_confidence_calculation(self):
        """Confidence should be based on projection quality."""
        from worth_it.calculations.valuation import (
            DCFStage,
            EnhancedDCFParams,
            calculate_enhanced_dcf,
        )

        # Short projection with positive cash flows should have higher confidence
        short_stages = [DCFStage(name="Growth", years=3, growth_rate=0.10, margin=0.25)]
        params_short = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=short_stages,
            discount_rate=0.12,
        )

        # Long projection should have lower confidence (more uncertainty)
        long_stages = [DCFStage(name="Growth", years=15, growth_rate=0.10, margin=0.25)]
        params_long = EnhancedDCFParams(
            base_revenue=1_000_000,
            stages=long_stages,
            discount_rate=0.12,
        )

        result_short = calculate_enhanced_dcf(params_short)
        result_long = calculate_enhanced_dcf(params_long)

        assert result_short.confidence >= result_long.confidence
