"""Tests for the dilution engine fluent pipeline."""

import numpy as np
import pytest

from worth_it.calculations.dilution_engine import DilutionResult


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
