"""Tests for dilution preview calculations.

TDD: Writing tests first before implementation.
"""

from __future__ import annotations

import pytest

from worth_it.calculations.dilution import (
    calculate_dilution_preview,
)


class TestCalculateDilutionPreview:
    """Test cases for calculate_dilution_preview function."""

    def test_basic_dilution_two_founders(self) -> None:
        """Test basic dilution with two founders raising a round."""
        stakeholders = [
            {"name": "Founder A", "type": "founder", "ownership_pct": 60.0},
            {"name": "Founder B", "type": "founder", "ownership_pct": 30.0},
        ]
        option_pool_pct = 10.0
        pre_money_valuation = 10_000_000
        amount_raised = 2_500_000
        investor_name = "Series A Investor"

        result = calculate_dilution_preview(
            stakeholders=stakeholders,
            option_pool_pct=option_pool_pct,
            pre_money_valuation=pre_money_valuation,
            amount_raised=amount_raised,
            investor_name=investor_name,
        )

        # Post-money = 10M + 2.5M = 12.5M
        # Dilution factor = 10M / 12.5M = 0.8
        # New investor gets 2.5M / 12.5M = 20%
        assert result["post_money_valuation"] == 12_500_000
        assert result["dilution_factor"] == pytest.approx(0.8)

        # Check dilution results
        dilution_results = result["dilution_results"]
        assert len(dilution_results) == 4  # 2 founders + option pool + new investor

        # Founder A: 60% * 0.8 = 48%
        founder_a = next(d for d in dilution_results if d["name"] == "Founder A")
        assert founder_a["before_pct"] == 60.0
        assert founder_a["after_pct"] == pytest.approx(48.0)
        assert founder_a["dilution_pct"] == pytest.approx(-20.0)
        assert founder_a["is_new"] is False

        # Founder B: 30% * 0.8 = 24%
        founder_b = next(d for d in dilution_results if d["name"] == "Founder B")
        assert founder_b["before_pct"] == 30.0
        assert founder_b["after_pct"] == pytest.approx(24.0)
        assert founder_b["dilution_pct"] == pytest.approx(-20.0)
        assert founder_b["is_new"] is False

        # Option Pool: 10% * 0.8 = 8%
        option_pool = next(d for d in dilution_results if d["type"] == "option_pool")
        assert option_pool["before_pct"] == 10.0
        assert option_pool["after_pct"] == pytest.approx(8.0)
        assert option_pool["dilution_pct"] == pytest.approx(-20.0)
        assert option_pool["is_new"] is False

        # New Investor: 0% -> 20%
        new_investor = next(d for d in dilution_results if d["type"] == "new_investor")
        assert new_investor["name"] == "Series A Investor"
        assert new_investor["before_pct"] == 0.0
        assert new_investor["after_pct"] == pytest.approx(20.0)
        assert new_investor["dilution_pct"] == 0.0
        assert new_investor["is_new"] is True

    def test_no_option_pool(self) -> None:
        """Test dilution when there's no option pool."""
        stakeholders = [
            {"name": "Solo Founder", "type": "founder", "ownership_pct": 100.0},
        ]

        result = calculate_dilution_preview(
            stakeholders=stakeholders,
            option_pool_pct=0.0,
            pre_money_valuation=5_000_000,
            amount_raised=1_000_000,
            investor_name="Angel",
        )

        # Post-money = 6M, dilution factor = 5/6 = 0.8333...
        assert result["post_money_valuation"] == 6_000_000
        assert result["dilution_factor"] == pytest.approx(5 / 6)

        dilution_results = result["dilution_results"]
        # Should only have founder + new investor (no option pool since it's 0)
        assert len(dilution_results) == 2

        # Verify no option_pool entry
        types = [d["type"] for d in dilution_results]
        assert "option_pool" not in types

    def test_empty_stakeholders(self) -> None:
        """Test dilution with no existing stakeholders."""
        result = calculate_dilution_preview(
            stakeholders=[],
            option_pool_pct=10.0,
            pre_money_valuation=1_000_000,
            amount_raised=250_000,
            investor_name="Seed Investor",
        )

        # Post-money = 1.25M
        assert result["post_money_valuation"] == 1_250_000
        assert result["dilution_factor"] == pytest.approx(0.8)

        dilution_results = result["dilution_results"]
        # Option pool + new investor
        assert len(dilution_results) == 2

    def test_default_investor_name(self) -> None:
        """Test that default investor name is used when not provided."""
        result = calculate_dilution_preview(
            stakeholders=[{"name": "Founder", "type": "founder", "ownership_pct": 90.0}],
            option_pool_pct=10.0,
            pre_money_valuation=1_000_000,
            amount_raised=100_000,
        )

        new_investor = next(d for d in result["dilution_results"] if d["is_new"])
        assert new_investor["name"] == "New Investor"

    def test_various_stakeholder_types(self) -> None:
        """Test dilution with different stakeholder types."""
        stakeholders = [
            {"name": "CEO", "type": "founder", "ownership_pct": 40.0},
            {"name": "CTO", "type": "founder", "ownership_pct": 30.0},
            {"name": "Early Employee", "type": "employee", "ownership_pct": 5.0},
            {"name": "Advisor", "type": "advisor", "ownership_pct": 2.0},
            {"name": "Seed Investor", "type": "investor", "ownership_pct": 13.0},
        ]
        option_pool_pct = 10.0  # Total = 100%

        result = calculate_dilution_preview(
            stakeholders=stakeholders,
            option_pool_pct=option_pool_pct,
            pre_money_valuation=20_000_000,
            amount_raised=5_000_000,
            investor_name="Series A Lead",
        )

        # Post-money = 25M, dilution factor = 0.8
        assert result["dilution_factor"] == pytest.approx(0.8)

        # All stakeholders should be diluted by 20%
        dilution_results = result["dilution_results"]
        for d in dilution_results:
            if not d["is_new"]:
                assert d["dilution_pct"] == pytest.approx(-20.0)

    def test_large_round_50_percent_dilution(self) -> None:
        """Test a large funding round causing 50% dilution."""
        result = calculate_dilution_preview(
            stakeholders=[{"name": "Founder", "type": "founder", "ownership_pct": 100.0}],
            option_pool_pct=0.0,
            pre_money_valuation=10_000_000,
            amount_raised=10_000_000,  # Equal to pre-money = 50% dilution
            investor_name="Mega Fund",
        )

        # Post-money = 20M, dilution factor = 0.5
        assert result["post_money_valuation"] == 20_000_000
        assert result["dilution_factor"] == pytest.approx(0.5)

        founder = next(d for d in result["dilution_results"] if d["name"] == "Founder")
        assert founder["after_pct"] == pytest.approx(50.0)
        assert founder["dilution_pct"] == pytest.approx(-50.0)

        investor = next(d for d in result["dilution_results"] if d["is_new"])
        assert investor["after_pct"] == pytest.approx(50.0)

    def test_small_round_minimal_dilution(self) -> None:
        """Test a small funding round with minimal dilution."""
        result = calculate_dilution_preview(
            stakeholders=[{"name": "Founder", "type": "founder", "ownership_pct": 100.0}],
            option_pool_pct=0.0,
            pre_money_valuation=100_000_000,
            amount_raised=1_000_000,  # 1% dilution
            investor_name="Small Check",
        )

        # Post-money = 101M, dilution factor = 100/101 ≈ 0.99
        assert result["post_money_valuation"] == 101_000_000
        assert result["dilution_factor"] == pytest.approx(100 / 101)

        founder = next(d for d in result["dilution_results"] if d["name"] == "Founder")
        expected_after = 100 * (100 / 101)
        assert founder["after_pct"] == pytest.approx(expected_after)

    def test_invalid_pre_money_valuation_raises_error(self) -> None:
        """Test that zero or negative pre-money valuation raises ValueError."""
        with pytest.raises(ValueError, match="pre_money_valuation must be positive"):
            calculate_dilution_preview(
                stakeholders=[],
                option_pool_pct=0.0,
                pre_money_valuation=0,
                amount_raised=1_000_000,
            )

        with pytest.raises(ValueError, match="pre_money_valuation must be positive"):
            calculate_dilution_preview(
                stakeholders=[],
                option_pool_pct=0.0,
                pre_money_valuation=-5_000_000,
                amount_raised=1_000_000,
            )

    def test_invalid_amount_raised_raises_error(self) -> None:
        """Test that zero or negative amount raised raises ValueError."""
        with pytest.raises(ValueError, match="amount_raised must be positive"):
            calculate_dilution_preview(
                stakeholders=[],
                option_pool_pct=0.0,
                pre_money_valuation=10_000_000,
                amount_raised=0,
            )

        with pytest.raises(ValueError, match="amount_raised must be positive"):
            calculate_dilution_preview(
                stakeholders=[],
                option_pool_pct=0.0,
                pre_money_valuation=10_000_000,
                amount_raised=-1_000_000,
            )

    def test_preserves_stakeholder_type(self) -> None:
        """Test that each stakeholder's type is preserved in results."""
        stakeholders = [
            {"name": "F1", "type": "founder", "ownership_pct": 50.0},
            {"name": "E1", "type": "employee", "ownership_pct": 10.0},
            {"name": "I1", "type": "investor", "ownership_pct": 30.0},
            {"name": "A1", "type": "advisor", "ownership_pct": 5.0},
        ]

        result = calculate_dilution_preview(
            stakeholders=stakeholders,
            option_pool_pct=5.0,
            pre_money_valuation=10_000_000,
            amount_raised=2_500_000,
        )

        # Check each type is preserved
        f1 = next(d for d in result["dilution_results"] if d["name"] == "F1")
        assert f1["type"] == "founder"

        e1 = next(d for d in result["dilution_results"] if d["name"] == "E1")
        assert e1["type"] == "employee"

        i1 = next(d for d in result["dilution_results"] if d["name"] == "I1")
        assert i1["type"] == "investor"

        a1 = next(d for d in result["dilution_results"] if d["name"] == "A1")
        assert a1["type"] == "advisor"

    def test_result_types_match_dilution_party(self) -> None:
        """Test that result types conform to DilutionParty TypedDict."""
        result = calculate_dilution_preview(
            stakeholders=[{"name": "Test", "type": "founder", "ownership_pct": 90.0}],
            option_pool_pct=10.0,
            pre_money_valuation=1_000_000,
            amount_raised=250_000,
        )

        for item in result["dilution_results"]:
            # Verify all required keys exist
            assert "name" in item
            assert "type" in item
            assert "before_pct" in item
            assert "after_pct" in item
            assert "dilution_pct" in item
            assert "is_new" in item

            # Verify types
            assert isinstance(item["name"], str)
            assert isinstance(item["type"], str)
            assert isinstance(item["before_pct"], int | float)
            assert isinstance(item["after_pct"], int | float)
            assert isinstance(item["dilution_pct"], int | float)
            assert isinstance(item["is_new"], bool)
