"""
Waterfall analysis engine using fluent pipeline pattern.

This module provides a composable, immutable pipeline for calculating
exit proceeds distribution. It handles:
- Liquidation preferences by seniority (pari passu when tied)
- Non-participating preferred conversion decisions
- Participating preferred with optional caps
- Pro-rata distribution of remaining proceeds
"""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class WaterfallResult:
    """Immutable result from waterfall pipeline."""

    stakeholder_payouts: list[dict[str, Any]]
    waterfall_steps: list[dict[str, Any]]
    common_pct: float
    preferred_pct: float


@dataclass(frozen=True)
class WaterfallPipeline:
    """
    Fluent pipeline for calculating exit proceeds distribution.

    Each method returns a new immutable instance, allowing chaining.

    Usage:
        result = (
            WaterfallPipeline(cap_table=cap_table, exit_valuation=exit_valuation)
            .with_preference_tiers(tiers)
            .initialize_payouts()
            .build_tier_lookups()
            .pay_liquidation_preferences()
            .process_conversions()
            .distribute_remaining()
            .calculate_final_metrics()
            .build()
        )
    """

    cap_table: dict[str, Any]
    exit_valuation: float
    preference_tiers: list[dict[str, Any]] = field(default_factory=list)

    # Internal state (immutable via frozen dataclass)
    _payouts: dict[str, dict[str, Any]] = field(default_factory=dict)
    _stakeholder_to_tier: dict[str, dict[str, Any]] = field(default_factory=dict)
    _tiers_by_seniority: dict[int, list[dict[str, Any]]] = field(default_factory=dict)
    _remaining_proceeds: float = 0.0
    _waterfall_steps: list[dict[str, Any]] = field(default_factory=list)
    _converted_tiers: frozenset[str] = field(default_factory=frozenset)
    _step_number: int = 0
    _common_pct: float = 0.0
    _preferred_pct: float = 0.0

    def with_preference_tiers(self, tiers: list[dict[str, Any]] | None) -> WaterfallPipeline:
        """Set preference tiers for the waterfall."""
        return dataclasses.replace(self, preference_tiers=tiers or [])

    def initialize_payouts(self) -> WaterfallPipeline:
        """Initialize payout tracking for all stakeholders."""
        stakeholders = self.cap_table.get("stakeholders", [])
        payouts: dict[str, dict[str, Any]] = {}

        for s in stakeholders:
            payouts[s["id"]] = {
                "stakeholder_id": s["id"],
                "name": s["name"],
                "payout_amount": 0.0,
                "payout_pct": 0.0,
                "investment_amount": None,
                "roi": None,
                "shares": s["shares"],
                "share_class": s["share_class"],
            }

        return dataclasses.replace(
            self,
            _payouts=payouts,
            _remaining_proceeds=self.exit_valuation,
        )

    def build_tier_lookups(self) -> WaterfallPipeline:
        """Build stakeholder-to-tier mappings and group by seniority."""
        stakeholder_to_tier: dict[str, dict[str, Any]] = {}
        for tier in self.preference_tiers:
            for sid in tier.get("stakeholder_ids", []):
                stakeholder_to_tier[sid] = tier

        sorted_tiers = sorted(self.preference_tiers, key=lambda t: t["seniority"])
        tiers_by_seniority: dict[int, list[dict[str, Any]]] = {}
        for tier in sorted_tiers:
            seniority = tier["seniority"]
            if seniority not in tiers_by_seniority:
                tiers_by_seniority[seniority] = []
            tiers_by_seniority[seniority].append(tier)

        return dataclasses.replace(
            self,
            _stakeholder_to_tier=stakeholder_to_tier,
            _tiers_by_seniority=tiers_by_seniority,
        )

    def pay_liquidation_preferences(self) -> WaterfallPipeline:
        """Pay liquidation preferences in seniority order.

        Handles both full payment and pari passu (proportional) distribution
        when proceeds are insufficient for a seniority level.
        """
        payouts = dict(self._payouts)  # Shallow copy for mutation
        remaining = self._remaining_proceeds
        steps = list(self._waterfall_steps)
        step_num = self._step_number

        for seniority in sorted(self._tiers_by_seniority.keys()):
            tiers_at_level = self._tiers_by_seniority[seniority]

            total_preference_at_level = sum(
                t["investment_amount"] * t.get("liquidation_multiplier", 1.0)
                for t in tiers_at_level
            )

            if remaining <= 0:
                break

            if remaining >= total_preference_at_level:
                # Full payment for all tiers at this level
                for tier in tiers_at_level:
                    preference = tier["investment_amount"] * tier.get("liquidation_multiplier", 1.0)

                    for sid in tier.get("stakeholder_ids", []):
                        payout = dict(payouts[sid])
                        payout["payout_amount"] = payout["payout_amount"] + preference
                        payout["investment_amount"] = tier["investment_amount"]
                        payouts[sid] = payout

                    step_num += 1
                    steps.append(
                        {
                            "step_number": step_num,
                            "description": (
                                f"{tier['name']} liquidation preference "
                                f"({tier.get('liquidation_multiplier', 1.0)}x)"
                            ),
                            "amount": preference,
                            "recipients": [
                                payouts[sid]["name"] for sid in tier.get("stakeholder_ids", [])
                            ],
                            "remaining_proceeds": remaining - preference,
                        }
                    )
                    remaining -= preference
            else:
                # Pari passu distribution when insufficient
                for tier in tiers_at_level:
                    preference = tier["investment_amount"] * tier.get("liquidation_multiplier", 1.0)
                    share_of_remaining = (preference / total_preference_at_level) * remaining

                    for sid in tier.get("stakeholder_ids", []):
                        payout = dict(payouts[sid])
                        payout["payout_amount"] = payout["payout_amount"] + share_of_remaining
                        payout["investment_amount"] = tier["investment_amount"]
                        payouts[sid] = payout

                    step_num += 1
                    steps.append(
                        {
                            "step_number": step_num,
                            "description": (
                                f"{tier['name']} liquidation preference (partial - pari passu)"
                            ),
                            "amount": share_of_remaining,
                            "recipients": [
                                payouts[sid]["name"] for sid in tier.get("stakeholder_ids", [])
                            ],
                            "remaining_proceeds": 0,
                        }
                    )

                remaining = 0

        return dataclasses.replace(
            self,
            _payouts=payouts,
            _remaining_proceeds=remaining,
            _waterfall_steps=steps,
            _step_number=step_num,
        )

    def process_conversions(self) -> WaterfallPipeline:
        """Handle non-participating preferred conversion decisions.

        Non-participating preferred can choose:
        - Take their liquidation preference OR
        - Convert to common and take pro-rata share

        They choose whichever is higher.
        """
        if self._remaining_proceeds <= 0 or not self.preference_tiers:
            return self

        payouts = dict(self._payouts)
        remaining = self._remaining_proceeds
        total_shares = self.cap_table.get("total_shares", 10_000_000)
        converted_tiers: set[str] = set()

        for tier in self.preference_tiers:
            tier_shares = sum(payouts[sid]["shares"] for sid in tier.get("stakeholder_ids", []))
            tier_ownership = tier_shares / total_shares if total_shares > 0 else 0

            # What would they get from pro-rata conversion?
            pro_rata_value = tier_ownership * self.exit_valuation
            current_payout = sum(
                payouts[sid]["payout_amount"] for sid in tier.get("stakeholder_ids", [])
            )

            if not tier.get("participating", False):
                # Non-participating: choose preference OR convert (not both)
                if pro_rata_value > current_payout:
                    converted_tiers.add(tier["id"])
                    # Reset payout - they'll get pro-rata in distribution
                    for sid in tier.get("stakeholder_ids", []):
                        payout = dict(payouts[sid])
                        remaining += payout["payout_amount"]
                        payout["payout_amount"] = 0
                        payouts[sid] = payout

        return dataclasses.replace(
            self,
            _payouts=payouts,
            _remaining_proceeds=remaining,
            _converted_tiers=frozenset(converted_tiers),
        )

    def distribute_remaining(self) -> WaterfallPipeline:
        """Distribute remaining proceeds pro-rata.

        Handles:
        - Converted preferred participating as common
        - Participating preferred with optional caps
        - Common shareholders
        """
        if self._remaining_proceeds <= 0:
            return self._handle_no_remaining()

        if not self.preference_tiers:
            return self._distribute_common_only()

        return self._distribute_with_preferences()

    def _handle_no_remaining(self) -> WaterfallPipeline:
        """Handle case when no proceeds remain after preferences."""
        return self

    def _distribute_common_only(self) -> WaterfallPipeline:
        """Distribute all proceeds pro-rata when no preference tiers."""
        stakeholders = self.cap_table.get("stakeholders", [])
        total_shares = self.cap_table.get("total_shares", 10_000_000)
        payouts = dict(self._payouts)
        steps = list(self._waterfall_steps)
        step_num = self._step_number

        for s in stakeholders:
            sid = s["id"]
            share_pct = s["shares"] / total_shares if total_shares > 0 else 0
            payout = dict(payouts[sid])
            payout["payout_amount"] = share_pct * self.exit_valuation
            payouts[sid] = payout

        step_num += 1
        steps.append(
            {
                "step_number": step_num,
                "description": "Pro-rata distribution to common shareholders",
                "amount": self.exit_valuation,
                "recipients": [s["name"] for s in stakeholders],
                "remaining_proceeds": 0,
            }
        )

        return dataclasses.replace(
            self,
            _payouts=payouts,
            _waterfall_steps=steps,
            _step_number=step_num,
            _remaining_proceeds=0,
        )

    def _distribute_with_preferences(self) -> WaterfallPipeline:
        """Distribute remaining with preference tier logic."""
        stakeholders = self.cap_table.get("stakeholders", [])
        self.cap_table.get("total_shares", 10_000_000)
        payouts = dict(self._payouts)
        remaining = self._remaining_proceeds
        steps = list(self._waterfall_steps)
        step_num = self._step_number

        # Calculate common shares
        common_shares = sum(s["shares"] for s in stakeholders if s["share_class"] == "common")

        # Calculate shares eligible for remaining distribution
        shares_for_remaining = common_shares
        for tier in self.preference_tiers:
            tier_shares = sum(payouts[sid]["shares"] for sid in tier.get("stakeholder_ids", []))
            if tier["id"] in self._converted_tiers:
                shares_for_remaining += tier_shares
            elif tier.get("participating", False):
                shares_for_remaining += tier_shares

        if shares_for_remaining > 0 and remaining > 0:
            # First pass: calculate capped excess
            capped_excess = 0.0
            capped_tier_ids: set[str] = set()

            for tier in self.preference_tiers:
                if tier.get("participating", False) and tier["id"] not in self._converted_tiers:
                    cap = tier.get("participation_cap")
                    if cap is not None:
                        tier_shares = sum(
                            payouts[sid]["shares"] for sid in tier.get("stakeholder_ids", [])
                        )
                        share_pct = tier_shares / shares_for_remaining
                        would_receive = share_pct * remaining

                        for sid in tier.get("stakeholder_ids", []):
                            max_payout = tier["investment_amount"] * cap
                            current = payouts[sid]["payout_amount"]
                            room_to_cap = max(0, max_payout - current)

                            if would_receive > room_to_cap:
                                capped_excess += would_receive - room_to_cap
                                capped_tier_ids.add(tier["id"])

            # Second pass: distribute to eligible shareholders
            for s in stakeholders:
                sid = s["id"]
                stakeholder_tier = self._stakeholder_to_tier.get(sid)
                payout = dict(payouts[sid])

                if stakeholder_tier is None:
                    # Common shareholder
                    share_pct = s["shares"] / shares_for_remaining
                    base_share = share_pct * remaining

                    if capped_excess > 0:
                        common_share_of_total = (
                            s["shares"] / common_shares if common_shares > 0 else 0
                        )
                        base_share += common_share_of_total * capped_excess

                    payout["payout_amount"] = payout["payout_amount"] + base_share

                elif stakeholder_tier["id"] in self._converted_tiers:
                    # Converted preferred - gets pro-rata as common
                    share_pct = s["shares"] / shares_for_remaining
                    payout["payout_amount"] = share_pct * self.exit_valuation

                elif stakeholder_tier.get("participating", False):
                    # Participating preferred
                    share_pct = s["shares"] / shares_for_remaining
                    additional = share_pct * remaining

                    # Apply participation cap if set
                    cap = stakeholder_tier.get("participation_cap")
                    if cap is not None:
                        max_payout = stakeholder_tier["investment_amount"] * cap
                        current = payout["payout_amount"]
                        if current + additional > max_payout:
                            additional = max(0, max_payout - current)

                    payout["payout_amount"] = payout["payout_amount"] + additional

                payouts[sid] = payout

            step_num += 1
            recipients = [
                payouts[sid]["name"] for sid in payouts if payouts[sid]["payout_amount"] > 0
            ]
            steps.append(
                {
                    "step_number": step_num,
                    "description": "Pro-rata distribution of remaining proceeds",
                    "amount": remaining,
                    "recipients": recipients,
                    "remaining_proceeds": 0,
                }
            )

        return dataclasses.replace(
            self,
            _payouts=payouts,
            _waterfall_steps=steps,
            _step_number=step_num,
            _remaining_proceeds=0,
        )

    def calculate_final_metrics(self) -> WaterfallPipeline:
        """Calculate final percentages and ROI for all stakeholders."""
        payouts = dict(self._payouts)

        total_payout = sum(p["payout_amount"] for p in payouts.values())
        common_total = 0.0
        preferred_total = 0.0

        for sid, payout_data in payouts.items():
            payout = dict(payout_data)

            if total_payout > 0:
                payout["payout_pct"] = (payout["payout_amount"] / self.exit_valuation) * 100

            # Calculate ROI for investors
            if payout["investment_amount"] and payout["investment_amount"] > 0:
                payout["roi"] = payout["payout_amount"] / payout["investment_amount"]

            # Track common vs preferred totals
            payout_tier = self._stakeholder_to_tier.get(sid)
            if payout_tier is None or payout_tier["id"] in self._converted_tiers:
                common_total += payout["payout_amount"]
            else:
                preferred_total += payout["payout_amount"]

            payouts[sid] = payout

        # If all preferred converted, count as common
        if self._converted_tiers and len(self._converted_tiers) == len(self.preference_tiers):
            common_total = total_payout
            preferred_total = 0

        common_pct = (common_total / self.exit_valuation * 100) if self.exit_valuation > 0 else 0
        preferred_pct = (
            (preferred_total / self.exit_valuation * 100) if self.exit_valuation > 0 else 0
        )

        return dataclasses.replace(
            self,
            _payouts=payouts,
            _common_pct=common_pct,
            _preferred_pct=preferred_pct,
        )

    def build(self) -> WaterfallResult:
        """Finalize pipeline and return WaterfallResult."""
        return WaterfallResult(
            stakeholder_payouts=list(self._payouts.values()),
            waterfall_steps=list(self._waterfall_steps),
            common_pct=self._common_pct,
            preferred_pct=self._preferred_pct,
        )


def calculate_waterfall(
    cap_table: dict[str, Any],
    preference_tiers: list[dict[str, Any]],
    exit_valuation: float,
) -> dict[str, Any]:
    """
    Convenience wrapper for waterfall calculations.

    Provides a simple function API for the fluent pipeline. Use this
    when you don't need to inspect intermediate pipeline states.

    This function is backward-compatible with the original calculate_waterfall.

    Args:
        cap_table: Cap table with stakeholders and total_shares
        preference_tiers: List of preference tier dictionaries
        exit_valuation: Total exit proceeds to distribute

    Returns:
        Dictionary with stakeholder_payouts, waterfall_steps, common_pct, preferred_pct
    """
    result = (
        WaterfallPipeline(cap_table=cap_table, exit_valuation=exit_valuation)
        .with_preference_tiers(preference_tiers)
        .initialize_payouts()
        .build_tier_lookups()
        .pay_liquidation_preferences()
        .process_conversions()
        .distribute_remaining()
        .calculate_final_metrics()
        .build()
    )

    return {
        "stakeholder_payouts": result.stakeholder_payouts,
        "waterfall_steps": result.waterfall_steps,
        "common_pct": result.common_pct,
        "preferred_pct": result.preferred_pct,
    }
