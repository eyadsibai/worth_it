"""
Tests for the ConversionPipeline fluent pattern.

These tests verify the fluent pipeline implementation while
convert_instruments tests in test_calculations.py verify backward compatibility.
"""

from __future__ import annotations

import pytest

from worth_it.calculations.conversion_engine import (
    ConversionPipeline,
    ConversionResult,
    convert_instruments,
)


class TestConversionResult:
    """Tests for ConversionResult dataclass."""

    def test_result_is_immutable(self):
        """ConversionResult should be frozen (immutable)."""
        result = ConversionResult(
            updated_cap_table={"stakeholders": [], "total_shares": 1000},
            converted_instruments=[],
            summary={"instruments_converted": 0},
        )
        with pytest.raises(AttributeError):
            result.summary = {"instruments_converted": 5}


class TestConversionPipeline:
    """Tests for ConversionPipeline fluent API."""

    @pytest.fixture
    def simple_cap_table(self):
        """Cap table with founders only."""
        return {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 8_000_000,
                    "ownership_pct": 80.0,
                    "share_class": "common",
                },
                {
                    "id": "employee-pool",
                    "name": "Employee Pool",
                    "type": "pool",
                    "shares": 2_000_000,
                    "ownership_pct": 20.0,
                    "share_class": "common",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 20,
        }

    @pytest.fixture
    def priced_round(self):
        """Series A priced round."""
        return {
            "price_per_share": 1.0,
            "date": "2024-06-01",
        }

    @pytest.fixture
    def safe_instrument(self):
        """Single SAFE note."""
        return [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Angel Investor",
                "investment_amount": 500_000,
                "valuation_cap": 5_000_000,
                "discount_pct": 20,
                "status": "outstanding",
            }
        ]

    @pytest.fixture
    def convertible_note(self):
        """Single convertible note with interest."""
        return [
            {
                "id": "note-1",
                "type": "CONVERTIBLE_NOTE",
                "investor_name": "Seed Fund",
                "principal_amount": 100_000,
                "valuation_cap": 4_000_000,
                "discount_pct": None,
                "interest_rate": 5,
                "interest_type": "simple",
                "date": "2024-01-01",
                "maturity_months": 12,
                "status": "outstanding",
            }
        ]

    def test_pipeline_is_immutable(self, simple_cap_table, priced_round):
        """Pipeline should be frozen (immutable)."""
        pipeline = ConversionPipeline(
            cap_table=simple_cap_table,
            priced_round=priced_round,
        )
        with pytest.raises(AttributeError):
            pipeline.priced_round = {"price_per_share": 2.0}

    def test_pipeline_methods_return_new_instance(
        self, simple_cap_table, priced_round, safe_instrument
    ):
        """Each method should return a new pipeline instance."""
        pipeline1 = ConversionPipeline(
            cap_table=simple_cap_table,
            priced_round=priced_round,
        )
        pipeline2 = pipeline1.with_instruments(safe_instrument)

        assert pipeline1 is not pipeline2
        assert pipeline1.instruments == []
        assert pipeline2.instruments == safe_instrument

    def test_pipeline_chaining(self, simple_cap_table, priced_round, safe_instrument):
        """Pipeline methods should be chainable."""
        result = (
            ConversionPipeline(cap_table=simple_cap_table, priced_round=priced_round)
            .with_instruments(safe_instrument)
            .filter_outstanding()
            .calculate_conversions()
            .create_stakeholders()
            .recalculate_ownership()
            .build()
        )

        assert isinstance(result, ConversionResult)
        assert result.summary["instruments_converted"] == 1

    def test_filter_outstanding_excludes_converted(self, simple_cap_table, priced_round):
        """filter_outstanding should exclude already-converted instruments."""
        instruments = [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Investor A",
                "investment_amount": 100_000,
                "valuation_cap": 5_000_000,
                "discount_pct": 20,
                "status": "outstanding",
            },
            {
                "id": "safe-2",
                "type": "SAFE",
                "investor_name": "Investor B",
                "investment_amount": 100_000,
                "valuation_cap": 5_000_000,
                "discount_pct": 20,
                "status": "converted",  # Already converted
            },
        ]

        pipeline = (
            ConversionPipeline(cap_table=simple_cap_table, priced_round=priced_round)
            .with_instruments(instruments)
            .filter_outstanding()
        )

        assert len(pipeline._outstanding) == 1
        assert pipeline._outstanding[0]["investor_name"] == "Investor A"

    def test_calculate_conversions_uses_cap_price(
        self, simple_cap_table, priced_round, safe_instrument
    ):
        """Should use cap-based price when it's better for investor."""
        pipeline = (
            ConversionPipeline(cap_table=simple_cap_table, priced_round=priced_round)
            .with_instruments(safe_instrument)
            .filter_outstanding()
            .calculate_conversions()
        )

        assert len(pipeline._conversions) == 1
        # Cap price: $5M / 10M shares = $0.50
        # Discount price: $1.00 * 0.80 = $0.80
        # Cap wins (lower = better for investor)
        assert pipeline._conversions[0]["conversion_price"] == pytest.approx(0.5)
        assert pipeline._conversions[0]["price_source"] == "cap"


class TestConversionConvenienceFunction:
    """Tests for the convert_instruments convenience wrapper."""

    @pytest.fixture
    def simple_cap_table(self):
        return {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 8_000_000,
                    "ownership_pct": 80.0,
                    "share_class": "common",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 10,
        }

    @pytest.fixture
    def priced_round(self):
        return {
            "price_per_share": 1.0,
            "date": "2024-06-01",
        }

    def test_convenience_function_returns_dict(self, simple_cap_table, priced_round):
        """convert_instruments should return a dict for backward compatibility."""
        instruments = [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Angel",
                "investment_amount": 100_000,
                "valuation_cap": 5_000_000,
                "discount_pct": 20,
                "status": "outstanding",
            }
        ]

        result = convert_instruments(
            cap_table=simple_cap_table,
            instruments=instruments,
            priced_round=priced_round,
        )

        assert isinstance(result, dict)
        assert "updated_cap_table" in result
        assert "converted_instruments" in result
        assert "summary" in result

    def test_safe_conversion_creates_stakeholder(self, simple_cap_table, priced_round):
        """SAFE conversion should create a new preferred stakeholder."""
        instruments = [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Angel Investor",
                "investment_amount": 500_000,
                "valuation_cap": 5_000_000,
                "discount_pct": 20,
                "status": "outstanding",
            }
        ]

        result = convert_instruments(
            cap_table=simple_cap_table,
            instruments=instruments,
            priced_round=priced_round,
        )

        stakeholders = result["updated_cap_table"]["stakeholders"]
        angel = next(s for s in stakeholders if s["name"] == "Angel Investor")

        assert angel["share_class"] == "preferred"
        assert angel["type"] == "investor"
        # $500K / $0.50 per share = 1,000,000 shares
        assert angel["shares"] == 1_000_000

    def test_note_conversion_includes_interest(self, simple_cap_table, priced_round):
        """Convertible note should include accrued interest in conversion."""
        instruments = [
            {
                "id": "note-1",
                "type": "CONVERTIBLE_NOTE",
                "investor_name": "Seed Fund",
                "principal_amount": 100_000,
                "valuation_cap": 4_000_000,
                "discount_pct": None,
                "interest_rate": 6,  # 6% annual
                "interest_type": "simple",
                "date": "2024-01-01",
                "status": "outstanding",
            }
        ]

        result = convert_instruments(
            cap_table=simple_cap_table,
            instruments=instruments,
            priced_round={"price_per_share": 1.0, "date": "2024-07-01"},  # 6 months later
        )

        converted = result["converted_instruments"][0]
        # 6 months of 6% simple interest: $100K * 0.06 * 0.5 = $3K
        # Conversion amount should be ~$103K (actual is slightly different due to day counting)
        assert converted["investment_amount"] > 100_000
        assert converted["accrued_interest"] is not None
        assert converted["accrued_interest"] > 0
