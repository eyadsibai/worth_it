"""
Waterfall analysis calculation functions.

This module handles exit proceeds distribution calculations,
respecting liquidation preferences and participation rights.
"""

from __future__ import annotations

from typing import Any


def calculate_waterfall(
    cap_table: dict[str, Any],
    preference_tiers: list[dict[str, Any]],
    exit_valuation: float,
) -> dict[str, Any]:
    """
    Calculate exit proceeds distribution respecting liquidation preferences.

    This function implements a standard waterfall analysis:
    1. Sort preference tiers by seniority (1 = most senior, paid first)
    2. Pay liquidation preferences in order (senior first)
    3. Handle participating vs non-participating preferred
    4. Distribute remaining proceeds to common shareholders

    Args:
        cap_table: Cap table with stakeholders and total_shares
        preference_tiers: List of preference tier dictionaries with:
            - id: Unique tier identifier
            - name: Tier name (e.g., "Series B")
            - seniority: Priority (1 = most senior)
            - investment_amount: Total invested
            - liquidation_multiplier: 1x, 2x, etc.
            - participating: Whether preferred participates in remaining
            - participation_cap: Max return multiplier (e.g., 3.0 for 3x cap)
            - stakeholder_ids: Links to stakeholders in cap table
        exit_valuation: Total exit proceeds to distribute

    Returns:
        Dictionary with:
        - stakeholder_payouts: List of payout details per stakeholder
        - waterfall_steps: Step-by-step breakdown of distribution
        - common_pct: Percentage of proceeds to common
        - preferred_pct: Percentage of proceeds to preferred
    """
    stakeholders = cap_table.get("stakeholders", [])
    total_shares = cap_table.get("total_shares", 10_000_000)

    # Initialize payouts for all stakeholders
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

    # Build lookup: stakeholder_id -> tier info
    stakeholder_to_tier: dict[str, dict[str, Any]] = {}
    for tier in preference_tiers:
        for sid in tier.get("stakeholder_ids", []):
            stakeholder_to_tier[sid] = tier

    # Track waterfall steps
    waterfall_steps: list[dict[str, Any]] = []
    remaining_proceeds = exit_valuation
    step_number = 0

    # Sort tiers by seniority (1 = most senior, paid first)
    sorted_tiers = sorted(preference_tiers, key=lambda t: t["seniority"])

    # Group tiers by seniority for pari passu handling
    tiers_by_seniority: dict[int, list[dict[str, Any]]] = {}
    for tier in sorted_tiers:
        seniority = tier["seniority"]
        if seniority not in tiers_by_seniority:
            tiers_by_seniority[seniority] = []
        tiers_by_seniority[seniority].append(tier)

    # Track which tiers converted (for non-participating preferred)
    converted_tiers: set[str] = set()

    # Phase 1: Pay liquidation preferences in seniority order
    for seniority in sorted(tiers_by_seniority.keys()):
        tiers_at_level = tiers_by_seniority[seniority]

        # Calculate total preference at this seniority level
        total_preference_at_level = sum(
            t["investment_amount"] * t.get("liquidation_multiplier", 1.0)
            for t in tiers_at_level
        )

        if remaining_proceeds <= 0:
            break

        # Determine how much each tier gets
        if remaining_proceeds >= total_preference_at_level:
            # Enough to pay all preferences at this level
            for tier in tiers_at_level:
                preference = tier["investment_amount"] * tier.get("liquidation_multiplier", 1.0)

                # Distribute to stakeholders in this tier
                for sid in tier.get("stakeholder_ids", []):
                    payouts[sid]["payout_amount"] += preference
                    payouts[sid]["investment_amount"] = tier["investment_amount"]

                step_number += 1
                waterfall_steps.append({
                    "step_number": step_number,
                    "description": f"{tier['name']} liquidation preference ({tier.get('liquidation_multiplier', 1.0)}x)",
                    "amount": preference,
                    "recipients": [payouts[sid]["name"] for sid in tier.get("stakeholder_ids", [])],
                    "remaining_proceeds": remaining_proceeds - preference,
                })
                remaining_proceeds -= preference
        else:
            # Not enough - split proportionally (pari passu)
            for tier in tiers_at_level:
                preference = tier["investment_amount"] * tier.get("liquidation_multiplier", 1.0)
                share_of_remaining = (preference / total_preference_at_level) * remaining_proceeds

                for sid in tier.get("stakeholder_ids", []):
                    payouts[sid]["payout_amount"] += share_of_remaining
                    payouts[sid]["investment_amount"] = tier["investment_amount"]

                step_number += 1
                waterfall_steps.append({
                    "step_number": step_number,
                    "description": f"{tier['name']} liquidation preference (partial - pari passu)",
                    "amount": share_of_remaining,
                    "recipients": [payouts[sid]["name"] for sid in tier.get("stakeholder_ids", [])],
                    "remaining_proceeds": 0,
                })

            remaining_proceeds = 0

    # Phase 2: Handle participation and conversion decisions
    if remaining_proceeds > 0 and preference_tiers:
        # Calculate what each preferred tier would get if they convert to common
        # vs what they'd get from participation

        # First, calculate pro-rata shares for everyone
        common_shares = sum(
            s["shares"] for s in stakeholders
            if s["share_class"] == "common"
        )

        for tier in preference_tiers:
            tier_shares = sum(
                payouts[sid]["shares"] for sid in tier.get("stakeholder_ids", [])
            )
            tier_ownership = tier_shares / total_shares if total_shares > 0 else 0

            # What would they get from pro-rata conversion?
            pro_rata_value = tier_ownership * exit_valuation
            current_payout = sum(
                payouts[sid]["payout_amount"] for sid in tier.get("stakeholder_ids", [])
            )

            if not tier.get("participating", False):
                # Non-participating: choose preference OR convert (not both)
                if pro_rata_value > current_payout:
                    # Convert - give up preference, take pro-rata
                    converted_tiers.add(tier["id"])
                    # Reset their payout - they'll get pro-rata in common distribution
                    for sid in tier.get("stakeholder_ids", []):
                        # Add back their preference to remaining (they're giving it up)
                        remaining_proceeds += payouts[sid]["payout_amount"]
                        payouts[sid]["payout_amount"] = 0

        # Now distribute remaining proceeds
        # Converted preferred + common shareholders share pro-rata
        participating_shares = 0
        for tier in preference_tiers:
            if tier.get("participating", False) and tier["id"] not in converted_tiers:
                for sid in tier.get("stakeholder_ids", []):
                    participating_shares += payouts[sid]["shares"]

        # Calculate shares eligible for remaining distribution
        shares_for_remaining = common_shares
        for tier in preference_tiers:
            tier_shares = sum(payouts[sid]["shares"] for sid in tier.get("stakeholder_ids", []))
            if tier["id"] in converted_tiers:
                # Converted preferred participates as common
                shares_for_remaining += tier_shares
            elif tier.get("participating", False):
                # Participating preferred gets a share
                shares_for_remaining += tier_shares

        if shares_for_remaining > 0 and remaining_proceeds > 0:
            # First pass: calculate what capped participants can take
            # and track excess that goes to common
            capped_excess = 0.0
            capped_tier_ids: set[str] = set()

            for tier in preference_tiers:
                if tier.get("participating", False) and tier["id"] not in converted_tiers:
                    cap = tier.get("participation_cap")
                    if cap is not None:
                        tier_shares = sum(payouts[sid]["shares"] for sid in tier.get("stakeholder_ids", []))
                        share_pct = tier_shares / shares_for_remaining
                        would_receive = share_pct * remaining_proceeds

                        for sid in tier.get("stakeholder_ids", []):
                            max_payout = tier["investment_amount"] * cap
                            current = payouts[sid]["payout_amount"]
                            room_to_cap = max(0, max_payout - current)

                            if would_receive > room_to_cap:
                                capped_excess += would_receive - room_to_cap
                                capped_tier_ids.add(tier["id"])

            # Second pass: distribute remaining to eligible shareholders
            # Capped participants only get up to their cap, excess goes to common
            for s in stakeholders:
                sid = s["id"]
                stakeholder_tier = stakeholder_to_tier.get(sid)

                if stakeholder_tier is None:
                    # Common shareholder - gets their share plus excess from capped participants
                    share_pct = s["shares"] / shares_for_remaining
                    base_share = share_pct * remaining_proceeds

                    # Add proportion of capped excess (distributed among common only)
                    if capped_excess > 0:
                        common_share_of_total = s["shares"] / common_shares if common_shares > 0 else 0
                        base_share += common_share_of_total * capped_excess

                    payouts[sid]["payout_amount"] += base_share
                elif stakeholder_tier["id"] in converted_tiers:
                    # Converted preferred - gets pro-rata as common
                    share_pct = s["shares"] / shares_for_remaining
                    payouts[sid]["payout_amount"] = share_pct * exit_valuation
                elif stakeholder_tier.get("participating", False):
                    # Participating preferred - gets share of remaining, capped if applicable
                    share_pct = s["shares"] / shares_for_remaining
                    additional = share_pct * remaining_proceeds

                    # Apply participation cap if set
                    cap = stakeholder_tier.get("participation_cap")
                    if cap is not None:
                        max_payout = stakeholder_tier["investment_amount"] * cap
                        current = payouts[sid]["payout_amount"]
                        if current + additional > max_payout:
                            additional = max(0, max_payout - current)

                    payouts[sid]["payout_amount"] += additional

            # Add waterfall step for remaining distribution
            step_number += 1
            recipients = [
                payouts[sid]["name"] for sid in payouts
                if payouts[sid]["payout_amount"] > 0
            ]
            waterfall_steps.append({
                "step_number": step_number,
                "description": "Pro-rata distribution of remaining proceeds",
                "amount": remaining_proceeds,
                "recipients": recipients,
                "remaining_proceeds": 0,
            })

    elif remaining_proceeds > 0:
        # No preference tiers - distribute all to common pro-rata
        for s in stakeholders:
            sid = s["id"]
            share_pct = s["shares"] / total_shares if total_shares > 0 else 0
            payouts[sid]["payout_amount"] = share_pct * exit_valuation

        step_number += 1
        waterfall_steps.append({
            "step_number": step_number,
            "description": "Pro-rata distribution to common shareholders",
            "amount": exit_valuation,
            "recipients": [s["name"] for s in stakeholders],
            "remaining_proceeds": 0,
        })

    # Calculate final percentages and ROI
    total_payout = sum(p["payout_amount"] for p in payouts.values())
    common_total = 0.0
    preferred_total = 0.0

    for sid, payout in payouts.items():
        if total_payout > 0:
            payout["payout_pct"] = (payout["payout_amount"] / exit_valuation) * 100

        # Calculate ROI for investors
        if payout["investment_amount"] and payout["investment_amount"] > 0:
            payout["roi"] = payout["payout_amount"] / payout["investment_amount"]

        # Track common vs preferred totals
        payout_tier = stakeholder_to_tier.get(sid)
        if payout_tier is None or payout_tier["id"] in converted_tiers:
            common_total += payout["payout_amount"]
        else:
            preferred_total += payout["payout_amount"]

    # If all preferred converted, count as common
    if converted_tiers and len(converted_tiers) == len(preference_tiers):
        common_total = total_payout
        preferred_total = 0

    common_pct = (common_total / exit_valuation * 100) if exit_valuation > 0 else 0
    preferred_pct = (preferred_total / exit_valuation * 100) if exit_valuation > 0 else 0

    return {
        "stakeholder_payouts": list(payouts.values()),
        "waterfall_steps": waterfall_steps,
        "common_pct": common_pct,
        "preferred_pct": preferred_pct,
    }
