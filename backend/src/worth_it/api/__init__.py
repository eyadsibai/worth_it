"""FastAPI backend for the Worth It application.

This module provides REST API endpoints for all financial calculation functions,
enabling the frontend to communicate with the backend via HTTP and WebSocket.

The API is organized into domain-specific routers:
- scenarios: Startup scenario calculations, IRR, NPV, comparisons
- monte_carlo: Monte Carlo simulations and sensitivity analysis
- cap_table: Cap table operations, waterfall analysis, dilution
- valuation: Company valuation methods (Revenue Multiple, DCF, VC Method)
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from worth_it.config import settings
from worth_it.exceptions import CalculationError, ValidationError, WorthItError
from worth_it.models import ErrorCode, FieldError, HealthCheckResponse

from .dependencies import WebSocketConnectionTracker as WebSocketConnectionTracker
from .dependencies import create_error_response, limiter
from .dependencies import startup_service as startup_service
from .dependencies import track_websocket_connection as track_websocket_connection
from .dependencies import ws_connection_tracker as ws_connection_tracker
from .routers import cap_table, monte_carlo, scenarios, valuation

# Configure logging
logger = logging.getLogger(__name__)

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


# =============================================================================
# Global Exception Handlers
# =============================================================================


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle FastAPI request validation errors with field details."""
    logger.warning(f"Request validation error on {request.url.path}: {exc}")

    # Extract field-level errors from Pydantic validation
    field_errors = [
        FieldError(
            field=".".join(str(loc) for loc in err["loc"] if loc != "body"),
            message=err["msg"],
        )
        for err in exc.errors()
    ]

    return create_error_response(
        code=ErrorCode.VALIDATION_ERROR,
        message="Invalid input parameters",
        status_code=400,
        details=field_errors if field_errors else None,
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle application validation errors with 400 status code."""
    logger.warning(f"Validation error on {request.url.path}: {exc}")
    return create_error_response(
        code=ErrorCode.VALIDATION_ERROR,
        message="Invalid input. Please check your request and try again.",
        status_code=400,
    )


@app.exception_handler(CalculationError)
async def calculation_error_handler(request: Request, exc: CalculationError) -> JSONResponse:
    """Handle calculation errors with 400 status code."""
    logger.error(f"Calculation error on {request.url.path}: {exc}", exc_info=True)
    return create_error_response(
        code=ErrorCode.CALCULATION_ERROR,
        message="Calculation failed with provided parameters",
        status_code=400,
    )


@app.exception_handler(WorthItError)
async def worthit_error_handler(request: Request, exc: WorthItError) -> JSONResponse:
    """Handle any other WorthIt errors with 500 status code."""
    logger.error(f"Application error on {request.url.path}: {exc}", exc_info=True)
    return create_error_response(
        code=ErrorCode.INTERNAL_ERROR,
        message="An application error occurred",
        status_code=500,
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors - log full details but return sanitized message."""
    logger.exception(f"Unexpected error on {request.url.path}: {exc}")
    return create_error_response(
        code=ErrorCode.INTERNAL_ERROR,
        message="An unexpected error occurred",
        status_code=500,
    )


# =============================================================================
# Health Check Endpoint
# =============================================================================


@app.get("/health", response_model=HealthCheckResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def health_check(request: Request):
    """Health check endpoint to verify API is running."""
    return HealthCheckResponse(status="healthy", version="1.0.0")


# =============================================================================
# Include Routers
# =============================================================================

# Scenario calculation endpoints
app.include_router(scenarios.router)

# Monte Carlo simulation endpoints (REST)
app.include_router(monte_carlo.router)

# Monte Carlo WebSocket endpoint (separate router without /api prefix)
app.include_router(monte_carlo.ws_router)

# Cap table and waterfall endpoints
app.include_router(cap_table.router)

# Valuation calculator endpoints
app.include_router(valuation.router)


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        log_level=settings.LOG_LEVEL.lower(),
    )
