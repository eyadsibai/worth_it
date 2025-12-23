"""Dilution preview calculations.

This module provides functions to calculate dilution impact on stakeholders
when a new funding round occurs.
"""

from __future__ import annotations

from typing import Literal, TypedDict

# Type definitions
StakeholderType = Literal["founder", "employee", "investor", "advisor"]
DilutionPartyType = Literal[
    "founder", "employee", "investor", "advisor", "option_pool", "new_investor"
]


class StakeholderInput(TypedDict):
    """Input stakeholder for dilution calculation."""

    name: str
    type: StakeholderType
    ownership_pct: float


class DilutionParty(TypedDict):
    """A single dilution result for one party."""

    name: str
    type: DilutionPartyType
    before_pct: float
    after_pct: float
    dilution_pct: float
    is_new: bool


class DilutionPreviewResult(TypedDict):
    """Result of dilution preview calculation."""

    dilution_results: list[DilutionParty]
    post_money_valuation: float
    dilution_factor: float


def calculate_dilution_preview(
    stakeholders: list[dict],
    option_pool_pct: float,
    pre_money_valuation: float,
    amount_raised: float,
    investor_name: str = "New Investor",
) -> DilutionPreviewResult:
    """
    Calculate dilution impact of a new funding round on existing stakeholders.

    Args:
        stakeholders: Current cap table stakeholders with name, type, and ownership_pct
        option_pool_pct: Current option pool percentage (0-100)
        pre_money_valuation: Pre-money valuation in dollars (must be > 0)
        amount_raised: Amount being raised in dollars (must be > 0)
        investor_name: Name for the new investor (defaults to "New Investor")

    Returns:
        DilutionPreviewResult containing:
        - dilution_results: List of DilutionParty showing before/after ownership
        - post_money_valuation: Post-money valuation
        - dilution_factor: Factor by which existing ownership is reduced (0-1)

    Raises:
        ValueError: If pre_money_valuation <= 0 or amount_raised <= 0
    """
    # Validate inputs
    if pre_money_valuation <= 0:
        raise ValueError(f"pre_money_valuation must be positive, got {pre_money_valuation}")
    if amount_raised <= 0:
        raise ValueError(f"amount_raised must be positive, got {amount_raised}")

    # Calculate post-money valuation and dilution factor
    post_money_valuation = pre_money_valuation + amount_raised
    dilution_factor = pre_money_valuation / post_money_valuation
    new_investor_pct = (amount_raised / post_money_valuation) * 100

    results: list[DilutionParty] = []

    # Process existing stakeholders
    for stakeholder in stakeholders:
        before_pct = stakeholder["ownership_pct"]
        after_pct = before_pct * dilution_factor
        # Dilution percentage is how much they lost relative to original
        dilution_pct = ((after_pct - before_pct) / before_pct) * 100 if before_pct > 0 else 0

        results.append(
            DilutionParty(
                name=stakeholder["name"],
                type=stakeholder["type"],
                before_pct=before_pct,
                after_pct=after_pct,
                dilution_pct=dilution_pct,
                is_new=False,
            )
        )

    # Process option pool if it exists
    if option_pool_pct > 0:
        after_pct = option_pool_pct * dilution_factor
        dilution_pct = ((after_pct - option_pool_pct) / option_pool_pct) * 100

        results.append(
            DilutionParty(
                name="Option Pool",
                type="option_pool",
                before_pct=option_pool_pct,
                after_pct=after_pct,
                dilution_pct=dilution_pct,
                is_new=False,
            )
        )

    # Add new investor
    results.append(
        DilutionParty(
            name=investor_name,
            type="new_investor",
            before_pct=0.0,
            after_pct=new_investor_pct,
            dilution_pct=0.0,
            is_new=True,
        )
    )

    return DilutionPreviewResult(
        dilution_results=results,
        post_money_valuation=post_money_valuation,
        dilution_factor=dilution_factor,
    )
