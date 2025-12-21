# Typed Request Payloads Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `dict[str, Any]` patterns with fully typed Pydantic/Zod models for Monte Carlo, Sensitivity Analysis, and Startup Scenario requests.

**Architecture:** Add new typed models (VariableParam enum, SimParamRange, RSUParams, StockOptionsParams, BaseParams) in backend models.py and mirror them in frontend schemas.ts. Update request models to use these types. Existing TypedDicts in types.py remain for internal use.

**Tech Stack:** Python/Pydantic (backend), TypeScript/Zod (frontend), pytest, vitest

---

## Task 1: Add VariableParam Enum and SimParamRange (Backend)

**Files:**
- Modify: `backend/src/worth_it/models.py`
- Create: `backend/tests/test_typed_models.py`

**Step 1: Write the failing test for VariableParam enum**

Create `backend/tests/test_typed_models.py`:

```python
"""Tests for typed request payload models."""

import pytest
from pydantic import ValidationError

from worth_it.models import VariableParam, SimParamRange


class TestVariableParam:
    """Tests for VariableParam enum."""

    def test_valid_param_values(self):
        """All expected parameter names are valid."""
        assert VariableParam.EXIT_VALUATION == "exit_valuation"
        assert VariableParam.EXIT_YEAR == "exit_year"
        assert VariableParam.FAILURE_PROBABILITY == "failure_probability"
        assert VariableParam.ANNUAL_ROI == "annual_roi"

    def test_param_is_string_enum(self):
        """VariableParam values are strings for JSON serialization."""
        assert isinstance(VariableParam.EXIT_VALUATION.value, str)


class TestSimParamRange:
    """Tests for SimParamRange model."""

    def test_valid_range(self):
        """Valid min <= max range is accepted."""
        r = SimParamRange(min=10.0, max=100.0)
        assert r.min == 10.0
        assert r.max == 100.0

    def test_equal_min_max(self):
        """min == max is valid (single value)."""
        r = SimParamRange(min=50.0, max=50.0)
        assert r.min == r.max == 50.0

    def test_invalid_range_min_greater_than_max(self):
        """min > max raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SimParamRange(min=100.0, max=10.0)
        assert "min" in str(exc_info.value).lower()
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/test_typed_models.py -v`
Expected: FAIL with "cannot import name 'VariableParam'"

**Step 3: Implement VariableParam and SimParamRange in models.py**

Add to `backend/src/worth_it/models.py` after the imports:

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


class SimParamRange(BaseModel):
    """Range for a simulation parameter with validation."""

    min: float
    max: float

    @model_validator(mode="after")
    def validate_min_less_than_max(self) -> Self:
        """Ensure min <= max."""
        if self.min > self.max:
            raise ValueError(f"min ({self.min}) must be <= max ({self.max})")
        return self
```

**Step 4: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/test_typed_models.py -v`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add backend/src/worth_it/models.py backend/tests/test_typed_models.py
git commit -m "feat(backend): add VariableParam enum and SimParamRange model

- VariableParam: string enum for allowed simulation parameters
- SimParamRange: validated min/max range with min <= max constraint

Issue #248"
```

---

## Task 2: Add RSUParams and StockOptionsParams (Backend)

**Files:**
- Modify: `backend/src/worth_it/models.py`
- Modify: `backend/tests/test_typed_models.py`

**Step 1: Write the failing tests**

Add to `backend/tests/test_typed_models.py`:

```python
from worth_it.models import RSUParams, StockOptionsParams


class TestRSUParams:
    """Tests for RSUParams model."""

    def test_valid_rsu_params(self):
        """Valid RSU parameters are accepted."""
        params = RSUParams(
            equity_type="RSU",
            monthly_salary=12000.0,
            total_equity_grant_pct=0.5,
            exit_valuation=100_000_000.0,
        )
        assert params.equity_type == "RSU"
        assert params.vesting_period == 4  # default
        assert params.cliff_period == 1  # default

    def test_rsu_rejects_wrong_equity_type(self):
        """RSUParams rejects non-RSU equity_type."""
        with pytest.raises(ValidationError):
            RSUParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                total_equity_grant_pct=0.5,
                exit_valuation=100_000_000.0,
            )

    def test_rsu_validates_equity_pct_range(self):
        """total_equity_grant_pct must be 0-100."""
        with pytest.raises(ValidationError):
            RSUParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                total_equity_grant_pct=101.0,
                exit_valuation=100_000_000.0,
            )


class TestStockOptionsParams:
    """Tests for StockOptionsParams model."""

    def test_valid_options_params(self):
        """Valid stock options parameters are accepted."""
        params = StockOptionsParams(
            equity_type="STOCK_OPTIONS",
            monthly_salary=12000.0,
            num_options=10000,
            strike_price=1.50,
            exit_price_per_share=15.0,
        )
        assert params.equity_type == "STOCK_OPTIONS"
        assert params.exercise_strategy == "AT_EXIT"  # default

    def test_options_rejects_wrong_equity_type(self):
        """StockOptionsParams rejects non-STOCK_OPTIONS equity_type."""
        with pytest.raises(ValidationError):
            StockOptionsParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=1.50,
                exit_price_per_share=15.0,
            )

    def test_options_validates_positive_strike(self):
        """strike_price must be >= 0."""
        with pytest.raises(ValidationError):
            StockOptionsParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=-1.0,
                exit_price_per_share=15.0,
            )
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/test_typed_models.py::TestRSUParams -v`
Expected: FAIL with "cannot import name 'RSUParams'"

**Step 3: Implement RSUParams and StockOptionsParams**

Add to `backend/src/worth_it/models.py`:

```python
class RSUParams(BaseModel):
    """RSU equity parameters for API requests."""

    equity_type: Literal["RSU"]
    monthly_salary: float = Field(..., ge=0)
    total_equity_grant_pct: float = Field(..., ge=0, le=100)
    vesting_period: int = Field(default=4, ge=1, le=10)
    cliff_period: int = Field(default=1, ge=0, le=5)
    exit_valuation: float = Field(..., ge=0)
    simulate_dilution: bool = False
    dilution_rounds: list[DilutionRound] | None = None


class StockOptionsParams(BaseModel):
    """Stock options equity parameters for API requests."""

    equity_type: Literal["STOCK_OPTIONS"]
    monthly_salary: float = Field(..., ge=0)
    num_options: int = Field(..., ge=0)
    strike_price: float = Field(..., ge=0)
    vesting_period: int = Field(default=4, ge=1, le=10)
    cliff_period: int = Field(default=1, ge=0, le=5)
    exit_price_per_share: float = Field(..., ge=0)
    exercise_strategy: Literal["AT_EXIT", "AFTER_VESTING"] = "AT_EXIT"
    exercise_year: int | None = None
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_typed_models.py -v`
Expected: PASS (9 tests)

**Step 5: Commit**

```bash
git add backend/src/worth_it/models.py backend/tests/test_typed_models.py
git commit -m "feat(backend): add RSUParams and StockOptionsParams models

- RSUParams: typed RSU equity parameters with validation
- StockOptionsParams: typed stock options parameters
- Both use Literal types for discriminated union support

Issue #248"
```

---

## Task 3: Add BaseParams Model (Backend)

**Files:**
- Modify: `backend/src/worth_it/models.py`
- Modify: `backend/tests/test_typed_models.py`

**Step 1: Write the failing test**

Add to `backend/tests/test_typed_models.py`:

```python
from worth_it.models import BaseParams


class TestBaseParams:
    """Tests for BaseParams model."""

    def test_valid_base_params_with_rsu(self):
        """Valid base params with RSU startup_params are accepted."""
        params = BaseParams(
            exit_year=5,
            current_job_monthly_salary=15000.0,
            startup_monthly_salary=12000.0,
            current_job_salary_growth_rate=0.05,
            annual_roi=0.08,
            investment_frequency="Monthly",
            failure_probability=0.3,
            startup_params=RSUParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                total_equity_grant_pct=0.5,
                exit_valuation=100_000_000.0,
            ),
        )
        assert params.exit_year == 5
        assert params.startup_params.equity_type == "RSU"

    def test_valid_base_params_with_options(self):
        """Valid base params with stock options startup_params are accepted."""
        params = BaseParams(
            exit_year=5,
            current_job_monthly_salary=15000.0,
            startup_monthly_salary=12000.0,
            current_job_salary_growth_rate=0.05,
            annual_roi=0.08,
            investment_frequency="Annually",
            failure_probability=0.3,
            startup_params=StockOptionsParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=1.50,
                exit_price_per_share=15.0,
            ),
        )
        assert params.startup_params.equity_type == "STOCK_OPTIONS"

    def test_exit_year_range(self):
        """exit_year must be 1-20."""
        with pytest.raises(ValidationError):
            BaseParams(
                exit_year=0,
                current_job_monthly_salary=15000.0,
                startup_monthly_salary=12000.0,
                current_job_salary_growth_rate=0.05,
                annual_roi=0.08,
                investment_frequency="Monthly",
                failure_probability=0.3,
                startup_params=RSUParams(
                    equity_type="RSU",
                    monthly_salary=12000.0,
                    total_equity_grant_pct=0.5,
                    exit_valuation=100_000_000.0,
                ),
            )

    def test_invalid_investment_frequency(self):
        """investment_frequency must be Monthly or Annually."""
        with pytest.raises(ValidationError):
            BaseParams(
                exit_year=5,
                current_job_monthly_salary=15000.0,
                startup_monthly_salary=12000.0,
                current_job_salary_growth_rate=0.05,
                annual_roi=0.08,
                investment_frequency="Weekly",
                failure_probability=0.3,
                startup_params=RSUParams(
                    equity_type="RSU",
                    monthly_salary=12000.0,
                    total_equity_grant_pct=0.5,
                    exit_valuation=100_000_000.0,
                ),
            )
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/test_typed_models.py::TestBaseParams -v`
Expected: FAIL with "cannot import name 'BaseParams'" (from models - the typed version)

**Step 3: Implement BaseParams**

Add to `backend/src/worth_it/models.py`:

```python
class BaseParams(BaseModel):
    """Typed base parameters for Monte Carlo and Sensitivity Analysis requests."""

    exit_year: int = Field(..., ge=1, le=20)
    current_job_monthly_salary: float = Field(..., ge=0)
    startup_monthly_salary: float = Field(..., ge=0)
    current_job_salary_growth_rate: float = Field(..., ge=0, le=1)
    annual_roi: float = Field(..., ge=0, le=1)
    investment_frequency: Literal["Monthly", "Annually"]
    failure_probability: float = Field(..., ge=0, le=1)
    startup_params: RSUParams | StockOptionsParams
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_typed_models.py -v`
Expected: PASS (13 tests)

**Step 5: Commit**

```bash
git add backend/src/worth_it/models.py backend/tests/test_typed_models.py
git commit -m "feat(backend): add BaseParams model with discriminated union

- BaseParams: fully typed parameters for Monte Carlo/Sensitivity
- startup_params uses RSUParams | StockOptionsParams union
- All fields validated with proper ranges

Issue #248"
```

---

## Task 4: Update Request Models (Backend)

**Files:**
- Modify: `backend/src/worth_it/models.py`
- Modify: `backend/tests/test_typed_models.py`

**Step 1: Write the failing tests**

Add to `backend/tests/test_typed_models.py`:

```python
from worth_it.models import MonteCarloRequest, SensitivityAnalysisRequest


class TestMonteCarloRequestTyped:
    """Tests for typed MonteCarloRequest."""

    def test_valid_monte_carlo_request(self):
        """Valid typed Monte Carlo request is accepted."""
        request = MonteCarloRequest(
            num_simulations=1000,
            base_params=BaseParams(
                exit_year=5,
                current_job_monthly_salary=15000.0,
                startup_monthly_salary=12000.0,
                current_job_salary_growth_rate=0.05,
                annual_roi=0.08,
                investment_frequency="Monthly",
                failure_probability=0.3,
                startup_params=RSUParams(
                    equity_type="RSU",
                    monthly_salary=12000.0,
                    total_equity_grant_pct=0.5,
                    exit_valuation=100_000_000.0,
                ),
            ),
            sim_param_configs={
                VariableParam.EXIT_VALUATION: SimParamRange(min=50_000_000, max=200_000_000),
            },
        )
        assert request.num_simulations == 1000
        assert VariableParam.EXIT_VALUATION in request.sim_param_configs

    def test_rejects_invalid_param_key(self):
        """sim_param_configs rejects non-VariableParam keys."""
        with pytest.raises(ValidationError):
            MonteCarloRequest(
                num_simulations=1000,
                base_params=BaseParams(
                    exit_year=5,
                    current_job_monthly_salary=15000.0,
                    startup_monthly_salary=12000.0,
                    current_job_salary_growth_rate=0.05,
                    annual_roi=0.08,
                    investment_frequency="Monthly",
                    failure_probability=0.3,
                    startup_params=RSUParams(
                        equity_type="RSU",
                        monthly_salary=12000.0,
                        total_equity_grant_pct=0.5,
                        exit_valuation=100_000_000.0,
                    ),
                ),
                sim_param_configs={
                    "invalid_param": SimParamRange(min=1, max=10),  # type: ignore
                },
            )


class TestSensitivityAnalysisRequestTyped:
    """Tests for typed SensitivityAnalysisRequest."""

    def test_valid_sensitivity_request(self):
        """Valid typed Sensitivity request is accepted."""
        request = SensitivityAnalysisRequest(
            base_params=BaseParams(
                exit_year=5,
                current_job_monthly_salary=15000.0,
                startup_monthly_salary=12000.0,
                current_job_salary_growth_rate=0.05,
                annual_roi=0.08,
                investment_frequency="Monthly",
                failure_probability=0.3,
                startup_params=RSUParams(
                    equity_type="RSU",
                    monthly_salary=12000.0,
                    total_equity_grant_pct=0.5,
                    exit_valuation=100_000_000.0,
                ),
            ),
            sim_param_configs={
                VariableParam.FAILURE_PROBABILITY: SimParamRange(min=0.1, max=0.5),
            },
        )
        assert VariableParam.FAILURE_PROBABILITY in request.sim_param_configs
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/test_typed_models.py::TestMonteCarloRequestTyped -v`
Expected: FAIL (existing MonteCarloRequest uses dict[str, Any])

**Step 3: Update MonteCarloRequest and SensitivityAnalysisRequest**

Modify in `backend/src/worth_it/models.py`:

```python
class MonteCarloRequest(BaseModel):
    """Request model for Monte Carlo simulation - fully typed."""

    num_simulations: int = Field(..., ge=1, le=100000)
    base_params: BaseParams
    sim_param_configs: dict[VariableParam, SimParamRange]

    @model_validator(mode="after")
    def validate_num_simulations_against_config(self) -> Self:
        """Validate num_simulations against the configured MAX_SIMULATIONS limit."""
        from worth_it.config import settings

        if self.num_simulations > settings.MAX_SIMULATIONS:
            raise ValueError(
                f"num_simulations ({self.num_simulations}) exceeds the maximum allowed "
                f"({settings.MAX_SIMULATIONS})."
            )
        return self


class SensitivityAnalysisRequest(BaseModel):
    """Request model for sensitivity analysis - fully typed."""

    base_params: BaseParams
    sim_param_configs: dict[VariableParam, SimParamRange]
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_typed_models.py -v`
Expected: PASS (17 tests)

**Step 5: Run full backend test suite**

Run: `cd backend && uv run pytest -v`
Expected: Some tests may fail due to changed request format - fix in next task

**Step 6: Commit**

```bash
git add backend/src/worth_it/models.py backend/tests/test_typed_models.py
git commit -m "feat(backend): update MonteCarloRequest and SensitivityAnalysisRequest to use typed models

- MonteCarloRequest: uses BaseParams and dict[VariableParam, SimParamRange]
- SensitivityAnalysisRequest: same typed structure
- Removes validate_base_params() - now redundant

Issue #248"
```

---

## Task 5: Update StartupScenarioRequest (Backend)

**Files:**
- Modify: `backend/src/worth_it/models.py`
- Modify: `backend/tests/test_typed_models.py`

**Step 1: Write the failing test**

Add to `backend/tests/test_typed_models.py`:

```python
from worth_it.models import StartupScenarioRequest


class TestStartupScenarioRequestTyped:
    """Tests for typed StartupScenarioRequest."""

    def test_valid_startup_scenario_with_rsu(self):
        """Valid request with RSU params is accepted."""
        request = StartupScenarioRequest(
            opportunity_cost_data=[{"Year": 1, "MonthlySurplus": 1000}],
            startup_params=RSUParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                total_equity_grant_pct=0.5,
                exit_valuation=100_000_000.0,
            ),
        )
        assert request.startup_params.equity_type == "RSU"

    def test_valid_startup_scenario_with_options(self):
        """Valid request with stock options params is accepted."""
        request = StartupScenarioRequest(
            opportunity_cost_data=[{"Year": 1, "MonthlySurplus": 1000}],
            startup_params=StockOptionsParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=1.50,
                exit_price_per_share=15.0,
            ),
        )
        assert request.startup_params.equity_type == "STOCK_OPTIONS"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/test_typed_models.py::TestStartupScenarioRequestTyped -v`
Expected: FAIL (existing StartupScenarioRequest uses dict[str, Any])

**Step 3: Update StartupScenarioRequest**

Modify in `backend/src/worth_it/models.py`:

```python
class StartupScenarioRequest(BaseModel):
    """Request model for calculating startup scenario - typed startup_params."""

    opportunity_cost_data: list[dict[str, Any]]  # Keep flexible (tabular data)
    startup_params: RSUParams | StockOptionsParams
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && uv run pytest tests/test_typed_models.py -v`
Expected: PASS (19 tests)

**Step 5: Commit**

```bash
git add backend/src/worth_it/models.py backend/tests/test_typed_models.py
git commit -m "feat(backend): update StartupScenarioRequest to use typed startup_params

- startup_params now uses RSUParams | StockOptionsParams union
- opportunity_cost_data remains flexible (tabular row data)

Issue #248"
```

---

## Task 6: Fix Existing Backend Tests

**Files:**
- Modify: `backend/tests/test_api.py`
- Modify: `backend/tests/test_integration.py`

**Step 1: Run full backend test suite to identify failures**

Run: `cd backend && uv run pytest -v 2>&1 | head -100`
Expected: Some tests fail due to changed request format

**Step 2: Update test fixtures to use new typed format**

Update tests that send Monte Carlo or Sensitivity requests to use the new format with proper `base_params` and `sim_param_configs` structure.

**Step 3: Run full test suite**

Run: `cd backend && uv run pytest -v`
Expected: PASS (204+ tests)

**Step 4: Commit**

```bash
git add backend/tests/
git commit -m "fix(backend): update tests to use new typed request format

- Monte Carlo tests use BaseParams and SimParamRange
- Sensitivity tests use new typed structure
- All 204+ tests passing

Issue #248"
```

---

## Task 7: Add Frontend Schemas (TypeScript)

**Files:**
- Modify: `frontend/lib/schemas.ts`
- Modify: `frontend/__tests__/lib/schemas.test.ts`

**Step 1: Write the failing tests**

Add to `frontend/__tests__/lib/schemas.test.ts`:

```typescript
import {
  VariableParamEnum,
  SimParamRangeSchema,
  SimParamConfigsSchema,
  RSUParamsSchema,
  StockOptionsParamsSchema,
  StartupParamsSchema,
  BaseParamsSchema,
} from "@/lib/schemas";

describe("VariableParamEnum", () => {
  it("accepts valid parameter names", () => {
    expect(VariableParamEnum.parse("exit_valuation")).toBe("exit_valuation");
    expect(VariableParamEnum.parse("failure_probability")).toBe("failure_probability");
  });

  it("rejects invalid parameter names", () => {
    expect(() => VariableParamEnum.parse("invalid_param")).toThrow();
  });
});

describe("SimParamRangeSchema", () => {
  it("accepts valid min <= max range", () => {
    const result = SimParamRangeSchema.parse({ min: 10, max: 100 });
    expect(result.min).toBe(10);
    expect(result.max).toBe(100);
  });

  it("rejects min > max", () => {
    expect(() => SimParamRangeSchema.parse({ min: 100, max: 10 })).toThrow();
  });
});

describe("StartupParamsSchema (discriminated union)", () => {
  it("correctly parses RSU params", () => {
    const result = StartupParamsSchema.parse({
      equity_type: "RSU",
      monthly_salary: 12000,
      total_equity_grant_pct: 0.5,
      exit_valuation: 100000000,
    });
    expect(result.equity_type).toBe("RSU");
  });

  it("correctly parses stock options params", () => {
    const result = StartupParamsSchema.parse({
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 12000,
      num_options: 10000,
      strike_price: 1.5,
      exit_price_per_share: 15,
    });
    expect(result.equity_type).toBe("STOCK_OPTIONS");
  });
});

describe("BaseParamsSchema", () => {
  it("validates complete base params with RSU", () => {
    const result = BaseParamsSchema.parse({
      exit_year: 5,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
      annual_roi: 0.08,
      investment_frequency: "Monthly",
      failure_probability: 0.3,
      startup_params: {
        equity_type: "RSU",
        monthly_salary: 12000,
        total_equity_grant_pct: 0.5,
        exit_valuation: 100000000,
      },
    });
    expect(result.exit_year).toBe(5);
    expect(result.startup_params.equity_type).toBe("RSU");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:unit -- --run __tests__/lib/schemas.test.ts`
Expected: FAIL with "VariableParamEnum is not exported"

**Step 3: Implement new schemas in schemas.ts**

Add to `frontend/lib/schemas.ts`:

```typescript
// ============================================================================
// Typed Request Payload Schemas (Issue #248)
// ============================================================================

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

export const SimParamRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((data) => data.min <= data.max, {
    message: "min must be <= max",
  });
export type SimParamRange = z.infer<typeof SimParamRangeSchema>;

export const SimParamConfigsSchema = z.record(VariableParamEnum, SimParamRangeSchema);
export type SimParamConfigs = z.infer<typeof SimParamConfigsSchema>;

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
export type RSUParamsType = z.infer<typeof RSUParamsSchema>;

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
export type StockOptionsParamsType = z.infer<typeof StockOptionsParamsSchema>;

export const StartupParamsSchema = z.discriminatedUnion("equity_type", [
  RSUParamsSchema,
  StockOptionsParamsSchema,
]);
export type StartupParamsType = z.infer<typeof StartupParamsSchema>;

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
export type BaseParamsType = z.infer<typeof BaseParamsSchema>;
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test:unit -- --run __tests__/lib/schemas.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/lib/schemas.ts frontend/__tests__/lib/schemas.test.ts
git commit -m "feat(frontend): add typed schemas for request payloads

- VariableParamEnum: allowed simulation parameter names
- SimParamRangeSchema: validated min/max range
- RSUParamsSchema, StockOptionsParamsSchema: typed startup params
- StartupParamsSchema: discriminated union
- BaseParamsSchema: complete typed base parameters

Issue #248"
```

---

## Task 8: Update Frontend Request Schemas

**Files:**
- Modify: `frontend/lib/schemas.ts`
- Modify: `frontend/__tests__/lib/schemas.test.ts`

**Step 1: Write the failing tests**

Add to `frontend/__tests__/lib/schemas.test.ts`:

```typescript
describe("MonteCarloRequestSchema (typed)", () => {
  it("validates complete typed request", () => {
    const result = MonteCarloRequestSchema.parse({
      num_simulations: 1000,
      base_params: {
        exit_year: 5,
        current_job_monthly_salary: 15000,
        startup_monthly_salary: 12000,
        current_job_salary_growth_rate: 0.05,
        annual_roi: 0.08,
        investment_frequency: "Monthly",
        failure_probability: 0.3,
        startup_params: {
          equity_type: "RSU",
          monthly_salary: 12000,
          total_equity_grant_pct: 0.5,
          exit_valuation: 100000000,
        },
      },
      sim_param_configs: {
        exit_valuation: { min: 50000000, max: 200000000 },
      },
    });
    expect(result.num_simulations).toBe(1000);
  });
});
```

**Step 2: Run test to verify behavior**

Run: `cd frontend && npm run test:unit -- --run`
Expected: Test passes (existing schema was loosely typed)

**Step 3: Update MonteCarloRequestSchema and SensitivityAnalysisRequestSchema**

Modify in `frontend/lib/schemas.ts`:

```typescript
export const MonteCarloRequestSchema = z.object({
  num_simulations: z.number().int().min(1).max(10000),
  base_params: BaseParamsSchema,
  sim_param_configs: SimParamConfigsSchema,
});
export type MonteCarloRequest = z.infer<typeof MonteCarloRequestSchema>;

export const SensitivityAnalysisRequestSchema = z.object({
  base_params: BaseParamsSchema,
  sim_param_configs: SimParamConfigsSchema,
});
export type SensitivityAnalysisRequest = z.infer<typeof SensitivityAnalysisRequestSchema>;

export const StartupScenarioRequestSchema = z.object({
  opportunity_cost_data: z.array(z.record(z.string(), z.any())),
  startup_params: StartupParamsSchema,
});
export type StartupScenarioRequest = z.infer<typeof StartupScenarioRequestSchema>;
```

**Step 4: Run full frontend test suite**

Run: `cd frontend && npm run test:unit -- --run`
Expected: PASS (1104+ tests)

**Step 5: Commit**

```bash
git add frontend/lib/schemas.ts frontend/__tests__/lib/schemas.test.ts
git commit -m "feat(frontend): update request schemas to use typed models

- MonteCarloRequestSchema uses BaseParamsSchema and SimParamConfigsSchema
- SensitivityAnalysisRequestSchema uses same typed structure
- StartupScenarioRequestSchema uses StartupParamsSchema

Issue #248"
```

---

## Task 9: Run E2E Tests and Verify Integration

**Files:**
- None (verification only)

**Step 1: Run backend tests**

Run: `cd backend && uv run pytest -v`
Expected: PASS (204+ tests)

**Step 2: Run frontend tests**

Run: `cd frontend && npm run test:unit -- --run`
Expected: PASS (1104+ tests)

**Step 3: Run E2E tests**

Run: `./scripts/run-e2e-tests.sh`
Expected: PASS (existing E2E tests should work with typed payloads)

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify all tests pass with typed request payloads

Backend: 204+ tests passing
Frontend: 1104+ tests passing
E2E: All scenarios working

Issue #248"
```

---

## Task 10: Cleanup and Documentation

**Files:**
- Modify: `backend/src/worth_it/models.py` (remove old validate_base_params if still present)
- Modify: `docs/plans/2025-12-21-typed-request-payloads-design.md` (mark complete)

**Step 1: Remove deprecated validate_base_params function**

If `validate_base_params()` still exists in models.py, remove it (now redundant).

**Step 2: Update design doc acceptance criteria**

Mark all checkboxes as complete in the design document.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: cleanup deprecated code and update docs

- Remove validate_base_params() - replaced by typed BaseParams model
- Update design doc with completed acceptance criteria

Issue #248"
```

**Step 4: Push and create PR**

```bash
git push -u origin feature/issue-248-typed-payloads
gh pr create --title "feat: add typed models for dynamic request payloads (#248)" --body "$(cat <<'EOF'
## Summary
- Replace `dict[str, Any]` with fully typed Pydantic/Zod models
- Add VariableParam enum for allowed simulation parameters
- Add SimParamRange with min <= max validation
- Add discriminated union for RSU/Stock Options params
- Add BaseParams for Monte Carlo/Sensitivity requests

## Test plan
- [x] Backend unit tests (204+ passing)
- [x] Frontend unit tests (1104+ passing)
- [x] E2E tests verify integration works

Closes #248

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
