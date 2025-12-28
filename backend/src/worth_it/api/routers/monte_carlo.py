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
from typing import Any

import numpy as np
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from pydantic import ValidationError as PydanticValidationError

from worth_it.calculations.monte_carlo_valuation import (
    DistributionType,
    MonteCarloConfig,
    ParameterDistribution,
)
from worth_it.calculations.monte_carlo_valuation import (
    run_monte_carlo_simulation as run_valuation_mc,
)
from worth_it.calculations.valuation import (
    FirstChicagoParams,
    FirstChicagoScenario,
    calculate_first_chicago,
)
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
                logger.warning(f"Invalid Monte Carlo request from {client_ip}: {e}")
                return

            # Convert typed models to internal format for calculations
            base_params = convert_typed_base_params_to_internal(request.base_params)
            sim_param_configs = convert_sim_param_configs_to_internal(request.sim_param_configs)

            # Run simulation with timeout
            try:
                await asyncio.wait_for(
                    _run_simulation_with_progress(
                        websocket, request, base_params, sim_param_configs
                    ),
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
            logger.error(
                f"Calculation error in WebSocket Monte Carlo from {client_ip}: {e}", exc_info=True
            )
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


# =============================================================================
# Valuation Monte Carlo WebSocket Endpoint
# =============================================================================


def _get_valuation_function(method: str) -> Any:
    """Get valuation function based on method name.

    Args:
        method: Valuation method name

    Returns:
        Callable valuation function wrapper
    """
    if method == "first_chicago":

        def first_chicago_wrapper(
            best_prob: float,
            best_value: float,
            base_prob: float,
            base_value: float,
            worst_prob: float,
            worst_value: float,
            discount_rate: float,
            years: int,
        ) -> float:
            total_prob = best_prob + base_prob + worst_prob
            # Guard against division by zero if all probabilities are zero
            if total_prob <= 0:
                total_prob = 1.0  # Fallback to equal weights
            params = FirstChicagoParams(
                scenarios=[
                    FirstChicagoScenario("Best", best_prob / total_prob, best_value, years),
                    FirstChicagoScenario("Base", base_prob / total_prob, base_value, years),
                    FirstChicagoScenario("Worst", worst_prob / total_prob, worst_value, years),
                ],
                discount_rate=discount_rate,
            )
            result = calculate_first_chicago(params)
            return result.present_value

        return first_chicago_wrapper

    raise ValueError(f"Unknown valuation method: {method}")


@ws_router.websocket("/ws/valuation-monte-carlo")
async def websocket_valuation_monte_carlo(websocket: WebSocket) -> None:
    """WebSocket endpoint for streaming valuation Monte Carlo results.

    Accepts configuration, runs simulation in batches, streams progress updates.

    Message format:
    - Input (JSON):
        {
            "method": "first_chicago",
            "distributions": [
                {"name": "param_name", "distribution_type": "normal", "params": {"mean": 0.25, "std": 0.05}}
            ],
            "n_simulations": 10000,
            "batch_size": 1000
        }
    - Output (JSON):
        - {"type": "progress", "progress": 0.5, "completed": 5000, "total": 10000}
        - {"type": "complete", "result": {...statistics...}}
        - {"type": "error", "message": "..."}
    """
    client_ip = get_client_ip(websocket)

    async with track_websocket_connection(ws_connection_tracker, client_ip) as registered:
        if not registered:
            logger.warning(f"WebSocket rate limit exceeded for IP {client_ip}")
            await websocket.accept()
            await websocket.send_json(
                create_ws_error_message(
                    code=ErrorCode.RATE_LIMIT_ERROR,
                    message="Rate limit exceeded. Try again later.",
                )
            )
            await websocket.close(code=1008, reason="Rate limit exceeded")
            return

        await websocket.accept()
        logger.debug(f"Valuation Monte Carlo WebSocket accepted for IP {client_ip}")

        try:
            # Receive configuration
            data = await websocket.receive_text()
            config_data = json.loads(data)

            # Parse configuration
            method = config_data.get("method", "first_chicago")
            distributions = config_data.get("distributions", [])
            n_simulations = min(config_data.get("n_simulations", 10000), 100000)
            batch_size = min(config_data.get("batch_size", 1000), 5000)

            # Validate distributions are provided
            if not distributions:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "No distributions provided. At least one distribution is required.",
                    }
                )
                return

            # Get valuation function based on method
            try:
                valuation_fn = _get_valuation_function(method)
            except ValueError as e:
                await websocket.send_json({"type": "error", "message": str(e)})
                return

            # Convert distributions to ParameterDistribution objects with validation
            try:
                param_dists = []
                for d in distributions:
                    if "name" not in d:
                        raise ValueError("Distribution missing required 'name' field")
                    if "distribution_type" not in d:
                        raise ValueError(
                            f"Distribution '{d.get('name', 'unknown')}' missing 'distribution_type'"
                        )
                    if "params" not in d:
                        raise ValueError(f"Distribution '{d['name']}' missing 'params'")

                    param_dists.append(
                        ParameterDistribution(
                            name=d["name"],
                            distribution_type=DistributionType(d["distribution_type"]),
                            params=d["params"],
                        )
                    )
            except (ValueError, KeyError) as e:
                await websocket.send_json(
                    {"type": "error", "message": f"Invalid distribution configuration: {e}"}
                )
                return

            # Run simulation in batches
            all_valuations: list[float] = []
            for batch_start in range(0, n_simulations, batch_size):
                batch_end = min(batch_start + batch_size, n_simulations)
                batch_count = batch_end - batch_start

                # Run batch in thread pool (CPU-bound)
                loop = asyncio.get_event_loop()
                config = MonteCarloConfig(
                    valuation_function=valuation_fn,
                    parameter_distributions=param_dists,
                    n_simulations=batch_count,
                )
                result = await loop.run_in_executor(None, run_valuation_mc, config)
                all_valuations.extend(result.valuations.tolist())

                # Send progress update
                progress = batch_end / n_simulations
                await websocket.send_json(
                    {
                        "type": "progress",
                        "progress": progress,
                        "completed": batch_end,
                        "total": n_simulations,
                    }
                )

            # Calculate final statistics
            valuations = np.array(all_valuations)
            histogram_counts, histogram_bins = np.histogram(valuations, bins=50)

            await websocket.send_json(
                {
                    "type": "complete",
                    "result": {
                        "mean": float(np.mean(valuations)),
                        "std": float(np.std(valuations)),
                        "min": float(np.min(valuations)),
                        "max": float(np.max(valuations)),
                        "percentile_10": float(np.percentile(valuations, 10)),
                        "percentile_25": float(np.percentile(valuations, 25)),
                        "percentile_50": float(np.percentile(valuations, 50)),
                        "percentile_75": float(np.percentile(valuations, 75)),
                        "percentile_90": float(np.percentile(valuations, 90)),
                        "histogram_bins": histogram_bins.tolist(),
                        "histogram_counts": histogram_counts.tolist(),
                    },
                }
            )

        except WebSocketDisconnect:
            logger.info(f"Valuation Monte Carlo WebSocket client {client_ip} disconnected")
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from {client_ip}")
            try:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
            except Exception:
                logger.debug("Failed to send JSON error to client")
        except Exception as e:
            logger.exception(f"Error in valuation Monte Carlo from {client_ip}: {e}")
            try:
                await websocket.send_json({"type": "error", "message": str(e)})
            except Exception:
                logger.debug("Failed to send error message to client")
        finally:
            try:
                await websocket.close()
            except Exception:
                logger.debug("WebSocket already closed")
