# API Router Refactoring Design

**Issue**: #247 - Split API into routers and standardize service usage
**Date**: 2025-12-21
**Status**: Implemented

## Problem

The `api.py` file had grown to 1056 lines with 17+ endpoints and a WebSocket handler all in a single file. This made the code harder to navigate, test independently, and maintain.

## Solution

Split the monolithic `api.py` into domain-specific routers following FastAPI best practices.

## Architecture

### File Structure

```
backend/src/worth_it/
├── api/
│   ├── __init__.py          # FastAPI app, CORS, exception handlers, router wiring
│   ├── dependencies.py      # Shared: rate limiter, services, WebSocket tracker
│   └── routers/
│       ├── __init__.py      # Package exports
│       ├── scenarios.py     # Startup scenario calculations (6 endpoints)
│       ├── monte_carlo.py   # Simulations + WebSocket (3 endpoints)
│       ├── cap_table.py     # Cap table operations (4 endpoints)
│       └── valuation.py     # Valuation methods (4 endpoints)
└── api_old.py               # REMOVED (was backward compat, not needed)
```

### Router Organization

| Router | Prefix | Endpoints | Description |
|--------|--------|-----------|-------------|
| `scenarios` | `/api` | 6 | Monthly grid, opportunity cost, startup scenario, IRR, NPV, compare |
| `monte_carlo` | `/api` | 2 REST + 1 WS | Monte Carlo, sensitivity, WebSocket simulation |
| `cap_table` | `/api` | 4 | Dilution, conversion, waterfall, preview |
| `valuation` | `/api/valuation` | 4 | Revenue multiple, DCF, VC method, compare |

### Shared Dependencies

`dependencies.py` contains:
- `limiter` - Rate limiter instance
- `startup_service` - StartupService for scenario calculations
- `cap_table_service` - CapTableService for cap table operations
- `WebSocketConnectionTracker` - Connection tracking for WS rate limiting
- `track_websocket_connection` - Context manager for WS connection lifecycle
- `get_client_ip` - IP extraction for rate limiting

## Design Decisions

### 1. Router Prefixes

**Decision**: Use `/api` prefix for most routers, `/api/valuation` for valuation.

**Rationale**: The existing URL structure wasn't designed with routers in mind. Rather than breaking backward compatibility, we use the generic `/api` prefix and define full paths in routes. Only `valuation` has a clean sub-hierarchy.

### 2. WebSocket Handling

**Decision**: Extract tracker infrastructure to `dependencies.py`, keep WS endpoint in `monte_carlo.py`.

**Rationale**:
- The `WebSocketConnectionTracker` is reusable infrastructure, not Monte Carlo-specific
- The actual endpoint logic belongs with its REST sibling
- Future WebSocket endpoints can reuse the tracker

### 3. No Backward Compatibility Shim Needed

**Decision**: Don't create a separate `api.py` shim file.

**Rationale**: When `api/` is a package, `from worth_it.api import app` automatically imports from `api/__init__.py`. Python's import system handles this natively.

### 4. Re-exports for Tests

**Decision**: Re-export `WebSocketConnectionTracker` and related utilities from `api/__init__.py`.

**Rationale**: Tests were importing these from `worth_it.api`. Re-exporting maintains backward compatibility without requiring test changes.

## Validation

- **272 backend tests pass** (all existing tests work without modification)
- **Ruff check passes** (no linting errors)
- **Pyright passes** (no type errors)
- **All URLs unchanged** (complete backward compatibility)

## Future Considerations

1. **Service Standardization**: All endpoints now go through services or calculation modules. The pattern is consistent.

2. **Testing Per Domain**: Can now run `pytest tests/test_api.py -k scenarios` to test just scenario endpoints.

3. **OpenAPI Tags**: Each router has its own tag, improving API documentation grouping.

4. **Additional Routers**: New features can add new routers without touching existing ones.
