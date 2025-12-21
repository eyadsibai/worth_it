"""Tests for the dilution engine fluent pipeline."""

import numpy as np
import pandas as pd
import pytest

from worth_it.calculations.dilution_engine import DilutionPipeline, DilutionResult


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
