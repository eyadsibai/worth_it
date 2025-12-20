"""FastAPI backend for the Worth It application.

This module provides REST API endpoints for all financial calculation functions,
enabling the frontend to communicate with the backend via HTTP and WebSocket.
"""

import asyncio
import json
import logging
from collections import defaultdict
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from pydantic import ValidationError as PydanticValidationError

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
    DCFRequest,
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
    RevenueMultipleRequest,
    ScenarioComparisonRequest,
    ScenarioComparisonResponse,
    SensitivityAnalysisRequest,
    SensitivityAnalysisResponse,
    StartupScenarioRequest,
    StartupScenarioResponse,
    ValuationCompareRequest,
    ValuationCompareResponse,
    ValuationResultResponse,
    VCMethodRequest,
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


# =============================================================================
# WebSocket Connection Tracker for Rate Limiting
# =============================================================================


class WebSocketConnectionTracker:
    """Tracks active WebSocket connections per IP address.

    This is used to enforce rate limits on WebSocket connections since the
    standard slowapi rate limiter doesn't work with WebSocket handlers.

    Async-safety: Uses asyncio locks for concurrent task protection within a
    single event loop. This class is not thread-safe and should not be used
    from multiple threads concurrently.
    """

    def __init__(self) -> None:
        self._connections: dict[str, int] = defaultdict(int)
        self._lock = asyncio.Lock()

    async def can_connect(self, client_ip: str) -> bool:
        """Check if a client IP can establish a new WebSocket connection.

        Returns True if the client has not exceeded the maximum concurrent
        connections limit, False otherwise.
        """
        async with self._lock:
            return self._connections[client_ip] < settings.WS_MAX_CONCURRENT_PER_IP

    async def register_connection(self, client_ip: str) -> bool:
        """Register a new WebSocket connection for the given IP.

        Returns True if the connection was registered successfully,
        False if the client has exceeded the limit.
        """
        async with self._lock:
            if self._connections[client_ip] >= settings.WS_MAX_CONCURRENT_PER_IP:
                return False
            self._connections[client_ip] += 1
            return True

    async def unregister_connection(self, client_ip: str) -> None:
        """Unregister a WebSocket connection when it closes."""
        async with self._lock:
            if self._connections[client_ip] > 0:
                self._connections[client_ip] -= 1
            if self._connections[client_ip] == 0:
                del self._connections[client_ip]

    def get_active_connections(self, client_ip: str) -> int:
        """Get the number of active connections for an IP (for monitoring).

        This helper is intentionally lock-free and may return slightly stale
        data if connections are being modified concurrently. It should only
        be used for approximate monitoring/telemetry, not for enforcing
        correctness or rate-limiting decisions.
        """
        return self._connections.get(client_ip, 0)


@asynccontextmanager
async def track_websocket_connection(
    tracker: WebSocketConnectionTracker, client_ip: str
) -> AsyncGenerator[bool]:
    """Context manager for tracking WebSocket connections.

    Automatically unregisters the connection when the context exits.

    Yields:
        bool: True if connection was registered, False if rate limited.
    """
    registered = await tracker.register_connection(client_ip)
    try:
        yield registered
    finally:
        if registered:
            await tracker.unregister_connection(client_ip)


# Global WebSocket connection tracker instance
ws_connection_tracker = WebSocketConnectionTracker()


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


def _get_client_ip(websocket: WebSocket) -> str:
    """Extract client IP from WebSocket connection.

    Checks X-Forwarded-For header for reverse proxy scenarios,
    falls back to direct client host if not present.
    """
    # Check for forwarded IP (reverse proxy)
    forwarded = websocket.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For can contain multiple IPs; first is the original client
        return forwarded.split(",")[0].strip()

    # Fall back to direct client host
    client = websocket.client
    return client.host if client else "unknown"


async def _run_simulation_with_progress(
    websocket: WebSocket,
    request: MonteCarloRequest,
    base_params: dict,
) -> None:
    """Run Monte Carlo simulation with progress updates.

    This is the core simulation logic, separated out to enable timeout wrapping.
    """
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
    all_net_outcomes: list[float] = []
    all_simulated_valuations: list[float] = []

    for i in range(0, request.num_simulations, batch_size):
        current_batch_size = min(batch_size, request.num_simulations - i)

        # Run batch simulation (CPU-bound, run in thread pool)
        # Use default argument to properly capture loop variable
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda batch=current_batch_size: mc_run_simulation(
                num_simulations=batch,
                base_params=base_params,
                sim_param_configs=request.sim_param_configs,
            ),
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


@app.websocket("/ws/monte-carlo")
async def websocket_monte_carlo(websocket: WebSocket):
    """WebSocket endpoint for Monte Carlo simulation with progress updates.

    Receives simulation parameters and sends progress updates as the simulation runs.
    This provides real-time feedback for long-running simulations.

    Security features:
    - Rate limiting: Max concurrent connections per IP (WS_MAX_CONCURRENT_PER_IP)
    - Timeout: Simulation timeout (WS_SIMULATION_TIMEOUT_SECONDS)
    - Validation: num_simulations validated against MAX_SIMULATIONS config

    Message format:
    - Input (JSON): Same as MonteCarloRequest
    - Output (JSON):
        - {"type": "progress", "current": N, "total": TOTAL, "percentage": PCT}
        - {"type": "complete", "net_outcomes": [...], "simulated_valuations": [...]}
        - {"type": "error", "message": "..."}
    """
    client_ip = _get_client_ip(websocket)

    # Check rate limit before accepting connection
    async with track_websocket_connection(ws_connection_tracker, client_ip) as registered:
        if not registered:
            # Rate limited - accept, send error, then close connection
            # This ensures clients receive a proper error message rather than just a rejection
            logger.warning(
                f"WebSocket rate limit exceeded for IP {client_ip}. "
                f"Max concurrent connections: {settings.WS_MAX_CONCURRENT_PER_IP}"
            )
            await websocket.accept()
            await websocket.send_json(
                {
                    "type": "error",
                    "message": (
                        "Rate limit exceeded. Please close other Monte Carlo "
                        "connections or try again later."
                    ),
                    "max_concurrent_connections": settings.WS_MAX_CONCURRENT_PER_IP,
                }
            )
            await websocket.close(code=1008, reason="Rate limit exceeded")
            return

        await websocket.accept()
        logger.debug(f"WebSocket connection accepted for IP {client_ip}")

        try:
            # Receive simulation parameters
            data = await websocket.receive_text()
            request_data = json.loads(data)

            # Validate request using Pydantic model (includes MAX_SIMULATIONS check)
            try:
                request = MonteCarloRequest(**request_data)
            except PydanticValidationError as e:
                # Pydantic validation error - send user-friendly message
                error_msg = str(e)
                if "num_simulations" in error_msg and "exceeds" in error_msg:
                    # This is our custom MAX_SIMULATIONS validation error
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": f"Requested simulations exceed the maximum allowed ({settings.MAX_SIMULATIONS})",
                        }
                    )
                else:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "Invalid simulation parameters",
                        }
                    )
                logger.warning(
                    f"Invalid Monte Carlo request from {client_ip}: {e}"
                )
                return

            # Convert equity_type string to EquityType enum if needed
            base_params = convert_equity_type_in_params(request.base_params.copy())

            # Run simulation with timeout
            try:
                await asyncio.wait_for(
                    _run_simulation_with_progress(websocket, request, base_params),
                    timeout=settings.WS_SIMULATION_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                logger.warning(
                    f"Simulation timeout for IP {client_ip} after "
                    f"{settings.WS_SIMULATION_TIMEOUT_SECONDS}s "
                    f"({request.num_simulations} simulations requested)"
                )
                try:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": f"Simulation timed out after {settings.WS_SIMULATION_TIMEOUT_SECONDS} seconds",
                        }
                    )
                except Exception as send_err:
                    logger.debug(f"Failed to send timeout error to client: {send_err}")

        except WebSocketDisconnect:
            logger.info(f"WebSocket client {client_ip} disconnected during Monte Carlo simulation")
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from WebSocket client {client_ip}")
            try:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Invalid JSON in request",
                    }
                )
            except Exception:
                logger.error("Failed to send error message to WebSocket client")
        except (ValueError, TypeError, KeyError) as e:
            # Known calculation errors - log and send sanitized message
            logger.error(f"Calculation error in WebSocket Monte Carlo from {client_ip}: {e}", exc_info=True)
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
            logger.exception(f"Unexpected error in WebSocket Monte Carlo from {client_ip}: {e}")
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
                logger.debug("WebSocket already closed")


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


# --- Valuation Calculator Endpoints (#229) ---


@app.post("/api/valuation/revenue-multiple", response_model=ValuationResultResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_revenue_multiple_valuation(request: Request, body: RevenueMultipleRequest):
    """Calculate company valuation using Revenue Multiple method.

    This method values a company based on a multiple of its annual revenue,
    adjusted for growth rate. Common for SaaS and tech companies.

    Formula: Valuation = Annual Revenue × Revenue Multiple × Growth Adjustment
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


@app.post("/api/valuation/dcf", response_model=ValuationResultResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_dcf_valuation(request: Request, body: DCFRequest):
    """Calculate company valuation using Discounted Cash Flow method.

    This method values a company based on the present value of projected
    future cash flows, plus a terminal value for perpetual growth.

    Formula: PV = Σ(CFt / (1+r)^t) + Terminal Value
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


@app.post("/api/valuation/vc-method", response_model=ValuationResultResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_vc_method_valuation(request: Request, body: VCMethodRequest):
    """Calculate company valuation using VC Method.

    This method works backwards from a projected exit value to determine
    what valuation makes sense today given target investor returns.

    Formula: Post-Money = Exit Value × Exit Probability × (1 - Dilution) / Target Multiple
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


@app.post("/api/valuation/compare", response_model=ValuationCompareResponse)
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        log_level=settings.LOG_LEVEL.lower(),
    )
