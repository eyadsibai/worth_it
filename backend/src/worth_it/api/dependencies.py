"""Shared dependencies for API routers.

This module contains shared infrastructure used across all API routers:
- Rate limiter configuration
- Service instances for dependency injection
- WebSocket connection tracking for rate limiting
- Error response helpers
"""

import asyncio
from collections import defaultdict
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import WebSocket
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from worth_it.config import settings
from worth_it.models import ErrorCode, ErrorDetail, ErrorResponse, FieldError
from worth_it.services import CapTableService, StartupService

# =============================================================================
# Rate Limiter
# =============================================================================

limiter = Limiter(
    key_func=get_remote_address,
    enabled=settings.RATE_LIMIT_ENABLED,
    default_limits=[],  # No default limits, we'll set per-endpoint
)


# =============================================================================
# Service Instances (Dependency Injection)
# =============================================================================

startup_service = StartupService()
cap_table_service = CapTableService()


# =============================================================================
# Error Response Helpers
# =============================================================================


def create_error_response(
    code: ErrorCode,
    message: str,
    status_code: int,
    details: list[FieldError] | None = None,
) -> JSONResponse:
    """Create a standardized error response.

    Args:
        code: Machine-readable error code
        message: Human-readable error message
        status_code: HTTP status code
        details: Optional field-level error details

    Returns:
        JSONResponse with structured error format
    """
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            error=ErrorDetail(code=code, message=message, details=details)
        ).model_dump(),
    )


def create_ws_error_message(
    code: ErrorCode,
    message: str,
    details: list[FieldError] | None = None,
) -> dict:
    """Create a standardized WebSocket error message.

    Args:
        code: Machine-readable error code
        message: Human-readable error message
        details: Optional field-level error details

    Returns:
        Dict with structured WebSocket error format
    """
    return {
        "type": "error",
        "error": ErrorDetail(code=code, message=message, details=details).model_dump(),
    }


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
            self._connections[client_ip] = max(0, self._connections[client_ip] - 1)
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


# Global WebSocket connection tracker instance
ws_connection_tracker = WebSocketConnectionTracker()


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


def get_client_ip(websocket: WebSocket) -> str:
    """Extract client IP from WebSocket connection.

    Checks X-Forwarded-For header for reverse proxy scenarios,
    falls back to direct client host if not present.

    SECURITY NOTE: The X-Forwarded-For header can be spoofed by clients.
    When deploying behind a reverse proxy (nginx, AWS ALB, etc.), ensure
    the proxy is configured to overwrite (not append to) this header.
    Without proper proxy configuration, malicious clients could set arbitrary
    X-Forwarded-For values to evade per-IP rate limiting.
    """
    # Check for forwarded IP (reverse proxy)
    forwarded = websocket.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For can contain multiple IPs; first is the original client
        return forwarded.split(",")[0].strip()

    # Fall back to direct client host
    client = websocket.client
    return client.host if client else "unknown"
