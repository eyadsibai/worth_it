"""
Instrument conversion engine using fluent pipeline pattern.

This module provides a composable, immutable pipeline for converting
SAFEs and Convertible Notes to equity. It handles:
- Filtering outstanding instruments
- Interest calculation for notes
- Conversion price determination (cap vs discount)
- Stakeholder creation and ownership recalculation
"""

from __future__ import annotations

import dataclasses
import uuid
from dataclasses import dataclass, field
from typing import Any

from worth_it.calculations.cap_table import (
    calculate_conversion_price,
    calculate_interest,
    calculate_months_between_dates,
)


@dataclass(frozen=True)
class ConversionResult:
    """Immutable result from conversion pipeline."""

    updated_cap_table: dict[str, Any]
    converted_instruments: list[dict[str, Any]]
    summary: dict[str, Any]


@dataclass(frozen=True)
class ConversionPipeline:
    """
    Fluent pipeline for converting SAFEs and Convertible Notes to equity.

    Each method returns a new immutable instance, allowing chaining.

    Usage:
        result = (
            ConversionPipeline(cap_table=cap_table, priced_round=priced_round)
            .with_instruments(instruments)
            .filter_outstanding()
            .calculate_conversions()
            .create_stakeholders()
            .recalculate_ownership()
            .build()
        )
    """

    cap_table: dict[str, Any]
    priced_round: dict[str, Any]
    instruments: list[dict[str, Any]] = field(default_factory=list)

    # Internal state
    _outstanding: list[dict[str, Any]] = field(default_factory=list)
    _conversions: list[dict[str, Any]] = field(default_factory=list)
    _new_stakeholders: list[dict[str, Any]] = field(default_factory=list)
    _total_new_shares: int = 0

    def with_instruments(self, instruments: list[dict[str, Any]] | None) -> ConversionPipeline:
        """Set instruments to convert."""
        return dataclasses.replace(self, instruments=instruments or [])

    def filter_outstanding(self) -> ConversionPipeline:
        """Filter to only outstanding (not yet converted) instruments."""
        outstanding = [inst for inst in self.instruments if inst.get("status") == "outstanding"]
        return dataclasses.replace(self, _outstanding=outstanding)

    def calculate_conversions(self) -> ConversionPipeline:
        """Calculate conversion details for each outstanding instrument.

        For each instrument:
        - Determine conversion amount (principal + interest for notes)
        - Calculate conversion price using cap vs discount rule
        - Calculate shares to be issued
        """
        total_shares = self.cap_table.get("total_shares", 10_000_000)
        round_price = self.priced_round["price_per_share"]
        round_date = self.priced_round.get("date")

        conversions: list[dict[str, Any]] = []
        total_new_shares = 0

        for instrument in self._outstanding:
            instrument_type = instrument.get("type")
            investor_name = instrument["investor_name"]
            instrument_id = instrument["id"]

            # Calculate conversion amount
            if instrument_type == "CONVERTIBLE_NOTE":
                principal = instrument["principal_amount"]
                interest_rate = instrument.get("interest_rate", 0)
                interest_type = instrument.get("interest_type", "simple")
                note_date = instrument.get("date")

                # Calculate months elapsed
                if note_date and round_date:
                    months_elapsed = calculate_months_between_dates(note_date, round_date)
                else:
                    months_elapsed = instrument.get("maturity_months", 12)

                accrued_interest = calculate_interest(
                    principal, interest_rate, months_elapsed, interest_type
                )
                conversion_amount = principal + accrued_interest
            else:
                # SAFE - no interest
                conversion_amount = instrument["investment_amount"]
                accrued_interest = None

            # Calculate conversion price
            valuation_cap = instrument.get("valuation_cap")
            discount_pct = instrument.get("discount_pct")

            conversion_price, price_source = calculate_conversion_price(
                valuation_cap=valuation_cap,
                discount_pct=discount_pct,
                round_price_per_share=round_price,
                pre_conversion_shares=total_shares,
            )

            # Calculate shares issued
            shares_issued = int(conversion_amount / conversion_price)
            total_new_shares += shares_issued

            conversions.append(
                {
                    "instrument_id": instrument_id,
                    "instrument_type": instrument_type,
                    "investor_name": investor_name,
                    "investment_amount": conversion_amount,
                    "conversion_price": conversion_price,
                    "price_source": price_source,
                    "shares_issued": shares_issued,
                    "ownership_pct": 0,  # Calculated later
                    "accrued_interest": accrued_interest,
                }
            )

        return dataclasses.replace(
            self,
            _conversions=conversions,
            _total_new_shares=total_new_shares,
        )

    def create_stakeholders(self) -> ConversionPipeline:
        """Create new stakeholder entries for converted instruments."""
        new_stakeholders: list[dict[str, Any]] = []

        for conversion in self._conversions:
            new_stakeholder = {
                "id": str(uuid.uuid4()),
                "name": conversion["investor_name"],
                "type": "investor",
                "shares": conversion["shares_issued"],
                "ownership_pct": 0,  # Calculated in recalculate_ownership
                "share_class": "preferred",
                "vesting": None,
            }
            new_stakeholders.append(new_stakeholder)

        return dataclasses.replace(self, _new_stakeholders=new_stakeholders)

    def recalculate_ownership(self) -> ConversionPipeline:
        """Recalculate ownership percentages for all stakeholders."""
        # This is a read-only operation on pipeline state
        # Actual recalculation happens in build()
        return self

    def build(self) -> ConversionResult:
        """Finalize pipeline and return ConversionResult."""
        # Build updated stakeholders list
        existing_stakeholders = list(self.cap_table.get("stakeholders", []))
        all_stakeholders = existing_stakeholders + self._new_stakeholders

        # Calculate new total shares
        total_shares = self.cap_table.get("total_shares", 10_000_000)
        new_total_shares = total_shares + self._total_new_shares
        option_pool_pct = self.cap_table.get("option_pool_pct", 10)

        # Recalculate ownership percentages
        for stakeholder in all_stakeholders:
            stakeholder["ownership_pct"] = (
                (stakeholder["shares"] / new_total_shares) * 100 if new_total_shares > 0 else 0
            )

        # Update ownership in conversions
        conversions = list(self._conversions)
        for conversion in conversions:
            conversion["ownership_pct"] = (
                (conversion["shares_issued"] / new_total_shares) * 100
                if new_total_shares > 0
                else 0
            )

        # Calculate dilution
        total_dilution_pct = (
            (self._total_new_shares / new_total_shares) * 100 if new_total_shares > 0 else 0
        )

        return ConversionResult(
            updated_cap_table={
                "stakeholders": all_stakeholders,
                "total_shares": new_total_shares,
                "option_pool_pct": option_pool_pct,
            },
            converted_instruments=conversions,
            summary={
                "instruments_converted": len(conversions),
                "total_shares_issued": self._total_new_shares,
                "total_dilution_pct": total_dilution_pct,
            },
        )


def convert_instruments(
    cap_table: dict[str, Any],
    instruments: list[dict[str, Any]],
    priced_round: dict[str, Any],
) -> dict[str, Any]:
    """
    Convenience wrapper for instrument conversions.

    Provides a simple function API for the fluent pipeline. Use this
    when you don't need to inspect intermediate pipeline states.

    This function is backward-compatible with the original convert_instruments.

    Args:
        cap_table: Current cap table with stakeholders and total_shares
        instruments: List of SAFE and ConvertibleNote dictionaries
        priced_round: The priced round triggering conversion

    Returns:
        Dictionary with updated_cap_table, converted_instruments, summary
    """
    result = (
        ConversionPipeline(cap_table=cap_table, priced_round=priced_round)
        .with_instruments(instruments)
        .filter_outstanding()
        .calculate_conversions()
        .create_stakeholders()
        .recalculate_ownership()
        .build()
    )

    return {
        "updated_cap_table": result.updated_cap_table,
        "converted_instruments": result.converted_instruments,
        "summary": result.summary,
    }
