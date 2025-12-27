# Phase 1: Foundation + First Chicago Method Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundation for the Ultimate Valuation Calculator with First Chicago Method as the flagship feature.

**Architecture:** Extend existing valuation module with new dataclasses and calculation functions in backend. Add new API endpoint. Create multi-scenario form component in frontend with probability-weighted outcome visualization.

**Tech Stack:** Python/FastAPI (backend), TypeScript/React/Next.js (frontend), Pydantic/Zod (validation), Recharts (visualization), TDD throughout.

---

## Overview

Phase 1 establishes the foundation for the Ultimate Valuation Calculator by implementing:
1. First Chicago Method calculation engine (backend)
2. API endpoint for First Chicago valuation
3. Frontend form with three-scenario input
4. Probability-weighted visualization

**Design Reference:** See `docs/plans/2025-12-27-ultimate-valuation-calculator-design.md`

---

## Task 1: First Chicago Method - Backend Data Models

**Files:**
- Modify: `backend/src/worth_it/calculations/valuation.py`
- Test: `backend/tests/test_valuation.py`

### Step 1: Write the failing test for FirstChicagoScenario dataclass

```python
# In backend/tests/test_valuation.py - add to imports
from worth_it.calculations.valuation import (
    # ... existing imports ...
    FirstChicagoScenario,
)

# Add new test class
class TestFirstChicagoScenario:
    """Tests for FirstChicagoScenario dataclass."""

    def test_scenario_creation(self) -> None:
        """Test creating a scenario with all required fields."""
        scenario = FirstChicagoScenario(
            name="Base Case",
            probability=0.5,
            exit_value=10_000_000,
            years_to_exit=5,
        )
        assert scenario.name == "Base Case"
        assert scenario.probability == 0.5
        assert scenario.exit_value == 10_000_000
        assert scenario.years_to_exit == 5

    def test_scenario_probability_bounds(self) -> None:
        """Test that probability must be between 0 and 1."""
        # Valid probabilities should work
        scenario = FirstChicagoScenario(
            name="Test",
            probability=0.0,
            exit_value=1_000_000,
            years_to_exit=3,
        )
        assert scenario.probability == 0.0
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_valuation.py::TestFirstChicagoScenario -v`
Expected: FAIL with "cannot import name 'FirstChicagoScenario'"

### Step 3: Write minimal implementation

```python
# In backend/src/worth_it/calculations/valuation.py - add after existing dataclasses

@dataclass(frozen=True)
class FirstChicagoScenario:
    """A single scenario for First Chicago Method valuation.

    Attributes:
        name: Scenario identifier (e.g., "Best Case", "Base Case", "Worst Case")
        probability: Probability of this outcome (0.0 to 1.0)
        exit_value: Expected company value at exit
        years_to_exit: Years until liquidity event
    """
    name: str
    probability: float
    exit_value: float
    years_to_exit: int
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_valuation.py::TestFirstChicagoScenario -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/calculations/valuation.py backend/tests/test_valuation.py
git commit -m "feat(valuation): add FirstChicagoScenario dataclass"
```

---

## Task 2: First Chicago Method - Params and Result Dataclasses

**Files:**
- Modify: `backend/src/worth_it/calculations/valuation.py`
- Test: `backend/tests/test_valuation.py`

### Step 1: Write failing tests for FirstChicagoParams and FirstChicagoResult

```python
# In backend/tests/test_valuation.py - update imports
from worth_it.calculations.valuation import (
    # ... existing imports ...
    FirstChicagoScenario,
    FirstChicagoParams,
    FirstChicagoResult,
)

# Add to TestFirstChicagoScenario class or create new class
class TestFirstChicagoParams:
    """Tests for FirstChicagoParams dataclass."""

    def test_params_creation_with_three_scenarios(self) -> None:
        """Test creating params with standard three scenarios."""
        best = FirstChicagoScenario("Best", 0.25, 50_000_000, 5)
        base = FirstChicagoScenario("Base", 0.50, 20_000_000, 5)
        worst = FirstChicagoScenario("Worst", 0.25, 5_000_000, 5)

        params = FirstChicagoParams(
            scenarios=[best, base, worst],
            discount_rate=0.25,
        )

        assert len(params.scenarios) == 3
        assert params.discount_rate == 0.25

    def test_params_with_optional_current_investment(self) -> None:
        """Test params with current investment amount."""
        scenario = FirstChicagoScenario("Base", 1.0, 10_000_000, 3)
        params = FirstChicagoParams(
            scenarios=[scenario],
            discount_rate=0.20,
            current_investment=1_000_000,
        )
        assert params.current_investment == 1_000_000


class TestFirstChicagoResult:
    """Tests for FirstChicagoResult dataclass."""

    def test_result_creation(self) -> None:
        """Test creating a result with all fields."""
        result = FirstChicagoResult(
            weighted_value=15_000_000,
            present_value=5_859_375,
            scenario_values={"Best": 50_000_000, "Base": 20_000_000, "Worst": 5_000_000},
            scenario_present_values={"Best": 19_531_250, "Base": 7_812_500, "Worst": 1_953_125},
            method="first_chicago",
        )
        assert result.weighted_value == 15_000_000
        assert result.present_value == 5_859_375
        assert result.method == "first_chicago"
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_valuation.py::TestFirstChicagoParams tests/test_valuation.py::TestFirstChicagoResult -v`
Expected: FAIL with import errors

### Step 3: Write minimal implementation

```python
# In backend/src/worth_it/calculations/valuation.py - add after FirstChicagoScenario

@dataclass(frozen=True)
class FirstChicagoParams:
    """Parameters for First Chicago Method valuation.

    Attributes:
        scenarios: List of scenarios (typically Best/Base/Worst cases)
        discount_rate: Required rate of return (e.g., 0.25 for 25%)
        current_investment: Optional current investment amount for ROI calc
    """
    scenarios: list[FirstChicagoScenario]
    discount_rate: float
    current_investment: float | None = None


@dataclass(frozen=True)
class FirstChicagoResult:
    """Result of First Chicago Method valuation.

    Attributes:
        weighted_value: Probability-weighted exit value
        present_value: Discounted present value of weighted outcome
        scenario_values: Exit value for each scenario
        scenario_present_values: Present value for each scenario
        method: Always "first_chicago"
    """
    weighted_value: float
    present_value: float
    scenario_values: dict[str, float]
    scenario_present_values: dict[str, float]
    method: str = "first_chicago"
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_valuation.py::TestFirstChicagoParams tests/test_valuation.py::TestFirstChicagoResult -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/calculations/valuation.py backend/tests/test_valuation.py
git commit -m "feat(valuation): add FirstChicagoParams and FirstChicagoResult dataclasses"
```

---

## Task 3: First Chicago Method - Core Calculation Function

**Files:**
- Modify: `backend/src/worth_it/calculations/valuation.py`
- Test: `backend/tests/test_valuation.py`

### Step 1: Write failing test for calculate_first_chicago function

```python
# In backend/tests/test_valuation.py - update imports
from worth_it.calculations.valuation import (
    # ... existing imports ...
    calculate_first_chicago,
)

class TestCalculateFirstChicago:
    """Tests for calculate_first_chicago function."""

    def test_basic_three_scenario_valuation(self) -> None:
        """Test standard three-scenario First Chicago calculation."""
        # Standard Best/Base/Worst with 25/50/25 probability split
        params = FirstChicagoParams(
            scenarios=[
                FirstChicagoScenario("Best", 0.25, 50_000_000, 5),
                FirstChicagoScenario("Base", 0.50, 20_000_000, 5),
                FirstChicagoScenario("Worst", 0.25, 5_000_000, 5),
            ],
            discount_rate=0.25,
        )

        result = calculate_first_chicago(params)

        # Weighted value = 0.25*50M + 0.50*20M + 0.25*5M = 12.5M + 10M + 1.25M = 23.75M
        assert result.weighted_value == pytest.approx(23_750_000, rel=0.01)

        # Present value = 23.75M / (1.25)^5 = 23.75M / 3.0517578125 ≈ 7,782,387
        assert result.present_value == pytest.approx(7_782_387, rel=0.01)

        assert result.method == "first_chicago"
        assert "Best" in result.scenario_values
        assert "Base" in result.scenario_values
        assert "Worst" in result.scenario_values

    def test_single_scenario(self) -> None:
        """Test with just one scenario (100% probability)."""
        params = FirstChicagoParams(
            scenarios=[
                FirstChicagoScenario("Only", 1.0, 10_000_000, 3),
            ],
            discount_rate=0.20,
        )

        result = calculate_first_chicago(params)

        # Weighted = 10M, PV = 10M / 1.2^3 = 10M / 1.728 ≈ 5,787,037
        assert result.weighted_value == pytest.approx(10_000_000, rel=0.01)
        assert result.present_value == pytest.approx(5_787_037, rel=0.01)

    def test_different_time_horizons(self) -> None:
        """Test scenarios with different exit timelines."""
        params = FirstChicagoParams(
            scenarios=[
                FirstChicagoScenario("Quick Exit", 0.30, 15_000_000, 3),
                FirstChicagoScenario("Normal Exit", 0.50, 30_000_000, 5),
                FirstChicagoScenario("Long Exit", 0.20, 60_000_000, 7),
            ],
            discount_rate=0.25,
        )

        result = calculate_first_chicago(params)

        # Each scenario discounted separately, then weighted
        # Quick: 15M / 1.25^3 = 7,680,000 * 0.30 = 2,304,000
        # Normal: 30M / 1.25^5 = 9,830,400 * 0.50 = 4,915,200
        # Long: 60M / 1.25^7 = 12,582,912 * 0.20 = 2,516,582
        # Total PV ≈ 9,735,782
        assert result.present_value == pytest.approx(9_735_782, rel=0.02)

    def test_probabilities_sum_to_one_validation(self) -> None:
        """Test that probabilities should sum close to 1.0."""
        params = FirstChicagoParams(
            scenarios=[
                FirstChicagoScenario("A", 0.25, 10_000_000, 5),
                FirstChicagoScenario("B", 0.25, 20_000_000, 5),
                # Probabilities sum to 0.5, not 1.0
            ],
            discount_rate=0.20,
        )

        # Should still calculate but may want to add warning in future
        result = calculate_first_chicago(params)
        assert result is not None
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_valuation.py::TestCalculateFirstChicago -v`
Expected: FAIL with "cannot import name 'calculate_first_chicago'"

### Step 3: Write minimal implementation

```python
# In backend/src/worth_it/calculations/valuation.py - add function

def calculate_first_chicago(params: FirstChicagoParams) -> FirstChicagoResult:
    """Calculate valuation using the First Chicago Method.

    The First Chicago Method values a company by:
    1. Defining multiple scenarios (typically Best/Base/Worst)
    2. Assigning probability weights to each scenario
    3. Calculating present value for each scenario
    4. Computing probability-weighted present value

    Args:
        params: FirstChicagoParams with scenarios and discount rate

    Returns:
        FirstChicagoResult with weighted and present values
    """
    scenario_values: dict[str, float] = {}
    scenario_present_values: dict[str, float] = {}

    weighted_exit_value = 0.0
    weighted_present_value = 0.0

    for scenario in params.scenarios:
        # Store raw exit value
        scenario_values[scenario.name] = scenario.exit_value

        # Calculate present value for this scenario
        discount_factor = (1 + params.discount_rate) ** scenario.years_to_exit
        pv = scenario.exit_value / discount_factor
        scenario_present_values[scenario.name] = pv

        # Accumulate weighted values
        weighted_exit_value += scenario.probability * scenario.exit_value
        weighted_present_value += scenario.probability * pv

    return FirstChicagoResult(
        weighted_value=weighted_exit_value,
        present_value=weighted_present_value,
        scenario_values=scenario_values,
        scenario_present_values=scenario_present_values,
        method="first_chicago",
    )
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_valuation.py::TestCalculateFirstChicago -v`
Expected: PASS

### Step 5: Update __init__.py exports

```python
# In backend/src/worth_it/calculations/__init__.py - add to exports
from worth_it.calculations.valuation import (
    # ... existing exports ...
    FirstChicagoScenario,
    FirstChicagoParams,
    FirstChicagoResult,
    calculate_first_chicago,
)
```

### Step 6: Commit

```bash
git add backend/src/worth_it/calculations/valuation.py backend/src/worth_it/calculations/__init__.py backend/tests/test_valuation.py
git commit -m "feat(valuation): implement calculate_first_chicago function"
```

---

## Task 4: First Chicago Method - Pydantic API Models

**Files:**
- Modify: `backend/src/worth_it/models.py`
- Test: `backend/tests/test_api.py`

### Step 1: Write failing test for Pydantic models

```python
# In backend/tests/test_api.py - add test
import pytest
from worth_it.models import FirstChicagoScenarioRequest, FirstChicagoRequest

class TestFirstChicagoModels:
    """Tests for First Chicago Pydantic models."""

    def test_scenario_request_validation(self) -> None:
        """Test FirstChicagoScenarioRequest validation."""
        scenario = FirstChicagoScenarioRequest(
            name="Best Case",
            probability=0.25,
            exit_value=50_000_000,
            years_to_exit=5,
        )
        assert scenario.name == "Best Case"
        assert scenario.probability == 0.25

    def test_scenario_probability_must_be_valid(self) -> None:
        """Test probability validation (0 to 1)."""
        with pytest.raises(ValueError):
            FirstChicagoScenarioRequest(
                name="Invalid",
                probability=1.5,  # > 1.0
                exit_value=10_000_000,
                years_to_exit=5,
            )

    def test_full_request_validation(self) -> None:
        """Test FirstChicagoRequest with multiple scenarios."""
        request = FirstChicagoRequest(
            scenarios=[
                FirstChicagoScenarioRequest(
                    name="Best", probability=0.25, exit_value=50_000_000, years_to_exit=5
                ),
                FirstChicagoScenarioRequest(
                    name="Base", probability=0.50, exit_value=20_000_000, years_to_exit=5
                ),
                FirstChicagoScenarioRequest(
                    name="Worst", probability=0.25, exit_value=5_000_000, years_to_exit=5
                ),
            ],
            discount_rate=0.25,
        )
        assert len(request.scenarios) == 3
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_api.py::TestFirstChicagoModels -v`
Expected: FAIL with import error

### Step 3: Write Pydantic models

```python
# In backend/src/worth_it/models.py - add models

class FirstChicagoScenarioRequest(BaseModel):
    """API request model for a single First Chicago scenario."""

    name: str = Field(..., min_length=1, max_length=50, description="Scenario name")
    probability: float = Field(..., ge=0.0, le=1.0, description="Probability (0-1)")
    exit_value: float = Field(..., gt=0, description="Expected exit value")
    years_to_exit: int = Field(..., ge=1, le=20, description="Years until exit")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Base Case",
                "probability": 0.50,
                "exit_value": 20000000,
                "years_to_exit": 5,
            }
        }
    )


class FirstChicagoRequest(BaseModel):
    """API request model for First Chicago Method valuation."""

    scenarios: list[FirstChicagoScenarioRequest] = Field(
        ..., min_length=1, max_length=10, description="Valuation scenarios"
    )
    discount_rate: float = Field(
        ..., gt=0, lt=1, description="Required rate of return (e.g., 0.25 for 25%)"
    )
    current_investment: float | None = Field(
        None, gt=0, description="Current investment amount (optional)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scenarios": [
                    {"name": "Best", "probability": 0.25, "exit_value": 50000000, "years_to_exit": 5},
                    {"name": "Base", "probability": 0.50, "exit_value": 20000000, "years_to_exit": 5},
                    {"name": "Worst", "probability": 0.25, "exit_value": 5000000, "years_to_exit": 5},
                ],
                "discount_rate": 0.25,
            }
        }
    )


class FirstChicagoResponse(BaseModel):
    """API response model for First Chicago Method valuation."""

    weighted_value: float = Field(..., description="Probability-weighted exit value")
    present_value: float = Field(..., description="Present value of weighted outcome")
    scenario_values: dict[str, float] = Field(..., description="Exit value per scenario")
    scenario_present_values: dict[str, float] = Field(..., description="PV per scenario")
    method: str = Field(default="first_chicago", description="Valuation method used")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "weighted_value": 23750000,
                "present_value": 7782387,
                "scenario_values": {"Best": 50000000, "Base": 20000000, "Worst": 5000000},
                "scenario_present_values": {"Best": 16384000, "Base": 6553600, "Worst": 1638400},
                "method": "first_chicago",
            }
        }
    )
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_api.py::TestFirstChicagoModels -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/models.py backend/tests/test_api.py
git commit -m "feat(api): add Pydantic models for First Chicago Method"
```

---

## Task 5: First Chicago Method - API Endpoint

**Files:**
- Modify: `backend/src/worth_it/api/routers/valuation.py`
- Test: `backend/tests/test_api.py`

### Step 1: Write failing test for API endpoint

```python
# In backend/tests/test_api.py - add to existing valuation tests

class TestFirstChicagoEndpoint:
    """Tests for /api/valuation/first-chicago endpoint."""

    def test_first_chicago_basic_calculation(self, client: TestClient) -> None:
        """Test basic First Chicago calculation via API."""
        response = client.post(
            "/api/valuation/first-chicago",
            json={
                "scenarios": [
                    {"name": "Best", "probability": 0.25, "exit_value": 50000000, "years_to_exit": 5},
                    {"name": "Base", "probability": 0.50, "exit_value": 20000000, "years_to_exit": 5},
                    {"name": "Worst", "probability": 0.25, "exit_value": 5000000, "years_to_exit": 5},
                ],
                "discount_rate": 0.25,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "weighted_value" in data
        assert "present_value" in data
        assert "scenario_values" in data
        assert data["method"] == "first_chicago"
        assert data["weighted_value"] == pytest.approx(23750000, rel=0.01)

    def test_first_chicago_validation_error(self, client: TestClient) -> None:
        """Test validation error for invalid probability."""
        response = client.post(
            "/api/valuation/first-chicago",
            json={
                "scenarios": [
                    {"name": "Invalid", "probability": 1.5, "exit_value": 10000000, "years_to_exit": 5},
                ],
                "discount_rate": 0.25,
            },
        )

        assert response.status_code == 422  # Validation error

    def test_first_chicago_empty_scenarios(self, client: TestClient) -> None:
        """Test validation error for empty scenarios list."""
        response = client.post(
            "/api/valuation/first-chicago",
            json={
                "scenarios": [],
                "discount_rate": 0.25,
            },
        )

        assert response.status_code == 422
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_api.py::TestFirstChicagoEndpoint -v`
Expected: FAIL with 404 (endpoint not found)

### Step 3: Write API endpoint

```python
# In backend/src/worth_it/api/routers/valuation.py - add endpoint

from worth_it.models import (
    # ... existing imports ...
    FirstChicagoRequest,
    FirstChicagoResponse,
)
from worth_it.calculations.valuation import (
    # ... existing imports ...
    FirstChicagoScenario,
    FirstChicagoParams,
    calculate_first_chicago,
)


@router.post(
    "/first-chicago",
    response_model=FirstChicagoResponse,
    summary="Calculate valuation using First Chicago Method",
    description="""
    The First Chicago Method values a company by modeling multiple scenarios
    (typically Best Case, Base Case, Worst Case) with probability weights,
    then computing a probability-weighted present value.

    This method is particularly useful for early-stage companies with
    high uncertainty about future outcomes.
    """,
)
@limiter.limit("30/minute")
async def calculate_first_chicago_valuation(
    request: Request,
    data: FirstChicagoRequest,
) -> FirstChicagoResponse:
    """Calculate First Chicago Method valuation."""
    # Convert API models to domain models
    scenarios = [
        FirstChicagoScenario(
            name=s.name,
            probability=s.probability,
            exit_value=s.exit_value,
            years_to_exit=s.years_to_exit,
        )
        for s in data.scenarios
    ]

    params = FirstChicagoParams(
        scenarios=scenarios,
        discount_rate=data.discount_rate,
        current_investment=data.current_investment,
    )

    result = calculate_first_chicago(params)

    return FirstChicagoResponse(
        weighted_value=result.weighted_value,
        present_value=result.present_value,
        scenario_values=result.scenario_values,
        scenario_present_values=result.scenario_present_values,
        method=result.method,
    )
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_api.py::TestFirstChicagoEndpoint -v`
Expected: PASS

### Step 5: Run full backend test suite

Run: `cd backend && uv run pytest -v`
Expected: All tests pass

### Step 6: Commit

```bash
git add backend/src/worth_it/api/routers/valuation.py backend/tests/test_api.py
git commit -m "feat(api): add /first-chicago endpoint"
```

---

## Task 6: Frontend - Zod Schema for First Chicago

**Files:**
- Modify: `frontend/lib/schemas.ts`
- Test: `frontend/__tests__/lib/schemas.test.ts` (create if needed)

### Step 1: Write failing test for Zod schema

```typescript
// In frontend/__tests__/lib/schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  FirstChicagoScenarioSchema,
  FirstChicagoRequestSchema,
  FirstChicagoResponseSchema,
} from '@/lib/schemas';

describe('FirstChicagoScenarioSchema', () => {
  it('validates a valid scenario', () => {
    const scenario = {
      name: 'Best Case',
      probability: 0.25,
      exitValue: 50000000,
      yearsToExit: 5,
    };

    const result = FirstChicagoScenarioSchema.safeParse(scenario);
    expect(result.success).toBe(true);
  });

  it('rejects probability > 1', () => {
    const scenario = {
      name: 'Invalid',
      probability: 1.5,
      exitValue: 10000000,
      yearsToExit: 5,
    };

    const result = FirstChicagoScenarioSchema.safeParse(scenario);
    expect(result.success).toBe(false);
  });
});

describe('FirstChicagoRequestSchema', () => {
  it('validates a complete request', () => {
    const request = {
      scenarios: [
        { name: 'Best', probability: 0.25, exitValue: 50000000, yearsToExit: 5 },
        { name: 'Base', probability: 0.50, exitValue: 20000000, yearsToExit: 5 },
        { name: 'Worst', probability: 0.25, exitValue: 5000000, yearsToExit: 5 },
      ],
      discountRate: 0.25,
    };

    const result = FirstChicagoRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd frontend && npm run test:unit -- __tests__/lib/schemas.test.ts`
Expected: FAIL with import error

### Step 3: Write Zod schemas

```typescript
// In frontend/lib/schemas.ts - add schemas

// ============================================================================
// First Chicago Method Schemas
// ============================================================================

export const FirstChicagoScenarioSchema = z.object({
  name: z.string().min(1).max(50),
  probability: z.number().min(0).max(1),
  exitValue: z.number().positive(),
  yearsToExit: z.number().int().min(1).max(20),
});

export type FirstChicagoScenario = z.infer<typeof FirstChicagoScenarioSchema>;

export const FirstChicagoRequestSchema = z.object({
  scenarios: z.array(FirstChicagoScenarioSchema).min(1).max(10),
  discountRate: z.number().positive().max(1),
  currentInvestment: z.number().positive().optional(),
});

export type FirstChicagoRequest = z.infer<typeof FirstChicagoRequestSchema>;

export const FirstChicagoResponseSchema = z.object({
  weightedValue: z.number(),
  presentValue: z.number(),
  scenarioValues: z.record(z.string(), z.number()),
  scenarioPresentValues: z.record(z.string(), z.number()),
  method: z.literal('first_chicago'),
});

export type FirstChicagoResponse = z.infer<typeof FirstChicagoResponseSchema>;

// Transform API response (snake_case) to frontend (camelCase)
export function transformFirstChicagoResponse(
  apiResponse: Record<string, unknown>
): FirstChicagoResponse {
  return {
    weightedValue: apiResponse.weighted_value as number,
    presentValue: apiResponse.present_value as number,
    scenarioValues: apiResponse.scenario_values as Record<string, number>,
    scenarioPresentValues: apiResponse.scenario_present_values as Record<string, number>,
    method: 'first_chicago',
  };
}
```

### Step 4: Run test to verify it passes

Run: `cd frontend && npm run test:unit -- __tests__/lib/schemas.test.ts`
Expected: PASS

### Step 5: Run type check

Run: `cd frontend && npm run type-check`
Expected: PASS

### Step 6: Commit

```bash
git add frontend/lib/schemas.ts frontend/__tests__/lib/schemas.test.ts
git commit -m "feat(frontend): add Zod schemas for First Chicago Method"
```

---

## Task 7: Frontend - API Client Method

**Files:**
- Modify: `frontend/lib/api-client.ts`

### Step 1: Add API client method

```typescript
// In frontend/lib/api-client.ts - add method to apiClient object

import {
  // ... existing imports ...
  FirstChicagoRequest,
  FirstChicagoResponse,
  transformFirstChicagoResponse,
} from './schemas';

// Add to apiClient object:
  calculateFirstChicago: async (
    request: FirstChicagoRequest
  ): Promise<ApiResponse<FirstChicagoResponse>> => {
    // Transform camelCase to snake_case for API
    const apiRequest = {
      scenarios: request.scenarios.map((s) => ({
        name: s.name,
        probability: s.probability,
        exit_value: s.exitValue,
        years_to_exit: s.yearsToExit,
      })),
      discount_rate: request.discountRate,
      current_investment: request.currentInvestment,
    };

    const response = await fetch(`${API_URL}/api/valuation/first-chicago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.detail || 'Failed to calculate First Chicago valuation' };
    }

    const data = await response.json();
    return { data: transformFirstChicagoResponse(data) };
  },
```

### Step 2: Run type check

Run: `cd frontend && npm run type-check`
Expected: PASS

### Step 3: Commit

```bash
git add frontend/lib/api-client.ts
git commit -m "feat(frontend): add API client method for First Chicago"
```

---

## Task 8: Frontend - First Chicago Form Component

**Files:**
- Create: `frontend/components/valuation/first-chicago-form.tsx`
- Test: `frontend/__tests__/components/valuation/first-chicago-form.test.tsx`

### Step 1: Write failing test for form component

```typescript
// In frontend/__tests__/components/valuation/first-chicago-form.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FirstChicagoForm } from '@/components/valuation/first-chicago-form';

describe('FirstChicagoForm', () => {
  it('renders three scenario inputs by default', () => {
    render(<FirstChicagoForm onSubmit={vi.fn()} />);

    expect(screen.getByText(/Best Case/i)).toBeInTheDocument();
    expect(screen.getByText(/Base Case/i)).toBeInTheDocument();
    expect(screen.getByText(/Worst Case/i)).toBeInTheDocument();
  });

  it('renders discount rate input', () => {
    render(<FirstChicagoForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Discount Rate/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    const mockOnSubmit = vi.fn();
    render(<FirstChicagoForm onSubmit={mockOnSubmit} />);

    // Fill in form (would need more detailed implementation)
    const submitButton = screen.getByRole('button', { name: /Calculate/i });
    fireEvent.click(submitButton);

    // Form should validate and potentially call onSubmit
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd frontend && npm run test:unit -- __tests__/components/valuation/first-chicago-form.test.tsx`
Expected: FAIL with module not found

### Step 3: Write form component

```typescript
// In frontend/components/valuation/first-chicago-form.tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2 } from 'lucide-react';

// Form schema with default scenarios
const FirstChicagoFormSchema = z.object({
  scenarios: z.array(
    z.object({
      name: z.string().min(1, 'Name required'),
      probability: z.number().min(0).max(1),
      exitValue: z.number().positive('Must be positive'),
      yearsToExit: z.number().int().min(1).max(20),
    })
  ).min(1, 'At least one scenario required'),
  discountRate: z.number().min(0.01).max(0.99),
});

type FirstChicagoFormData = z.infer<typeof FirstChicagoFormSchema>;

interface FirstChicagoFormProps {
  onSubmit: (data: FirstChicagoFormData) => void;
  isLoading?: boolean;
}

const DEFAULT_SCENARIOS = [
  { name: 'Best Case', probability: 0.25, exitValue: 50000000, yearsToExit: 5 },
  { name: 'Base Case', probability: 0.50, exitValue: 20000000, yearsToExit: 5 },
  { name: 'Worst Case', probability: 0.25, exitValue: 5000000, yearsToExit: 5 },
];

export function FirstChicagoForm({ onSubmit, isLoading }: FirstChicagoFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FirstChicagoFormData>({
    resolver: zodResolver(FirstChicagoFormSchema),
    defaultValues: {
      scenarios: DEFAULT_SCENARIOS,
      discountRate: 0.25,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'scenarios',
  });

  const scenarios = watch('scenarios');
  const totalProbability = scenarios.reduce((sum, s) => sum + (s.probability || 0), 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Scenarios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scenarios</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: '', probability: 0, exitValue: 0, yearsToExit: 5 })}
            disabled={fields.length >= 10}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Scenario
          </Button>
        </div>

        {fields.map((field, index) => (
          <Card key={field.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Input
                  {...register(`scenarios.${index}.name`)}
                  placeholder="Scenario name"
                  className="max-w-[200px] font-medium"
                />
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {/* Probability */}
              <div className="space-y-2">
                <Label>Probability ({Math.round((scenarios[index]?.probability || 0) * 100)}%)</Label>
                <Slider
                  value={[(scenarios[index]?.probability || 0) * 100]}
                  onValueChange={([value]) => setValue(`scenarios.${index}.probability`, value / 100)}
                  max={100}
                  step={5}
                />
              </div>

              {/* Exit Value */}
              <div className="space-y-2">
                <Label>Exit Value ($)</Label>
                <Input
                  type="number"
                  {...register(`scenarios.${index}.exitValue`, { valueAsNumber: true })}
                  placeholder="50,000,000"
                />
                {errors.scenarios?.[index]?.exitValue && (
                  <p className="text-sm text-destructive">
                    {errors.scenarios[index]?.exitValue?.message}
                  </p>
                )}
              </div>

              {/* Years to Exit */}
              <div className="space-y-2">
                <Label>Years to Exit</Label>
                <Input
                  type="number"
                  {...register(`scenarios.${index}.yearsToExit`, { valueAsNumber: true })}
                  min={1}
                  max={20}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Probability total warning */}
        {Math.abs(totalProbability - 1) > 0.01 && (
          <p className="text-sm text-amber-600">
            Probabilities sum to {Math.round(totalProbability * 100)}% (should be 100%)
          </p>
        )}
      </div>

      {/* Discount Rate */}
      <div className="space-y-2">
        <Label htmlFor="discountRate">Discount Rate (Required Return)</Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[(watch('discountRate') || 0.25) * 100]}
            onValueChange={([value]) => setValue('discountRate', value / 100)}
            min={5}
            max={50}
            step={1}
            className="flex-1"
          />
          <span className="w-16 text-right font-mono">
            {Math.round((watch('discountRate') || 0.25) * 100)}%
          </span>
        </div>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Calculating...' : 'Calculate Valuation'}
      </Button>
    </form>
  );
}
```

### Step 4: Run test to verify it passes

Run: `cd frontend && npm run test:unit -- __tests__/components/valuation/first-chicago-form.test.tsx`
Expected: PASS

### Step 5: Run type check and lint

Run: `cd frontend && npm run type-check && npm run lint`
Expected: PASS

### Step 6: Commit

```bash
git add frontend/components/valuation/first-chicago-form.tsx frontend/__tests__/components/valuation/first-chicago-form.test.tsx
git commit -m "feat(frontend): add FirstChicagoForm component"
```

---

## Task 9: Frontend - First Chicago Results Component

**Files:**
- Create: `frontend/components/valuation/first-chicago-results.tsx`

### Step 1: Write the results display component

```typescript
// In frontend/components/valuation/first-chicago-results.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-utils';
import type { FirstChicagoResponse } from '@/lib/schemas';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useChartColors } from '@/lib/hooks/use-chart-colors';

interface FirstChicagoResultsProps {
  result: FirstChicagoResponse;
}

export function FirstChicagoResults({ result }: FirstChicagoResultsProps) {
  const chartColors = useChartColors();

  // Prepare chart data
  const chartData = Object.entries(result.scenarioValues).map(([name, value]) => ({
    name,
    exitValue: value,
    presentValue: result.scenarioPresentValues[name],
  }));

  // Color scale for scenarios (green to red)
  const getBarColor = (index: number, total: number) => {
    const colors = ['hsl(142, 76%, 36%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)'];
    return colors[Math.min(index, colors.length - 1)];
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Probability-Weighted Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(result.weightedValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Present Value (Today)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(result.presentValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                  tick={{ fill: chartColors.foreground }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: chartColors.foreground }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Bar dataKey="exitValue" name="Exit Value">
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(index, chartData.length)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Scenario</th>
                  <th className="py-2 text-right font-medium">Exit Value</th>
                  <th className="py-2 text-right font-medium">Present Value</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.name} className="border-b">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(row.exitValue)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(row.presentValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 2: Run type check

Run: `cd frontend && npm run type-check`
Expected: PASS

### Step 3: Commit

```bash
git add frontend/components/valuation/first-chicago-results.tsx
git commit -m "feat(frontend): add FirstChicagoResults component"
```

---

## Task 10: Integration - Wire Up First Chicago Tab

**Files:**
- Modify: `frontend/components/valuation/valuation-calculator.tsx`

### Step 1: Add First Chicago tab to existing calculator

```typescript
// In frontend/components/valuation/valuation-calculator.tsx
// Add imports
import { FirstChicagoForm } from './first-chicago-form';
import { FirstChicagoResults } from './first-chicago-results';
import { apiClient } from '@/lib/api-client';
import type { FirstChicagoResponse } from '@/lib/schemas';

// Add state for First Chicago
const [firstChicagoResult, setFirstChicagoResult] = useState<FirstChicagoResponse | null>(null);
const [isFirstChicagoLoading, setIsFirstChicagoLoading] = useState(false);

// Add handler
const handleFirstChicagoSubmit = async (data: FirstChicagoFormData) => {
  setIsFirstChicagoLoading(true);
  const response = await apiClient.calculateFirstChicago(data);
  setIsFirstChicagoLoading(false);

  if (response.data) {
    setFirstChicagoResult(response.data);
  }
};

// Add tab content (in TabsList)
<TabsTrigger value="first-chicago">First Chicago</TabsTrigger>

// Add tab panel (in TabsContent area)
<TabsContent value="first-chicago" className="space-y-6">
  <FirstChicagoForm
    onSubmit={handleFirstChicagoSubmit}
    isLoading={isFirstChicagoLoading}
  />
  {firstChicagoResult && <FirstChicagoResults result={firstChicagoResult} />}
</TabsContent>
```

### Step 2: Run full frontend tests

Run: `cd frontend && npm run test:unit`
Expected: All tests pass

### Step 3: Run type check and lint

Run: `cd frontend && npm run type-check && npm run lint`
Expected: PASS

### Step 4: Commit

```bash
git add frontend/components/valuation/valuation-calculator.tsx
git commit -m "feat(valuation): integrate First Chicago Method into calculator"
```

---

## Task 11: E2E Testing

**Files:**
- Create: `playwright/tests/17-first-chicago-valuation.spec.ts`

### Step 1: Write E2E test

```typescript
// In playwright/tests/17-first-chicago-valuation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('First Chicago Method Valuation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/valuation');
  });

  test('should display First Chicago tab', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /First Chicago/i })).toBeVisible();
  });

  test('should calculate First Chicago valuation', async ({ page }) => {
    // Click First Chicago tab
    await page.getByRole('tab', { name: /First Chicago/i }).click();

    // Should show three default scenarios
    await expect(page.getByText(/Best Case/i)).toBeVisible();
    await expect(page.getByText(/Base Case/i)).toBeVisible();
    await expect(page.getByText(/Worst Case/i)).toBeVisible();

    // Submit with defaults
    await page.getByRole('button', { name: /Calculate/i }).click();

    // Wait for results
    await expect(page.getByText(/Present Value/i)).toBeVisible();
    await expect(page.getByText(/Probability-Weighted/i)).toBeVisible();
  });

  test('should show probability warning when not 100%', async ({ page }) => {
    await page.getByRole('tab', { name: /First Chicago/i }).click();

    // Adjust probabilities to not sum to 100%
    // (implementation depends on slider interaction)

    // Should show warning
    await expect(page.getByText(/should be 100%/i)).toBeVisible();
  });
});
```

### Step 2: Run E2E tests

Run: `./scripts/run-e2e-tests.sh`
Expected: All tests pass

### Step 3: Commit

```bash
git add playwright/tests/17-first-chicago-valuation.spec.ts
git commit -m "test(e2e): add First Chicago Method E2E tests"
```

---

## Final Verification

### Step 1: Run all backend tests

Run: `cd backend && uv run pytest -v`
Expected: All 101+ tests pass

### Step 2: Run backend type check

Run: `cd backend && uv run pyright src/`
Expected: No errors

### Step 3: Run all frontend tests

Run: `cd frontend && npm run test:unit`
Expected: All tests pass

### Step 4: Run frontend type check and lint

Run: `cd frontend && npm run type-check && npm run lint`
Expected: No errors

### Step 5: Run E2E tests

Run: `./scripts/run-e2e-tests.sh`
Expected: All tests pass

### Step 6: Create final commit and push

```bash
git push origin master
```

---

## Summary

Phase 1 implements:
- **Backend**: `FirstChicagoScenario`, `FirstChicagoParams`, `FirstChicagoResult` dataclasses + `calculate_first_chicago()` function
- **API**: `/api/valuation/first-chicago` endpoint with Pydantic validation
- **Frontend**: `FirstChicagoForm` + `FirstChicagoResults` components with Zod schemas
- **Tests**: Unit tests (backend + frontend) + E2E tests

Next phases will add:
- Phase 2: Pre-revenue methods (Berkus, Scorecard)
- Phase 3: Monte Carlo enhancement layer
- Phase 4: Industry benchmarks
- Phase 5: Output generation
- Phase 6: Advanced methods
