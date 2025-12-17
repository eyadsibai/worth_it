"""FastAPI backend for the Worth It application.

This module provides REST API endpoints for all financial calculation functions,
enabling the frontend to communicate with the backend via HTTP and WebSocket.
"""

import json
import logging

import pandas as pd
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from worth_it import calculations
from worth_it.config import settings
from worth_it.exceptions import CalculationError, ValidationError, WorthItError
from worth_it.models import (
    CapTable,
    CapTableConversionRequest,
    CapTableConversionResponse,
    ComparisonInsight,
    ConversionSummary,
    ConvertedInstrumentDetail,
    DilutionFromValuationRequest,
    DilutionFromValuationResponse,
    DilutionPreviewRequest,
    DilutionPreviewResponse,
    DilutionResultItem,
    HealthCheckResponse,
    IRRRequest,
    IRRResponse,
    MetricDiff,
    MonteCarloRequest,
    MonteCarloResponse,
    MonthlyDataGridRequest,
    MonthlyDataGridResponse,
    NPVRequest,
    NPVResponse,
    OpportunityCostRequest,
    OpportunityCostResponse,
    ScenarioComparisonRequest,
    ScenarioComparisonResponse,
    SensitivityAnalysisRequest,
    SensitivityAnalysisResponse,
    StartupScenarioRequest,
    StartupScenarioResponse,
    WaterfallRequest,
    WaterfallResponse,
    WinnerResult,
)
from worth_it.monte_carlo import (
    run_monte_carlo_simulation as mc_run_simulation,
)
from worth_it.monte_carlo import (
    run_sensitivity_analysis as mc_sensitivity_analysis,
)
from worth_it.services import CapTableService, StartupService
from worth_it.services.serializers import (
    convert_equity_type_in_params,
    convert_equity_type_in_startup_params,
)

# Configure logging
logger = logging.getLogger(__name__)

# Configure rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    enabled=settings.RATE_LIMIT_ENABLED,
    default_limits=[],  # No default limits, we'll set per-endpoint
)


# Service instances for dependency injection
startup_service = StartupService()
cap_table_service = CapTableService()


# Create FastAPI app
app = FastAPI(
    title="Worth It API",
    description="Backend API for startup job offer financial analysis",
    version="1.0.0",
)

# Add rate limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

# Add CORS middleware with configuration from settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=False,  # Set to False for wildcard or True with explicit origins
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers - provide sanitized error messages to clients
@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle validation errors with 400 status code."""
    logger.warning(f"Validation error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=400,
        content={
            "error": "validation_error",
            "message": "Invalid input. Please check your request and try again.",
        },
    )


@app.exception_handler(CalculationError)
async def calculation_error_handler(request: Request, exc: CalculationError) -> JSONResponse:
    """Handle calculation errors with 400 status code."""
    logger.error(f"Calculation error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=400,
        content={"error": "calculation_error", "message": "Invalid calculation parameters"},
    )


@app.exception_handler(WorthItError)
async def worthit_error_handler(request: Request, exc: WorthItError) -> JSONResponse:
    """Handle any other WorthIt errors with 500 status code."""
    logger.error(f"Application error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "application_error", "message": "An application error occurred"},
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors - log full details but return sanitized message."""
    logger.exception(f"Unexpected error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "message": "An unexpected error occurred"},
    )


@app.get("/health", response_model=HealthCheckResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def health_check(request: Request):
    """Health check endpoint to verify API is running."""
    return HealthCheckResponse(status="healthy", version="1.0.0")


@app.post("/api/monthly-data-grid", response_model=MonthlyDataGridResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def create_monthly_data_grid(request: Request, body: MonthlyDataGridRequest):
    """Create a DataFrame with monthly financial projections.

    This endpoint creates a monthly data grid showing salary differences,
    surplus calculations, and cash flows over the analysis period.
    """
    try:
        df = calculations.create_monthly_data_grid(
            exit_year=body.exit_year,
            current_job_monthly_salary=body.current_job_monthly_salary,
            startup_monthly_salary=body.startup_monthly_salary,
            current_job_salary_growth_rate=body.current_job_salary_growth_rate,
            dilution_rounds=body.dilution_rounds,
        )
        return MonthlyDataGridResponse(data=df.to_dict(orient="records"))  # type: ignore[arg-type]
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for monthly data grid") from e


@app.post("/api/opportunity-cost", response_model=OpportunityCostResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_opportunity_cost(request: Request, body: OpportunityCostRequest):
    """Calculate the opportunity cost of foregone salary.

    This endpoint calculates the future value of the salary difference
    between current job and startup job, accounting for investment returns.
    """
    try:
        monthly_df = pd.DataFrame(body.monthly_data)

        # Convert equity_type string to EquityType enum if needed
        startup_params = convert_equity_type_in_startup_params(
            body.startup_params.copy() if body.startup_params else None
        )

        df = calculations.calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=body.annual_roi,
            investment_frequency=body.investment_frequency,
            options_params=body.options_params,
            startup_params=startup_params,
        )
        return OpportunityCostResponse(data=df.to_dict(orient="records"))  # type: ignore[arg-type]
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for opportunity cost") from e


@app.post("/api/startup-scenario", response_model=StartupScenarioResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_startup_scenario(request: Request, body: StartupScenarioRequest):
    """Calculate financial outcomes for a startup equity package.

    This endpoint evaluates both RSU and Stock Option scenarios,
    including dilution effects and breakeven analysis.
    """
    try:
        # Use service layer for business logic and column mapping
        result = startup_service.calculate_scenario(
            opportunity_cost_data=body.opportunity_cost_data,
            startup_params=body.startup_params.copy(),
        )

        return StartupScenarioResponse(
            results_df=result.results_df,
            final_payout_value=result.final_payout_value,
            final_opportunity_cost=result.final_opportunity_cost,
            payout_label=result.payout_label,
            breakeven_label=result.breakeven_label,
            total_dilution=result.total_dilution,
            diluted_equity_pct=result.diluted_equity_pct,
        )
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for startup scenario") from e


@app.post("/api/irr", response_model=IRRResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_irr(request: Request, body: IRRRequest):
    """Calculate the Internal Rate of Return (IRR).

    This endpoint computes the annualized IRR based on monthly cash flows
    and the final equity payout.
    """
    try:
        irr = startup_service.calculate_irr(body.monthly_surpluses, body.final_payout_value)
        return IRRResponse(irr=irr)
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for IRR calculation") from e


@app.post("/api/npv", response_model=NPVResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_npv(request: Request, body: NPVRequest):
    """Calculate the Net Present Value (NPV).

    This endpoint computes the NPV of the investment decision,
    accounting for the time value of money.
    """
    try:
        npv = startup_service.calculate_npv(
            body.monthly_surpluses,
            body.annual_roi,
            body.final_payout_value,
        )
        return NPVResponse(npv=npv)
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for NPV calculation") from e


@app.post("/api/monte-carlo", response_model=MonteCarloResponse)
@limiter.limit(f"{settings.RATE_LIMIT_MONTE_CARLO_PER_MINUTE}/minute")
async def run_monte_carlo(request: Request, body: MonteCarloRequest):
    """Run Monte Carlo simulation for probabilistic analysis.

    This endpoint performs thousands of simulations with varying parameters
    to understand the range of potential outcomes.
    """
    try:
        # Convert equity_type string to EquityType enum if needed
        base_params = convert_equity_type_in_params(body.base_params.copy())

        results = mc_run_simulation(
            num_simulations=body.num_simulations,
            base_params=base_params,
            sim_param_configs=body.sim_param_configs,
        )
        return MonteCarloResponse(
            net_outcomes=results["net_outcomes"].tolist(),
            simulated_valuations=results["simulated_valuations"].tolist(),
        )
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for Monte Carlo simulation") from e


@app.websocket("/ws/monte-carlo")
async def websocket_monte_carlo(websocket: WebSocket):
    """WebSocket endpoint for Monte Carlo simulation with progress updates.

    Receives simulation parameters and sends progress updates as the simulation runs.
    This provides real-time feedback for long-running simulations.

    Message format:
    - Input (JSON): Same as MonteCarloRequest
    - Output (JSON):
        - {"type": "progress", "current": N, "total": TOTAL, "percentage": PCT}
        - {"type": "complete", "net_outcomes": [...], "simulated_valuations": [...]}
        - {"type": "error", "message": "..."}
    """
    await websocket.accept()

    try:
        # Receive simulation parameters
        data = await websocket.receive_text()
        request_data = json.loads(data)

        # Validate request using Pydantic model
        request = MonteCarloRequest(**request_data)

        # Convert equity_type string to EquityType enum if needed
        base_params = convert_equity_type_in_params(request.base_params.copy())

        # Send initial progress
        await websocket.send_json(
            {
                "type": "progress",
                "current": 0,
                "total": request.num_simulations,
                "percentage": 0,
            }
        )

        # Run simulation in batches to send progress updates
        batch_size = max(100, request.num_simulations // 20)  # Send ~20 updates
        all_net_outcomes = []
        all_simulated_valuations = []

        for i in range(0, request.num_simulations, batch_size):
            current_batch_size = min(batch_size, request.num_simulations - i)

            # Run batch simulation
            results = mc_run_simulation(
                num_simulations=current_batch_size,
                base_params=base_params,
                sim_param_configs=request.sim_param_configs,
            )

            all_net_outcomes.extend(results["net_outcomes"].tolist())
            all_simulated_valuations.extend(results["simulated_valuations"].tolist())

            # Send progress update
            completed = i + current_batch_size
            percentage = (completed / request.num_simulations) * 100
            await websocket.send_json(
                {
                    "type": "progress",
                    "current": completed,
                    "total": request.num_simulations,
                    "percentage": round(percentage, 2),
                }
            )

        # Send final results
        await websocket.send_json(
            {
                "type": "complete",
                "net_outcomes": all_net_outcomes,
                "simulated_valuations": all_simulated_valuations,
            }
        )

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected during Monte Carlo simulation")
    except (ValueError, TypeError, KeyError) as e:
        # Known calculation errors - log and send sanitized message
        logger.error(f"Calculation error in WebSocket Monte Carlo: {e}", exc_info=True)
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": "Invalid parameters for simulation",
                }
            )
        except Exception:
            logger.error("Failed to send error message to WebSocket client")
    except Exception as e:
        # Unexpected errors - log full details but send generic message
        logger.exception(f"Unexpected error in WebSocket Monte Carlo: {e}")
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": "An unexpected error occurred during simulation",
                }
            )
        except Exception:
            logger.error("Failed to send error message to WebSocket client")
    finally:
        try:
            await websocket.close()
        except Exception:
            logger.error("Failed to close WebSocket connection")


@app.post("/api/sensitivity-analysis", response_model=SensitivityAnalysisResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def run_sensitivity(request: Request, body: SensitivityAnalysisRequest):
    """Run sensitivity analysis to identify key variables.

    This endpoint analyzes how each variable impacts the final outcome
    to identify the most influential factors.
    """
    try:
        # Convert equity_type string to EquityType enum if needed
        base_params = convert_equity_type_in_params(body.base_params.copy())

        df = mc_sensitivity_analysis(
            base_params=base_params,
            sim_param_configs=body.sim_param_configs,
        )
        return SensitivityAnalysisResponse(data=df.to_dict(orient="records"))  # type: ignore[arg-type]
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for sensitivity analysis") from e


@app.post("/api/dilution", response_model=DilutionFromValuationResponse)
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


@app.post("/api/cap-table/convert", response_model=CapTableConversionResponse)
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


@app.post("/api/waterfall", response_model=WaterfallResponse)
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
        from worth_it.models import (
            StakeholderPayout,
            WaterfallDistribution,
            WaterfallStep,
        )

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


@app.post("/api/dilution/preview", response_model=DilutionPreviewResponse)
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


@app.post("/api/scenarios/compare", response_model=ScenarioComparisonResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def compare_scenarios(request: Request, body: ScenarioComparisonRequest):
    """Compare multiple scenarios to identify the best option.

    This endpoint analyzes multiple scenarios and provides:
    - Winner identification (highest net outcome)
    - Metric differences (absolute and percentage)
    - Human-readable insights about trade-offs

    Key features:
    - Identifies winning scenario by net outcome
    - Detects ties when scenarios have equal outcomes
    - Compares key metrics (net outcome, payout, opportunity cost)
    - Generates insights about salary vs equity trade-offs
    - Finds earliest breakeven scenario
    """
    try:
        # Convert Pydantic models to dicts for calculation
        scenarios = [
            {
                "name": s.name,
                "results": {
                    "net_outcome": s.results.net_outcome,
                    "final_payout_value": s.results.final_payout_value,
                    "final_opportunity_cost": s.results.final_opportunity_cost,
                    "breakeven": s.results.breakeven,
                },
                "equity": {
                    "monthly_salary": s.equity.monthly_salary,
                },
            }
            for s in body.scenarios
        ]

        result = calculations.get_comparison_metrics(scenarios)

        return ScenarioComparisonResponse(
            winner=WinnerResult(
                winner_name=result["winner"]["winner_name"],
                winner_index=result["winner"]["winner_index"],
                net_outcome_advantage=result["winner"]["net_outcome_advantage"],
                is_tie=result["winner"]["is_tie"],
            ),
            metric_diffs=[
                MetricDiff(
                    metric=d["metric"],
                    label=d["label"],
                    values=d["values"],
                    scenario_names=d["scenario_names"],
                    absolute_diff=d["absolute_diff"],
                    percentage_diff=d["percentage_diff"],
                    better_scenario=d["better_scenario"],
                    higher_is_better=d["higher_is_better"],
                )
                for d in result["metric_diffs"]
            ],
            insights=[
                ComparisonInsight(
                    type=i["type"],
                    title=i["title"],
                    description=i["description"],
                    scenario_name=i.get("scenario_name"),
                    icon=i.get("icon"),
                )
                for i in result["insights"]
            ],
        )
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for scenario comparison") from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        log_level=settings.LOG_LEVEL.lower(),
    )
