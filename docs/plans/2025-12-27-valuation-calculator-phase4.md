# Phase 4: Industry Benchmarks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add built-in industry benchmarks for 15+ sectors, enabling automatic parameter suggestions and validation warnings for valuation inputs.

**Architecture:** Create a benchmark data layer with sector-specific metrics. Integrate with existing valuation forms to suggest defaults and flag outliers.

**Tech Stack:** Python/FastAPI (backend), TypeScript/React (frontend), JSON data files for benchmarks, TDD throughout.

**Prerequisites:** Phases 1-3 complete (First Chicago, Pre-Revenue methods, Monte Carlo working). Phase 2 patterns: frozen dataclasses for all params/results, Pydantic for API validation. Phase 3 patterns: ParameterDistribution with DistributionType enum, MonteCarloResult for simulation outputs.

**Branch:** Create from `master` (after Phase 3 merge) as `feature/valuation-phase4`

---

## Overview

Industry benchmarks provide:
1. **Default Values** - Pre-fill forms with sector-appropriate parameters
2. **Validation Warnings** - Flag inputs that deviate significantly from norms
3. **Comparison Context** - Show how inputs compare to industry averages
4. **Monte Carlo Suggestions** - Suggest distribution parameters based on sector volatility

---

## Task 1: Benchmark Data Models

**Files:**
- Create: `backend/src/worth_it/calculations/benchmarks.py`
- Create: `backend/src/worth_it/data/industry_benchmarks.json`
- Test: `backend/tests/test_benchmarks.py`

### Step 1: Write failing test for benchmark structure

```python
# In backend/tests/test_benchmarks.py
import pytest
from worth_it.calculations.benchmarks import (
    IndustryBenchmark,
    BenchmarkMetric,
    ValidationResult,
    get_benchmark,
    get_all_industries,
    validate_against_benchmark,
)


class TestBenchmarkStructure:
    """Tests for benchmark data structure."""

    def test_benchmark_metric_creation(self) -> None:
        """Test creating a benchmark metric."""
        metric = BenchmarkMetric(
            name="revenue_multiple",
            min_value=2.0,
            typical_low=4.0,
            median=6.0,
            typical_high=10.0,
            max_value=20.0,
            unit="x",
        )
        assert metric.median == 6.0
        assert metric.unit == "x"

    def test_industry_benchmark_creation(self) -> None:
        """Test creating an industry benchmark."""
        benchmark = IndustryBenchmark(
            code="saas",
            name="SaaS / Software",
            description="Software-as-a-Service companies",
            metrics={
                "revenue_multiple": BenchmarkMetric(
                    name="revenue_multiple",
                    min_value=2.0,
                    typical_low=4.0,
                    median=6.0,
                    typical_high=10.0,
                    max_value=20.0,
                    unit="x",
                ),
            },
        )
        assert benchmark.code == "saas"
        assert "revenue_multiple" in benchmark.metrics


class TestBenchmarkLookup:
    """Tests for benchmark lookup functions."""

    def test_get_benchmark_by_industry(self) -> None:
        """Test retrieving benchmark by industry code."""
        benchmark = get_benchmark("saas")
        assert benchmark is not None
        assert benchmark.name == "SaaS / Software"

    def test_get_all_industries(self) -> None:
        """Test getting list of all industries."""
        industries = get_all_industries()
        assert len(industries) >= 15
        assert any(i.code == "saas" for i in industries)
        assert any(i.code == "fintech" for i in industries)

    def test_unknown_industry_returns_none(self) -> None:
        """Test that unknown industry returns None."""
        benchmark = get_benchmark("unknown_industry_xyz")
        assert benchmark is None


class TestBenchmarkValidation:
    """Tests for validating inputs against benchmarks."""

    def test_value_within_typical_range(self) -> None:
        """Test value within typical range passes."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="revenue_multiple",
            value=6.0,
        )
        assert result.is_valid
        assert result.severity == "ok"

    def test_value_outside_typical_but_within_range(self) -> None:
        """Test value outside typical range but within min/max."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="revenue_multiple",
            value=15.0,
        )
        assert result.is_valid
        assert result.severity == "warning"
        assert "above typical" in result.message.lower()

    def test_value_outside_range(self) -> None:
        """Test value completely outside range."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="revenue_multiple",
            value=25.0,
        )
        assert not result.is_valid
        assert result.severity == "error"
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_benchmarks.py -v`
Expected: FAIL with import error

### Step 3: Write implementation

```python
# In backend/src/worth_it/calculations/benchmarks.py
"""Industry benchmark data for valuation parameters.

Provides sector-specific benchmarks for validating valuation inputs
and suggesting reasonable parameter ranges.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal


@dataclass(frozen=True)
class BenchmarkMetric:
    """A single benchmark metric with range values.

    Attributes:
        name: Metric identifier (e.g., "revenue_multiple", "discount_rate")
        min_value: Absolute minimum (anything below is an error)
        typical_low: Lower bound of typical range (25th percentile)
        median: Industry median value (50th percentile)
        typical_high: Upper bound of typical range (75th percentile)
        max_value: Absolute maximum (anything above is an error)
        unit: Display unit (e.g., "x", "%", "$")
    """

    name: str
    min_value: float
    typical_low: float
    median: float
    typical_high: float
    max_value: float
    unit: str


@dataclass(frozen=True)
class IndustryBenchmark:
    """Benchmark data for a specific industry.

    Attributes:
        code: Unique identifier (e.g., "saas", "fintech")
        name: Display name (e.g., "SaaS / Software")
        description: Brief description of the industry
        metrics: Dictionary of metric name to BenchmarkMetric
    """

    code: str
    name: str
    description: str
    metrics: dict[str, BenchmarkMetric]


@dataclass(frozen=True)
class ValidationResult:
    """Result of validating a value against benchmarks.

    Attributes:
        is_valid: Whether the value is within acceptable range
        severity: "ok", "warning", or "error"
        message: Human-readable explanation
        benchmark_median: The benchmark median for comparison
        suggested_range: Tuple of (typical_low, typical_high)
    """

    is_valid: bool
    severity: Literal["ok", "warning", "error"]
    message: str
    benchmark_median: float
    suggested_range: tuple[float, float] | None = None


# Module-level cache for benchmark data
_BENCHMARKS: dict[str, IndustryBenchmark] = {}


def _load_benchmarks() -> None:
    """Load benchmark data from JSON file."""
    global _BENCHMARKS
    if _BENCHMARKS:
        return

    data_path = Path(__file__).parent.parent / "data" / "industry_benchmarks.json"
    with open(data_path) as f:
        data = json.load(f)

    for industry in data["industries"]:
        metrics = {
            m["name"]: BenchmarkMetric(
                name=m["name"],
                min_value=m["min_value"],
                typical_low=m["typical_low"],
                median=m["median"],
                typical_high=m["typical_high"],
                max_value=m["max_value"],
                unit=m["unit"],
            )
            for m in industry["metrics"]
        }
        _BENCHMARKS[industry["code"]] = IndustryBenchmark(
            code=industry["code"],
            name=industry["name"],
            description=industry.get("description", ""),
            metrics=metrics,
        )


def get_benchmark(industry_code: str) -> IndustryBenchmark | None:
    """Get benchmark for an industry by code.

    Args:
        industry_code: Industry identifier (e.g., "saas")

    Returns:
        IndustryBenchmark or None if not found
    """
    _load_benchmarks()
    return _BENCHMARKS.get(industry_code)


def get_all_industries() -> list[IndustryBenchmark]:
    """Get all available industry benchmarks.

    Returns:
        List of all IndustryBenchmark objects
    """
    _load_benchmarks()
    return list(_BENCHMARKS.values())


def validate_against_benchmark(
    industry_code: str,
    metric_name: str,
    value: float,
) -> ValidationResult:
    """Validate a value against industry benchmarks.

    Args:
        industry_code: Industry to compare against
        metric_name: Metric being validated
        value: The value to validate

    Returns:
        ValidationResult with severity and message
    """
    benchmark = get_benchmark(industry_code)
    if not benchmark:
        return ValidationResult(
            is_valid=True,
            severity="ok",
            message="No benchmark data available for this industry",
            benchmark_median=0,
        )

    metric = benchmark.metrics.get(metric_name)
    if not metric:
        return ValidationResult(
            is_valid=True,
            severity="ok",
            message=f"No benchmark for {metric_name} in {industry_code}",
            benchmark_median=0,
        )

    suggested_range = (metric.typical_low, metric.typical_high)

    # Check ranges
    if value < metric.min_value:
        return ValidationResult(
            is_valid=False,
            severity="error",
            message=f"Value {value}{metric.unit} is below minimum ({metric.min_value}{metric.unit}) for {benchmark.name}",
            benchmark_median=metric.median,
            suggested_range=suggested_range,
        )

    if value > metric.max_value:
        return ValidationResult(
            is_valid=False,
            severity="error",
            message=f"Value {value}{metric.unit} is above maximum ({metric.max_value}{metric.unit}) for {benchmark.name}",
            benchmark_median=metric.median,
            suggested_range=suggested_range,
        )

    if value < metric.typical_low:
        return ValidationResult(
            is_valid=True,
            severity="warning",
            message=f"Value {value}{metric.unit} is below typical range ({metric.typical_low}-{metric.typical_high}{metric.unit})",
            benchmark_median=metric.median,
            suggested_range=suggested_range,
        )

    if value > metric.typical_high:
        return ValidationResult(
            is_valid=True,
            severity="warning",
            message=f"Value {value}{metric.unit} is above typical range ({metric.typical_low}-{metric.typical_high}{metric.unit})",
            benchmark_median=metric.median,
            suggested_range=suggested_range,
        )

    return ValidationResult(
        is_valid=True,
        severity="ok",
        message="Value is within typical industry range",
        benchmark_median=metric.median,
        suggested_range=suggested_range,
    )
```

### Step 4: Create data directory and JSON file

```bash
mkdir -p backend/src/worth_it/data
```

```json
// In backend/src/worth_it/data/industry_benchmarks.json
{
  "industries": [
    {
      "code": "saas",
      "name": "SaaS / Software",
      "description": "Software-as-a-Service and enterprise software companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 1.0, "typical_low": 4.0, "median": 6.0, "typical_high": 12.0, "max_value": 25.0, "unit": "x"},
        {"name": "discount_rate", "min_value": 0.12, "typical_low": 0.18, "median": 0.25, "typical_high": 0.35, "max_value": 0.50, "unit": ""},
        {"name": "growth_rate", "min_value": 0.10, "typical_low": 0.30, "median": 0.50, "typical_high": 1.00, "max_value": 3.00, "unit": ""},
        {"name": "gross_margin", "min_value": 0.50, "typical_low": 0.70, "median": 0.80, "typical_high": 0.90, "max_value": 0.95, "unit": ""}
      ]
    },
    {
      "code": "fintech",
      "name": "Fintech",
      "description": "Financial technology and payments companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 2.0, "typical_low": 5.0, "median": 8.0, "typical_high": 15.0, "max_value": 30.0, "unit": "x"},
        {"name": "discount_rate", "min_value": 0.15, "typical_low": 0.20, "median": 0.28, "typical_high": 0.38, "max_value": 0.50, "unit": ""}
      ]
    },
    {
      "code": "ecommerce",
      "name": "E-Commerce / Retail",
      "description": "Online retail and marketplace companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 0.5, "typical_low": 1.0, "median": 2.0, "typical_high": 4.0, "max_value": 8.0, "unit": "x"},
        {"name": "discount_rate", "min_value": 0.10, "typical_low": 0.15, "median": 0.20, "typical_high": 0.30, "max_value": 0.45, "unit": ""}
      ]
    },
    {
      "code": "healthcare",
      "name": "Healthcare / Biotech",
      "description": "Healthcare technology and biotechnology companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 2.0, "typical_low": 4.0, "median": 7.0, "typical_high": 12.0, "max_value": 25.0, "unit": "x"},
        {"name": "discount_rate", "min_value": 0.18, "typical_low": 0.25, "median": 0.35, "typical_high": 0.45, "max_value": 0.60, "unit": ""}
      ]
    },
    {
      "code": "marketplace",
      "name": "Marketplace",
      "description": "Two-sided marketplace platforms",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 1.0, "typical_low": 3.0, "median": 5.0, "typical_high": 10.0, "max_value": 20.0, "unit": "x"}
      ]
    },
    {
      "code": "edtech",
      "name": "EdTech",
      "description": "Education technology companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 1.0, "typical_low": 2.0, "median": 4.0, "typical_high": 8.0, "max_value": 15.0, "unit": "x"}
      ]
    },
    {
      "code": "proptech",
      "name": "PropTech / Real Estate",
      "description": "Real estate technology companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 1.0, "typical_low": 2.0, "median": 4.0, "typical_high": 7.0, "max_value": 12.0, "unit": "x"}
      ]
    },
    {
      "code": "cleantech",
      "name": "CleanTech / Energy",
      "description": "Clean technology and renewable energy companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 1.0, "typical_low": 3.0, "median": 5.0, "typical_high": 10.0, "max_value": 20.0, "unit": "x"}
      ]
    },
    {
      "code": "gaming",
      "name": "Gaming / Entertainment",
      "description": "Video gaming and entertainment companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 1.0, "typical_low": 2.0, "median": 4.0, "typical_high": 8.0, "max_value": 15.0, "unit": "x"}
      ]
    },
    {
      "code": "logistics",
      "name": "Logistics / Supply Chain",
      "description": "Logistics and supply chain technology companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 0.5, "typical_low": 1.5, "median": 3.0, "typical_high": 6.0, "max_value": 10.0, "unit": "x"}
      ]
    },
    {
      "code": "adtech",
      "name": "AdTech / Marketing",
      "description": "Advertising technology and marketing companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 1.0, "typical_low": 2.0, "median": 4.0, "typical_high": 8.0, "max_value": 15.0, "unit": "x"}
      ]
    },
    {
      "code": "cybersecurity",
      "name": "Cybersecurity",
      "description": "Cybersecurity and data protection companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 3.0, "typical_low": 6.0, "median": 10.0, "typical_high": 18.0, "max_value": 30.0, "unit": "x"}
      ]
    },
    {
      "code": "ai_ml",
      "name": "AI / Machine Learning",
      "description": "Artificial intelligence and machine learning companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 5.0, "typical_low": 10.0, "median": 15.0, "typical_high": 25.0, "max_value": 50.0, "unit": "x"}
      ]
    },
    {
      "code": "consumer",
      "name": "Consumer Apps",
      "description": "Consumer-facing mobile and web applications",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 0.5, "typical_low": 1.5, "median": 3.0, "typical_high": 6.0, "max_value": 12.0, "unit": "x"}
      ]
    },
    {
      "code": "b2b_services",
      "name": "B2B Services",
      "description": "Business-to-business service companies",
      "metrics": [
        {"name": "revenue_multiple", "min_value": 1.0, "typical_low": 2.0, "median": 3.5, "typical_high": 6.0, "max_value": 10.0, "unit": "x"}
      ]
    }
  ]
}
```

### Step 5: Run tests

Run: `cd backend && uv run pytest tests/test_benchmarks.py -v`
Expected: PASS

### Step 6: Commit

```bash
git add backend/src/worth_it/calculations/benchmarks.py backend/src/worth_it/data/industry_benchmarks.json backend/tests/test_benchmarks.py
git commit -m "feat(benchmarks): add industry benchmark data for 15+ sectors"
```

---

## Task 2: Benchmark API Endpoints

**Files:**
- Modify: `backend/src/worth_it/api/routers/valuation.py`
- Modify: `backend/src/worth_it/models.py`
- Test: `backend/tests/test_api.py`

### Step 1: Add Pydantic models for benchmarks

```python
# Add to backend/src/worth_it/models.py

class BenchmarkMetricResponse(BaseModel):
    """API response for a single benchmark metric."""

    name: str
    min_value: float
    typical_low: float
    median: float
    typical_high: float
    max_value: float
    unit: str


class IndustryBenchmarkResponse(BaseModel):
    """API response for industry benchmark data."""

    code: str
    name: str
    description: str
    metrics: dict[str, BenchmarkMetricResponse]


class IndustryListItem(BaseModel):
    """Summary item for industry list."""

    code: str
    name: str


class BenchmarkValidationRequest(BaseModel):
    """Request to validate a value against benchmarks."""

    industry_code: str
    metric_name: str
    value: float


class BenchmarkValidationResponse(BaseModel):
    """Response from benchmark validation."""

    is_valid: bool
    severity: str
    message: str
    benchmark_median: float
    suggested_range: tuple[float, float] | None = None
```

### Step 2: Add API endpoints

```python
# Add to backend/src/worth_it/api/routers/valuation.py

from worth_it.calculations.benchmarks import (
    get_benchmark,
    get_all_industries,
    validate_against_benchmark,
)
from worth_it.models import (
    IndustryBenchmarkResponse,
    IndustryListItem,
    BenchmarkMetricResponse,
    BenchmarkValidationRequest,
    BenchmarkValidationResponse,
)


@router.get("/benchmarks/industries", response_model=list[IndustryListItem])
async def list_industries() -> list[IndustryListItem]:
    """List all available industries with benchmarks."""
    industries = get_all_industries()
    return [
        IndustryListItem(code=i.code, name=i.name)
        for i in industries
    ]


@router.get("/benchmarks/{industry_code}", response_model=IndustryBenchmarkResponse)
async def get_industry_benchmark(industry_code: str) -> IndustryBenchmarkResponse:
    """Get benchmark data for a specific industry."""
    benchmark = get_benchmark(industry_code)
    if not benchmark:
        raise HTTPException(status_code=404, detail=f"Industry '{industry_code}' not found")

    return IndustryBenchmarkResponse(
        code=benchmark.code,
        name=benchmark.name,
        description=benchmark.description,
        metrics={
            name: BenchmarkMetricResponse(
                name=m.name,
                min_value=m.min_value,
                typical_low=m.typical_low,
                median=m.median,
                typical_high=m.typical_high,
                max_value=m.max_value,
                unit=m.unit,
            )
            for name, m in benchmark.metrics.items()
        },
    )


@router.post("/benchmarks/validate", response_model=BenchmarkValidationResponse)
async def validate_benchmark(request: BenchmarkValidationRequest) -> BenchmarkValidationResponse:
    """Validate a value against industry benchmarks."""
    result = validate_against_benchmark(
        industry_code=request.industry_code,
        metric_name=request.metric_name,
        value=request.value,
    )
    return BenchmarkValidationResponse(
        is_valid=result.is_valid,
        severity=result.severity,
        message=result.message,
        benchmark_median=result.benchmark_median,
        suggested_range=result.suggested_range,
    )
```

### Step 3: Write API tests

```python
# Add to backend/tests/test_api.py

class TestBenchmarkAPI:
    """Tests for benchmark API endpoints."""

    def test_list_industries(self, client: TestClient) -> None:
        """Test listing all industries."""
        response = client.get("/api/valuation/benchmarks/industries")
        assert response.status_code == 200
        industries = response.json()
        assert len(industries) >= 15
        assert any(i["code"] == "saas" for i in industries)

    def test_get_industry_benchmark(self, client: TestClient) -> None:
        """Test getting benchmark for specific industry."""
        response = client.get("/api/valuation/benchmarks/saas")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "saas"
        assert "revenue_multiple" in data["metrics"]

    def test_get_unknown_industry(self, client: TestClient) -> None:
        """Test 404 for unknown industry."""
        response = client.get("/api/valuation/benchmarks/unknown_xyz")
        assert response.status_code == 404

    def test_validate_value_ok(self, client: TestClient) -> None:
        """Test validation of value within range."""
        response = client.post(
            "/api/valuation/benchmarks/validate",
            json={"industry_code": "saas", "metric_name": "revenue_multiple", "value": 6.0},
        )
        assert response.status_code == 200
        assert response.json()["severity"] == "ok"

    def test_validate_value_warning(self, client: TestClient) -> None:
        """Test validation of value outside typical range."""
        response = client.post(
            "/api/valuation/benchmarks/validate",
            json={"industry_code": "saas", "metric_name": "revenue_multiple", "value": 20.0},
        )
        assert response.status_code == 200
        assert response.json()["severity"] == "warning"
```

### Step 4: Run tests and commit

```bash
cd backend && uv run pytest tests/test_api.py::TestBenchmarkAPI -v
git add backend/src/worth_it/api/routers/valuation.py backend/src/worth_it/models.py backend/tests/test_api.py
git commit -m "feat(api): add benchmark API endpoints"
```

---

## Task 3: Frontend - Zod Schemas and API Client

**Files:**
- Modify: `frontend/lib/schemas.ts`
- Modify: `frontend/lib/api-client.ts`

### Step 1: Add Zod schemas for benchmarks

```typescript
// Add to frontend/lib/schemas.ts

// ============================================================================
// Benchmark Schemas (Phase 4)
// ============================================================================

export const BenchmarkMetricSchema = z.object({
  name: z.string(),
  min_value: z.number(),
  typical_low: z.number(),
  median: z.number(),
  typical_high: z.number(),
  max_value: z.number(),
  unit: z.string(),
});
export type BenchmarkMetric = z.infer<typeof BenchmarkMetricSchema>;

export const IndustryBenchmarkSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string(),
  metrics: z.record(BenchmarkMetricSchema),
});
export type IndustryBenchmark = z.infer<typeof IndustryBenchmarkSchema>;

export const IndustryListItemSchema = z.object({
  code: z.string(),
  name: z.string(),
});
export type IndustryListItem = z.infer<typeof IndustryListItemSchema>;

export const BenchmarkValidationResponseSchema = z.object({
  is_valid: z.boolean(),
  severity: z.enum(["ok", "warning", "error"]),
  message: z.string(),
  benchmark_median: z.number(),
  suggested_range: z.tuple([z.number(), z.number()]).nullable(),
});
export type BenchmarkValidationResponse = z.infer<typeof BenchmarkValidationResponseSchema>;
```

### Step 2: Add API client methods

```typescript
// Add to frontend/lib/api-client.ts

  /**
   * Get list of all industries with benchmarks.
   */
  async getIndustries(): Promise<ApiResponse<IndustryListItem[]>> {
    return this.get<IndustryListItem[]>("/api/valuation/benchmarks/industries");
  }

  /**
   * Get benchmark data for a specific industry.
   */
  async getIndustryBenchmark(industryCode: string): Promise<ApiResponse<IndustryBenchmark>> {
    return this.get<IndustryBenchmark>(`/api/valuation/benchmarks/${industryCode}`);
  }

  /**
   * Validate a value against industry benchmarks.
   */
  async validateAgainstBenchmark(
    industryCode: string,
    metricName: string,
    value: number
  ): Promise<ApiResponse<BenchmarkValidationResponse>> {
    return this.post<BenchmarkValidationResponse>("/api/valuation/benchmarks/validate", {
      industry_code: industryCode,
      metric_name: metricName,
      value,
    });
  }
```

### Step 3: Commit

```bash
git add frontend/lib/schemas.ts frontend/lib/api-client.ts
git commit -m "feat(frontend): add benchmark schemas and API client"
```

---

## Task 4: Frontend - Industry Selector Component

**Files:**
- Create: `frontend/components/valuation/industry-selector.tsx`

### Step 1: Write industry selector with benchmarks display

```typescript
// In frontend/components/valuation/industry-selector.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { IndustryListItem, IndustryBenchmark, BenchmarkMetric } from '@/lib/schemas';

interface IndustrySelectorProps {
  value: string | null;
  onChange: (industryCode: string) => void;
  onBenchmarksLoaded?: (metrics: Record<string, BenchmarkMetric>) => void;
  showBenchmarkDetails?: boolean;
}

export function IndustrySelector({
  value,
  onChange,
  onBenchmarksLoaded,
  showBenchmarkDetails = true,
}: IndustrySelectorProps) {
  const [industries, setIndustries] = useState<IndustryListItem[]>([]);
  const [benchmark, setBenchmark] = useState<IndustryBenchmark | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch industries list on mount
  useEffect(() => {
    apiClient.getIndustries().then((response) => {
      if (response.data) {
        setIndustries(response.data);
      }
    });
  }, []);

  // Fetch benchmarks when industry changes
  useEffect(() => {
    if (!value) {
      setBenchmark(null);
      return;
    }

    setLoading(true);
    apiClient.getIndustryBenchmark(value).then((response) => {
      if (response.data) {
        setBenchmark(response.data);
        onBenchmarksLoaded?.(response.data.metrics);
      }
      setLoading(false);
    });
  }, [value, onBenchmarksLoaded]);

  const formatMetricRange = useCallback((metric: BenchmarkMetric) => {
    const unit = metric.unit === "x" ? "x" : metric.unit === "" ? "" : ` ${metric.unit}`;
    if (metric.unit === "" && metric.typical_high <= 1) {
      // Percentage format
      return `${(metric.typical_low * 100).toFixed(0)}% - ${(metric.typical_high * 100).toFixed(0)}%`;
    }
    return `${metric.typical_low}${unit} - ${metric.typical_high}${unit}`;
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Industry</label>
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select your industry" />
          </SelectTrigger>
          <SelectContent>
            {industries.map((ind) => (
              <SelectItem key={ind.code} value={ind.code}>
                {ind.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showBenchmarkDetails && benchmark && !loading && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4" />
              {benchmark.name} Benchmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              {Object.entries(benchmark.metrics).map(([key, metric]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-muted-foreground capitalize">
                    {metric.name.replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">
                      {formatMetricRange(metric)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Median: {metric.median}{metric.unit}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Step 2: Commit

```bash
git add frontend/components/valuation/industry-selector.tsx
git commit -m "feat(frontend): add IndustrySelector component with benchmarks"
```

---

## Task 5: Frontend - Benchmark Warning Component

**Files:**
- Create: `frontend/components/valuation/benchmark-warning.tsx`

### Step 1: Write validation warning display

```typescript
// In frontend/components/valuation/benchmark-warning.tsx
'use client';

import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BenchmarkWarningProps {
  severity: 'ok' | 'warning' | 'error';
  message: string;
  median?: number;
  suggestedRange?: [number, number] | null;
  unit?: string;
  className?: string;
}

export function BenchmarkWarning({
  severity,
  message,
  median,
  suggestedRange,
  unit = '',
  className,
}: BenchmarkWarningProps) {
  if (severity === 'ok') return null;

  const Icon = severity === 'error' ? AlertCircle : AlertTriangle;
  const colorClass =
    severity === 'error'
      ? 'text-destructive bg-destructive/10 border-destructive/20'
      : 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900';

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border p-3 text-sm',
        colorClass,
        className
      )}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="space-y-1">
        <p>{message}</p>
        {median !== undefined && median > 0 && (
          <p className="text-xs opacity-75">
            Industry median: {median}{unit}
          </p>
        )}
        {suggestedRange && (
          <p className="text-xs opacity-75">
            Typical range: {suggestedRange[0]}{unit} - {suggestedRange[1]}{unit}
          </p>
        )}
      </div>
    </div>
  );
}
```

### Step 2: Commit

```bash
git add frontend/components/valuation/benchmark-warning.tsx
git commit -m "feat(frontend): add BenchmarkWarning component"
```

---

## Task 6: Frontend - useBenchmarkValidation Hook

**Files:**
- Create: `frontend/lib/hooks/use-benchmark-validation.ts`
- Modify: `frontend/lib/hooks/index.ts`

### Step 1: Create validation hook

```typescript
// In frontend/lib/hooks/use-benchmark-validation.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import type { BenchmarkValidationResponse } from '@/lib/schemas';

interface ValidationState {
  [fieldKey: string]: BenchmarkValidationResponse | null;
}

export function useBenchmarkValidation(industryCode: string | null) {
  const [validations, setValidations] = useState<ValidationState>({});
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const validateField = useCallback(
    async (metricName: string, value: number, fieldKey?: string) => {
      const key = fieldKey || metricName;

      if (!industryCode) {
        setValidations((prev) => ({ ...prev, [key]: null }));
        return;
      }

      // Clear existing timer for this field
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }

      // Debounce validation calls
      debounceTimers.current[key] = setTimeout(async () => {
        setIsValidating(true);
        const response = await apiClient.validateAgainstBenchmark(
          industryCode,
          metricName,
          value
        );
        setIsValidating(false);

        if (response.data) {
          setValidations((prev) => ({ ...prev, [key]: response.data }));
        }
      }, 300);
    },
    [industryCode]
  );

  const clearValidation = useCallback((fieldKey: string) => {
    setValidations((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }, []);

  const clearAllValidations = useCallback(() => {
    setValidations({});
  }, []);

  return {
    validations,
    validateField,
    clearValidation,
    clearAllValidations,
    isValidating,
  };
}
```

### Step 2: Export from hooks index

```typescript
// Add to frontend/lib/hooks/index.ts
export { useBenchmarkValidation } from './use-benchmark-validation';
```

### Step 3: Commit

```bash
git add frontend/lib/hooks/use-benchmark-validation.ts frontend/lib/hooks/index.ts
git commit -m "feat(frontend): add useBenchmarkValidation hook"
```

---

## Task 7: Integration - Add Benchmarks to Valuation Calculator

**Files:**
- Modify: `frontend/components/valuation/valuation-calculator.tsx`
- Modify: Form components to use IndustrySelector and validation

### Step 1: Add industry selector to calculator header

Integrate the IndustrySelector at the top of the valuation calculator, storing the selected industry in state. Pass the industry code to form components.

### Step 2: Add validation to form inputs

For forms like DCF and Revenue Multiple, add the useBenchmarkValidation hook and BenchmarkWarning components to display validation feedback as users enter values.

### Step 3: Commit

```bash
git add frontend/components/valuation/valuation-calculator.tsx frontend/components/valuation/*.tsx
git commit -m "feat(valuation): integrate industry benchmarks into calculator"
```

---

## Task 8: E2E Tests

**Files:**
- Modify: `playwright/tests/27-valuation-calculator.spec.ts`

### Step 1: Add benchmark E2E tests

```typescript
// Add to playwright/tests/27-valuation-calculator.spec.ts

test.describe('Industry Benchmarks', () => {
  test('should display industry selector', async ({ page }) => {
    await page.goto('/valuation');
    await expect(page.getByRole('combobox', { name: /industry/i })).toBeVisible();
  });

  test('should show benchmark metrics when industry selected', async ({ page }) => {
    await page.goto('/valuation');
    await page.getByRole('combobox', { name: /industry/i }).click();
    await page.getByRole('option', { name: /saas/i }).click();
    await expect(page.getByText(/revenue multiple/i)).toBeVisible();
    await expect(page.getByText(/median/i)).toBeVisible();
  });

  test('should show warning for outlier values', async ({ page }) => {
    await page.goto('/valuation');
    // Select industry and enter outlier value
    await page.getByRole('combobox', { name: /industry/i }).click();
    await page.getByRole('option', { name: /saas/i }).click();
    // Navigate to DCF or Revenue Multiple form
    await page.getByRole('tab', { name: /revenue multiple/i }).click();
    // Enter high revenue multiple
    await page.getByLabel(/revenue multiple/i).fill('50');
    // Should show warning
    await expect(page.getByText(/above typical/i)).toBeVisible();
  });
});
```

### Step 2: Run tests and commit

```bash
cd playwright && npx playwright test tests/27-valuation-calculator.spec.ts
git add playwright/tests/27-valuation-calculator.spec.ts
git commit -m "test(e2e): add benchmark integration tests"
```

---

## Final Verification

Run all tests and push:
```bash
cd backend && uv run pytest -v
cd frontend && npm run type-check && npm run lint
./scripts/run-e2e-tests.sh
git push origin feature/valuation-phase4
```

---

## Summary

Phase 4 adds industry benchmarks:

| Feature | Description |
|---------|-------------|
| 15+ Industries | SaaS, Fintech, Healthcare, AI/ML, Cybersecurity, etc. |
| Benchmark Metrics | Revenue multiples, discount rates, growth rates, margins |
| Real-time Validation | Warnings for outlier inputs as users type |
| Suggested Defaults | Pre-fill forms with industry-appropriate values |
| API Endpoints | `/api/valuation/benchmarks/industries`, `/api/valuation/benchmarks/{code}` |
| Frontend Components | `IndustrySelector`, `BenchmarkWarning`, `useBenchmarkValidation` hook |
