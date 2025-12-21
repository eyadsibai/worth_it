"""Monte Carlo simulation endpoints.

This router handles probabilistic analysis:
- Monte Carlo simulation (REST)
- Monte Carlo simulation with progress (WebSocket)
- Sensitivity analysis
"""

import asyncio
import json
import logging
from functools import partial

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from pydantic import ValidationError as PydanticValidationError

from worth_it.config import settings
from worth_it.exceptions import CalculationError
from worth_it.models import (
    ErrorCode,
    FieldError,
    MonteCarloRequest,
    MonteCarloResponse,
    SensitivityAnalysisRequest,
    SensitivityAnalysisResponse,
)
from worth_it.monte_carlo import (
    run_monte_carlo_simulation as mc_run_simulation,
)
from worth_it.monte_carlo import (
    run_sensitivity_analysis as mc_sensitivity_analysis,
)
from worth_it.services import (
    convert_sim_param_configs_to_internal,
    convert_typed_base_params_to_internal,
)

from ..dependencies import (
    create_ws_error_message,
    get_client_ip,
    limiter,
    track_websocket_connection,
    ws_connection_tracker,
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["monte-carlo"],
)


@router.post("/monte-carlo", response_model=MonteCarloResponse)
@limiter.limit(f"{settings.RATE_LIMIT_MONTE_CARLO_PER_MINUTE}/minute")
async def run_monte_carlo(request: Request, body: MonteCarloRequest):
    """Run Monte Carlo simulation for probabilistic analysis.

    This endpoint performs thousands of simulations with varying parameters
    to understand the range of potential outcomes.
    """
    try:
        # Convert typed models to internal format for calculations
        base_params = convert_typed_base_params_to_internal(body.base_params)
        sim_param_configs = convert_sim_param_configs_to_internal(body.sim_param_configs)

        results = mc_run_simulation(
            num_simulations=body.num_simulations,
            base_params=base_params,
            sim_param_configs=sim_param_configs,
        )
        return MonteCarloResponse(
            net_outcomes=results["net_outcomes"].tolist(),
            simulated_valuations=results["simulated_valuations"].tolist(),
        )
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for Monte Carlo simulation") from e


@router.post("/sensitivity-analysis", response_model=SensitivityAnalysisResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def run_sensitivity(request: Request, body: SensitivityAnalysisRequest):
    """Run sensitivity analysis to identify key variables.

    This endpoint analyzes how each variable impacts the final outcome
    to identify the most influential factors.
    """
    try:
        # Convert typed models to internal format for calculations
        base_params = convert_typed_base_params_to_internal(body.base_params)
        sim_param_configs = convert_sim_param_configs_to_internal(body.sim_param_configs)

        df = mc_sensitivity_analysis(
            base_params=base_params,
            sim_param_configs=sim_param_configs,
        )
        return SensitivityAnalysisResponse(data=df.to_dict(orient="records"))  # type: ignore[arg-type]
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for sensitivity analysis") from e


# =============================================================================
# WebSocket Endpoint
# =============================================================================


async def _run_simulation_with_progress(
    websocket: WebSocket,
    request: MonteCarloRequest,
    base_params: dict,
    sim_param_configs: dict,
) -> None:
    """Run Monte Carlo simulation with progress updates.

    This is the core simulation logic, separated out to enable timeout wrapping.

    Args:
        websocket: WebSocket connection to send progress updates
        request: Original request (used for num_simulations)
        base_params: Converted base parameters in internal format
        sim_param_configs: Converted sim param configs in internal format
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
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            partial(
                mc_run_simulation,
                num_simulations=current_batch_size,
                base_params=base_params,
                sim_param_configs=sim_param_configs,
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


# Create a separate router for WebSocket (no prefix needed)
ws_router = APIRouter(tags=["monte-carlo"])


@ws_router.websocket("/ws/monte-carlo")
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
        - {"type": "error", "error": {"code": "...", "message": "...", "details": [...]}}
    """
    client_ip = get_client_ip(websocket)

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
                create_ws_error_message(
                    code=ErrorCode.RATE_LIMIT_ERROR,
                    message=(
                        "Rate limit exceeded. Please close other Monte Carlo "
                        "connections or try again later."
                    ),
                )
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
                # Extract field-level errors from Pydantic validation
                field_errors = [
                    FieldError(
                        field=".".join(str(loc) for loc in err["loc"]),
                        message=err["msg"],
                    )
                    for err in e.errors()
                ]
                await websocket.send_json(
                    create_ws_error_message(
                        code=ErrorCode.VALIDATION_ERROR,
                        message="Invalid simulation parameters",
                        details=field_errors if field_errors else None,
                    )
                )
                logger.warning(
                    f"Invalid Monte Carlo request from {client_ip}: {e}"
                )
                return

            # Convert typed models to internal format for calculations
            base_params = convert_typed_base_params_to_internal(request.base_params)
            sim_param_configs = convert_sim_param_configs_to_internal(request.sim_param_configs)

            # Run simulation with timeout
            try:
                await asyncio.wait_for(
                    _run_simulation_with_progress(websocket, request, base_params, sim_param_configs),
                    timeout=settings.WS_SIMULATION_TIMEOUT_SECONDS,
                )
            except TimeoutError:
                logger.warning(
                    f"Simulation timeout for IP {client_ip} after "
                    f"{settings.WS_SIMULATION_TIMEOUT_SECONDS}s "
                    f"({request.num_simulations} simulations requested)"
                )
                try:
                    await websocket.send_json(
                        create_ws_error_message(
                            code=ErrorCode.CALCULATION_ERROR,
                            message=f"Simulation timed out after {settings.WS_SIMULATION_TIMEOUT_SECONDS} seconds",
                        )
                    )
                except Exception as send_err:
                    logger.debug(f"Failed to send timeout error to client: {send_err}")

        except WebSocketDisconnect:
            logger.info(f"WebSocket client {client_ip} disconnected during Monte Carlo simulation")
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from WebSocket client {client_ip}")
            try:
                await websocket.send_json(
                    create_ws_error_message(
                        code=ErrorCode.VALIDATION_ERROR,
                        message="Invalid JSON in request",
                    )
                )
            except Exception:
                logger.error("Failed to send error message to WebSocket client")
        except (ValueError, TypeError, KeyError) as e:
            # Known calculation errors - log and send sanitized message
            logger.error(f"Calculation error in WebSocket Monte Carlo from {client_ip}: {e}", exc_info=True)
            try:
                await websocket.send_json(
                    create_ws_error_message(
                        code=ErrorCode.CALCULATION_ERROR,
                        message="Invalid parameters for simulation",
                    )
                )
            except Exception:
                logger.error("Failed to send error message to WebSocket client")
        except Exception as e:
            # Unexpected errors - log full details but send generic message
            logger.exception(f"Unexpected error in WebSocket Monte Carlo from {client_ip}: {e}")
            try:
                await websocket.send_json(
                    create_ws_error_message(
                        code=ErrorCode.INTERNAL_ERROR,
                        message="An unexpected error occurred during simulation",
                    )
                )
            except Exception:
                logger.error("Failed to send error message to WebSocket client")
        finally:
            try:
                await websocket.close()
            except Exception:
                logger.debug("WebSocket already closed")
