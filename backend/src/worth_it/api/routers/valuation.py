"""Valuation calculator endpoints.

This router handles company valuation methods:
- Revenue Multiple valuation
- Discounted Cash Flow (DCF) valuation
- VC Method valuation
- Multi-method comparison
"""

from fastapi import APIRouter, Request

from worth_it import calculations
from worth_it.config import settings
from worth_it.exceptions import CalculationError
from worth_it.models import (
    DCFRequest,
    RevenueMultipleRequest,
    ValuationCompareRequest,
    ValuationCompareResponse,
    ValuationResultResponse,
    VCMethodRequest,
)

from ..dependencies import limiter

router = APIRouter(
    prefix="/api/valuation",
    tags=["valuation"],
)


@router.post("/revenue-multiple", response_model=ValuationResultResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_revenue_multiple_valuation(request: Request, body: RevenueMultipleRequest):
    """Calculate company valuation using Revenue Multiple method.

    This method values a company based on a multiple of its annual revenue,
    adjusted for growth rate. Common for SaaS and tech companies.

    Formula: Valuation = Annual Revenue * Revenue Multiple * Growth Adjustment
    """
    try:
        params = calculations.RevenueMultipleParams(
            annual_revenue=body.annual_revenue,
            revenue_multiple=body.revenue_multiple,
            growth_rate=body.growth_rate,
            industry_benchmark_multiple=body.industry_benchmark_multiple,
        )
        result = calculations.calculate_revenue_multiple(params)

        return ValuationResultResponse(
            method=result.method,
            valuation=result.valuation,
            confidence=result.confidence,
            inputs=result.inputs,
            notes=result.notes,
        )
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for revenue multiple valuation") from e


@router.post("/dcf", response_model=ValuationResultResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_dcf_valuation(request: Request, body: DCFRequest):
    """Calculate company valuation using Discounted Cash Flow method.

    This method values a company based on the present value of projected
    future cash flows, plus a terminal value for perpetual growth.

    Formula: PV = Sum(CFt / (1+r)^t) + Terminal Value
    """
    try:
        params = calculations.DCFParams(
            projected_cash_flows=body.projected_cash_flows,
            discount_rate=body.discount_rate,
            terminal_growth_rate=body.terminal_growth_rate,
        )
        result = calculations.calculate_dcf(params)

        return ValuationResultResponse(
            method=result.method,
            valuation=result.valuation,
            confidence=result.confidence,
            inputs=result.inputs,
            notes=result.notes,
        )
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for DCF valuation") from e


@router.post("/vc-method", response_model=ValuationResultResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_vc_method_valuation(request: Request, body: VCMethodRequest):
    """Calculate company valuation using VC Method.

    This method works backwards from a projected exit value to determine
    what valuation makes sense today given target investor returns.

    Formula: Post-Money = Exit Value * Exit Probability * (1 - Dilution) / Target Multiple
    """
    try:
        params = calculations.VCMethodParams(
            projected_exit_value=body.projected_exit_value,
            exit_year=body.exit_year,
            target_return_multiple=body.target_return_multiple,
            target_irr=body.target_irr,
            expected_dilution=body.expected_dilution,
            investment_amount=body.investment_amount,
            exit_probability=body.exit_probability,
        )
        result = calculations.calculate_vc_method(params)

        return ValuationResultResponse(
            method=result.method,
            valuation=result.valuation,
            confidence=result.confidence,
            inputs=result.inputs,
            notes=result.notes,
        )
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for VC method valuation") from e


@router.post("/compare", response_model=ValuationCompareResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def compare_valuation_methods(request: Request, body: ValuationCompareRequest):
    """Calculate and compare valuations from multiple methods.

    This endpoint runs all provided valuation methods and synthesizes
    the results into a comparison with insights and recommendations.

    Returns:
    - Individual results from each method
    - Min/max/average/weighted average valuations
    - Outlier identification
    - Actionable insights about the valuation range
    """
    try:
        results = []

        # Calculate each provided method
        if body.revenue_multiple is not None:
            rm_params = calculations.RevenueMultipleParams(
                annual_revenue=body.revenue_multiple.annual_revenue,
                revenue_multiple=body.revenue_multiple.revenue_multiple,
                growth_rate=body.revenue_multiple.growth_rate,
                industry_benchmark_multiple=body.revenue_multiple.industry_benchmark_multiple,
            )
            results.append(calculations.calculate_revenue_multiple(rm_params))

        if body.dcf is not None:
            dcf_params = calculations.DCFParams(
                projected_cash_flows=body.dcf.projected_cash_flows,
                discount_rate=body.dcf.discount_rate,
                terminal_growth_rate=body.dcf.terminal_growth_rate,
            )
            results.append(calculations.calculate_dcf(dcf_params))

        if body.vc_method is not None:
            vc_params = calculations.VCMethodParams(
                projected_exit_value=body.vc_method.projected_exit_value,
                exit_year=body.vc_method.exit_year,
                target_return_multiple=body.vc_method.target_return_multiple,
                target_irr=body.vc_method.target_irr,
                expected_dilution=body.vc_method.expected_dilution,
                investment_amount=body.vc_method.investment_amount,
                exit_probability=body.vc_method.exit_probability,
            )
            results.append(calculations.calculate_vc_method(vc_params))

        # Compare results
        comparison = calculations.compare_valuations(results)

        return ValuationCompareResponse(
            results=[
                ValuationResultResponse(
                    method=r.method,
                    valuation=r.valuation,
                    confidence=r.confidence,
                    inputs=r.inputs,
                    notes=r.notes,
                )
                for r in comparison.results
            ],
            min_valuation=comparison.min_valuation,
            max_valuation=comparison.max_valuation,
            average_valuation=comparison.average_valuation,
            weighted_average=comparison.weighted_average,
            range_pct=comparison.range_pct,
            outliers=comparison.outliers,
            insights=comparison.insights,
        )
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for valuation comparison") from e
