"""Tests for typed request payload models (Issue #248)."""

import pytest
from pydantic import ValidationError

from worth_it.models import VariableParam, SimParamRange


class TestVariableParam:
    """Tests for VariableParam enum."""

    def test_valid_param_values(self):
        """All expected parameter names are valid."""
        assert VariableParam.EXIT_VALUATION == "exit_valuation"
        assert VariableParam.EXIT_YEAR == "exit_year"
        assert VariableParam.FAILURE_PROBABILITY == "failure_probability"
        assert VariableParam.ANNUAL_ROI == "annual_roi"

    def test_param_is_string_enum(self):
        """VariableParam values are strings for JSON serialization."""
        assert isinstance(VariableParam.EXIT_VALUATION.value, str)


class TestSimParamRange:
    """Tests for SimParamRange model."""

    def test_valid_range(self):
        """Valid min <= max range is accepted."""
        r = SimParamRange(min=10.0, max=100.0)
        assert r.min == 10.0
        assert r.max == 100.0

    def test_equal_min_max(self):
        """min == max is valid (single value)."""
        r = SimParamRange(min=50.0, max=50.0)
        assert r.min == r.max == 50.0

    def test_invalid_range_min_greater_than_max(self):
        """min > max raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SimParamRange(min=100.0, max=10.0)
        assert "min" in str(exc_info.value).lower()
