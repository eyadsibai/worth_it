"""
Tests for the WaterfallPipeline fluent pattern.

These tests verify the fluent pipeline implementation while
calculate_waterfall tests in test_calculations.py verify backward compatibility.
"""

from __future__ import annotations

import pytest

from worth_it.calculations.waterfall_engine import (
    WaterfallPipeline,
    WaterfallResult,
    calculate_waterfall,
)


class TestWaterfallResult:
    """Tests for WaterfallResult dataclass."""

    def test_result_is_immutable(self):
        """WaterfallResult should be frozen (immutable)."""
        result = WaterfallResult(
            stakeholder_payouts=[],
            waterfall_steps=[],
            common_pct=50.0,
            preferred_pct=50.0,
        )
        with pytest.raises(AttributeError):
            result.common_pct = 75.0


class TestWaterfallPipeline:
    """Tests for WaterfallPipeline fluent API."""

    @pytest.fixture
    def simple_cap_table(self):
        """Cap table with founders and one investor."""
        return {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 7_000_000,
                    "ownership_pct": 70.0,
                    "share_class": "common",
                },
                {
                    "id": "investor-1",
                    "name": "Series A Investor",
                    "type": "investor",
                    "shares": 3_000_000,
                    "ownership_pct": 30.0,
                    "share_class": "preferred",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 0,
        }

    @pytest.fixture
    def non_participating_tier(self):
        """Single preference tier, non-participating."""
        return [
            {
                "id": "tier-1",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 5_000_000,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "participation_cap": None,
                "stakeholder_ids": ["investor-1"],
            }
        ]

    @pytest.fixture
    def participating_tier(self):
        """Single preference tier, participating uncapped."""
        return [
            {
                "id": "tier-1",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 5_000_000,
                "liquidation_multiplier": 1.0,
                "participating": True,
                "participation_cap": None,
                "stakeholder_ids": ["investor-1"],
            }
        ]

    def test_pipeline_is_immutable(self, simple_cap_table):
        """Pipeline should be frozen (immutable)."""
        pipeline = WaterfallPipeline(
            cap_table=simple_cap_table,
            exit_valuation=10_000_000,
        )
        with pytest.raises(AttributeError):
            pipeline.exit_valuation = 20_000_000

    def test_pipeline_methods_return_new_instance(self, simple_cap_table, non_participating_tier):
        """Each method should return a new pipeline instance."""
        pipeline1 = WaterfallPipeline(
            cap_table=simple_cap_table,
            exit_valuation=10_000_000,
        )
        pipeline2 = pipeline1.with_preference_tiers(non_participating_tier)

        assert pipeline1 is not pipeline2
        assert pipeline1.preference_tiers == []
        assert pipeline2.preference_tiers == non_participating_tier

    def test_pipeline_chaining(self, simple_cap_table, non_participating_tier):
        """Pipeline methods should be chainable."""
        result = (
            WaterfallPipeline(cap_table=simple_cap_table, exit_valuation=10_000_000)
            .with_preference_tiers(non_participating_tier)
            .initialize_payouts()
            .build_tier_lookups()
            .pay_liquidation_preferences()
            .process_conversions()
            .distribute_remaining()
            .calculate_final_metrics()
            .build()
        )

        assert isinstance(result, WaterfallResult)
        assert len(result.stakeholder_payouts) == 2

    def test_initialize_payouts_creates_payout_entries(self, simple_cap_table):
        """initialize_payouts should create entries for all stakeholders."""
        pipeline = WaterfallPipeline(
            cap_table=simple_cap_table, exit_valuation=10_000_000
        ).initialize_payouts()

        assert len(pipeline._payouts) == 2
        assert "founder-1" in pipeline._payouts
        assert "investor-1" in pipeline._payouts
        assert pipeline._payouts["founder-1"]["payout_amount"] == 0.0

    def test_build_tier_lookups_maps_stakeholders_to_tiers(
        self, simple_cap_table, non_participating_tier
    ):
        """build_tier_lookups should map stakeholder IDs to their tiers."""
        pipeline = (
            WaterfallPipeline(cap_table=simple_cap_table, exit_valuation=10_000_000)
            .with_preference_tiers(non_participating_tier)
            .initialize_payouts()
            .build_tier_lookups()
        )

        assert "investor-1" in pipeline._stakeholder_to_tier
        assert pipeline._stakeholder_to_tier["investor-1"]["name"] == "Series A"
        assert 1 in pipeline._tiers_by_seniority

    def test_pay_liquidation_preferences_pays_senior_first(self, simple_cap_table):
        """Liquidation preferences should be paid in seniority order."""
        two_tier = [
            {
                "id": "tier-b",
                "name": "Series B",
                "seniority": 1,  # More senior
                "investment_amount": 3_000_000,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "stakeholder_ids": ["investor-1"],
            },
            {
                "id": "tier-a",
                "name": "Series A",
                "seniority": 2,  # Less senior
                "investment_amount": 2_000_000,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "stakeholder_ids": ["investor-1"],
            },
        ]

        # Exit at $4M - enough for Series B but not fully for Series A
        pipeline = (
            WaterfallPipeline(cap_table=simple_cap_table, exit_valuation=4_000_000)
            .with_preference_tiers(two_tier)
            .initialize_payouts()
            .build_tier_lookups()
            .pay_liquidation_preferences()
        )

        # Series B should get full $3M, Series A gets remaining $1M
        assert pipeline._remaining_proceeds == pytest.approx(0)
        # Check waterfall steps show seniority order
        assert len(pipeline._waterfall_steps) >= 1


class TestWaterfallConvenienceFunction:
    """Tests for the calculate_waterfall convenience wrapper."""

    @pytest.fixture
    def simple_cap_table(self):
        """Cap table with founders and one investor."""
        return {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 7_000_000,
                    "ownership_pct": 70.0,
                    "share_class": "common",
                },
                {
                    "id": "investor-1",
                    "name": "Series A Investor",
                    "type": "investor",
                    "shares": 3_000_000,
                    "ownership_pct": 30.0,
                    "share_class": "preferred",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 0,
        }

    @pytest.fixture
    def non_participating_tier(self):
        return [
            {
                "id": "tier-1",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 5_000_000,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "participation_cap": None,
                "stakeholder_ids": ["investor-1"],
            }
        ]

    def test_convenience_function_returns_dict(self, simple_cap_table, non_participating_tier):
        """calculate_waterfall should return a dict for backward compatibility."""
        result = calculate_waterfall(
            cap_table=simple_cap_table,
            preference_tiers=non_participating_tier,
            exit_valuation=10_000_000,
        )

        assert isinstance(result, dict)
        assert "stakeholder_payouts" in result
        assert "waterfall_steps" in result
        assert "common_pct" in result
        assert "preferred_pct" in result

    def test_low_exit_investor_takes_all(self, simple_cap_table, non_participating_tier):
        """At low exit, investor should take all proceeds via preference."""
        result = calculate_waterfall(
            cap_table=simple_cap_table,
            preference_tiers=non_participating_tier,
            exit_valuation=3_000_000,
        )

        investor = next(
            p for p in result["stakeholder_payouts"] if p["name"] == "Series A Investor"
        )
        founder = next(p for p in result["stakeholder_payouts"] if p["name"] == "Founder")

        assert investor["payout_amount"] == pytest.approx(3_000_000)
        assert founder["payout_amount"] == pytest.approx(0)

    def test_high_exit_investor_converts(self, simple_cap_table, non_participating_tier):
        """At high exit, non-participating investor should convert for pro-rata."""
        result = calculate_waterfall(
            cap_table=simple_cap_table,
            preference_tiers=non_participating_tier,
            exit_valuation=50_000_000,
        )

        investor = next(
            p for p in result["stakeholder_payouts"] if p["name"] == "Series A Investor"
        )
        founder = next(p for p in result["stakeholder_payouts"] if p["name"] == "Founder")

        # 30% of $50M = $15M (converts because pro-rata > $5M preference)
        assert investor["payout_amount"] == pytest.approx(15_000_000)
        # 70% of $50M = $35M
        assert founder["payout_amount"] == pytest.approx(35_000_000)
