"""Cap table and waterfall analysis endpoints.

This router handles cap table operations:
- SAFE/Convertible Note conversion
- Waterfall (liquidation preference) analysis
- Dilution calculations
- Dilution preview for new funding rounds
"""

from fastapi import APIRouter, Request

from worth_it import calculations
from worth_it.config import settings
from worth_it.exceptions import CalculationError
from worth_it.models import (
    CapTable,
    CapTableConversionRequest,
    CapTableConversionResponse,
    ConversionSummary,
    ConvertedInstrumentDetail,
    DilutionFromValuationRequest,
    DilutionFromValuationResponse,
    DilutionPreviewRequest,
    DilutionPreviewResponse,
    DilutionResultItem,
    StakeholderPayout,
    WaterfallDistribution,
    WaterfallRequest,
    WaterfallResponse,
    WaterfallStep,
)

from ..dependencies import cap_table_service, limiter

router = APIRouter(
    prefix="/api",
    tags=["cap-table"],
)


@router.post("/dilution", response_model=DilutionFromValuationResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_dilution_from_valuation(request: Request, body: DilutionFromValuationRequest):
    """Calculate dilution percentage from fundraising round.

    This endpoint computes how much ownership dilution occurs
    based on pre-money valuation and amount raised.
    """
    try:
        dilution = cap_table_service.calculate_dilution(
            body.pre_money_valuation,
            body.amount_raised,
        )
        return DilutionFromValuationResponse(dilution=dilution)
    except (ValueError, ZeroDivisionError) as e:
        raise CalculationError("Invalid parameters for dilution calculation") from e


@router.post("/cap-table/convert", response_model=CapTableConversionResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def convert_cap_table_instruments(request: Request, body: CapTableConversionRequest):
    """Convert SAFEs and Convertible Notes to equity when a priced round occurs.

    This endpoint takes the current cap table, outstanding instruments, and a
    new priced round, then calculates how each SAFE/Note converts to shares.

    The conversion follows the "best of both" rule:
    - SAFEs/Notes convert at the lower of cap price or discount price
    - Notes include accrued interest in the conversion amount
    - New stakeholders are created for each converted instrument
    """
    try:
        # Convert Pydantic models to dicts for the service
        result = cap_table_service.convert_instruments(
            cap_table=body.cap_table.model_dump(),
            instruments=[inst.model_dump() for inst in body.instruments],
            priced_round=body.priced_round.model_dump(),
        )

        return CapTableConversionResponse(
            updated_cap_table=CapTable.model_validate(result.updated_cap_table),
            converted_instruments=[
                ConvertedInstrumentDetail.model_validate(inst)
                for inst in result.converted_instruments
            ],
            summary=ConversionSummary.model_validate(result.summary),
        )
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for cap table conversion") from e


@router.post("/waterfall", response_model=WaterfallResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_waterfall(request: Request, body: WaterfallRequest):
    """Calculate exit proceeds distribution using waterfall analysis.

    This endpoint performs a liquidation waterfall analysis showing how exit
    proceeds are distributed among stakeholders respecting liquidation preferences.

    Key features:
    - Seniority-based preference ordering (senior tiers paid first)
    - Participating vs non-participating preferred handling
    - Participation cap enforcement
    - Automatic conversion decision for non-participating preferred
    - Pari passu (equal seniority) proportional distribution
    """
    try:
        # Use service for business logic
        result = cap_table_service.calculate_waterfall(
            cap_table=body.cap_table.model_dump(),
            preference_tiers=[tier.model_dump() for tier in body.preference_tiers],
            exit_valuations=body.exit_valuations,
        )

        # Convert service dataclasses to Pydantic models for response
        distributions = [
            WaterfallDistribution(
                exit_valuation=dist.exit_valuation,
                waterfall_steps=[
                    WaterfallStep(
                        step_number=s.step_number,
                        description=s.description,
                        amount=s.amount,
                        recipients=s.recipients,
                        remaining_proceeds=s.remaining_proceeds,
                    )
                    for s in dist.waterfall_steps
                ],
                stakeholder_payouts=[
                    StakeholderPayout(
                        stakeholder_id=p.stakeholder_id,
                        name=p.name,
                        payout_amount=p.payout_amount,
                        payout_pct=p.payout_pct,
                        investment_amount=p.investment_amount,
                        roi=p.roi,
                    )
                    for p in dist.stakeholder_payouts
                ],
                common_pct=dist.common_pct,
                preferred_pct=dist.preferred_pct,
            )
            for dist in result.distributions_by_valuation
        ]

        return WaterfallResponse(
            distributions_by_valuation=distributions,
            breakeven_points=result.breakeven_points,
        )
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for waterfall analysis") from e


@router.post("/dilution/preview", response_model=DilutionPreviewResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_dilution_preview(request: Request, body: DilutionPreviewRequest):
    """Calculate dilution impact of a new funding round on existing stakeholders.

    This endpoint computes how ownership percentages change when new investment
    comes in. It shows before/after ownership for each stakeholder, option pool,
    and the new investor.

    Key features:
    - Calculates dilution factor from pre/post money valuation
    - Shows percentage change for each existing stakeholder
    - Handles option pool dilution
    - Returns new investor ownership percentage
    """
    try:
        # Convert Pydantic models to dicts for calculation
        stakeholders = [
            {"name": s.name, "type": s.type, "ownership_pct": s.ownership_pct}
            for s in body.stakeholders
        ]

        result = calculations.calculate_dilution_preview(
            stakeholders=stakeholders,
            option_pool_pct=body.option_pool_pct,
            pre_money_valuation=body.pre_money_valuation,
            amount_raised=body.amount_raised,
            investor_name=body.investor_name,
        )

        return DilutionPreviewResponse(
            dilution_results=[
                DilutionResultItem(
                    name=item["name"],
                    type=item["type"],
                    before_pct=item["before_pct"],
                    after_pct=item["after_pct"],
                    dilution_pct=item["dilution_pct"],
                    is_new=item["is_new"],
                )
                for item in result["dilution_results"]
            ],
            post_money_valuation=result["post_money_valuation"],
            dilution_factor=result["dilution_factor"],
        )
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for dilution preview") from e
