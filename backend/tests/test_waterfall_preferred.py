"""Regression tests for preferred-share handling in the waterfall engine.

Covers preferred stakeholders that no preference tier claims, conversion of
non-participating preferred alongside a senior preference, participating
preferred, and the engine-level total-distribution invariant.
"""

from __future__ import annotations

from typing import Any

import pytest

from worth_it.calculations.waterfall_engine import calculate_waterfall
from worth_it.exceptions import CalculationError


def total_distributed(result: dict[str, Any]) -> float:
    """Sum of every stakeholder payout in a waterfall result."""
    return float(sum(p["payout_amount"] for p in result["stakeholder_payouts"]))


def payout_for(result: dict[str, Any], name: str) -> float:
    """Payout amount for the stakeholder with the given name."""
    return float(
        next(p["payout_amount"] for p in result["stakeholder_payouts"] if p["name"] == name)
    )


def assert_within_exit_valuation(result: dict[str, Any], exit_valuation: float) -> None:
    """Total payouts and reported percentages must stay inside the exit proceeds."""
    assert total_distributed(result) <= exit_valuation + 1.0
    assert result["common_pct"] <= 100.0
    assert result["preferred_pct"] <= 100.0


def assert_conserves_value(result: dict[str, Any], exit_valuation: float) -> None:
    """Every cent of the exit reaches a stakeholder - no over-payment and no leak."""
    assert total_distributed(result) == pytest.approx(exit_valuation)
    assert result["common_pct"] <= 100.0
    assert result["preferred_pct"] <= 100.0


def stakeholder(
    sid: str,
    name: str,
    shares: int,
    share_class: str = "common",
    stakeholder_type: str = "investor",
) -> dict[str, Any]:
    """Build a cap-table stakeholder entry."""
    return {
        "id": sid,
        "name": name,
        "type": stakeholder_type,
        "shares": shares,
        "ownership_pct": 0.0,
        "share_class": share_class,
    }


def cap_table_of(*stakeholders: dict[str, Any], total_shares: int = 10_000_000) -> dict[str, Any]:
    """Build a cap table around the given stakeholders."""
    return {
        "stakeholders": list(stakeholders),
        "total_shares": total_shares,
        "option_pool_pct": 0,
    }


def tier(
    tier_id: str,
    name: str,
    seniority: int,
    investment_amount: float,
    stakeholder_ids: list[str],
    *,
    participating: bool = False,
    participation_cap: float | None = None,
    liquidation_multiplier: float = 1.0,
) -> dict[str, Any]:
    """Build a preference tier."""
    return {
        "id": tier_id,
        "name": name,
        "seniority": seniority,
        "investment_amount": investment_amount,
        "liquidation_multiplier": liquidation_multiplier,
        "participating": participating,
        "participation_cap": participation_cap,
        "stakeholder_ids": stakeholder_ids,
    }


class TestUntieredPreferredStakeholder:
    """Preferred with no tier has no liquidation preference: it shares the residual."""

    def test_untiered_preferred_shares_residual_without_over_distributing(self):
        """A tier that claims nobody must not push the residual split above 100%."""
        cap_table = {
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
                    "id": "angel-1",
                    "name": "Angel",
                    "type": "investor",
                    "shares": 3_000_000,
                    "ownership_pct": 30.0,
                    "share_class": "preferred",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 0,
        }
        preference_tiers = [
            {
                "id": "tier-1",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 1_000_000,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "participation_cap": None,
                "stakeholder_ids": [],
            }
        ]

        result = calculate_waterfall(
            cap_table=cap_table,
            preference_tiers=preference_tiers,
            exit_valuation=10_000_000,
        )

        # A tier claiming nobody cannot consume proceeds: the whole exit is still
        # distributed, split 70/30 by shares.
        assert_conserves_value(result, 10_000_000)
        assert payout_for(result, "Founder") == pytest.approx(7_000_000)
        assert payout_for(result, "Angel") == pytest.approx(3_000_000)

    def test_untiered_preferred_alongside_converted_tier(self):
        """Untiered preferred dilutes the residual for common and converted preferred."""
        cap_table = {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 5_000_000,
                    "ownership_pct": 50.0,
                    "share_class": "common",
                },
                {
                    "id": "investor-a",
                    "name": "Series A Investor",
                    "type": "investor",
                    "shares": 3_000_000,
                    "ownership_pct": 30.0,
                    "share_class": "preferred",
                },
                {
                    "id": "angel-1",
                    "name": "Angel",
                    "type": "investor",
                    "shares": 2_000_000,
                    "ownership_pct": 20.0,
                    "share_class": "preferred",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 0,
        }
        preference_tiers = [
            {
                "id": "tier-a",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 3_000_000,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "participation_cap": None,
                "stakeholder_ids": ["investor-a"],
            }
        ]

        result = calculate_waterfall(
            cap_table=cap_table,
            preference_tiers=preference_tiers,
            exit_valuation=50_000_000,
        )

        assert_within_exit_valuation(result, 50_000_000)
        assert payout_for(result, "Founder") == pytest.approx(25_000_000)
        assert payout_for(result, "Series A Investor") == pytest.approx(15_000_000)
        assert payout_for(result, "Angel") == pytest.approx(10_000_000)
        assert total_distributed(result) == pytest.approx(50_000_000)


class TestConvertedTierDoesNotDoubleCountSeniorPreference:
    """Converted preferred is paid from the residual, not from the full exit value."""

    def test_conversion_with_senior_participating_tier(self):
        """A senior preference already consumed proceeds; the converter cannot re-spend them."""
        cap_table = {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 6_000_000,
                    "ownership_pct": 60.0,
                    "share_class": "common",
                },
                {
                    "id": "investor-a",
                    "name": "Series A Investor",
                    "type": "investor",
                    "shares": 2_000_000,
                    "ownership_pct": 20.0,
                    "share_class": "preferred",
                },
                {
                    "id": "investor-b",
                    "name": "Series B Investor",
                    "type": "investor",
                    "shares": 2_000_000,
                    "ownership_pct": 20.0,
                    "share_class": "preferred",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 0,
        }
        preference_tiers = [
            {
                "id": "tier-a",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 2_000_000,
                "liquidation_multiplier": 1.0,
                "participating": True,
                "participation_cap": None,
                "stakeholder_ids": ["investor-a"],
            },
            {
                "id": "tier-b",
                "name": "Series B",
                "seniority": 2,
                "investment_amount": 1_000_000,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "participation_cap": None,
                "stakeholder_ids": ["investor-b"],
            },
        ]

        result = calculate_waterfall(
            cap_table=cap_table,
            preference_tiers=preference_tiers,
            exit_valuation=50_000_000,
        )

        assert_within_exit_valuation(result, 50_000_000)
        # Series A keeps its $2M preference, so only $48M is left to split pro-rata.
        assert payout_for(result, "Founder") == pytest.approx(28_800_000)
        assert payout_for(result, "Series A Investor") == pytest.approx(11_600_000)
        assert payout_for(result, "Series B Investor") == pytest.approx(9_600_000)
        assert total_distributed(result) == pytest.approx(50_000_000)


class TestParticipatingTier:
    """Participating preferred takes its preference and then shares the residual."""

    def test_participating_uncapped_stays_within_exit_valuation(self):
        cap_table = {
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
        preference_tiers = [
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

        result = calculate_waterfall(
            cap_table=cap_table,
            preference_tiers=preference_tiers,
            exit_valuation=20_000_000,
        )

        assert_within_exit_valuation(result, 20_000_000)
        assert payout_for(result, "Series A Investor") == pytest.approx(9_500_000)
        assert payout_for(result, "Founder") == pytest.approx(10_500_000)
        assert total_distributed(result) == pytest.approx(20_000_000)

    def test_capped_participation_excess_with_untiered_preferred(self):
        """Excess above a participation cap flows to residual holders, not beyond the exit."""
        cap_table = {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 5_000_000,
                    "ownership_pct": 50.0,
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
                {
                    "id": "angel-1",
                    "name": "Angel",
                    "type": "investor",
                    "shares": 2_000_000,
                    "ownership_pct": 20.0,
                    "share_class": "preferred",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 0,
        }
        preference_tiers = [
            {
                "id": "tier-1",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 5_000_000,
                "liquidation_multiplier": 1.0,
                "participating": True,
                "participation_cap": 2.0,
                "stakeholder_ids": ["investor-1"],
            }
        ]

        result = calculate_waterfall(
            cap_table=cap_table,
            preference_tiers=preference_tiers,
            exit_valuation=50_000_000,
        )

        assert_within_exit_valuation(result, 50_000_000)
        assert payout_for(result, "Series A Investor") == pytest.approx(10_000_000)
        assert total_distributed(result) == pytest.approx(50_000_000)


class TestTotalDistributionInvariant:
    """The engine refuses to hand back more money than the exit produced."""

    def test_inconsistent_total_shares_raises_calculation_error(self):
        """total_shares below the shares actually issued would over-distribute."""
        cap_table = {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder A",
                    "type": "founder",
                    "shares": 6_000_000,
                    "ownership_pct": 60.0,
                    "share_class": "common",
                },
                {
                    "id": "founder-2",
                    "name": "Founder B",
                    "type": "founder",
                    "shares": 4_000_000,
                    "ownership_pct": 40.0,
                    "share_class": "common",
                },
            ],
            "total_shares": 1_000_000,
            "option_pool_pct": 0,
        }

        with pytest.raises(CalculationError, match="exceeds exit valuation"):
            calculate_waterfall(
                cap_table=cap_table,
                preference_tiers=[],
                exit_valuation=10_000_000,
            )

    def test_consistent_cap_table_does_not_trip_invariant(self):
        cap_table = {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder A",
                    "type": "founder",
                    "shares": 6_000_000,
                    "ownership_pct": 60.0,
                    "share_class": "common",
                },
                {
                    "id": "founder-2",
                    "name": "Founder B",
                    "type": "founder",
                    "shares": 4_000_000,
                    "ownership_pct": 40.0,
                    "share_class": "common",
                },
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 0,
        }

        result = calculate_waterfall(
            cap_table=cap_table,
            preference_tiers=[],
            exit_valuation=10_000_000,
        )

        assert total_distributed(result) == pytest.approx(10_000_000)


class TestStakeholderInTwoTiers:
    """One share count cannot back two series, so the ambiguity is rejected loudly."""

    def test_stakeholder_claimed_by_two_tiers_is_rejected(self):
        """Silently converting both tiers would under-pay the investor's preferences."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 6_000_000, "common", "founder"),
            stakeholder("fund-1", "Acme Fund", 4_000_000, "preferred"),
        )
        tiers = [
            tier("tier-a", "Series A", 1, 2_000_000, ["fund-1"]),
            tier("tier-b", "Series B", 2, 3_000_000, ["fund-1"]),
        ]

        with pytest.raises(ValueError, match="only one preference tier"):
            calculate_waterfall(
                cap_table=cap_table, preference_tiers=tiers, exit_valuation=10_000_000
            )

    def test_separate_entries_per_series_price_correctly(self):
        """The documented workaround produces the right answer."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 6_000_000, "common", "founder"),
            stakeholder("fund-a", "Acme Fund (Series A)", 1_600_000, "preferred"),
            stakeholder("fund-b", "Acme Fund (Series B)", 2_400_000, "preferred"),
        )
        tiers = [
            tier("tier-a", "Series A", 1, 2_000_000, ["fund-a"]),
            tier("tier-b", "Series B", 2, 3_000_000, ["fund-b"]),
        ]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=10_000_000
        )

        assert_conserves_value(result, 10_000_000)
        # The fund's two positions total $5M of preference, above their $4M as-converted
        # value, so neither converts and both are paid in full.
        combined = payout_for(result, "Acme Fund (Series A)") + payout_for(
            result, "Acme Fund (Series B)"
        )
        assert combined == pytest.approx(5_000_000)
        assert payout_for(result, "Founder") == pytest.approx(5_000_000)


class TestMultiStakeholderTier:
    """A tier's preference is shared by its holders, not paid to each of them."""

    def test_participating_tier_with_two_holders(self):
        """Two co-investors in one tier split the preference between them."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 6_000_000, "common", "founder"),
            stakeholder("fund-1", "Fund One", 2_000_000, "preferred"),
            stakeholder("fund-2", "Fund Two", 2_000_000, "preferred"),
        )
        tiers = [tier("tier-a", "Series A", 1, 4_000_000, ["fund-1", "fund-2"], participating=True)]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=10_000_000
        )

        # $4M preference split 50/50, then $6M residual split by shares 60/20/20.
        assert_conserves_value(result, 10_000_000)
        assert payout_for(result, "Fund One") == pytest.approx(2_000_000 + 1_200_000)
        assert payout_for(result, "Fund Two") == pytest.approx(2_000_000 + 1_200_000)
        assert payout_for(result, "Founder") == pytest.approx(3_600_000)

    def test_non_participating_tier_with_two_holders_at_low_exit(self):
        """The preference cannot exceed the exit just because a tier has two holders."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 6_000_000, "common", "founder"),
            stakeholder("fund-1", "Fund One", 2_000_000, "preferred"),
            stakeholder("fund-2", "Fund Two", 2_000_000, "preferred"),
        )
        tiers = [tier("tier-a", "Series A", 1, 4_000_000, ["fund-1", "fund-2"])]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=6_000_000
        )

        assert_conserves_value(result, 6_000_000)
        assert payout_for(result, "Fund One") == pytest.approx(2_000_000)
        assert payout_for(result, "Fund Two") == pytest.approx(2_000_000)
        assert payout_for(result, "Founder") == pytest.approx(2_000_000)

    def test_tier_with_three_holders_splits_pro_rata_by_shares(self):
        """An unequal three-way tier splits its preference by shares held."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 4_000_000, "common", "founder"),
            stakeholder("fund-1", "Fund One", 3_000_000, "preferred"),
            stakeholder("fund-2", "Fund Two", 2_000_000, "preferred"),
            stakeholder("fund-3", "Fund Three", 1_000_000, "preferred"),
        )
        tiers = [tier("tier-a", "Series A", 1, 6_000_000, ["fund-1", "fund-2", "fund-3"])]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=6_000_000
        )

        # Exit exactly equals the preference: 3:2:1 split, nothing left for common.
        assert_conserves_value(result, 6_000_000)
        assert payout_for(result, "Fund One") == pytest.approx(3_000_000)
        assert payout_for(result, "Fund Two") == pytest.approx(2_000_000)
        assert payout_for(result, "Fund Three") == pytest.approx(1_000_000)
        assert payout_for(result, "Founder") == pytest.approx(0)

    def test_capped_tier_with_two_holders(self):
        """A participation cap binds the tier as a whole, not each holder separately."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 6_000_000, "common", "founder"),
            stakeholder("fund-1", "Fund One", 2_000_000, "preferred"),
            stakeholder("fund-2", "Fund Two", 2_000_000, "preferred"),
        )
        tiers = [
            tier(
                "tier-a",
                "Series A",
                1,
                4_000_000,
                ["fund-1", "fund-2"],
                participating=True,
                participation_cap=2.0,
            )
        ]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=50_000_000
        )

        assert_conserves_value(result, 50_000_000)
        # The tier is capped at 2x its $4M investment.
        tier_total = payout_for(result, "Fund One") + payout_for(result, "Fund Two")
        assert tier_total == pytest.approx(8_000_000)
        assert payout_for(result, "Founder") == pytest.approx(42_000_000)


class TestEmptyTierConsumesNothing:
    """A tier that claims no stakeholder must not silently absorb proceeds."""

    def test_empty_tier_does_not_reduce_the_residual(self):
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 6_000_000, "common", "founder"),
            stakeholder("fund-1", "Fund One", 2_000_000, "preferred"),
            stakeholder("fund-2", "Fund Two", 2_000_000, "preferred"),
        )
        tiers = [tier("tier-a", "Series A", 1, 4_000_000, [])]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=10_000_000
        )

        assert_conserves_value(result, 10_000_000)
        assert payout_for(result, "Founder") == pytest.approx(6_000_000)
        assert payout_for(result, "Fund One") == pytest.approx(2_000_000)
        assert payout_for(result, "Fund Two") == pytest.approx(2_000_000)

    def test_empty_tier_larger_than_exit_does_not_zero_everyone(self):
        """An unassigned oversized tier must not report that nobody gets anything."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 7_000_000, "common", "founder"),
            stakeholder("angel-1", "Angel", 3_000_000, "preferred"),
        )
        tiers = [tier("tier-a", "Series A", 1, 12_000_000, [])]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=10_000_000
        )

        assert_conserves_value(result, 10_000_000)
        assert payout_for(result, "Founder") == pytest.approx(7_000_000)
        assert payout_for(result, "Angel") == pytest.approx(3_000_000)


class TestCappedParticipationSpillover:
    """Proceeds a capped tier cannot take must reach the other residual holders."""

    def test_capped_excess_reaches_converted_tier_when_no_common_exists(self):
        """With no common holder, the converted tier absorbs the capped tier's excess."""
        cap_table = cap_table_of(
            stakeholder("investor-a", "Series A Investor", 3_000_000, "preferred"),
            stakeholder("investor-b", "Series B Investor", 7_000_000, "preferred"),
        )
        tiers = [
            tier(
                "tier-a",
                "Series A",
                1,
                5_000_000,
                ["investor-a"],
                participating=True,
                participation_cap=2.0,
            ),
            tier("tier-b", "Series B", 2, 1_000_000, ["investor-b"]),
        ]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=50_000_000
        )

        # Series A is capped at 2x $5M; every remaining dollar must reach Series B.
        assert_conserves_value(result, 50_000_000)
        assert payout_for(result, "Series A Investor") == pytest.approx(10_000_000)
        assert payout_for(result, "Series B Investor") == pytest.approx(40_000_000)


class TestCappedParticipationSaturates:
    """Capping is iterative: excess refills the holders that still have room."""

    def test_capped_tier_saturates_and_the_rest_flows_on(self):
        """A capped seed tier stops at its cap while later rounds absorb the growth."""
        cap_table = cap_table_of(
            stakeholder("seed-1", "Seed", 3_000_000, "preferred"),
            stakeholder("b-1", "Series B", 7_000_000, "preferred"),
        )
        tiers = [
            tier(
                "tier-seed",
                "Seed",
                1,
                5_000_000,
                ["seed-1"],
                participating=True,
                participation_cap=2.0,
            ),
            tier("tier-b", "Series B", 2, 1_000_000, ["b-1"]),
        ]

        for exit_valuation in (20_000_000, 50_000_000, 120_000_000, 400_000_000):
            result = calculate_waterfall(
                cap_table=cap_table, preference_tiers=tiers, exit_valuation=exit_valuation
            )
            assert_conserves_value(result, exit_valuation)
            # 2x on a $5M investment is the ceiling, however large the exit.
            assert payout_for(result, "Seed") <= 10_000_000 + 1.0

    def test_every_residual_holder_capped_still_conserves(self):
        """When all caps saturate the leftover follows ownership rather than vanishing."""
        cap_table = cap_table_of(
            stakeholder("a-1", "Fund A", 5_000_000, "preferred"),
            stakeholder("b-1", "Fund B", 5_000_000, "preferred"),
        )
        tiers = [
            tier("tier-a", "A", 1, 1_000_000, ["a-1"], participating=True, participation_cap=2.0),
            tier("tier-b", "B", 1, 1_000_000, ["b-1"], participating=True, participation_cap=2.0),
        ]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=100_000_000
        )

        assert_conserves_value(result, 100_000_000)

    def test_capped_holder_with_headroom_shares_the_spillover(self):
        """A tier under its own cap must not be excluded from another tier's excess."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 5_000_000, "common", "founder"),
            stakeholder("a-1", "Capped Big", 3_000_000, "preferred"),
            stakeholder("b-1", "Capped Small", 2_000_000, "preferred"),
        )
        tiers = [
            tier("tier-a", "A", 1, 2_000_000, ["a-1"], participating=True, participation_cap=2.0),
            tier("tier-b", "B", 2, 8_000_000, ["b-1"], participating=True, participation_cap=5.0),
        ]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=60_000_000
        )

        assert_conserves_value(result, 60_000_000)
        assert payout_for(result, "Capped Big") == pytest.approx(4_000_000)
        # Tier B is far from its $40M ceiling, so it shares tier A's excess.
        assert payout_for(result, "Capped Small") > 8_000_000


class TestNonParticipatingNeverBelowPreference:
    """Non-participating preferred receives max(preference, as-converted) - never less."""

    def test_junior_tier_is_not_worse_off_for_converting(self):
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 6_000_000, "common", "founder"),
            stakeholder("investor-a", "Investor A", 2_000_000, "preferred"),
            stakeholder("investor-b", "Investor B", 2_000_000, "preferred"),
        )
        tiers = [
            tier("tier-a", "Senior", 1, 20_000_000, ["investor-a"]),
            tier("tier-b", "Junior", 2, 9_000_000, ["investor-b"]),
        ]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=50_000_000
        )

        assert_conserves_value(result, 50_000_000)
        # Investor B must never take home less than the $9M preference it gave up.
        assert payout_for(result, "Investor B") >= 9_000_000 - 1.0

    def test_conversion_still_chosen_when_genuinely_better(self):
        """The floor must not suppress a conversion that really is worth more."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 5_000_000, "common", "founder"),
            stakeholder("investor-a", "Investor A", 5_000_000, "preferred"),
        )
        tiers = [tier("tier-a", "Series A", 1, 1_000_000, ["investor-a"])]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=100_000_000
        )

        assert_conserves_value(result, 100_000_000)
        assert payout_for(result, "Investor A") == pytest.approx(50_000_000)


class TestValueConservation:
    """Whenever anyone shares the residual, the whole exit must be distributed."""

    def test_down_exit_distributes_everything_to_the_preference(self):
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 8_000_000, "common", "founder"),
            stakeholder("investor-a", "Investor A", 2_000_000, "preferred"),
        )
        tiers = [tier("tier-a", "Series A", 1, 10_000_000, ["investor-a"])]

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=4_000_000
        )

        assert_conserves_value(result, 4_000_000)
        assert payout_for(result, "Investor A") == pytest.approx(4_000_000)
        assert payout_for(result, "Founder") == pytest.approx(0)

    def test_stacked_tiers_conserve_value(self):
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 5_000_000, "common", "founder"),
            stakeholder("seed-1", "Seed Fund", 2_000_000, "preferred"),
            stakeholder("a-1", "Series A Fund", 2_000_000, "preferred"),
            stakeholder("b-1", "Series B Fund", 1_000_000, "preferred"),
        )
        tiers = [
            tier("tier-seed", "Seed", 1, 1_000_000, ["seed-1"], participating=True),
            tier("tier-a", "Series A", 2, 5_000_000, ["a-1"]),
            tier(
                "tier-b",
                "Series B",
                3,
                3_000_000,
                ["b-1"],
                participating=True,
                participation_cap=3.0,
            ),
        ]

        for exit_valuation in (2_000_000, 9_000_000, 25_000_000, 200_000_000):
            result = calculate_waterfall(
                cap_table=cap_table, preference_tiers=tiers, exit_valuation=exit_valuation
            )
            assert_conserves_value(result, exit_valuation)

    def test_unallocated_option_pool_is_not_a_leak(self):
        """Shares held by nobody dilute everyone, and their slice is not payable."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 6_000_000, "common", "founder"),
            stakeholder("investor-1", "Investor", 2_000_000, "preferred"),
            total_shares=10_000_000,
        )

        result = calculate_waterfall(
            cap_table=cap_table, preference_tiers=[], exit_valuation=10_000_000
        )

        # 2M shares sit in an unallocated pool, so only 80% of the exit is payable.
        assert payout_for(result, "Founder") == pytest.approx(6_000_000)
        assert payout_for(result, "Investor") == pytest.approx(2_000_000)
        assert total_distributed(result) == pytest.approx(8_000_000)

    def test_unallocated_pool_is_withheld_identically_with_and_without_tiers(self):
        """Adding a preference tier must not change what the option pool absorbs."""
        cap_table = cap_table_of(
            stakeholder("founder-1", "Founder", 6_000_000, "common", "founder"),
            stakeholder("investor-1", "Investor", 2_000_000, "preferred"),
            total_shares=10_000_000,
        )
        tiers = [tier("tier-a", "Series A", 1, 1_000_000, ["investor-1"])]

        without_tiers = calculate_waterfall(
            cap_table=cap_table, preference_tiers=[], exit_valuation=10_000_000
        )
        with_tiers = calculate_waterfall(
            cap_table=cap_table, preference_tiers=tiers, exit_valuation=10_000_000
        )

        assert total_distributed(with_tiers) == pytest.approx(total_distributed(without_tiers))
        assert payout_for(with_tiers, "Founder") == pytest.approx(
            payout_for(without_tiers, "Founder")
        )
        assert total_distributed(with_tiers) == pytest.approx(8_000_000)
