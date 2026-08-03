"""Shared dependencies for API routers.

This module contains shared infrastructure used across all API routers:
- Client identity resolution (shared trusted-proxy model)
- Rate limiter configuration
- Service instances for dependency injection
- WebSocket connection tracking for rate limiting
- Error response helpers
"""

import asyncio
import ipaddress
from collections import defaultdict
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import Request, WebSocket
from fastapi.responses import JSONResponse
from slowapi import Limiter
from starlette.requests import HTTPConnection

from worth_it.config import Settings, settings
from worth_it.models import ErrorCode, ErrorDetail, ErrorResponse, FieldError
from worth_it.services import CapTableService, StartupService

# =============================================================================
# Client Identity (shared trust model for HTTP and WebSocket rate limiting)
# =============================================================================

UNKNOWN_CLIENT_IP = "unknown"

IPAddress = ipaddress.IPv4Address | ipaddress.IPv6Address
IPNetwork = ipaddress.IPv4Network | ipaddress.IPv6Network


def get_trusted_proxies() -> tuple[IPNetwork, ...]:
    """Resolve the configured trusted proxy networks.

    Read off the Settings class rather than the import-time singleton so the
    value tracks the current environment; TRUSTED_PROXIES is a declared setting,
    so backend/.env and real environment variables both reach here. Defaults to
    trusting nothing, which makes X-Forwarded-For inert until an operator
    declares which peers are allowed to set it.
    """
    return tuple(Settings.TRUSTED_PROXIES)


def _parse_ip(value: str) -> IPAddress | None:
    try:
        return ipaddress.ip_address(value)
    except ValueError:
        return None


def _parse_hop(token: str) -> IPAddress | None:
    """Normalise one X-Forwarded-For hop to an address, or None if it is not one.

    Real chains carry more than bare addresses: Azure Front Door and some
    ALB/NLB configurations emit "ip:port", IPv6 hops arrive bracketed, and RFC
    7239 explicitly permits the "unknown" token and obfuscated identifiers.
    """
    candidate = token.strip().strip('"')
    if candidate.startswith("["):
        candidate = candidate[1:].partition("]")[0]
    elif candidate.count(":") == 1:
        # "ip:port" - a bare IPv6 address always carries more than one colon.
        candidate = candidate.partition(":")[0]
    return _parse_ip(candidate)


def _is_trusted_peer(address: str, trusted: tuple[IPNetwork, ...]) -> bool:
    ip = _parse_ip(address)
    return ip is not None and any(ip in network for network in trusted)


def _client_from_forwarded_chain(forwarded: str, trusted: tuple[IPNetwork, ...]) -> str | None:
    """Resolve the right-most forwarded hop that is not itself a trusted proxy.

    Hops that do not parse are skipped, not fatal. Abandoning the chain on one
    bad hop would let any client prepend a junk token to force itself onto the
    proxy's shared bucket, and would collapse every request onto the load
    balancer whenever it emits a port or the RFC-permitted "unknown" token.

    Returns None only when no hop parses at all, so the caller falls back to the
    socket peer rather than keying off attacker text.
    """
    hops = [hop for hop in map(_parse_hop, forwarded.split(",")) if hop is not None]
    if not hops:
        return None

    for hop in reversed(hops):
        if not any(hop in network for network in trusted):
            return str(hop)

    # Every hop is one of ours, so the origin client is the left-most entry.
    return str(hops[0])


def resolve_client_ip(connection: HTTPConnection) -> str:
    """Resolve the client identity used as the rate-limiting bucket key.

    X-Forwarded-For is honoured only when the immediate socket peer is a
    configured trusted proxy; otherwise the socket peer address wins. HTTP and
    WebSocket connections share this function so a single request shape yields a
    single identity on both surfaces.
    """
    client = connection.client
    peer = client.host if client else UNKNOWN_CLIENT_IP

    trusted = get_trusted_proxies()
    if not trusted or not _is_trusted_peer(peer, trusted):
        return peer

    # getlist, not get: a proxy may append its hop as a separate X-Forwarded-For
    # line instead of extending the first one, and RFC 9110 5.3 says repeated
    # field lines are one comma-joined list. Reading only the first line would
    # hand the client the entire chain, putting its own text right-most-untrusted.
    forwarded = ",".join(connection.headers.getlist("x-forwarded-for"))
    if not forwarded:
        return peer

    return _client_from_forwarded_chain(forwarded, trusted) or peer


def get_http_client_ip(request: Request) -> str:
    """Rate-limit key function for HTTP endpoints."""
    # The parameter must stay named "request": slowapi inspects the signature and
    # only forwards the request object when a parameter of that name exists.
    return resolve_client_ip(request)


# =============================================================================
# Rate Limiter
# =============================================================================

limiter = Limiter(
    key_func=get_http_client_ip,
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
        max_concurrent: int = settings.WS_MAX_CONCURRENT_PER_IP
        async with self._lock:
            return self._connections[client_ip] < max_concurrent

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
    """Extract the rate-limiting client identity from a WebSocket connection.

    Uses the same trusted-proxy model as the HTTP limiter; see resolve_client_ip.
    """
    return resolve_client_ip(websocket)
