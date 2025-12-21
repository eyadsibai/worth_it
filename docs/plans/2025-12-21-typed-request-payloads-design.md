# Issue #248: Add Typed Models for Dynamic Request Payloads

## Overview

Replace loosely-typed `dict[str, Any]` and `z.record(z.string(), z.any())` patterns with fully typed models across frontend and backend for Monte Carlo, Sensitivity Analysis, and Startup Scenario requests.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | All three areas (Monte Carlo, Sensitivity, Startup) | Comprehensive type safety |
| Typing Strategy | Strict typed models | Maximum compile-time and runtime validation |
| Startup Params | Discriminated union (RSU vs Stock Options) | Type-safe, self-documenting, matches form usage |
| Sim Param Configs | Explicit parameter enum | Prevents typos, enables IDE autocomplete |

## Backend Changes

### New Models in `models.py`

#### Variable Parameter Enum

```python
from enum import Enum

class VariableParam(str, Enum):
    """Parameters that can be varied in Monte Carlo/Sensitivity analysis."""

    EXIT_VALUATION = "exit_valuation"
    EXIT_YEAR = "exit_year"
    FAILURE_PROBABILITY = "failure_probability"
    CURRENT_JOB_MONTHLY_SALARY = "current_job_monthly_salary"
    STARTUP_MONTHLY_SALARY = "startup_monthly_salary"
    CURRENT_JOB_SALARY_GROWTH_RATE = "current_job_salary_growth_rate"
    ANNUAL_ROI = "annual_roi"
    TOTAL_EQUITY_GRANT_PCT = "total_equity_grant_pct"
    NUM_OPTIONS = "num_options"
    STRIKE_PRICE = "strike_price"
    EXIT_PRICE_PER_SHARE = "exit_price_per_share"
```

#### Simulation Parameter Range

```python
class SimParamRange(BaseModel):
    """Range for a simulation parameter."""
    min: float
    max: float

    @model_validator(mode="after")
    def validate_min_less_than_max(self) -> Self:
        if self.min > self.max:
            raise ValueError(f"min ({self.min}) must be <= max ({self.max})")
        return self
```

#### Startup Params (Discriminated Union)

```python
class RSUParams(BaseModel):
    """RSU equity parameters."""
    equity_type: Literal["RSU"]
    monthly_salary: float = Field(..., ge=0)
    total_equity_grant_pct: float = Field(..., ge=0, le=100)
    vesting_period: int = Field(default=4, ge=1, le=10)
    cliff_period: int = Field(default=1, ge=0, le=5)
    exit_valuation: float = Field(..., ge=0)
    simulate_dilution: bool = False
    dilution_rounds: list[DilutionRound] | None = None

class StockOptionsParams(BaseModel):
    """Stock options equity parameters."""
    equity_type: Literal["STOCK_OPTIONS"]
    monthly_salary: float = Field(..., ge=0)
    num_options: int = Field(..., ge=0)
    strike_price: float = Field(..., ge=0)
    vesting_period: int = Field(default=4, ge=1, le=10)
    cliff_period: int = Field(default=1, ge=0, le=5)
    exit_price_per_share: float = Field(..., ge=0)
    exercise_strategy: Literal["AT_EXIT", "AFTER_VESTING"] = "AT_EXIT"
    exercise_year: int | None = None

StartupParams = RSUParams | StockOptionsParams
```

#### Base Parameters

```python
class BaseParams(BaseModel):
    """Typed base parameters for Monte Carlo and Sensitivity Analysis."""

    exit_year: int = Field(..., ge=1, le=20)
    current_job_monthly_salary: float = Field(..., ge=0)
    startup_monthly_salary: float = Field(..., ge=0)
    current_job_salary_growth_rate: float = Field(..., ge=0, le=1)
    annual_roi: float = Field(..., ge=0, le=1)
    investment_frequency: Literal["Monthly", "Annually"]
    failure_probability: float = Field(..., ge=0, le=1)
    startup_params: RSUParams | StockOptionsParams
```

#### Updated Request Models

```python
class MonteCarloRequest(BaseModel):
    num_simulations: int = Field(..., ge=1, le=100000)
    base_params: BaseParams
    sim_param_configs: dict[VariableParam, SimParamRange]

class SensitivityAnalysisRequest(BaseModel):
    base_params: BaseParams
    sim_param_configs: dict[VariableParam, SimParamRange]

class StartupScenarioRequest(BaseModel):
    opportunity_cost_data: list[dict[str, Any]]  # Keep flexible (tabular data)
    startup_params: RSUParams | StockOptionsParams
```

## Frontend Changes

### New Schemas in `schemas.ts`

#### Variable Parameter Enum

```typescript
export const VariableParamEnum = z.enum([
  "exit_valuation",
  "exit_year",
  "failure_probability",
  "current_job_monthly_salary",
  "startup_monthly_salary",
  "current_job_salary_growth_rate",
  "annual_roi",
  "total_equity_grant_pct",
  "num_options",
  "strike_price",
  "exit_price_per_share",
]);
export type VariableParam = z.infer<typeof VariableParamEnum>;
```

#### Simulation Parameter Range

```typescript
export const SimParamRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
}).refine(data => data.min <= data.max, {
  message: "min must be <= max",
});
export type SimParamRange = z.infer<typeof SimParamRangeSchema>;

export const SimParamConfigsSchema = z.record(
  VariableParamEnum,
  SimParamRangeSchema
);
export type SimParamConfigs = z.infer<typeof SimParamConfigsSchema>;
```

#### Startup Params (Discriminated Union)

```typescript
export const RSUParamsSchema = z.object({
  equity_type: z.literal("RSU"),
  monthly_salary: z.number().min(0),
  total_equity_grant_pct: z.number().min(0).max(100),
  vesting_period: z.number().int().min(1).max(10).default(4),
  cliff_period: z.number().int().min(0).max(5).default(1),
  exit_valuation: z.number().min(0),
  simulate_dilution: z.boolean().default(false),
  dilution_rounds: z.array(DilutionRoundFormSchema).optional(),
});

export const StockOptionsParamsSchema = z.object({
  equity_type: z.literal("STOCK_OPTIONS"),
  monthly_salary: z.number().min(0),
  num_options: z.number().int().min(0),
  strike_price: z.number().min(0),
  vesting_period: z.number().int().min(1).max(10).default(4),
  cliff_period: z.number().int().min(0).max(5).default(1),
  exit_price_per_share: z.number().min(0),
  exercise_strategy: z.enum(["AT_EXIT", "AFTER_VESTING"]).default("AT_EXIT"),
  exercise_year: z.number().int().min(1).max(20).optional(),
});

export const StartupParamsSchema = z.discriminatedUnion("equity_type", [
  RSUParamsSchema,
  StockOptionsParamsSchema,
]);
export type StartupParams = z.infer<typeof StartupParamsSchema>;
```

#### Base Params

```typescript
export const BaseParamsSchema = z.object({
  exit_year: z.number().int().min(1).max(20),
  current_job_monthly_salary: z.number().min(0),
  startup_monthly_salary: z.number().min(0),
  current_job_salary_growth_rate: z.number().min(0).max(1),
  annual_roi: z.number().min(0).max(1),
  investment_frequency: InvestmentFrequencyEnum,
  failure_probability: z.number().min(0).max(1),
  startup_params: StartupParamsSchema,
});
export type BaseParams = z.infer<typeof BaseParamsSchema>;
```

#### Updated Request Schemas

```typescript
export const MonteCarloRequestSchema = z.object({
  num_simulations: z.number().int().min(1).max(10000),
  base_params: BaseParamsSchema,
  sim_param_configs: SimParamConfigsSchema,
});

export const SensitivityAnalysisRequestSchema = z.object({
  base_params: BaseParamsSchema,
  sim_param_configs: SimParamConfigsSchema,
});

export const StartupScenarioRequestSchema = z.object({
  opportunity_cost_data: z.array(z.record(z.string(), z.any())),
  startup_params: StartupParamsSchema,
});
```

## Migration Strategy

1. Add new typed models (keep old validators temporarily)
2. Update request models to use typed versions
3. Update frontend schemas to match
4. Update API client type imports
5. Run full test suite - fix any breakages
6. Remove the old `validate_base_params()` function (now redundant)

## Backward Compatibility

- API endpoints remain unchanged (same URLs, same HTTP methods)
- JSON serialization is compatible - Pydantic/Zod handle enum values as strings
- Existing valid requests continue to work
- Invalid requests that previously passed silently will now fail with clear errors

## Files to Modify

| File | Changes |
|------|---------|
| `backend/src/worth_it/models.py` | Add BaseParams, RSUParams, StockOptionsParams, VariableParam, SimParamRange |
| `frontend/lib/schemas.ts` | Add matching Zod schemas |
| `backend/tests/test_models.py` | New tests for typed models |
| `frontend/__tests__/lib/schemas.test.ts` | New tests for Zod schemas |

## Testing

- Backend: Add unit tests for new models with valid/invalid payloads
- Frontend: Add tests for schema validation
- E2E: Existing Playwright tests validate integration works

## Acceptance Criteria

- [x] Design document created and approved
- [ ] Create TypeScript interfaces for all dynamic request payloads
- [ ] Add Zod schemas for runtime validation before API calls
- [ ] Update `api-client.ts` methods to use typed parameters
- [ ] Ensure types match backend Pydantic models
- [ ] All tests pass
- [ ] E2E tests verify integration works
