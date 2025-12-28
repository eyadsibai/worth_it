# Phase 2: Pre-Revenue Valuation Methods Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three pre-revenue valuation methods (Berkus, Scorecard, Risk Factor Summation) for early-stage startups without revenue.

**Architecture:** Extend valuation module with scoring-based methods. Each method uses weighted criteria to derive valuation. Share common scoring UI components across methods.

**Tech Stack:** Python/FastAPI (backend), TypeScript/React (frontend), Pydantic/Zod (validation), TDD throughout.

**Prerequisites:** Phase 1 complete (First Chicago Method working)

---

## Overview

Phase 2 adds three complementary pre-revenue valuation methods:

1. **Berkus Method** - Score 5 risk factors, each worth up to $500K
2. **Scorecard Method** - Compare to average pre-money, adjust by weighted factors
3. **Risk Factor Summation** - Start with base, add/subtract for 12 risk factors

These methods are ideal for pre-seed and seed-stage startups.

---

## Task 1: Berkus Method - Backend Data Models

**Files:**
- Modify: `backend/src/worth_it/calculations/valuation.py`
- Test: `backend/tests/test_valuation.py`

### Step 1: Write failing test for Berkus dataclasses

```python
# In backend/tests/test_valuation.py
from worth_it.calculations.valuation import (
    BerkusParams,
    BerkusResult,
)

class TestBerkusMethod:
    """Tests for Berkus Method valuation."""

    def test_berkus_params_creation(self) -> None:
        """Test creating Berkus params with all criteria."""
        params = BerkusParams(
            sound_idea=400_000,           # 0-500K
            prototype=300_000,            # 0-500K
            quality_team=500_000,         # 0-500K
            strategic_relationships=200_000,  # 0-500K
            product_rollout=100_000,      # 0-500K
        )
        assert params.sound_idea == 400_000
        assert params.quality_team == 500_000

    def test_berkus_result_creation(self) -> None:
        """Test Berkus result structure."""
        result = BerkusResult(
            valuation=1_500_000,
            breakdown={
                "sound_idea": 400_000,
                "prototype": 300_000,
                "quality_team": 500_000,
                "strategic_relationships": 200_000,
                "product_rollout": 100_000,
            },
            method="berkus",
        )
        assert result.valuation == 1_500_000
        assert result.method == "berkus"
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_valuation.py::TestBerkusMethod -v`
Expected: FAIL with import error

### Step 3: Write dataclasses

```python
# In backend/src/worth_it/calculations/valuation.py

@dataclass(frozen=True)
class BerkusParams:
    """Parameters for Berkus Method valuation.

    Each criterion is scored 0 to max_value (default $500K).
    Total valuation is sum of all criteria.

    Attributes:
        sound_idea: Value for basic value/idea (0-500K)
        prototype: Value for technology/prototype (0-500K)
        quality_team: Value for execution/management team (0-500K)
        strategic_relationships: Value for strategic relationships (0-500K)
        product_rollout: Value for product rollout/sales (0-500K)
        max_per_criterion: Maximum value per criterion (default 500K)
    """
    sound_idea: float
    prototype: float
    quality_team: float
    strategic_relationships: float
    product_rollout: float
    max_per_criterion: float = 500_000


@dataclass(frozen=True)
class BerkusResult:
    """Result of Berkus Method valuation.

    Attributes:
        valuation: Total valuation (sum of all criteria)
        breakdown: Value assigned to each criterion
        method: Always "berkus"
    """
    valuation: float
    breakdown: dict[str, float]
    method: str = "berkus"
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_valuation.py::TestBerkusMethod -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/calculations/valuation.py backend/tests/test_valuation.py
git commit -m "feat(valuation): add Berkus Method dataclasses"
```

---

## Task 2: Berkus Method - Calculation Function

**Files:**
- Modify: `backend/src/worth_it/calculations/valuation.py`
- Test: `backend/tests/test_valuation.py`

### Step 1: Write failing test for calculate_berkus

```python
# In backend/tests/test_valuation.py
from worth_it.calculations.valuation import calculate_berkus

class TestCalculateBerkus:
    """Tests for calculate_berkus function."""

    def test_full_score_valuation(self) -> None:
        """Test maximum valuation (all criteria at max)."""
        params = BerkusParams(
            sound_idea=500_000,
            prototype=500_000,
            quality_team=500_000,
            strategic_relationships=500_000,
            product_rollout=500_000,
        )
        result = calculate_berkus(params)
        assert result.valuation == 2_500_000
        assert result.method == "berkus"

    def test_partial_score_valuation(self) -> None:
        """Test partial scoring."""
        params = BerkusParams(
            sound_idea=400_000,
            prototype=300_000,
            quality_team=500_000,
            strategic_relationships=200_000,
            product_rollout=100_000,
        )
        result = calculate_berkus(params)
        assert result.valuation == 1_500_000

    def test_breakdown_included(self) -> None:
        """Test that breakdown shows each criterion."""
        params = BerkusParams(
            sound_idea=100_000,
            prototype=200_000,
            quality_team=300_000,
            strategic_relationships=400_000,
            product_rollout=500_000,
        )
        result = calculate_berkus(params)
        assert result.breakdown["sound_idea"] == 100_000
        assert result.breakdown["prototype"] == 200_000
        assert result.breakdown["quality_team"] == 300_000

    def test_zero_valuation(self) -> None:
        """Test with all zeros."""
        params = BerkusParams(
            sound_idea=0,
            prototype=0,
            quality_team=0,
            strategic_relationships=0,
            product_rollout=0,
        )
        result = calculate_berkus(params)
        assert result.valuation == 0
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_valuation.py::TestCalculateBerkus -v`
Expected: FAIL with import error

### Step 3: Write calculation function

```python
# In backend/src/worth_it/calculations/valuation.py

def calculate_berkus(params: BerkusParams) -> BerkusResult:
    """Calculate valuation using the Berkus Method.

    The Berkus Method assigns value to five key risk-reducing elements:
    1. Sound Idea (basic value)
    2. Prototype (technology risk reduction)
    3. Quality Management Team (execution risk reduction)
    4. Strategic Relationships (market risk reduction)
    5. Product Rollout or Sales (production risk reduction)

    Each element is worth $0 to $500K (configurable), max total $2.5M.

    Args:
        params: BerkusParams with scores for each criterion

    Returns:
        BerkusResult with total valuation and breakdown
    """
    breakdown = {
        "sound_idea": min(params.sound_idea, params.max_per_criterion),
        "prototype": min(params.prototype, params.max_per_criterion),
        "quality_team": min(params.quality_team, params.max_per_criterion),
        "strategic_relationships": min(params.strategic_relationships, params.max_per_criterion),
        "product_rollout": min(params.product_rollout, params.max_per_criterion),
    }

    valuation = sum(breakdown.values())

    return BerkusResult(
        valuation=valuation,
        breakdown=breakdown,
        method="berkus",
    )
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_valuation.py::TestCalculateBerkus -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/calculations/valuation.py backend/tests/test_valuation.py
git commit -m "feat(valuation): implement calculate_berkus function"
```

---

## Task 3: Scorecard Method - Backend Implementation

**Files:**
- Modify: `backend/src/worth_it/calculations/valuation.py`
- Test: `backend/tests/test_valuation.py`

### Step 1: Write failing tests

```python
# In backend/tests/test_valuation.py
from worth_it.calculations.valuation import (
    ScorecardFactor,
    ScorecardParams,
    ScorecardResult,
    calculate_scorecard,
)

class TestScorecardMethod:
    """Tests for Scorecard Method valuation."""

    def test_scorecard_factor_creation(self) -> None:
        """Test creating a scorecard factor."""
        factor = ScorecardFactor(
            name="Team",
            weight=0.30,
            score=1.25,  # 25% above average
        )
        assert factor.name == "Team"
        assert factor.weight == 0.30
        assert factor.score == 1.25

    def test_scorecard_params_creation(self) -> None:
        """Test creating scorecard params."""
        params = ScorecardParams(
            base_valuation=2_000_000,  # Average pre-money in region
            factors=[
                ScorecardFactor("Team", 0.30, 1.25),
                ScorecardFactor("Market Size", 0.25, 1.10),
                ScorecardFactor("Product", 0.15, 1.00),
                ScorecardFactor("Competition", 0.10, 0.90),
                ScorecardFactor("Marketing", 0.10, 1.00),
                ScorecardFactor("Need for Funding", 0.05, 1.00),
                ScorecardFactor("Other", 0.05, 1.00),
            ],
        )
        assert params.base_valuation == 2_000_000
        assert len(params.factors) == 7


class TestCalculateScorecard:
    """Tests for calculate_scorecard function."""

    def test_average_company_valuation(self) -> None:
        """Test company matching average (all scores = 1.0)."""
        params = ScorecardParams(
            base_valuation=2_000_000,
            factors=[
                ScorecardFactor("Team", 0.30, 1.0),
                ScorecardFactor("Market", 0.25, 1.0),
                ScorecardFactor("Product", 0.20, 1.0),
                ScorecardFactor("Competition", 0.15, 1.0),
                ScorecardFactor("Other", 0.10, 1.0),
            ],
        )
        result = calculate_scorecard(params)
        # All 1.0 scores = 100% of base
        assert result.valuation == pytest.approx(2_000_000, rel=0.01)

    def test_above_average_company(self) -> None:
        """Test company scoring above average."""
        params = ScorecardParams(
            base_valuation=2_000_000,
            factors=[
                ScorecardFactor("Team", 0.30, 1.50),      # +50%
                ScorecardFactor("Market", 0.25, 1.25),    # +25%
                ScorecardFactor("Product", 0.20, 1.10),   # +10%
                ScorecardFactor("Competition", 0.15, 1.00),
                ScorecardFactor("Other", 0.10, 1.00),
            ],
        )
        result = calculate_scorecard(params)
        # Weighted sum: 0.30*1.5 + 0.25*1.25 + 0.20*1.10 + 0.15*1.0 + 0.10*1.0
        # = 0.45 + 0.3125 + 0.22 + 0.15 + 0.10 = 1.2325
        # Valuation = 2M * 1.2325 = 2,465,000
        assert result.valuation == pytest.approx(2_465_000, rel=0.01)

    def test_below_average_company(self) -> None:
        """Test company scoring below average."""
        params = ScorecardParams(
            base_valuation=2_000_000,
            factors=[
                ScorecardFactor("Team", 0.30, 0.75),      # -25%
                ScorecardFactor("Market", 0.25, 0.80),    # -20%
                ScorecardFactor("Product", 0.20, 1.00),
                ScorecardFactor("Competition", 0.15, 0.90),
                ScorecardFactor("Other", 0.10, 1.00),
            ],
        )
        result = calculate_scorecard(params)
        # Weighted sum < 1.0, so valuation < base
        assert result.valuation < 2_000_000
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_valuation.py::TestScorecardMethod tests/test_valuation.py::TestCalculateScorecard -v`
Expected: FAIL with import error

### Step 3: Write implementation

```python
# In backend/src/worth_it/calculations/valuation.py

@dataclass(frozen=True)
class ScorecardFactor:
    """A single factor for Scorecard Method.

    Attributes:
        name: Factor name (e.g., "Team", "Market Size")
        weight: Weight of this factor (0.0 to 1.0, all weights should sum to 1.0)
        score: Score relative to average (1.0 = average, 1.5 = 50% better, 0.75 = 25% worse)
    """
    name: str
    weight: float
    score: float


@dataclass(frozen=True)
class ScorecardParams:
    """Parameters for Scorecard Method valuation.

    Attributes:
        base_valuation: Average pre-money valuation for comparable companies
        factors: List of weighted scoring factors
    """
    base_valuation: float
    factors: list[ScorecardFactor]


@dataclass(frozen=True)
class ScorecardResult:
    """Result of Scorecard Method valuation.

    Attributes:
        valuation: Adjusted valuation based on scores
        adjustment_factor: Overall multiplier applied to base (e.g., 1.25 = 25% premium)
        factor_contributions: Contribution of each factor to adjustment
        method: Always "scorecard"
    """
    valuation: float
    adjustment_factor: float
    factor_contributions: dict[str, float]
    method: str = "scorecard"


def calculate_scorecard(params: ScorecardParams) -> ScorecardResult:
    """Calculate valuation using the Scorecard Method.

    The Scorecard Method:
    1. Starts with average pre-money valuation for the region/stage
    2. Compares the startup to average across weighted factors
    3. Adjusts valuation based on weighted score

    Standard factors and weights:
    - Strength of Team: 30%
    - Size of Opportunity: 25%
    - Product/Technology: 15%
    - Competitive Environment: 10%
    - Marketing/Sales: 10%
    - Need for Additional Funding: 5%
    - Other: 5%

    Args:
        params: ScorecardParams with base valuation and factors

    Returns:
        ScorecardResult with adjusted valuation
    """
    factor_contributions: dict[str, float] = {}
    total_weighted_score = 0.0

    for factor in params.factors:
        contribution = factor.weight * factor.score
        factor_contributions[factor.name] = contribution
        total_weighted_score += contribution

    valuation = params.base_valuation * total_weighted_score

    return ScorecardResult(
        valuation=valuation,
        adjustment_factor=total_weighted_score,
        factor_contributions=factor_contributions,
        method="scorecard",
    )
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_valuation.py::TestScorecardMethod tests/test_valuation.py::TestCalculateScorecard -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/calculations/valuation.py backend/tests/test_valuation.py
git commit -m "feat(valuation): implement Scorecard Method"
```

---

## Task 4: Risk Factor Summation - Backend Implementation

**Files:**
- Modify: `backend/src/worth_it/calculations/valuation.py`
- Test: `backend/tests/test_valuation.py`

### Step 1: Write failing tests

```python
# In backend/tests/test_valuation.py
from worth_it.calculations.valuation import (
    RiskFactor,
    RiskFactorSummationParams,
    RiskFactorSummationResult,
    calculate_risk_factor_summation,
)

class TestRiskFactorSummation:
    """Tests for Risk Factor Summation Method."""

    def test_risk_factor_creation(self) -> None:
        """Test creating a risk factor with adjustment."""
        factor = RiskFactor(
            name="Management Risk",
            adjustment=250_000,  # Positive = reduces risk, adds value
        )
        assert factor.name == "Management Risk"
        assert factor.adjustment == 250_000

    def test_params_with_12_factors(self) -> None:
        """Test creating params with standard 12 factors."""
        factors = [
            RiskFactor("Management", 250_000),
            RiskFactor("Stage of Business", 0),
            RiskFactor("Legislation/Political", -250_000),
            RiskFactor("Manufacturing", 0),
            RiskFactor("Sales and Marketing", 250_000),
            RiskFactor("Funding/Capital", 0),
            RiskFactor("Competition", -500_000),
            RiskFactor("Technology", 250_000),
            RiskFactor("Litigation", 0),
            RiskFactor("International", 0),
            RiskFactor("Reputation", 250_000),
            RiskFactor("Lucrative Exit", 500_000),
        ]
        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=factors,
        )
        assert len(params.factors) == 12


class TestCalculateRiskFactorSummation:
    """Tests for calculate_risk_factor_summation function."""

    def test_neutral_factors(self) -> None:
        """Test with all neutral (0) adjustments."""
        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=[
                RiskFactor("Management", 0),
                RiskFactor("Stage", 0),
                RiskFactor("Competition", 0),
            ],
        )
        result = calculate_risk_factor_summation(params)
        assert result.valuation == 2_000_000

    def test_positive_adjustments(self) -> None:
        """Test with positive adjustments (risk reducers)."""
        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=[
                RiskFactor("Management", 500_000),   # Very strong team
                RiskFactor("Technology", 250_000),   # Strong tech
            ],
        )
        result = calculate_risk_factor_summation(params)
        assert result.valuation == 2_750_000

    def test_negative_adjustments(self) -> None:
        """Test with negative adjustments (risk increasers)."""
        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=[
                RiskFactor("Competition", -500_000),  # High competition
                RiskFactor("Funding", -250_000),      # Funding challenges
            ],
        )
        result = calculate_risk_factor_summation(params)
        assert result.valuation == 1_250_000

    def test_mixed_adjustments(self) -> None:
        """Test with mixed positive and negative adjustments."""
        params = RiskFactorSummationParams(
            base_valuation=2_000_000,
            factors=[
                RiskFactor("Management", 500_000),
                RiskFactor("Competition", -500_000),
                RiskFactor("Technology", 250_000),
            ],
        )
        result = calculate_risk_factor_summation(params)
        # 2M + 500K - 500K + 250K = 2.25M
        assert result.valuation == 2_250_000

    def test_minimum_valuation_floor(self) -> None:
        """Test that valuation doesn't go negative."""
        params = RiskFactorSummationParams(
            base_valuation=1_000_000,
            factors=[
                RiskFactor("Risk1", -500_000),
                RiskFactor("Risk2", -500_000),
                RiskFactor("Risk3", -500_000),
            ],
        )
        result = calculate_risk_factor_summation(params)
        # Should floor at 0, not go negative
        assert result.valuation >= 0
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_valuation.py::TestRiskFactorSummation tests/test_valuation.py::TestCalculateRiskFactorSummation -v`
Expected: FAIL with import error

### Step 3: Write implementation

```python
# In backend/src/worth_it/calculations/valuation.py

@dataclass(frozen=True)
class RiskFactor:
    """A single risk factor for Risk Factor Summation.

    Attributes:
        name: Factor name (e.g., "Management Risk", "Competition")
        adjustment: Dollar adjustment (-500K to +500K typically)
                   Positive = risk reducer (adds value)
                   Negative = risk increaser (subtracts value)
    """
    name: str
    adjustment: float


@dataclass(frozen=True)
class RiskFactorSummationParams:
    """Parameters for Risk Factor Summation Method.

    Attributes:
        base_valuation: Starting valuation (average for stage/region)
        factors: List of risk factors with adjustments
        adjustment_step: Standard adjustment increment (default 250K)
    """
    base_valuation: float
    factors: list[RiskFactor]
    adjustment_step: float = 250_000


@dataclass(frozen=True)
class RiskFactorSummationResult:
    """Result of Risk Factor Summation Method.

    Attributes:
        valuation: Final valuation after all adjustments
        total_adjustment: Sum of all adjustments
        factor_adjustments: Each factor's adjustment
        method: Always "risk_factor_summation"
    """
    valuation: float
    total_adjustment: float
    factor_adjustments: dict[str, float]
    method: str = "risk_factor_summation"


def calculate_risk_factor_summation(params: RiskFactorSummationParams) -> RiskFactorSummationResult:
    """Calculate valuation using Risk Factor Summation Method.

    The Risk Factor Summation Method:
    1. Starts with average pre-money valuation
    2. Adjusts by +/- $250K for each of 12 risk factors
    3. Factors rated: Very Low Risk (+2), Low (+1), Neutral (0), High (-1), Very High (-2)

    Standard 12 factors:
    1. Management
    2. Stage of the business
    3. Legislation/Political risk
    4. Manufacturing risk
    5. Sales and marketing risk
    6. Funding/Capital raising risk
    7. Competition risk
    8. Technology risk
    9. Litigation risk
    10. International risk
    11. Reputation risk
    12. Potential lucrative exit

    Args:
        params: RiskFactorSummationParams with base and factors

    Returns:
        RiskFactorSummationResult with adjusted valuation
    """
    factor_adjustments: dict[str, float] = {}
    total_adjustment = 0.0

    for factor in params.factors:
        factor_adjustments[factor.name] = factor.adjustment
        total_adjustment += factor.adjustment

    valuation = max(0, params.base_valuation + total_adjustment)

    return RiskFactorSummationResult(
        valuation=valuation,
        total_adjustment=total_adjustment,
        factor_adjustments=factor_adjustments,
        method="risk_factor_summation",
    )
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_valuation.py::TestRiskFactorSummation tests/test_valuation.py::TestCalculateRiskFactorSummation -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/calculations/valuation.py backend/tests/test_valuation.py
git commit -m "feat(valuation): implement Risk Factor Summation Method"
```

---

## Task 5: API Endpoints for Pre-Revenue Methods

**Files:**
- Modify: `backend/src/worth_it/models.py`
- Modify: `backend/src/worth_it/api/routers/valuation.py`
- Test: `backend/tests/test_api.py`

### Step 1: Write Pydantic models

```python
# In backend/src/worth_it/models.py

class BerkusRequest(BaseModel):
    """API request for Berkus Method."""
    sound_idea: float = Field(..., ge=0, le=500_000)
    prototype: float = Field(..., ge=0, le=500_000)
    quality_team: float = Field(..., ge=0, le=500_000)
    strategic_relationships: float = Field(..., ge=0, le=500_000)
    product_rollout: float = Field(..., ge=0, le=500_000)
    max_per_criterion: float = Field(default=500_000, ge=0)


class BerkusResponse(BaseModel):
    """API response for Berkus Method."""
    valuation: float
    breakdown: dict[str, float]
    method: str = "berkus"


class ScorecardFactorRequest(BaseModel):
    """A single factor for Scorecard Method."""
    name: str = Field(..., min_length=1, max_length=50)
    weight: float = Field(..., ge=0, le=1)
    score: float = Field(..., ge=0, le=2)


class ScorecardRequest(BaseModel):
    """API request for Scorecard Method."""
    base_valuation: float = Field(..., gt=0)
    factors: list[ScorecardFactorRequest] = Field(..., min_length=1)


class ScorecardResponse(BaseModel):
    """API response for Scorecard Method."""
    valuation: float
    adjustment_factor: float
    factor_contributions: dict[str, float]
    method: str = "scorecard"


class RiskFactorRequest(BaseModel):
    """A single risk factor."""
    name: str = Field(..., min_length=1, max_length=50)
    adjustment: float = Field(..., ge=-500_000, le=500_000)


class RiskFactorSummationRequest(BaseModel):
    """API request for Risk Factor Summation."""
    base_valuation: float = Field(..., gt=0)
    factors: list[RiskFactorRequest] = Field(..., min_length=1)


class RiskFactorSummationResponse(BaseModel):
    """API response for Risk Factor Summation."""
    valuation: float
    total_adjustment: float
    factor_adjustments: dict[str, float]
    method: str = "risk_factor_summation"
```

### Step 2: Write API endpoints

```python
# In backend/src/worth_it/api/routers/valuation.py

@router.post("/berkus", response_model=BerkusResponse)
@limiter.limit("30/minute")
async def calculate_berkus_valuation(
    request: Request,
    data: BerkusRequest,
) -> BerkusResponse:
    """Calculate valuation using Berkus Method."""
    params = BerkusParams(
        sound_idea=data.sound_idea,
        prototype=data.prototype,
        quality_team=data.quality_team,
        strategic_relationships=data.strategic_relationships,
        product_rollout=data.product_rollout,
        max_per_criterion=data.max_per_criterion,
    )
    result = calculate_berkus(params)
    return BerkusResponse(
        valuation=result.valuation,
        breakdown=result.breakdown,
        method=result.method,
    )


@router.post("/scorecard", response_model=ScorecardResponse)
@limiter.limit("30/minute")
async def calculate_scorecard_valuation(
    request: Request,
    data: ScorecardRequest,
) -> ScorecardResponse:
    """Calculate valuation using Scorecard Method."""
    factors = [
        ScorecardFactor(name=f.name, weight=f.weight, score=f.score)
        for f in data.factors
    ]
    params = ScorecardParams(
        base_valuation=data.base_valuation,
        factors=factors,
    )
    result = calculate_scorecard(params)
    return ScorecardResponse(
        valuation=result.valuation,
        adjustment_factor=result.adjustment_factor,
        factor_contributions=result.factor_contributions,
        method=result.method,
    )


@router.post("/risk-factor-summation", response_model=RiskFactorSummationResponse)
@limiter.limit("30/minute")
async def calculate_risk_factor_summation_valuation(
    request: Request,
    data: RiskFactorSummationRequest,
) -> RiskFactorSummationResponse:
    """Calculate valuation using Risk Factor Summation Method."""
    factors = [
        RiskFactor(name=f.name, adjustment=f.adjustment)
        for f in data.factors
    ]
    params = RiskFactorSummationParams(
        base_valuation=data.base_valuation,
        factors=factors,
    )
    result = calculate_risk_factor_summation(params)
    return RiskFactorSummationResponse(
        valuation=result.valuation,
        total_adjustment=result.total_adjustment,
        factor_adjustments=result.factor_adjustments,
        method=result.method,
    )
```

### Step 3: Write API tests

```python
# In backend/tests/test_api.py

class TestBerkusEndpoint:
    def test_berkus_calculation(self, client: TestClient) -> None:
        response = client.post("/api/valuation/berkus", json={
            "sound_idea": 400000,
            "prototype": 300000,
            "quality_team": 500000,
            "strategic_relationships": 200000,
            "product_rollout": 100000,
        })
        assert response.status_code == 200
        assert response.json()["valuation"] == 1500000


class TestScorecardEndpoint:
    def test_scorecard_calculation(self, client: TestClient) -> None:
        response = client.post("/api/valuation/scorecard", json={
            "base_valuation": 2000000,
            "factors": [
                {"name": "Team", "weight": 0.30, "score": 1.25},
                {"name": "Market", "weight": 0.25, "score": 1.10},
                {"name": "Product", "weight": 0.25, "score": 1.00},
                {"name": "Other", "weight": 0.20, "score": 1.00},
            ],
        })
        assert response.status_code == 200
        assert response.json()["method"] == "scorecard"


class TestRiskFactorSummationEndpoint:
    def test_risk_factor_summation_calculation(self, client: TestClient) -> None:
        response = client.post("/api/valuation/risk-factor-summation", json={
            "base_valuation": 2000000,
            "factors": [
                {"name": "Management", "adjustment": 250000},
                {"name": "Competition", "adjustment": -250000},
            ],
        })
        assert response.status_code == 200
        assert response.json()["valuation"] == 2000000
```

### Step 4: Run tests

Run: `cd backend && uv run pytest tests/test_api.py -v -k "Berkus or Scorecard or RiskFactor"`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/models.py backend/src/worth_it/api/routers/valuation.py backend/tests/test_api.py
git commit -m "feat(api): add endpoints for pre-revenue valuation methods"
```

---

## Task 6: Frontend - Zod Schemas for Pre-Revenue Methods

**Files:**
- Modify: `frontend/lib/schemas.ts`

### Step 1: Add Zod schemas

```typescript
// In frontend/lib/schemas.ts

// Berkus Method
export const BerkusRequestSchema = z.object({
  soundIdea: z.number().min(0).max(500000),
  prototype: z.number().min(0).max(500000),
  qualityTeam: z.number().min(0).max(500000),
  strategicRelationships: z.number().min(0).max(500000),
  productRollout: z.number().min(0).max(500000),
});

export type BerkusRequest = z.infer<typeof BerkusRequestSchema>;

export const BerkusResponseSchema = z.object({
  valuation: z.number(),
  breakdown: z.record(z.string(), z.number()),
  method: z.literal('berkus'),
});

export type BerkusResponse = z.infer<typeof BerkusResponseSchema>;

// Scorecard Method
export const ScorecardFactorSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0).max(1),
  score: z.number().min(0).max(2),
});

export const ScorecardRequestSchema = z.object({
  baseValuation: z.number().positive(),
  factors: z.array(ScorecardFactorSchema).min(1),
});

export type ScorecardRequest = z.infer<typeof ScorecardRequestSchema>;

export const ScorecardResponseSchema = z.object({
  valuation: z.number(),
  adjustmentFactor: z.number(),
  factorContributions: z.record(z.string(), z.number()),
  method: z.literal('scorecard'),
});

export type ScorecardResponse = z.infer<typeof ScorecardResponseSchema>;

// Risk Factor Summation
export const RiskFactorSchema = z.object({
  name: z.string().min(1),
  adjustment: z.number().min(-500000).max(500000),
});

export const RiskFactorSummationRequestSchema = z.object({
  baseValuation: z.number().positive(),
  factors: z.array(RiskFactorSchema).min(1),
});

export type RiskFactorSummationRequest = z.infer<typeof RiskFactorSummationRequestSchema>;

export const RiskFactorSummationResponseSchema = z.object({
  valuation: z.number(),
  totalAdjustment: z.number(),
  factorAdjustments: z.record(z.string(), z.number()),
  method: z.literal('risk_factor_summation'),
});

export type RiskFactorSummationResponse = z.infer<typeof RiskFactorSummationResponseSchema>;
```

### Step 2: Run type check

Run: `cd frontend && npm run type-check`
Expected: PASS

### Step 3: Commit

```bash
git add frontend/lib/schemas.ts
git commit -m "feat(frontend): add Zod schemas for pre-revenue methods"
```

---

## Task 7: Frontend - API Client Methods

**Files:**
- Modify: `frontend/lib/api-client.ts`

### Step 1: Add API client methods

```typescript
// In frontend/lib/api-client.ts

  calculateBerkus: async (request: BerkusRequest): Promise<ApiResponse<BerkusResponse>> => {
    const apiRequest = {
      sound_idea: request.soundIdea,
      prototype: request.prototype,
      quality_team: request.qualityTeam,
      strategic_relationships: request.strategicRelationships,
      product_rollout: request.productRollout,
    };
    const response = await fetch(`${API_URL}/api/valuation/berkus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest),
    });
    if (!response.ok) return { error: 'Failed to calculate Berkus valuation' };
    const data = await response.json();
    return { data: { ...data, method: 'berkus' } };
  },

  calculateScorecard: async (request: ScorecardRequest): Promise<ApiResponse<ScorecardResponse>> => {
    const apiRequest = {
      base_valuation: request.baseValuation,
      factors: request.factors,
    };
    const response = await fetch(`${API_URL}/api/valuation/scorecard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest),
    });
    if (!response.ok) return { error: 'Failed to calculate Scorecard valuation' };
    const data = await response.json();
    return {
      data: {
        valuation: data.valuation,
        adjustmentFactor: data.adjustment_factor,
        factorContributions: data.factor_contributions,
        method: 'scorecard',
      },
    };
  },

  calculateRiskFactorSummation: async (
    request: RiskFactorSummationRequest
  ): Promise<ApiResponse<RiskFactorSummationResponse>> => {
    const apiRequest = {
      base_valuation: request.baseValuation,
      factors: request.factors,
    };
    const response = await fetch(`${API_URL}/api/valuation/risk-factor-summation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest),
    });
    if (!response.ok) return { error: 'Failed to calculate Risk Factor Summation' };
    const data = await response.json();
    return {
      data: {
        valuation: data.valuation,
        totalAdjustment: data.total_adjustment,
        factorAdjustments: data.factor_adjustments,
        method: 'risk_factor_summation',
      },
    };
  },
```

### Step 2: Commit

```bash
git add frontend/lib/api-client.ts
git commit -m "feat(frontend): add API client methods for pre-revenue methods"
```

---

## Task 8: Frontend - Berkus Form Component

**Files:**
- Create: `frontend/components/valuation/berkus-form.tsx`

### Step 1: Write component

```typescript
// In frontend/components/valuation/berkus-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { BerkusRequestSchema, type BerkusRequest } from '@/lib/schemas';
import { formatCurrency } from '@/lib/format-utils';

interface BerkusFormProps {
  onSubmit: (data: BerkusRequest) => void;
  isLoading?: boolean;
}

const BERKUS_CRITERIA = [
  { key: 'soundIdea', label: 'Sound Idea', description: 'Basic value proposition and idea quality' },
  { key: 'prototype', label: 'Prototype/Technology', description: 'Working prototype or technology risk reduction' },
  { key: 'qualityTeam', label: 'Quality Management Team', description: 'Execution capability and experience' },
  { key: 'strategicRelationships', label: 'Strategic Relationships', description: 'Partnerships, advisors, board members' },
  { key: 'productRollout', label: 'Product Rollout/Sales', description: 'Evidence of market traction or sales' },
] as const;

export function BerkusForm({ onSubmit, isLoading }: BerkusFormProps) {
  const { handleSubmit, watch, setValue } = useForm<BerkusRequest>({
    resolver: zodResolver(BerkusRequestSchema),
    defaultValues: {
      soundIdea: 250000,
      prototype: 250000,
      qualityTeam: 250000,
      strategicRelationships: 250000,
      productRollout: 250000,
    },
  });

  const values = watch();
  const totalValuation = Object.values(values).reduce((sum, val) => sum + (val || 0), 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Berkus Method</CardTitle>
          <CardDescription>
            Score each criterion from $0 to $500K. Total valuation caps at $2.5M.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {BERKUS_CRITERIA.map(({ key, label, description }) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between">
                <div>
                  <Label>{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <span className="font-mono text-sm">
                  {formatCurrency(values[key] || 0)}
                </span>
              </div>
              <Slider
                value={[values[key] || 0]}
                onValueChange={([val]) => setValue(key, val)}
                min={0}
                max={500000}
                step={50000}
              />
            </div>
          ))}

          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Valuation</span>
              <span className="text-primary">{formatCurrency(totalValuation)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Calculating...' : 'Calculate Berkus Valuation'}
      </Button>
    </form>
  );
}
```

### Step 2: Commit

```bash
git add frontend/components/valuation/berkus-form.tsx
git commit -m "feat(frontend): add BerkusForm component"
```

---

## Task 9: Frontend - Scorecard Form Component

**Files:**
- Create: `frontend/components/valuation/scorecard-form.tsx`

### Step 1: Write component

```typescript
// In frontend/components/valuation/scorecard-form.tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScorecardRequestSchema, type ScorecardRequest } from '@/lib/schemas';
import { formatCurrency } from '@/lib/format-utils';

interface ScorecardFormProps {
  onSubmit: (data: ScorecardRequest) => void;
  isLoading?: boolean;
}

const DEFAULT_FACTORS = [
  { name: 'Strength of Team', weight: 0.30, score: 1.0 },
  { name: 'Size of Opportunity', weight: 0.25, score: 1.0 },
  { name: 'Product/Technology', weight: 0.15, score: 1.0 },
  { name: 'Competitive Environment', weight: 0.10, score: 1.0 },
  { name: 'Marketing/Sales Channels', weight: 0.10, score: 1.0 },
  { name: 'Need for Additional Investment', weight: 0.05, score: 1.0 },
  { name: 'Other Factors', weight: 0.05, score: 1.0 },
];

export function ScorecardForm({ onSubmit, isLoading }: ScorecardFormProps) {
  const { register, control, handleSubmit, watch, setValue } = useForm<ScorecardRequest>({
    resolver: zodResolver(ScorecardRequestSchema),
    defaultValues: {
      baseValuation: 2000000,
      factors: DEFAULT_FACTORS,
    },
  });

  const { fields } = useFieldArray({ control, name: 'factors' });
  const factors = watch('factors');
  const baseValuation = watch('baseValuation');

  // Calculate preview
  const adjustmentFactor = factors.reduce((sum, f) => sum + (f.weight * f.score), 0);
  const estimatedValuation = baseValuation * adjustmentFactor;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scorecard Method</CardTitle>
          <CardDescription>
            Compare your startup to average companies. Score 1.0 = average.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Valuation */}
          <div className="space-y-2">
            <Label>Average Pre-Money (Your Region/Stage)</Label>
            <Input
              type="number"
              {...register('baseValuation', { valueAsNumber: true })}
              placeholder="2,000,000"
            />
          </div>

          {/* Factors */}
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-2 rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between">
                  <span className="font-medium">{factors[index]?.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Weight: {Math.round((factors[index]?.weight || 0) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-16">Below Avg</span>
                  <Slider
                    value={[(factors[index]?.score || 1) * 100]}
                    onValueChange={([val]) => setValue(`factors.${index}.score`, val / 100)}
                    min={50}
                    max={150}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-16 text-right">Above Avg</span>
                  <span className="font-mono text-sm w-12 text-right">
                    {Math.round((factors[index]?.score || 1) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Adjustment Factor</span>
              <span className="font-mono">{(adjustmentFactor * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Estimated Valuation</span>
              <span className="text-primary">{formatCurrency(estimatedValuation)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Calculating...' : 'Calculate Scorecard Valuation'}
      </Button>
    </form>
  );
}
```

### Step 2: Commit

```bash
git add frontend/components/valuation/scorecard-form.tsx
git commit -m "feat(frontend): add ScorecardForm component"
```

---

## Task 10: Frontend - Risk Factor Form Component

**Files:**
- Create: `frontend/components/valuation/risk-factor-form.tsx`

### Step 1: Write component (similar pattern, with 12 risk factors and +2 to -2 scale)

### Step 2: Commit

```bash
git add frontend/components/valuation/risk-factor-form.tsx
git commit -m "feat(frontend): add RiskFactorForm component"
```

---

## Task 11: Integration - Add Pre-Revenue Tabs

**Files:**
- Modify: `frontend/components/valuation/valuation-calculator.tsx`

### Step 1: Add tabs for Berkus, Scorecard, and Risk Factor Summation

### Step 2: Test and commit

```bash
git add frontend/components/valuation/valuation-calculator.tsx
git commit -m "feat(valuation): integrate pre-revenue methods into calculator"
```

---

## Final Verification

Run all tests:
```bash
cd backend && uv run pytest -v
cd frontend && npm run test:unit && npm run type-check
./scripts/run-e2e-tests.sh
```

Push changes:
```bash
git push origin feat/valuation-pre-revenue
```

---

## Summary

Phase 2 implements three pre-revenue valuation methods:

| Method | Best For | Valuation Range |
|--------|----------|-----------------|
| Berkus | Pre-seed with idea/prototype | $0 - $2.5M |
| Scorecard | Seed stage, comparing to peers | Variable based on base |
| Risk Factor Summation | Any early stage, 12-factor analysis | Variable based on adjustments |

All methods follow the same pattern:
- Backend dataclass + calculation function
- API endpoint with Pydantic validation
- Frontend form with Zod schema
- Results display component
