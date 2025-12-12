"""
Cap table service for business logic orchestration.

This service encapsulates the business logic for cap table management,
including SAFE/Note conversions and waterfall analysis.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from worth_it.calculations import (
    calculate_dilution_from_valuation,
    calculate_waterfall,
    convert_instruments,
)


@dataclass
class ConversionResult:
    """Result of a cap table conversion."""

    updated_cap_table: dict[str, Any]
    converted_instruments: list[dict[str, Any]]
    summary: dict[str, Any]


@dataclass
class WaterfallStep:
    """A single step in the waterfall distribution."""

    step_number: int
    description: str
    amount: float
    recipients: list[str]
    remaining_proceeds: float


@dataclass
class StakeholderPayout:
    """Payout details for a single stakeholder."""

    stakeholder_id: str
    name: str
    payout_amount: float
    payout_pct: float
    investment_amount: float | None = None
    roi: float | None = None


@dataclass
class WaterfallDistribution:
    """Waterfall distribution for a single exit valuation."""

    exit_valuation: float
    waterfall_steps: list[WaterfallStep]
    stakeholder_payouts: list[StakeholderPayout]
    common_pct: float
    preferred_pct: float


@dataclass
class WaterfallResult:
    """Result of a waterfall analysis across multiple exit valuations."""

    distributions_by_valuation: list[WaterfallDistribution]
    breakeven_points: dict[str, float] = field(default_factory=dict)


class CapTableService:
    """
    Service for cap table and waterfall calculations.

    This service orchestrates cap table operations including:
    - SAFE and Convertible Note conversions
    - Dilution calculations
    - Waterfall analysis for exit proceeds distribution

    Example:
        service = CapTableService()
        result = service.convert_instruments(
            cap_table={...},
            instruments=[...],
            priced_round={...}
        )
    """

    def calculate_dilution(
        self,
        pre_money_valuation: float,
        amount_raised: float,
    ) -> float:
        """
        Calculate dilution percentage from a funding round.

        Args:
            pre_money_valuation: Company valuation before investment
            amount_raised: Investment amount

        Returns:
            Dilution as a decimal (e.g., 0.20 for 20%)
        """
        return calculate_dilution_from_valuation(pre_money_valuation, amount_raised)

    def convert_instruments(
        self,
        cap_table: dict[str, Any],
        instruments: list[dict[str, Any]],
        priced_round: dict[str, Any],
    ) -> ConversionResult:
        """
        Convert SAFEs and Convertible Notes to equity.

        Args:
            cap_table: Current cap table with stakeholders
            instruments: List of SAFE/Note instruments to convert
            priced_round: Priced round triggering conversion

        Returns:
            ConversionResult with updated cap table and conversion details
        """
        result = convert_instruments(
            cap_table=cap_table,
            instruments=instruments,
            priced_round=priced_round,
        )

        return ConversionResult(
            updated_cap_table=result["updated_cap_table"],
            converted_instruments=result["converted_instruments"],
            summary=result["summary"],
        )

    def calculate_waterfall(
        self,
        cap_table: dict[str, Any],
        preference_tiers: list[dict[str, Any]],
        exit_valuations: list[float],
    ) -> WaterfallResult:
        """
        Calculate exit proceeds distribution using waterfall analysis.

        Performs waterfall analysis for multiple exit valuations, showing
        how proceeds are distributed respecting liquidation preferences.

        Args:
            cap_table: Cap table with stakeholders
            preference_tiers: List of preference tiers with seniority
            exit_valuations: List of exit valuations to analyze

        Returns:
            WaterfallResult with distributions and breakeven points
        """
        distributions: list[WaterfallDistribution] = []
        breakeven_points: dict[str, float] = {}

        for exit_val in exit_valuations:
            result = calculate_waterfall(
                cap_table=cap_table,
                preference_tiers=preference_tiers,
                exit_valuation=exit_val,
            )

            # Build waterfall steps
            waterfall_steps = [
                WaterfallStep(
                    step_number=s["step_number"],
                    description=s["description"],
                    amount=s["amount"],
                    recipients=s["recipients"],
                    remaining_proceeds=s["remaining_proceeds"],
                )
                for s in result["waterfall_steps"]
            ]

            # Build stakeholder payouts
            stakeholder_payouts = [
                StakeholderPayout(
                    stakeholder_id=p["stakeholder_id"],
                    name=p["name"],
                    payout_amount=p["payout_amount"],
                    payout_pct=p["payout_pct"],
                    investment_amount=p.get("investment_amount"),
                    roi=p.get("roi"),
                )
                for p in result["stakeholder_payouts"]
            ]

            distributions.append(
                WaterfallDistribution(
                    exit_valuation=exit_val,
                    waterfall_steps=waterfall_steps,
                    stakeholder_payouts=stakeholder_payouts,
                    common_pct=result["common_pct"],
                    preferred_pct=result["preferred_pct"],
                )
            )

            # Track breakeven points (first valuation where stakeholder gets money)
            for payout in result["stakeholder_payouts"]:
                name = payout["name"]
                if name not in breakeven_points and payout["payout_amount"] > 0:
                    breakeven_points[name] = exit_val

        return WaterfallResult(
            distributions_by_valuation=distributions,
            breakeven_points=breakeven_points,
        )
