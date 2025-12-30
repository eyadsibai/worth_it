"""Valuation calculator endpoints.

This router handles company valuation methods:
- Revenue Multiple valuation
- Discounted Cash Flow (DCF) valuation
- VC Method valuation
- Multi-method comparison
- Industry benchmarks (Phase 4)
- Advanced methods (Phase 6): Enhanced DCF, WACC, Comparables, Real Options
"""

from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Request

from worth_it import calculations
from worth_it.calculations.benchmarks import (
    get_all_industries,
    get_benchmark,
    validate_against_benchmark,
)
from worth_it.calculations.comparables import (
    ComparablesParams,
    ComparableTransaction,
    calculate_comparable_valuation,
)
from worth_it.calculations.real_options import (
    OptionType,
    RealOptionParams,
    calculate_real_option_value,
)
from worth_it.calculations.valuation import (
    DCFStage,
    EnhancedDCFParams,
    calculate_enhanced_dcf,
)
from worth_it.calculations.wacc import (
    WACCParams,
    calculate_wacc,
)
from worth_it.calculations.weighted_average import (
    ValuationInput,
    WeightedAverageParams,
    calculate_weighted_average,
)
from worth_it.config import settings
from worth_it.exceptions import CalculationError
from worth_it.models import (
    BenchmarkMetricResponse,
    BenchmarkValidationRequest,
    BenchmarkValidationResponse,
    BerkusRequest,
    BerkusResponse,
    ComparablesRequest,
    ComparablesResponse,
    DCFRequest,
    EnhancedDCFRequest,
    EnhancedDCFResponse,
    FirstChicagoRequest,
    FirstChicagoResponse,
    IndustryBenchmarkResponse,
    IndustryListItem,
    RealOptionRequest,
    RealOptionResponse,
    RevenueMultipleRequest,
    RiskFactorSummationRequest,
    RiskFactorSummationResponse,
    ScorecardRequest,
    ScorecardResponse,
    ValuationCompareRequest,
    ValuationCompareResponse,
    ValuationResultResponse,
    VCMethodRequest,
    WACCRequest,
    WACCResponse,
    WeightedAverageRequest,
    WeightedAverageResponse,
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


@router.post("/first-chicago", response_model=FirstChicagoResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_first_chicago_valuation(request: Request, body: FirstChicagoRequest):
    """Calculate company valuation using First Chicago Method.

    The First Chicago Method values a company by:
    1. Defining multiple scenarios (typically Best/Base/Worst cases)
    2. Assigning probability weights to each scenario
    3. Calculating present value for each scenario (using its own time horizon)
    4. Computing probability-weighted present value

    This method is particularly useful for early-stage companies where
    multiple outcome paths are realistic possibilities.
    """
    try:
        # Convert API request to domain params
        scenarios = [
            calculations.FirstChicagoScenario(
                name=s.name,
                probability=s.probability,
                exit_value=s.exit_value,
                years_to_exit=s.years_to_exit,
            )
            for s in body.scenarios
        ]

        params = calculations.FirstChicagoParams(
            scenarios=scenarios,
            discount_rate=body.discount_rate,
            current_investment=body.current_investment,
        )

        result = calculations.calculate_first_chicago(params)

        return FirstChicagoResponse(
            weighted_value=result.weighted_value,
            present_value=result.present_value,
            scenario_values=result.scenario_values,
            scenario_present_values=result.scenario_present_values,
            method=result.method,
        )
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for First Chicago valuation") from e


# --- Pre-Revenue Valuation Methods (Phase 2) ---


@router.post("/berkus", response_model=BerkusResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_berkus_valuation(request: Request, body: BerkusRequest):
    """Calculate valuation using the Berkus Method.

    The Berkus Method assigns value to five key risk-reducing elements,
    each worth $0 to $500K. Maximum total valuation is $2.5M.

    Ideal for pre-seed startups with idea/prototype stage.
    """
    try:
        params = calculations.BerkusParams(
            sound_idea=body.sound_idea,
            prototype=body.prototype,
            quality_team=body.quality_team,
            strategic_relationships=body.strategic_relationships,
            product_rollout=body.product_rollout,
            max_per_criterion=body.max_per_criterion,
        )
        result = calculations.calculate_berkus(params)

        return BerkusResponse(
            valuation=result.valuation,
            breakdown=result.breakdown,
        )
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for Berkus valuation") from e


@router.post("/scorecard", response_model=ScorecardResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_scorecard_valuation(request: Request, body: ScorecardRequest):
    """Calculate valuation using the Scorecard Method.

    The Scorecard Method compares a startup to average companies in the region/stage
    using weighted factors. A score of 1.0 equals average.

    Ideal for seed-stage startups with comparable companies in the market.
    """
    try:
        factors = [
            calculations.ScorecardFactor(name=f.name, weight=f.weight, score=f.score)
            for f in body.factors
        ]
        params = calculations.ScorecardParams(
            base_valuation=body.base_valuation,
            factors=factors,
        )
        result = calculations.calculate_scorecard(params)

        return ScorecardResponse(
            valuation=result.valuation,
            adjustment_factor=result.adjustment_factor,
            factor_contributions=result.factor_contributions,
        )
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for Scorecard valuation") from e


@router.post("/risk-factor-summation", response_model=RiskFactorSummationResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_risk_factor_summation_valuation(
    request: Request, body: RiskFactorSummationRequest
):
    """Calculate valuation using the Risk Factor Summation Method.

    Starts with a base valuation and adjusts by +/- amounts for 12 standard risk factors.
    Each factor can add or subtract up to $500K from the base.

    Standard factors: Management, Stage, Legislation, Manufacturing, Sales/Marketing,
    Funding, Competition, Technology, Litigation, International, Reputation, Exit Potential.
    """
    try:
        factors = [
            calculations.RiskFactor(name=f.name, adjustment=f.adjustment) for f in body.factors
        ]
        params = calculations.RiskFactorSummationParams(
            base_valuation=body.base_valuation,
            factors=factors,
        )
        result = calculations.calculate_risk_factor_summation(params)

        return RiskFactorSummationResponse(
            valuation=result.valuation,
            total_adjustment=result.total_adjustment,
            factor_adjustments=result.factor_adjustments,
        )
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for Risk Factor Summation valuation") from e


# --- Industry Benchmark Endpoints (Phase 4) ---


@router.get("/benchmarks/industries", response_model=list[IndustryListItem])
async def list_industries() -> list[IndustryListItem]:
    """List all available industries with benchmarks.

    Returns a list of industry codes and names that can be used
    to retrieve detailed benchmark data.
    """
    industries = get_all_industries()
    return [IndustryListItem(code=i.code, name=i.name) for i in industries]


@router.get("/benchmarks/{industry_code}", response_model=IndustryBenchmarkResponse)
async def get_industry_benchmark(industry_code: str) -> IndustryBenchmarkResponse:
    """Get benchmark data for a specific industry.

    Returns detailed benchmark metrics including revenue multiples,
    discount rates, growth rates, and margins typical for the industry.
    """
    benchmark = get_benchmark(industry_code)
    if not benchmark:
        raise HTTPException(status_code=404, detail=f"Industry '{industry_code}' not found")

    return IndustryBenchmarkResponse(
        code=benchmark.code,
        name=benchmark.name,
        description=benchmark.description,
        metrics={
            name: BenchmarkMetricResponse(
                name=m.name,
                min_value=m.min_value,
                typical_low=m.typical_low,
                median=m.median,
                typical_high=m.typical_high,
                max_value=m.max_value,
                unit=m.unit,
            )
            for name, m in benchmark.metrics.items()
        },
    )


@router.post("/benchmarks/validate", response_model=BenchmarkValidationResponse)
async def validate_benchmark(
    request: BenchmarkValidationRequest,
) -> BenchmarkValidationResponse:
    """Validate a value against industry benchmarks.

    Returns validation result indicating whether the value is within
    typical range, with suggestions for appropriate values.
    """
    result = validate_against_benchmark(
        industry_code=request.industry_code,
        metric_name=request.metric_name,
        value=request.value,
    )
    return BenchmarkValidationResponse(
        is_valid=result.is_valid,
        severity=result.severity,
        message=result.message,
        benchmark_median=result.benchmark_median,
        suggested_range=result.suggested_range,
    )


# --- Advanced Valuation Endpoints (Phase 6) ---


@router.post("/enhanced-dcf", response_model=EnhancedDCFResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def enhanced_dcf_valuation(request: Request, body: EnhancedDCFRequest) -> EnhancedDCFResponse:
    """Calculate enhanced multi-stage DCF valuation.

    Projects cash flows through multiple growth stages (e.g., hypergrowth,
    growth, mature), then calculates terminal value and present value.

    This is more realistic than simple DCF for high-growth startups
    that will transition through different growth phases.
    """
    try:
        stages = [
            DCFStage(
                name=s.name,
                years=s.years,
                growth_rate=s.growth_rate,
                margin=s.margin,
            )
            for s in body.stages
        ]
        params = EnhancedDCFParams(
            base_revenue=body.base_revenue,
            stages=stages,
            discount_rate=body.discount_rate,
            terminal_growth_rate=body.terminal_growth_rate,
        )
        result = calculate_enhanced_dcf(params)
        return EnhancedDCFResponse(**asdict(result))
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for enhanced DCF valuation") from e


@router.post("/wacc", response_model=WACCResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def wacc_calculation(request: Request, body: WACCRequest) -> WACCResponse:
    """Calculate Weighted Average Cost of Capital (WACC).

    WACC = (E/V) × Re + (D/V) × Rd × (1 - T)

    This provides the discount rate for DCF valuations based on
    the company's capital structure and required returns.
    """
    try:
        params = WACCParams(
            equity_value=body.equity_value,
            debt_value=body.debt_value,
            cost_of_equity=body.cost_of_equity,
            cost_of_debt=body.cost_of_debt,
            tax_rate=body.tax_rate,
        )
        result = calculate_wacc(params)
        return WACCResponse(**asdict(result))
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for WACC calculation") from e


@router.post("/comparables", response_model=ComparablesResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def comparables_valuation(request: Request, body: ComparablesRequest) -> ComparablesResponse:
    """Calculate valuation using Comparable Transactions method.

    Values a company based on revenue multiples from similar
    M&A transactions or public company valuations.

    Returns median and mean multiples, plus 25th/75th percentile range.
    """
    try:
        comparables = [
            ComparableTransaction(
                name=c.name,
                deal_value=c.deal_value,
                revenue=c.revenue,
                industry=c.industry,
                date=c.date,
            )
            for c in body.comparables
        ]
        params = ComparablesParams(
            target_revenue=body.target_revenue,
            comparables=comparables,
        )
        result = calculate_comparable_valuation(params)
        return ComparablesResponse(**asdict(result))
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for comparables valuation") from e


@router.post("/real-options", response_model=RealOptionResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def real_options_valuation(request: Request, body: RealOptionRequest) -> RealOptionResponse:
    """Calculate Real Options valuation using Black-Scholes framework.

    Values strategic flexibility as options:
    - GROWTH: Option to expand/invest (call-like)
    - ABANDONMENT: Option to exit/sell (put-like)
    - DELAY: Option to wait before investing
    - SWITCH: Option to change strategy

    Uses Black-Scholes option pricing adapted for real assets.
    """
    try:
        option_type = OptionType(body.option_type)
        params = RealOptionParams(
            option_type=option_type,
            underlying_value=body.underlying_value,
            exercise_price=body.exercise_price,
            time_to_expiry=body.time_to_expiry,
            volatility=body.volatility,
            risk_free_rate=body.risk_free_rate,
        )
        result = calculate_real_option_value(params)
        return RealOptionResponse(**asdict(result))
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for real options valuation") from e


@router.post("/weighted-average", response_model=WeightedAverageResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def weighted_average_valuation(
    request: Request, body: WeightedAverageRequest
) -> WeightedAverageResponse:
    """Synthesize multiple valuation methods into weighted average.

    Combines valuations from different methods using confidence weights.
    Weights are automatically normalized to sum to 1.0.

    This is standard practice in professional valuations - triangulating
    from multiple methods provides a more robust estimate.
    """
    try:
        valuations = [
            ValuationInput(
                method=v.method,
                valuation=v.valuation,
                weight=v.weight,
            )
            for v in body.valuations
        ]
        params = WeightedAverageParams(valuations=valuations)
        result = calculate_weighted_average(params)
        return WeightedAverageResponse(**asdict(result))
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for weighted average") from e
