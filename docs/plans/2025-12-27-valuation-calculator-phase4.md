# Phase 4: Industry Benchmarks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add built-in industry benchmarks for 15+ sectors, enabling automatic parameter suggestions and validation warnings for valuation inputs.

**Architecture:** Create a benchmark data layer with sector-specific metrics. Integrate with valuation forms to suggest defaults and flag outliers.

**Tech Stack:** Python/FastAPI (backend), TypeScript/React (frontend), JSON data files for benchmarks, TDD throughout.

**Prerequisites:** Phases 1-3 complete (valuation methods + Monte Carlo working)

---

## Overview

Industry benchmarks provide:
1. **Default Values** - Pre-fill forms with sector-appropriate parameters
2. **Validation Warnings** - Flag inputs that deviate significantly from norms
3. **Comparison Context** - Show how inputs compare to industry averages
4. **Confidence Indicators** - Suggest Monte Carlo distributions based on sector volatility

---

## Task 1: Benchmark Data Structure

**Files:**
- Create: `backend/src/worth_it/data/benchmarks.py`
- Create: `backend/src/worth_it/data/industry_data.json`
- Test: `backend/tests/test_benchmarks.py`

### Step 1: Write failing test for benchmark structure

```python
# In backend/tests/test_benchmarks.py
import pytest
from worth_it.data.benchmarks import (
    IndustryBenchmark,
    BenchmarkMetric,
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
            min=2.0,
            typical_low=4.0,
            median=6.0,
            typical_high=10.0,
            max=20.0,
            unit="x",
        )
        assert metric.median == 6.0
        assert metric.unit == "x"

    def test_industry_benchmark_creation(self) -> None:
        """Test creating an industry benchmark."""
        benchmark = IndustryBenchmark(
            industry_code="saas",
            industry_name="SaaS / Software",
            stage="growth",
            metrics={
                "revenue_multiple": BenchmarkMetric(
                    name="revenue_multiple",
                    min=2.0,
                    typical_low=4.0,
                    median=6.0,
                    typical_high=10.0,
                    max=20.0,
                    unit="x",
                ),
                "discount_rate": BenchmarkMetric(
                    name="discount_rate",
                    min=0.15,
                    typical_low=0.20,
                    median=0.25,
                    typical_high=0.35,
                    max=0.50,
                    unit="%",
                ),
            },
        )
        assert benchmark.industry_code == "saas"
        assert "revenue_multiple" in benchmark.metrics


class TestBenchmarkLookup:
    """Tests for benchmark lookup functions."""

    def test_get_benchmark_by_industry(self) -> None:
        """Test retrieving benchmark by industry code."""
        benchmark = get_benchmark("saas")
        assert benchmark is not None
        assert benchmark.industry_name == "SaaS / Software"

    def test_get_all_industries(self) -> None:
        """Test getting list of all industries."""
        industries = get_all_industries()
        assert len(industries) >= 15
        assert any(i.industry_code == "saas" for i in industries)
        assert any(i.industry_code == "fintech" for i in industries)

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
            value=15.0,  # Between typical_high and max
        )
        assert result.is_valid
        assert result.severity == "warning"
        assert "above typical range" in result.message.lower()

    def test_value_outside_range(self) -> None:
        """Test value completely outside range."""
        result = validate_against_benchmark(
            industry_code="saas",
            metric_name="revenue_multiple",
            value=25.0,  # Above max
        )
        assert not result.is_valid
        assert result.severity == "error"
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_benchmarks.py -v`
Expected: FAIL with import error

### Step 3: Write implementation

```python
# In backend/src/worth_it/data/benchmarks.py
"""Industry benchmark data for valuation parameters."""

from dataclasses import dataclass
from typing import Optional
import json
from pathlib import Path


@dataclass(frozen=True)
class BenchmarkMetric:
    """A single benchmark metric with range values.

    Attributes:
        name: Metric identifier
        min: Absolute minimum (anything below is an error)
        typical_low: Lower bound of typical range
        median: Industry median value
        typical_high: Upper bound of typical range
        max: Absolute maximum (anything above is an error)
        unit: Display unit (e.g., "x", "%", "$")
    """
    name: str
    min: float
    typical_low: float
    median: float
    typical_high: float
    max: float
    unit: str


@dataclass(frozen=True)
class IndustryBenchmark:
    """Benchmark data for a specific industry.

    Attributes:
        industry_code: Unique identifier (e.g., "saas", "fintech")
        industry_name: Display name
        stage: Company stage (e.g., "pre_seed", "seed", "growth")
        metrics: Dictionary of metric name to BenchmarkMetric
    """
    industry_code: str
    industry_name: str
    stage: str
    metrics: dict[str, BenchmarkMetric]


@dataclass
class ValidationResult:
    """Result of validating a value against benchmarks.

    Attributes:
        is_valid: Whether the value is within acceptable range
        severity: "ok", "warning", or "error"
        message: Human-readable explanation
        benchmark_median: The benchmark median for comparison
    """
    is_valid: bool
    severity: str
    message: str
    benchmark_median: float


# Load benchmark data from JSON
_BENCHMARKS: dict[str, IndustryBenchmark] = {}


def _load_benchmarks() -> None:
    """Load benchmark data from JSON file."""
    global _BENCHMARKS
    if _BENCHMARKS:
        return

    data_path = Path(__file__).parent / "industry_data.json"
    with open(data_path) as f:
        data = json.load(f)

    for industry in data["industries"]:
        metrics = {
            m["name"]: BenchmarkMetric(**m)
            for m in industry["metrics"]
        }
        _BENCHMARKS[industry["industry_code"]] = IndustryBenchmark(
            industry_code=industry["industry_code"],
            industry_name=industry["industry_name"],
            stage=industry.get("stage", "all"),
            metrics=metrics,
        )


def get_benchmark(industry_code: str) -> Optional[IndustryBenchmark]:
    """Get benchmark for an industry by code."""
    _load_benchmarks()
    return _BENCHMARKS.get(industry_code)


def get_all_industries() -> list[IndustryBenchmark]:
    """Get all available industry benchmarks."""
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

    # Check ranges
    if value < metric.min:
        return ValidationResult(
            is_valid=False,
            severity="error",
            message=f"Value {value} is below minimum ({metric.min}) for {industry_code}",
            benchmark_median=metric.median,
        )

    if value > metric.max:
        return ValidationResult(
            is_valid=False,
            severity="error",
            message=f"Value {value} is above maximum ({metric.max}) for {industry_code}",
            benchmark_median=metric.median,
        )

    if value < metric.typical_low:
        return ValidationResult(
            is_valid=True,
            severity="warning",
            message=f"Value {value} is below typical range ({metric.typical_low}-{metric.typical_high})",
            benchmark_median=metric.median,
        )

    if value > metric.typical_high:
        return ValidationResult(
            is_valid=True,
            severity="warning",
            message=f"Value {value} is above typical range ({metric.typical_low}-{metric.typical_high})",
            benchmark_median=metric.median,
        )

    return ValidationResult(
        is_valid=True,
        severity="ok",
        message="Value is within typical industry range",
        benchmark_median=metric.median,
    )
```

### Step 4: Create industry data JSON

```json
// In backend/src/worth_it/data/industry_data.json
{
  "industries": [
    {
      "industry_code": "saas",
      "industry_name": "SaaS / Software",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 1.0, "typical_low": 4.0, "median": 6.0, "typical_high": 12.0, "max": 25.0, "unit": "x"},
        {"name": "discount_rate", "min": 0.15, "typical_low": 0.20, "median": 0.25, "typical_high": 0.35, "max": 0.50, "unit": "%"},
        {"name": "growth_rate", "min": 0.10, "typical_low": 0.30, "median": 0.50, "typical_high": 1.00, "max": 3.00, "unit": "%"},
        {"name": "gross_margin", "min": 0.50, "typical_low": 0.70, "median": 0.80, "typical_high": 0.90, "max": 0.95, "unit": "%"}
      ]
    },
    {
      "industry_code": "fintech",
      "industry_name": "Fintech",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 2.0, "typical_low": 5.0, "median": 8.0, "typical_high": 15.0, "max": 30.0, "unit": "x"},
        {"name": "discount_rate", "min": 0.18, "typical_low": 0.22, "median": 0.28, "typical_high": 0.38, "max": 0.50, "unit": "%"}
      ]
    },
    {
      "industry_code": "ecommerce",
      "industry_name": "E-Commerce / Retail",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 0.5, "typical_low": 1.0, "median": 2.0, "typical_high": 4.0, "max": 8.0, "unit": "x"},
        {"name": "discount_rate", "min": 0.12, "typical_low": 0.15, "median": 0.20, "typical_high": 0.30, "max": 0.45, "unit": "%"}
      ]
    },
    {
      "industry_code": "healthcare",
      "industry_name": "Healthcare / Biotech",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 2.0, "typical_low": 4.0, "median": 7.0, "typical_high": 12.0, "max": 25.0, "unit": "x"},
        {"name": "discount_rate", "min": 0.20, "typical_low": 0.25, "median": 0.35, "typical_high": 0.45, "max": 0.60, "unit": "%"}
      ]
    },
    {
      "industry_code": "marketplace",
      "industry_name": "Marketplace",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 1.0, "typical_low": 3.0, "median": 5.0, "typical_high": 10.0, "max": 20.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "edtech",
      "industry_name": "EdTech",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 1.0, "typical_low": 2.0, "median": 4.0, "typical_high": 8.0, "max": 15.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "proptech",
      "industry_name": "PropTech / Real Estate",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 1.0, "typical_low": 2.0, "median": 4.0, "typical_high": 7.0, "max": 12.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "cleantech",
      "industry_name": "CleanTech / Energy",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 1.0, "typical_low": 3.0, "median": 5.0, "typical_high": 10.0, "max": 20.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "gaming",
      "industry_name": "Gaming / Entertainment",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 1.0, "typical_low": 2.0, "median": 4.0, "typical_high": 8.0, "max": 15.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "logistics",
      "industry_name": "Logistics / Supply Chain",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 0.5, "typical_low": 1.5, "median": 3.0, "typical_high": 6.0, "max": 10.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "adtech",
      "industry_name": "AdTech / Marketing",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 1.0, "typical_low": 2.0, "median": 4.0, "typical_high": 8.0, "max": 15.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "cybersecurity",
      "industry_name": "Cybersecurity",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 3.0, "typical_low": 6.0, "median": 10.0, "typical_high": 18.0, "max": 30.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "ai_ml",
      "industry_name": "AI / Machine Learning",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 5.0, "typical_low": 10.0, "median": 15.0, "typical_high": 25.0, "max": 50.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "consumer",
      "industry_name": "Consumer Apps",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 0.5, "typical_low": 1.5, "median": 3.0, "typical_high": 6.0, "max": 12.0, "unit": "x"}
      ]
    },
    {
      "industry_code": "b2b_services",
      "industry_name": "B2B Services",
      "stage": "growth",
      "metrics": [
        {"name": "revenue_multiple", "min": 1.0, "typical_low": 2.0, "median": 3.5, "typical_high": 6.0, "max": 10.0, "unit": "x"}
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
git add backend/src/worth_it/data/benchmarks.py backend/src/worth_it/data/industry_data.json backend/tests/test_benchmarks.py
git commit -m "feat(benchmarks): add industry benchmark data for 15+ sectors"
```

---

## Task 2: Benchmark API Endpoints

**Files:**
- Create: `backend/src/worth_it/api/routers/benchmarks.py`
- Modify: `backend/src/worth_it/api/__init__.py`
- Test: `backend/tests/test_api.py`

### Step 1: Write API endpoints

```python
# In backend/src/worth_it/api/routers/benchmarks.py
from fastapi import APIRouter, Query
from worth_it.data.benchmarks import (
    get_benchmark,
    get_all_industries,
    validate_against_benchmark,
)
from pydantic import BaseModel

router = APIRouter(prefix="/api/benchmarks", tags=["benchmarks"])


class IndustryResponse(BaseModel):
    industry_code: str
    industry_name: str


class MetricResponse(BaseModel):
    name: str
    min: float
    typical_low: float
    median: float
    typical_high: float
    max: float
    unit: str


class BenchmarkResponse(BaseModel):
    industry_code: str
    industry_name: str
    stage: str
    metrics: dict[str, MetricResponse]


class ValidationResponse(BaseModel):
    is_valid: bool
    severity: str
    message: str
    benchmark_median: float


@router.get("/industries", response_model=list[IndustryResponse])
async def list_industries() -> list[IndustryResponse]:
    """List all available industries with benchmarks."""
    industries = get_all_industries()
    return [
        IndustryResponse(
            industry_code=i.industry_code,
            industry_name=i.industry_name,
        )
        for i in industries
    ]


@router.get("/industry/{industry_code}", response_model=BenchmarkResponse)
async def get_industry_benchmark(industry_code: str) -> BenchmarkResponse:
    """Get benchmark data for a specific industry."""
    benchmark = get_benchmark(industry_code)
    if not benchmark:
        raise HTTPException(status_code=404, detail=f"Industry {industry_code} not found")

    return BenchmarkResponse(
        industry_code=benchmark.industry_code,
        industry_name=benchmark.industry_name,
        stage=benchmark.stage,
        metrics={
            name: MetricResponse(
                name=m.name,
                min=m.min,
                typical_low=m.typical_low,
                median=m.median,
                typical_high=m.typical_high,
                max=m.max,
                unit=m.unit,
            )
            for name, m in benchmark.metrics.items()
        },
    )


@router.get("/validate", response_model=ValidationResponse)
async def validate_value(
    industry_code: str = Query(...),
    metric_name: str = Query(...),
    value: float = Query(...),
) -> ValidationResponse:
    """Validate a value against industry benchmarks."""
    result = validate_against_benchmark(industry_code, metric_name, value)
    return ValidationResponse(
        is_valid=result.is_valid,
        severity=result.severity,
        message=result.message,
        benchmark_median=result.benchmark_median,
    )
```

### Step 2: Register router

### Step 3: Write API tests

### Step 4: Commit

```bash
git add backend/src/worth_it/api/routers/benchmarks.py backend/src/worth_it/api/__init__.py backend/tests/test_api.py
git commit -m "feat(api): add benchmark API endpoints"
```

---

## Task 3: Frontend - Industry Selector Component

**Files:**
- Create: `frontend/components/valuation/industry-selector.tsx`

### Step 1: Write industry selector with benchmarks display

```typescript
// In frontend/components/valuation/industry-selector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface Industry {
  industryCode: string;
  industryName: string;
}

interface BenchmarkMetric {
  name: string;
  min: number;
  typicalLow: number;
  median: number;
  typicalHigh: number;
  max: number;
  unit: string;
}

interface IndustrySelectorProps {
  value: string | null;
  onChange: (industryCode: string) => void;
  onBenchmarksLoaded?: (metrics: Record<string, BenchmarkMetric>) => void;
}

export function IndustrySelector({ value, onChange, onBenchmarksLoaded }: IndustrySelectorProps) {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [benchmarks, setBenchmarks] = useState<Record<string, BenchmarkMetric> | null>(null);

  // Fetch industries list
  useEffect(() => {
    fetch('/api/benchmarks/industries')
      .then(res => res.json())
      .then(data => setIndustries(data));
  }, []);

  // Fetch benchmarks when industry changes
  useEffect(() => {
    if (!value) return;

    fetch(`/api/benchmarks/industry/${value}`)
      .then(res => res.json())
      .then(data => {
        const metrics = Object.fromEntries(
          Object.entries(data.metrics).map(([k, v]: [string, any]) => [
            k,
            {
              name: v.name,
              min: v.min,
              typicalLow: v.typical_low,
              median: v.median,
              typicalHigh: v.typical_high,
              max: v.max,
              unit: v.unit,
            },
          ])
        );
        setBenchmarks(metrics);
        onBenchmarksLoaded?.(metrics);
      });
  }, [value, onBenchmarksLoaded]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Industry</label>
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select your industry" />
          </SelectTrigger>
          <SelectContent>
            {industries.map((ind) => (
              <SelectItem key={ind.industryCode} value={ind.industryCode}>
                {ind.industryName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {benchmarks && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4" />
              Industry Benchmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              {Object.entries(benchmarks).map(([key, metric]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">
                    {metric.name.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {metric.typicalLow}{metric.unit} - {metric.typicalHigh}{metric.unit}
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

## Task 4: Frontend - Validation Warning Component

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
  className?: string;
}

export function BenchmarkWarning({ severity, message, median, className }: BenchmarkWarningProps) {
  if (severity === 'ok') return null;

  const Icon = severity === 'error' ? AlertCircle : AlertTriangle;
  const colorClass = severity === 'error'
    ? 'text-destructive bg-destructive/10 border-destructive/20'
    : 'text-amber-600 bg-amber-50 border-amber-200';

  return (
    <div className={cn('flex items-start gap-2 rounded-lg border p-3 text-sm', colorClass, className)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p>{message}</p>
        {median !== undefined && median > 0 && (
          <p className="mt-1 text-xs opacity-75">
            Industry median: {median.toLocaleString()}
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

## Task 5: Integration - Add Benchmarks to Valuation Forms

**Files:**
- Modify: `frontend/components/valuation/valuation-calculator.tsx`
- Modify: Form components to include IndustrySelector and validation

### Step 1: Add industry selector to calculator

### Step 2: Add real-time validation to form inputs

### Step 3: Commit

```bash
git add frontend/components/valuation/valuation-calculator.tsx
git commit -m "feat(valuation): integrate industry benchmarks into forms"
```

---

## Final Verification

Run all tests and push:
```bash
cd backend && uv run pytest -v
cd frontend && npm run test:unit && npm run type-check
./scripts/run-e2e-tests.sh
git push origin feat/valuation-benchmarks
```

---

## Summary

Phase 4 adds industry benchmarks:

| Feature | Description |
|---------|-------------|
| 15+ Industries | SaaS, Fintech, Healthcare, AI/ML, etc. |
| Benchmark Metrics | Revenue multiples, discount rates, growth rates |
| Validation | Real-time warnings for outlier inputs |
| Auto-Defaults | Pre-fill forms with industry-appropriate values |
| API Endpoints | `/api/benchmarks/industries`, `/api/benchmarks/validate` |
