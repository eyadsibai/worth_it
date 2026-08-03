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

from worth_it.exceptions import CalculationError

# Tolerances for the "never distribute more than the exit" invariant.
_ABSOLUTE_TOLERANCE = 1e-6
_RELATIVE_TOLERANCE = 1e-9

# Stands in for shares no stakeholder holds (an unallocated option pool). It dilutes
# every real holder, but its slice of the exit is not payable to anyone.
_POOL_KEY = "__unallocated_pool__"


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
    # Proceeds attributable to shares no stakeholder holds (an unallocated option
    # pool). Tracked so the distribution invariant can tell a deliberate gap from a leak.
    _unallocated_proceeds: float = 0.0

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
        """Build stakeholder-to-tier mappings and group by seniority.

        Raises:
            ValueError: If a tier references a stakeholder ID not in the cap table.
        """
        stakeholder_ids_in_cap_table = {s["id"] for s in self.cap_table.get("stakeholders", [])}
        stakeholder_to_tier: dict[str, dict[str, Any]] = {}
        for tier in self.preference_tiers:
            for sid in tier.get("stakeholder_ids", []):
                if sid not in stakeholder_ids_in_cap_table:
                    raise ValueError(
                        f"Stakeholder '{sid}' in tier '{tier.get('name', tier.get('id'))}' "
                        f"not found in cap table. Valid IDs: {stakeholder_ids_in_cap_table}"
                    )
                claimed_by = stakeholder_to_tier.get(sid)
                if claimed_by is not None and claimed_by["id"] != tier["id"]:
                    # A stakeholder carries a single share count, so there is no way to
                    # say how much of it backs each series. Guessing would quietly
                    # misprice the conversion decision, so the ambiguity is surfaced.
                    raise ValueError(
                        f"Stakeholder '{sid}' is claimed by both "
                        f"'{claimed_by.get('name', claimed_by['id'])}' and "
                        f"'{tier.get('name', tier['id'])}'. A stakeholder can hold only one "
                        f"preference tier. Model each preferred series the investor holds as "
                        f"its own cap table entry, splitting their shares between them."
                    )
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

    def _tier_weights(self, tier: dict[str, Any]) -> dict[str, float]:
        """How a tier's preference divides among its holders, keyed by stakeholder id.

        A tier's preference belongs to the tier as a whole, so it is split across the
        holders in proportion to the shares each brought to that tier. Holders the cap
        table does not contain are ignored; a tier whose holders all hold zero shares
        splits evenly, since there is no other basis available.
        """
        member_shares = {
            sid: float(self._payouts[sid]["shares"])
            for sid in tier.get("stakeholder_ids", [])
            if sid in self._payouts
        }
        if not member_shares:
            return {}

        total = sum(member_shares.values())
        if total <= 0:
            equal = 1.0 / len(member_shares)
            return dict.fromkeys(member_shares, equal)

        return {sid: shares / total for sid, shares in member_shares.items()}

    def _tier_preference(self, tier: dict[str, Any]) -> float:
        """Total liquidation preference owed to a tier."""
        return float(tier["investment_amount"]) * float(tier.get("liquidation_multiplier", 1.0))

    def _active_tiers(self) -> list[dict[str, Any]]:
        """Tiers that actually claim a stakeholder present in the cap table.

        A tier claiming nobody has no one to pay, so it must not consume proceeds.
        """
        return [tier for tier in self.preference_tiers if self._tier_weights(tier)]

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
            tiers_at_level = [
                tier for tier in self._tiers_by_seniority[seniority] if self._tier_weights(tier)
            ]
            if not tiers_at_level:
                continue

            total_preference_at_level = sum(self._tier_preference(t) for t in tiers_at_level)

            if remaining <= 0:
                break

            if remaining >= total_preference_at_level:
                # Full payment for all tiers at this level
                for tier in tiers_at_level:
                    preference = self._tier_preference(tier)
                    weights = self._tier_weights(tier)

                    for sid, weight in weights.items():
                        payout = dict(payouts[sid])
                        payout["payout_amount"] = payout["payout_amount"] + preference * weight
                        payout["investment_amount"] = tier["investment_amount"] * weight
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
                            "recipients": [payouts[sid]["name"] for sid in weights],
                            "remaining_proceeds": remaining - preference,
                        }
                    )
                    remaining -= preference
            else:
                # Pari passu distribution when insufficient
                for tier in tiers_at_level:
                    preference = self._tier_preference(tier)
                    share_of_remaining = (preference / total_preference_at_level) * remaining
                    weights = self._tier_weights(tier)

                    for sid, weight in weights.items():
                        payout = dict(payouts[sid])
                        payout["payout_amount"] = (
                            payout["payout_amount"] + share_of_remaining * weight
                        )
                        payout["investment_amount"] = tier["investment_amount"] * weight
                        payouts[sid] = payout

                    step_num += 1
                    steps.append(
                        {
                            "step_number": step_num,
                            "description": (
                                f"{tier['name']} liquidation preference (partial - pari passu)"
                            ),
                            "amount": share_of_remaining,
                            "recipients": [payouts[sid]["name"] for sid in weights],
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

    def _residual_shares_if_converted(self, converted: frozenset[str]) -> dict[str, float]:
        """Shares entitled to the residual, assuming `converted` tiers took common stock.

        Includes the unallocated option pool, which dilutes every real holder on this
        path exactly as it does when there are no preference tiers at all.
        """
        residual_shares: dict[str, float] = {}

        for s in self.cap_table.get("stakeholders", []):
            tier = self._stakeholder_to_tier.get(s["id"])
            participates = (
                tier is None or tier["id"] in converted or tier.get("participating", False)
            )
            if participates:
                residual_shares[s["id"]] = float(s["shares"])

        unallocated = self._unallocated_shares()
        if unallocated > 0:
            residual_shares[_POOL_KEY] = unallocated

        return residual_shares

    def _unallocated_shares(self) -> float:
        """Shares in the cap table that no stakeholder holds."""
        total_shares = float(self.cap_table.get("total_shares", 0) or 0)
        allocated = sum(float(s["shares"]) for s in self.cap_table.get("stakeholders", []))
        return max(0.0, total_shares - allocated)

    def _participation_caps(self, converted: frozenset[str]) -> dict[str, float]:
        """Ceiling on each holder's total payout, for holders in a capped tier.

        A participation cap limits the tier as a whole, so each holder's own ceiling is
        its share of the tier.
        """
        caps: dict[str, float] = {}

        for tier in self.preference_tiers:
            cap = tier.get("participation_cap")
            if cap is None or not tier.get("participating", False) or tier["id"] in converted:
                continue
            for sid, weight in self._tier_weights(tier).items():
                caps[sid] = float(tier["investment_amount"]) * cap * weight

        return caps

    def _allocate_residual(
        self,
        residual_shares: dict[str, float],
        pool: float,
        base_payouts: dict[str, float],
        caps: dict[str, float],
    ) -> dict[str, float]:
        """Split `pool` across residual holders, refilling until every cap saturates.

        Capping is iterative rather than single-pass: when a capped holder cannot take
        its full pro-rata slice, the excess is redivided among the holders that still
        have room, which may in turn push another holder to its own cap. A single pass
        would either strand the excess or hand it to the wrong holders.
        """
        allocations = dict.fromkeys(residual_shares, 0.0)
        active = {sid for sid, shares in residual_shares.items() if shares > 0}
        remaining_pool = pool

        while active and remaining_pool > _ABSOLUTE_TOLERANCE:
            active_shares = sum(residual_shares[sid] for sid in active)
            if active_shares <= 0:
                break

            saturated: list[tuple[str, float]] = []
            for sid in active:
                cap = caps.get(sid)
                if cap is None:
                    continue
                room = max(0.0, cap - base_payouts.get(sid, 0.0) - allocations[sid])
                if residual_shares[sid] / active_shares * remaining_pool > room:
                    saturated.append((sid, room))

            if not saturated:
                for sid in active:
                    allocations[sid] += residual_shares[sid] / active_shares * remaining_pool
                remaining_pool = 0.0
                break

            for sid, room in saturated:
                allocations[sid] += room
                remaining_pool -= room
                active.discard(sid)

        if remaining_pool > _ABSOLUTE_TOLERANCE:
            # Every residual holder hit its cap. The proceeds still belong to the
            # shareholders, so they follow ownership rather than disappearing.
            total_shares = sum(residual_shares.values())
            if total_shares > 0:
                for sid, shares in residual_shares.items():
                    allocations[sid] += shares / total_shares * remaining_pool

        return allocations

    def _as_converted_value(self, tier: dict[str, Any], converted: frozenset[str]) -> float:
        """What a tier would receive by converting, given which other tiers converted.

        Runs the same allocator `_distribute_with_preferences` uses, so a tier's decision
        and the payout it later receives are computed on identical arithmetic - including
        any spillover released by a capped tier saturating.
        """
        base_payouts: dict[str, float] = {}
        preferences_paid = 0.0
        for active in self._active_tiers():
            if active["id"] in converted:
                continue
            preference = self._tier_preference(active)
            preferences_paid += preference
            for sid, weight in self._tier_weights(active).items():
                base_payouts[sid] = base_payouts.get(sid, 0.0) + preference * weight

        residual = self.exit_valuation - preferences_paid
        if residual <= 0:
            return 0.0

        allocations = self._allocate_residual(
            self._residual_shares_if_converted(converted),
            residual,
            base_payouts,
            self._participation_caps(converted),
        )
        return sum(allocations.get(sid, 0.0) for sid in self._tier_weights(tier))

    def _solve_conversions(self) -> frozenset[str]:
        """Find which non-participating tiers are better off converting to common.

        Each tier's choice changes the residual pool and the shares dividing it, which
        changes what every other tier would get by converting. The choices are therefore
        solved to a fixed point rather than decided independently in one pass.
        """
        candidates = [t for t in self._active_tiers() if not t.get("participating", False)]
        if not candidates:
            return frozenset()

        converted: frozenset[str] = frozenset()
        for _ in range(len(candidates) + 1):
            updated = converted
            for candidate in candidates:
                tier_id = candidate["id"]
                trial = updated | {tier_id}
                converts = self._as_converted_value(candidate, trial) > self._tier_preference(
                    candidate
                )
                updated = trial if converts else updated - {tier_id}

            if updated == converted:
                break
            converted = updated

        return converted

    def process_conversions(self) -> WaterfallPipeline:
        """Handle non-participating preferred conversion decisions.

        Non-participating preferred can choose:
        - Take their liquidation preference OR
        - Convert to common and take pro-rata share

        They choose whichever is higher.
        """
        if self._remaining_proceeds <= 0 or not self.preference_tiers:
            return self

        converted_tiers = self._solve_conversions()
        if not converted_tiers:
            return self

        payouts = dict(self._payouts)
        remaining = self._remaining_proceeds

        for tier in self._active_tiers():
            if tier["id"] not in converted_tiers:
                continue
            # Converting forfeits the preference; the residual is their only source.
            for sid in self._tier_weights(tier):
                payout = dict(payouts[sid])
                remaining += payout["payout_amount"]
                payout["payout_amount"] = 0.0
                payouts[sid] = payout

        return dataclasses.replace(
            self,
            _payouts=payouts,
            _remaining_proceeds=remaining,
            _converted_tiers=converted_tiers,
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

        # Shares in an unallocated option pool dilute everyone but belong to no
        # stakeholder, so their slice of the exit is not payable to anyone here.
        allocated_shares = sum(s["shares"] for s in stakeholders)
        unallocated = max(0.0, float(total_shares) - allocated_shares)
        unallocated_proceeds = (
            unallocated / total_shares * self.exit_valuation if total_shares > 0 else 0.0
        )

        step_num += 1
        steps.append(
            {
                "step_number": step_num,
                "description": "Pro-rata distribution to common shareholders",
                "amount": self.exit_valuation - unallocated_proceeds,
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
            _unallocated_proceeds=unallocated_proceeds,
        )

    def _residual_share_counts(self) -> dict[str, float]:
        """Shares entitled to the residual distribution, keyed by stakeholder id.

        A stakeholder shares in the residual when it holds common stock, when its
        preference tier converted to common, or when its tier is participating.
        Preferred held by a stakeholder no tier claims carries no liquidation
        preference, so the residual is its only source of proceeds - it takes a
        pro-rata slice alongside common.
        """
        return self._residual_shares_if_converted(self._converted_tiers)

    def _distribute_with_preferences(self) -> WaterfallPipeline:
        """Distribute remaining with preference tier logic."""
        stakeholders = self.cap_table.get("stakeholders", [])
        payouts = dict(self._payouts)
        remaining = self._remaining_proceeds
        steps = list(self._waterfall_steps)
        step_num = self._step_number

        residual_shares = self._residual_share_counts()
        shares_for_remaining = sum(residual_shares.values())

        if shares_for_remaining <= 0 and remaining > 0:
            # Every holder took a preference and proceeds are still left over. There is
            # no residual class to receive them, so they follow ownership rather than
            # disappearing.
            residual_shares = {s["id"]: float(s["shares"]) for s in stakeholders if s["shares"] > 0}
            shares_for_remaining = sum(residual_shares.values())

        unallocated_proceeds = self._unallocated_proceeds

        if shares_for_remaining > 0 and remaining > 0:
            allocations = self._allocate_residual(
                residual_shares,
                remaining,
                {sid: payouts[sid]["payout_amount"] for sid in payouts},
                self._participation_caps(self._converted_tiers),
            )
            unallocated_proceeds += allocations.pop(_POOL_KEY, 0.0)

            for sid, additional in allocations.items():
                payout = dict(payouts[sid])
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
            _unallocated_proceeds=unallocated_proceeds,
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

    def _validate_total_distribution(self) -> None:
        """Enforce the core waterfall invariant: the exit is distributed exactly.

        Checking only the upper bound would let proceeds silently vanish, which is the
        more dangerous failure for a tool whose output is advice about money. Both
        directions are therefore enforced.

        Raises:
            CalculationError: If total payouts do not match the exit valuation.
        """
        if not self._payouts:
            return

        total_payout = sum(p["payout_amount"] for p in self._payouts.values())
        tolerance = _ABSOLUTE_TOLERANCE + abs(self.exit_valuation) * _RELATIVE_TOLERANCE
        distributable = self.exit_valuation - self._unallocated_proceeds

        if total_payout > self.exit_valuation + tolerance:
            raise CalculationError(
                f"Waterfall distributed {total_payout:,.2f}, which exceeds exit valuation "
                f"{self.exit_valuation:,.2f}. Check that cap table total_shares covers every "
                f"stakeholder and that preference tiers list their stakeholder_ids."
            )

        if total_payout < distributable - tolerance:
            raise CalculationError(
                f"Waterfall distributed {total_payout:,.2f} of the {distributable:,.2f} "
                f"payable from exit valuation {self.exit_valuation:,.2f}, leaving "
                f"{distributable - total_payout:,.2f} unassigned. Every payable dollar of "
                f"the exit must reach a stakeholder."
            )

    def build(self) -> WaterfallResult:
        """Finalize pipeline and return WaterfallResult.

        Raises:
            CalculationError: If total payouts exceed the exit valuation, or fall
                short of the amount payable from it. The message names the cap
                table field to correct and reaches the caller unchanged.
        """
        self._validate_total_distribution()

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
