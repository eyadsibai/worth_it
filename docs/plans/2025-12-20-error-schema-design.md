# API Error Schema Alignment Design

**Issue:** #244 - Align API error schema with frontend handling
**Date:** 2025-12-20
**Status:** Approved

## Problem Statement

The backend API error responses don't follow a consistent schema, making it difficult for the frontend to handle errors uniformly:

1. **Property mismatch:** Frontend expects `detail` but backend sends `message`
2. **Fragile type detection:** Frontend parses error messages with string matching
3. **No field-level errors:** Validation errors don't indicate which field failed
4. **REST/WebSocket inconsistency:** Different error formats for each transport

## Solution: Nested Error Structure

### Error Response Model

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": [
      {"field": "exit_year", "message": "must be between 1 and 20"}
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `CALCULATION_ERROR` | 400 | Calculation failed with provided values |
| `RATE_LIMIT_ERROR` | 429 | Too many requests |
| `NOT_FOUND_ERROR` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Backend Changes

### 1. Pydantic Models (`models.py`)

```python
from enum import Enum
from typing import Optional

class ErrorCode(str, Enum):
    VALIDATION_ERROR = "VALIDATION_ERROR"
    CALCULATION_ERROR = "CALCULATION_ERROR"
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR"
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"

class FieldError(BaseModel):
    field: str
    message: str

class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str
    details: Optional[list[FieldError]] = None

class ErrorResponse(BaseModel):
    error: ErrorDetail
```

### 2. Exception Handlers (`api.py`)

```python
def create_error_response(
    code: ErrorCode,
    message: str,
    status_code: int,
    details: list[FieldError] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            error=ErrorDetail(code=code, message=message, details=details)
        ).model_dump()
    )

@app.exception_handler(PydanticValidationError)
async def pydantic_validation_handler(request: Request, exc: PydanticValidationError):
    field_errors = [
        FieldError(field=".".join(str(loc) for loc in err["loc"]), message=err["msg"])
        for err in exc.errors()
    ]
    return create_error_response(
        code=ErrorCode.VALIDATION_ERROR,
        message="Invalid input parameters",
        status_code=400,
        details=field_errors
    )
```

### 3. WebSocket Errors

```python
async def send_ws_error(websocket: WebSocket, code: ErrorCode, message: str, details: list = None):
    await websocket.send_json({
        "type": "error",
        "error": ErrorDetail(code=code, message=message, details=details).model_dump()
    })
```

## Frontend Changes

### 1. Zod Schemas (`schemas.ts`)

```typescript
export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "CALCULATION_ERROR",
  "RATE_LIMIT_ERROR",
  "NOT_FOUND_ERROR",
  "INTERNAL_ERROR"
]);

export const FieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const ErrorDetailSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.array(FieldErrorSchema).optional(),
});

export const APIErrorResponseSchema = z.object({
  error: ErrorDetailSchema,
});
```

### 2. API Client (`api-client.ts`)

```typescript
export class APIError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: FieldError[]
  ) {
    super(message);
    this.name = "APIError";
  }
}

// Updated interceptor
this.client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      const parsed = APIErrorResponseSchema.safeParse(error.response.data);
      if (parsed.success) {
        throw new APIError(
          parsed.data.error.code,
          parsed.data.error.message,
          parsed.data.error.details
        );
      }
    }
    throw new APIError("INTERNAL_ERROR", error.message || "Request failed");
  }
);
```

### 3. Hook Updates (`use-scenario-calculation.ts`)

Replace string-based error type detection with code-based:

```typescript
const getErrorType = (err: Error | null): ErrorType => {
  if (!err) return "generic";

  if (err instanceof APIError) {
    switch (err.code) {
      case "VALIDATION_ERROR": return "validation";
      case "CALCULATION_ERROR": return "calculation";
      case "RATE_LIMIT_ERROR": return "rate_limit";
      default: return "generic";
    }
  }

  if (err.message.includes("No response from server")) return "network";
  return "generic";
};
```

## Testing Strategy

### Backend Tests

```python
def test_validation_error_format():
    response = client.post("/api/startup-scenario", json={"exit_year": 100})
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert any(d["field"] == "exit_year" for d in data["error"]["details"])
```

### Frontend Tests

```typescript
it("parses structured API errors correctly", () => {
  const error = new APIError("VALIDATION_ERROR", "Invalid input", [
    { field: "exit_year", message: "must be between 1 and 20" }
  ]);
  expect(error.code).toBe("VALIDATION_ERROR");
  expect(error.details?.[0].field).toBe("exit_year");
});
```

## Implementation Order

1. Backend: Add error models to `models.py`
2. Backend: Update exception handlers in `api.py`
3. Backend: Update WebSocket error handling
4. Backend: Add tests
5. Frontend: Add Zod schemas
6. Frontend: Add `APIError` class and update interceptor
7. Frontend: Update hooks and components
8. Frontend: Add tests

## Files Changed

| File | Changes |
|------|---------|
| `backend/src/worth_it/models.py` | Add error models |
| `backend/src/worth_it/api.py` | Update exception handlers |
| `backend/tests/test_api.py` | Add error format tests |
| `frontend/lib/schemas.ts` | Add error schemas |
| `frontend/lib/api-client.ts` | Add APIError class, update interceptor |
| `frontend/lib/hooks/use-scenario-calculation.ts` | Replace string matching |
| `frontend/__tests__/lib/api-client.test.ts` | Add error tests |

## Breaking Changes

This is a breaking change to the API error response format. Frontend must be updated simultaneously with backend.
