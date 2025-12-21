"""Tests for the dilution engine fluent pipeline."""

import numpy as np
import pandas as pd
import pytest

from worth_it.calculations.dilution_engine import (
    DilutionPipeline,
    DilutionResult,
    calculate_dilution_schedule,
)


class TestDilutionResult:
    """Tests for the DilutionResult dataclass."""

    def test_dilution_result_creation(self):
        """DilutionResult stores yearly factors and total dilution."""
        factors = np.array([1.0, 0.9, 0.8])
        result = DilutionResult(
            yearly_factors=factors,
            total_dilution=0.2,
            historical_factor=0.9,
        )
        assert np.array_equal(result.yearly_factors, factors)
        assert result.total_dilution == 0.2
        assert result.historical_factor == 0.9

    def test_dilution_result_default_historical_factor(self):
        """DilutionResult defaults historical_factor to 1.0."""
        result = DilutionResult(
            yearly_factors=np.array([1.0]),
            total_dilution=0.0,
        )
        assert result.historical_factor == 1.0

    def test_dilution_result_is_immutable(self):
        """DilutionResult cannot be modified after creation."""
        result = DilutionResult(
            yearly_factors=np.array([1.0]),
            total_dilution=0.0,
        )
        with pytest.raises(AttributeError):
            result.total_dilution = 0.5


class TestDilutionPipelineBase:
    """Tests for DilutionPipeline base structure."""

    def test_pipeline_creation_with_range(self):
        """Pipeline can be created with a range of years."""
        pipeline = DilutionPipeline(years=range(5))
        assert len(list(pipeline.years)) == 5

    def test_pipeline_creation_with_pandas_index(self):
        """Pipeline can be created with a pandas Index."""
        years = pd.RangeIndex(start=0, stop=5)
        pipeline = DilutionPipeline(years=years)
        assert len(pipeline.years) == 5

    def test_pipeline_is_immutable(self):
        """Pipeline cannot be modified after creation."""
        pipeline = DilutionPipeline(years=range(5))
        with pytest.raises(AttributeError):
            pipeline.rounds = [{"year": 1}]

    def test_with_rounds_returns_new_instance(self):
        """with_rounds returns a new pipeline instance."""
        pipeline1 = DilutionPipeline(years=range(5))
        pipeline2 = pipeline1.with_rounds([{"year": 1, "dilution": 0.1}])
        assert pipeline1 is not pipeline2
        assert len(pipeline1.rounds) == 0
        assert len(pipeline2.rounds) == 1

    def test_with_rounds_handles_none(self):
        """with_rounds handles None input gracefully."""
        pipeline = DilutionPipeline(years=range(5)).with_rounds(None)
        assert pipeline.rounds == []


class TestWithSimulatedDilution:
    """Tests for with_simulated_dilution shortcut."""

    def test_simulated_dilution_returns_result(self):
        """with_simulated_dilution returns DilutionResult directly."""
        pipeline = DilutionPipeline(years=range(5))
        result = pipeline.with_simulated_dilution(0.3)
        assert isinstance(result, DilutionResult)
        assert result.total_dilution == 0.3

    def test_simulated_dilution_fills_factors(self):
        """All yearly factors are set to (1 - dilution)."""
        result = DilutionPipeline(years=range(5)).with_simulated_dilution(0.2)
        expected = np.full(5, 0.8)
        assert np.allclose(result.yearly_factors, expected)

    def test_simulated_dilution_sets_historical_factor(self):
        """Historical factor equals (1 - dilution)."""
        result = DilutionPipeline(years=range(5)).with_simulated_dilution(0.25)
        assert result.historical_factor == 0.75

    def test_simulated_dilution_zero(self):
        """Zero dilution returns all ones."""
        result = DilutionPipeline(years=range(3)).with_simulated_dilution(0.0)
        assert np.allclose(result.yearly_factors, [1.0, 1.0, 1.0])
        assert result.total_dilution == 0.0


class TestClassify:
    """Tests for classify() method."""

    def test_classify_by_status_completed(self):
        """Rounds with status='completed' go to completed list."""
        rounds = [
            {"year": 1, "dilution": 0.1, "status": "completed"},
            {"year": 2, "dilution": 0.2, "status": "upcoming"},
        ]
        pipeline = DilutionPipeline(years=range(5)).with_rounds(rounds).classify()
        assert len(pipeline._completed) == 1
        assert len(pipeline._upcoming) == 1
        assert pipeline._completed[0]["year"] == 1

    def test_classify_by_negative_year(self):
        """Rounds with negative year (no status) go to completed."""
        rounds = [
            {"year": -2, "dilution": 0.1},
            {"year": -1, "dilution": 0.15},
            {"year": 1, "dilution": 0.2},
        ]
        pipeline = DilutionPipeline(years=range(5)).with_rounds(rounds).classify()
        assert len(pipeline._completed) == 2
        assert len(pipeline._upcoming) == 1

    def test_classify_zero_year_is_upcoming(self):
        """Year 0 with no status is classified as upcoming."""
        rounds = [{"year": 0, "dilution": 0.1}]
        pipeline = DilutionPipeline(years=range(5)).with_rounds(rounds).classify()
        assert len(pipeline._completed) == 0
        assert len(pipeline._upcoming) == 1

    def test_classify_status_overrides_year(self):
        """Explicit status overrides year-based classification."""
        rounds = [
            {"year": -1, "dilution": 0.1, "status": "upcoming"},
            {"year": 5, "dilution": 0.2, "status": "completed"},
        ]
        pipeline = DilutionPipeline(years=range(5)).with_rounds(rounds).classify()
        assert len(pipeline._completed) == 1
        assert pipeline._completed[0]["year"] == 5
        assert len(pipeline._upcoming) == 1
        assert pipeline._upcoming[0]["year"] == -1

    def test_classify_returns_new_instance(self):
        """classify() returns a new pipeline instance."""
        pipeline1 = DilutionPipeline(years=range(5)).with_rounds([{"year": 1, "dilution": 0.1}])
        pipeline2 = pipeline1.classify()
        assert pipeline1 is not pipeline2


class TestApplyHistorical:
    """Tests for apply_historical() method."""

    def test_apply_historical_single_round(self):
        """Single completed round applies its dilution."""
        rounds = [{"year": -1, "dilution": 0.2}]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
        )
        assert pipeline._historical_factor == 0.8

    def test_apply_historical_multiple_rounds(self):
        """Multiple completed rounds multiply dilution factors."""
        rounds = [
            {"year": -2, "dilution": 0.1},  # 0.9
            {"year": -1, "dilution": 0.2},  # 0.9 * 0.8 = 0.72
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
        )
        assert np.isclose(pipeline._historical_factor, 0.72)

    def test_apply_historical_no_completed_rounds(self):
        """No completed rounds keeps factor at 1.0."""
        rounds = [{"year": 1, "dilution": 0.2}]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
        )
        assert pipeline._historical_factor == 1.0

    def test_apply_historical_missing_dilution_defaults_zero(self):
        """Rounds without dilution key default to 0 dilution."""
        rounds = [{"year": -1}]  # No dilution key
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
        )
        assert pipeline._historical_factor == 1.0

    def test_apply_historical_returns_new_instance(self):
        """apply_historical() returns a new pipeline instance."""
        pipeline1 = DilutionPipeline(years=range(5)).with_rounds([]).classify()
        pipeline2 = pipeline1.apply_historical()
        assert pipeline1 is not pipeline2


class TestApplySafeConversions:
    """Tests for apply_safe_conversions() method."""

    def test_safe_converts_at_next_priced_round(self):
        """SAFE note maps to the next priced round's year."""
        rounds = [
            {"year": 1, "dilution": 0.1, "is_safe_note": True},
            {"year": 3, "dilution": 0.2, "is_safe_note": False},  # Priced
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        # SAFE at year 1 should convert at year 3
        safe_round = pipeline._upcoming[0]
        assert pipeline._safe_conversions[id(safe_round)] == 3

    def test_safe_with_no_following_priced_round(self):
        """SAFE with no following priced round gets None."""
        rounds = [
            {"year": 1, "dilution": 0.1, "is_safe_note": True},
            {"year": 2, "dilution": 0.2, "is_safe_note": True},  # Also SAFE
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        # Both SAFEs have no priced round to convert at
        for r in pipeline._upcoming:
            assert pipeline._safe_conversions[id(r)] is None

    def test_priced_rounds_not_in_safe_map(self):
        """Priced rounds are not added to SAFE conversion map."""
        rounds = [
            {"year": 1, "dilution": 0.1, "is_safe_note": False},  # Priced
            {"year": 2, "dilution": 0.2, "is_safe_note": False},  # Priced
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        assert len(pipeline._safe_conversions) == 0

    def test_safe_converts_at_same_year_priced_round(self):
        """SAFE can convert at priced round in same year."""
        rounds = [
            {"year": 2, "dilution": 0.1, "is_safe_note": True},
            {"year": 2, "dilution": 0.2, "is_safe_note": False},  # Same year, priced
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        safe_round = [r for r in pipeline._upcoming if r.get("is_safe_note")][0]
        assert pipeline._safe_conversions[id(safe_round)] == 2

    def test_upcoming_rounds_sorted_by_year(self):
        """apply_safe_conversions sorts upcoming rounds by year."""
        rounds = [
            {"year": 3, "dilution": 0.2},
            {"year": 1, "dilution": 0.1},
            {"year": 2, "dilution": 0.15},
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        years = [r["year"] for r in pipeline._upcoming]
        assert years == [1, 2, 3]


class TestApplyFutureRounds:
    """Tests for apply_future_rounds() method."""

    def test_priced_round_dilutes_at_year(self):
        """Priced round applies dilution starting at its year."""
        rounds = [{"year": 2, "dilution": 0.2, "is_safe_note": False}]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        factors = pipeline._yearly_factors
        assert factors[0] == 1.0  # Year 0
        assert factors[1] == 1.0  # Year 1
        assert factors[2] == 0.8  # Year 2 (dilution applied)
        assert factors[3] == 0.8  # Year 3
        assert factors[4] == 0.8  # Year 4

    def test_safe_dilutes_at_conversion_year(self):
        """SAFE dilution applies at conversion year, not SAFE year."""
        rounds = [
            {"year": 1, "dilution": 0.1, "is_safe_note": True},
            {"year": 3, "dilution": 0.2, "is_safe_note": False},  # Priced
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        factors = pipeline._yearly_factors
        assert factors[0] == 1.0  # Year 0
        assert factors[1] == 1.0  # Year 1 (SAFE not converted yet)
        assert factors[2] == 1.0  # Year 2 (SAFE not converted yet)
        # Year 3: both SAFE (0.9) and priced (0.8) apply = 0.72
        assert np.isclose(factors[3], 0.72)
        assert np.isclose(factors[4], 0.72)

    def test_historical_factor_applied(self):
        """Historical factor is included in yearly factors."""
        rounds = [
            {"year": -1, "dilution": 0.1},  # Historical
            {"year": 2, "dilution": 0.2},   # Future
        ]
        pipeline = (
            DilutionPipeline(years=range(4))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        factors = pipeline._yearly_factors
        assert np.isclose(factors[0], 0.9)  # Historical only
        assert np.isclose(factors[1], 0.9)  # Historical only
        assert np.isclose(factors[2], 0.72)  # 0.9 * 0.8
        assert np.isclose(factors[3], 0.72)

    def test_safe_without_conversion_never_dilutes(self):
        """SAFE with no priced round after it never applies dilution."""
        rounds = [{"year": 1, "dilution": 0.5, "is_safe_note": True}]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        # No priced round, so SAFE never converts
        assert all(f == 1.0 for f in pipeline._yearly_factors)

    def test_multiple_rounds_compound(self):
        """Multiple rounds compound their dilution."""
        rounds = [
            {"year": 1, "dilution": 0.1},  # 0.9
            {"year": 2, "dilution": 0.2},  # 0.9 * 0.8 = 0.72
            {"year": 3, "dilution": 0.1},  # 0.72 * 0.9 = 0.648
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        factors = pipeline._yearly_factors
        assert factors[0] == 1.0
        assert np.isclose(factors[1], 0.9)
        assert np.isclose(factors[2], 0.72)
        assert np.isclose(factors[3], 0.648)
        assert np.isclose(factors[4], 0.648)


class TestBuild:
    """Tests for build() method."""

    def test_build_returns_dilution_result(self):
        """build() returns a DilutionResult instance."""
        result = (
            DilutionPipeline(years=range(5))
            .with_rounds([{"year": 2, "dilution": 0.2}])
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
            .build()
        )
        assert isinstance(result, DilutionResult)

    def test_build_calculates_total_dilution(self):
        """Total dilution is 1 - final yearly factor."""
        result = (
            DilutionPipeline(years=range(5))
            .with_rounds([{"year": 2, "dilution": 0.3}])
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
            .build()
        )
        # Final factor = 0.7, total dilution = 0.3
        assert np.isclose(result.total_dilution, 0.3)

    def test_build_includes_historical_factor(self):
        """Result includes historical factor from apply_historical."""
        rounds = [{"year": -1, "dilution": 0.2}]
        result = (
            DilutionPipeline(years=range(3))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
            .build()
        )
        assert result.historical_factor == 0.8

    def test_build_without_apply_future_rounds(self):
        """build() without apply_future_rounds returns ones array."""
        result = (
            DilutionPipeline(years=range(3))
            .with_rounds([])
            .classify()
            .build()
        )
        assert np.allclose(result.yearly_factors, [1.0, 1.0, 1.0])
        assert result.total_dilution == 0.0

    def test_build_empty_years(self):
        """build() with empty years returns zero total dilution."""
        result = (
            DilutionPipeline(years=range(0))
            .with_rounds([])
            .classify()
            .build()
        )
        assert len(result.yearly_factors) == 0
        assert result.total_dilution == 0.0


class TestCalculateDilutionSchedule:
    """Tests for calculate_dilution_schedule convenience function."""

    def test_simulated_dilution_shortcut(self):
        """Simulated dilution bypasses round calculation."""
        result = calculate_dilution_schedule(
            years=range(5),
            simulated_dilution=0.4,
        )
        assert result.total_dilution == 0.4
        assert np.allclose(result.yearly_factors, [0.6] * 5)

    def test_rounds_processed(self):
        """Rounds are classified and processed correctly."""
        rounds = [
            {"year": -1, "dilution": 0.1},  # Historical
            {"year": 2, "dilution": 0.2},   # Future
        ]
        result = calculate_dilution_schedule(
            years=range(4),
            rounds=rounds,
        )
        # Historical: 0.9, Future at year 2: 0.9 * 0.8 = 0.72
        assert np.isclose(result.yearly_factors[0], 0.9)
        assert np.isclose(result.yearly_factors[1], 0.9)
        assert np.isclose(result.yearly_factors[2], 0.72)
        assert np.isclose(result.total_dilution, 0.28)

    def test_empty_rounds(self):
        """Empty rounds list returns no dilution."""
        result = calculate_dilution_schedule(
            years=range(3),
            rounds=[],
        )
        assert np.allclose(result.yearly_factors, [1.0, 1.0, 1.0])
        assert result.total_dilution == 0.0

    def test_none_rounds(self):
        """None rounds returns no dilution."""
        result = calculate_dilution_schedule(
            years=range(3),
            rounds=None,
        )
        assert np.allclose(result.yearly_factors, [1.0, 1.0, 1.0])

    def test_simulated_takes_precedence(self):
        """Simulated dilution takes precedence over rounds."""
        rounds = [{"year": 1, "dilution": 0.3}]
        result = calculate_dilution_schedule(
            years=range(3),
            rounds=rounds,
            simulated_dilution=0.5,
        )
        # Simulated wins, so we get 0.5 uniform dilution
        assert result.total_dilution == 0.5
        assert np.allclose(result.yearly_factors, [0.5, 0.5, 0.5])

    def test_pandas_index(self):
        """Works with pandas Index."""
        result = calculate_dilution_schedule(
            years=pd.RangeIndex(start=0, stop=3),
            rounds=[{"year": 1, "dilution": 0.2}],
        )
        assert len(result.yearly_factors) == 3
