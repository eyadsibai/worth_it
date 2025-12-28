# Phase 3: Monte Carlo Enhancement Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Monte Carlo simulation as an enhancement layer applicable to ANY valuation method, enabling probabilistic analysis of valuation uncertainty.

**Architecture:** Create a generic Monte Carlo wrapper that accepts any valuation function and parameter distributions. Reuse existing WebSocket infrastructure for streaming simulation results.

**Tech Stack:** Python/NumPy (backend), TypeScript/React (frontend), WebSocket for streaming, Recharts for distribution visualization, TDD throughout.

**Prerequisites:** Phases 1-2 complete (valuation methods working)

---

## Overview

Monte Carlo simulation adds uncertainty analysis to valuations by:
1. Defining probability distributions for input parameters
2. Running thousands of simulations with sampled values
3. Producing a distribution of possible valuations
4. Calculating percentiles, confidence intervals, and key statistics

**Key Insight:** Monte Carlo is NOT a separate valuation method - it's an enhancement layer that wraps existing methods.

---

## Task 1: Monte Carlo Parameter Distribution Types

**Files:**
- Create: `backend/src/worth_it/calculations/monte_carlo_valuation.py`
- Test: `backend/tests/test_monte_carlo_valuation.py`

### Step 1: Write failing test for distribution types

```python
# In backend/tests/test_monte_carlo_valuation.py
import pytest
from worth_it.calculations.monte_carlo_valuation import (
    DistributionType,
    ParameterDistribution,
    sample_distribution,
)
import numpy as np

class TestParameterDistribution:
    """Tests for parameter distribution definitions."""

    def test_normal_distribution_creation(self) -> None:
        """Test creating a normal distribution parameter."""
        dist = ParameterDistribution(
            name="discount_rate",
            distribution_type=DistributionType.NORMAL,
            params={"mean": 0.25, "std": 0.05},
        )
        assert dist.name == "discount_rate"
        assert dist.distribution_type == DistributionType.NORMAL

    def test_uniform_distribution_creation(self) -> None:
        """Test creating a uniform distribution parameter."""
        dist = ParameterDistribution(
            name="exit_multiple",
            distribution_type=DistributionType.UNIFORM,
            params={"min": 3.0, "max": 8.0},
        )
        assert dist.distribution_type == DistributionType.UNIFORM

    def test_triangular_distribution_creation(self) -> None:
        """Test creating a triangular distribution parameter."""
        dist = ParameterDistribution(
            name="exit_value",
            distribution_type=DistributionType.TRIANGULAR,
            params={"min": 10_000_000, "mode": 25_000_000, "max": 50_000_000},
        )
        assert dist.distribution_type == DistributionType.TRIANGULAR

    def test_lognormal_distribution_creation(self) -> None:
        """Test creating a lognormal distribution."""
        dist = ParameterDistribution(
            name="revenue",
            distribution_type=DistributionType.LOGNORMAL,
            params={"mean": 14.0, "sigma": 0.5},  # log-space params
        )
        assert dist.distribution_type == DistributionType.LOGNORMAL


class TestSampleDistribution:
    """Tests for sampling from distributions."""

    def test_sample_normal(self) -> None:
        """Test sampling from normal distribution."""
        dist = ParameterDistribution(
            name="rate",
            distribution_type=DistributionType.NORMAL,
            params={"mean": 0.25, "std": 0.05},
        )
        samples = sample_distribution(dist, n_samples=1000, seed=42)
        assert len(samples) == 1000
        assert np.mean(samples) == pytest.approx(0.25, abs=0.01)

    def test_sample_uniform(self) -> None:
        """Test sampling from uniform distribution."""
        dist = ParameterDistribution(
            name="multiple",
            distribution_type=DistributionType.UNIFORM,
            params={"min": 3.0, "max": 8.0},
        )
        samples = sample_distribution(dist, n_samples=1000, seed=42)
        assert all(3.0 <= s <= 8.0 for s in samples)

    def test_sample_triangular(self) -> None:
        """Test sampling from triangular distribution."""
        dist = ParameterDistribution(
            name="value",
            distribution_type=DistributionType.TRIANGULAR,
            params={"min": 10, "mode": 25, "max": 50},
        )
        samples = sample_distribution(dist, n_samples=1000, seed=42)
        assert all(10 <= s <= 50 for s in samples)

    def test_reproducible_with_seed(self) -> None:
        """Test that same seed produces same samples."""
        dist = ParameterDistribution(
            name="test",
            distribution_type=DistributionType.NORMAL,
            params={"mean": 100, "std": 10},
        )
        samples1 = sample_distribution(dist, n_samples=100, seed=42)
        samples2 = sample_distribution(dist, n_samples=100, seed=42)
        assert np.array_equal(samples1, samples2)
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_monte_carlo_valuation.py -v`
Expected: FAIL with import error

### Step 3: Write implementation

```python
# In backend/src/worth_it/calculations/monte_carlo_valuation.py
"""Monte Carlo simulation layer for valuation methods."""

from dataclasses import dataclass
from enum import Enum
from typing import Callable, Any
import numpy as np


class DistributionType(Enum):
    """Supported probability distribution types."""
    NORMAL = "normal"
    UNIFORM = "uniform"
    TRIANGULAR = "triangular"
    LOGNORMAL = "lognormal"
    FIXED = "fixed"  # For non-varying parameters


@dataclass(frozen=True)
class ParameterDistribution:
    """Definition of a parameter's probability distribution.

    Attributes:
        name: Parameter name (must match valuation function param)
        distribution_type: Type of distribution
        params: Distribution-specific parameters
            - NORMAL: {"mean": float, "std": float}
            - UNIFORM: {"min": float, "max": float}
            - TRIANGULAR: {"min": float, "mode": float, "max": float}
            - LOGNORMAL: {"mean": float, "sigma": float}
            - FIXED: {"value": float}
    """
    name: str
    distribution_type: DistributionType
    params: dict[str, float]


def sample_distribution(
    dist: ParameterDistribution,
    n_samples: int,
    seed: int | None = None,
) -> np.ndarray:
    """Sample values from a parameter distribution.

    Args:
        dist: Parameter distribution definition
        n_samples: Number of samples to generate
        seed: Random seed for reproducibility

    Returns:
        Array of sampled values
    """
    rng = np.random.default_rng(seed)

    match dist.distribution_type:
        case DistributionType.NORMAL:
            return rng.normal(
                loc=dist.params["mean"],
                scale=dist.params["std"],
                size=n_samples,
            )
        case DistributionType.UNIFORM:
            return rng.uniform(
                low=dist.params["min"],
                high=dist.params["max"],
                size=n_samples,
            )
        case DistributionType.TRIANGULAR:
            return rng.triangular(
                left=dist.params["min"],
                mode=dist.params["mode"],
                right=dist.params["max"],
                size=n_samples,
            )
        case DistributionType.LOGNORMAL:
            return rng.lognormal(
                mean=dist.params["mean"],
                sigma=dist.params["sigma"],
                size=n_samples,
            )
        case DistributionType.FIXED:
            return np.full(n_samples, dist.params["value"])
        case _:
            raise ValueError(f"Unknown distribution type: {dist.distribution_type}")
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_monte_carlo_valuation.py -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/calculations/monte_carlo_valuation.py backend/tests/test_monte_carlo_valuation.py
git commit -m "feat(monte-carlo): add parameter distribution types and sampling"
```

---

## Task 2: Monte Carlo Simulation Engine

**Files:**
- Modify: `backend/src/worth_it/calculations/monte_carlo_valuation.py`
- Test: `backend/tests/test_monte_carlo_valuation.py`

### Step 1: Write failing test for simulation engine

```python
# In backend/tests/test_monte_carlo_valuation.py
from worth_it.calculations.monte_carlo_valuation import (
    MonteCarloConfig,
    MonteCarloResult,
    run_monte_carlo_simulation,
)

class TestMonteCarloSimulation:
    """Tests for Monte Carlo simulation engine."""

    def test_simple_simulation(self) -> None:
        """Test running a simple simulation."""
        # Simple valuation function: value = base * multiplier
        def simple_valuation(base: float, multiplier: float) -> float:
            return base * multiplier

        config = MonteCarloConfig(
            valuation_function=simple_valuation,
            parameter_distributions=[
                ParameterDistribution(
                    name="base",
                    distribution_type=DistributionType.FIXED,
                    params={"value": 1_000_000},
                ),
                ParameterDistribution(
                    name="multiplier",
                    distribution_type=DistributionType.UNIFORM,
                    params={"min": 1.0, "max": 3.0},
                ),
            ],
            n_simulations=1000,
            seed=42,
        )

        result = run_monte_carlo_simulation(config)

        assert len(result.valuations) == 1000
        assert result.mean == pytest.approx(2_000_000, rel=0.1)  # ~2M average
        assert result.min >= 1_000_000
        assert result.max <= 3_000_000

    def test_percentile_calculation(self) -> None:
        """Test that percentiles are calculated correctly."""
        def identity(value: float) -> float:
            return value

        config = MonteCarloConfig(
            valuation_function=identity,
            parameter_distributions=[
                ParameterDistribution(
                    name="value",
                    distribution_type=DistributionType.UNIFORM,
                    params={"min": 0, "max": 100},
                ),
            ],
            n_simulations=10000,
            seed=42,
        )

        result = run_monte_carlo_simulation(config)

        assert result.percentile_10 == pytest.approx(10, abs=2)
        assert result.percentile_50 == pytest.approx(50, abs=2)
        assert result.percentile_90 == pytest.approx(90, abs=2)

    def test_with_first_chicago(self) -> None:
        """Test Monte Carlo with First Chicago valuation."""
        from worth_it.calculations.valuation import (
            FirstChicagoScenario,
            FirstChicagoParams,
            calculate_first_chicago,
        )

        def first_chicago_wrapper(
            best_prob: float,
            best_value: float,
            base_prob: float,
            base_value: float,
            worst_prob: float,
            worst_value: float,
            discount_rate: float,
            years: int,
        ) -> float:
            # Normalize probabilities
            total_prob = best_prob + base_prob + worst_prob
            params = FirstChicagoParams(
                scenarios=[
                    FirstChicagoScenario("Best", best_prob / total_prob, best_value, years),
                    FirstChicagoScenario("Base", base_prob / total_prob, base_value, years),
                    FirstChicagoScenario("Worst", worst_prob / total_prob, worst_value, years),
                ],
                discount_rate=discount_rate,
            )
            result = calculate_first_chicago(params)
            return result.present_value

        config = MonteCarloConfig(
            valuation_function=first_chicago_wrapper,
            parameter_distributions=[
                ParameterDistribution("best_prob", DistributionType.FIXED, {"value": 0.25}),
                ParameterDistribution("best_value", DistributionType.TRIANGULAR,
                    {"min": 40_000_000, "mode": 50_000_000, "max": 80_000_000}),
                ParameterDistribution("base_prob", DistributionType.FIXED, {"value": 0.50}),
                ParameterDistribution("base_value", DistributionType.TRIANGULAR,
                    {"min": 15_000_000, "mode": 20_000_000, "max": 30_000_000}),
                ParameterDistribution("worst_prob", DistributionType.FIXED, {"value": 0.25}),
                ParameterDistribution("worst_value", DistributionType.TRIANGULAR,
                    {"min": 0, "mode": 5_000_000, "max": 10_000_000}),
                ParameterDistribution("discount_rate", DistributionType.NORMAL,
                    {"mean": 0.25, "std": 0.03}),
                ParameterDistribution("years", DistributionType.FIXED, {"value": 5}),
            ],
            n_simulations=1000,
            seed=42,
        )

        result = run_monte_carlo_simulation(config)

        assert result.mean > 0
        assert result.percentile_10 < result.percentile_50 < result.percentile_90
```

### Step 2: Run test to verify it fails

Run: `cd backend && uv run pytest tests/test_monte_carlo_valuation.py::TestMonteCarloSimulation -v`
Expected: FAIL with import error

### Step 3: Write implementation

```python
# In backend/src/worth_it/calculations/monte_carlo_valuation.py

@dataclass
class MonteCarloConfig:
    """Configuration for Monte Carlo simulation.

    Attributes:
        valuation_function: Function that takes parameters and returns valuation
        parameter_distributions: List of parameter distributions
        n_simulations: Number of simulations to run
        seed: Random seed for reproducibility
    """
    valuation_function: Callable[..., float]
    parameter_distributions: list[ParameterDistribution]
    n_simulations: int = 10000
    seed: int | None = None


@dataclass
class MonteCarloResult:
    """Result of Monte Carlo simulation.

    Attributes:
        valuations: All simulated valuations
        mean: Mean valuation
        std: Standard deviation
        min: Minimum valuation
        max: Maximum valuation
        percentile_10: 10th percentile (pessimistic)
        percentile_25: 25th percentile
        percentile_50: 50th percentile (median)
        percentile_75: 75th percentile
        percentile_90: 90th percentile (optimistic)
        histogram_bins: Bin edges for histogram
        histogram_counts: Counts per bin
    """
    valuations: np.ndarray
    mean: float
    std: float
    min: float
    max: float
    percentile_10: float
    percentile_25: float
    percentile_50: float
    percentile_75: float
    percentile_90: float
    histogram_bins: np.ndarray
    histogram_counts: np.ndarray


def run_monte_carlo_simulation(config: MonteCarloConfig) -> MonteCarloResult:
    """Run Monte Carlo simulation on a valuation function.

    Args:
        config: Simulation configuration

    Returns:
        MonteCarloResult with distribution statistics
    """
    # Sample all parameters
    param_samples: dict[str, np.ndarray] = {}
    for dist in config.parameter_distributions:
        param_samples[dist.name] = sample_distribution(
            dist,
            n_samples=config.n_simulations,
            seed=config.seed,
        )

    # Run simulations
    valuations = np.zeros(config.n_simulations)
    for i in range(config.n_simulations):
        params = {name: samples[i] for name, samples in param_samples.items()}
        # Convert numpy types to Python types for function compatibility
        params = {k: float(v) if isinstance(v, np.floating) else int(v) if isinstance(v, np.integer) else v
                  for k, v in params.items()}
        valuations[i] = config.valuation_function(**params)

    # Calculate statistics
    histogram_counts, histogram_bins = np.histogram(valuations, bins=50)

    return MonteCarloResult(
        valuations=valuations,
        mean=float(np.mean(valuations)),
        std=float(np.std(valuations)),
        min=float(np.min(valuations)),
        max=float(np.max(valuations)),
        percentile_10=float(np.percentile(valuations, 10)),
        percentile_25=float(np.percentile(valuations, 25)),
        percentile_50=float(np.percentile(valuations, 50)),
        percentile_75=float(np.percentile(valuations, 75)),
        percentile_90=float(np.percentile(valuations, 90)),
        histogram_bins=histogram_bins,
        histogram_counts=histogram_counts,
    )
```

### Step 4: Run test to verify it passes

Run: `cd backend && uv run pytest tests/test_monte_carlo_valuation.py::TestMonteCarloSimulation -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/calculations/monte_carlo_valuation.py backend/tests/test_monte_carlo_valuation.py
git commit -m "feat(monte-carlo): implement simulation engine with percentile calculation"
```

---

## Task 3: WebSocket Endpoint for Streaming Simulations

**Files:**
- Modify: `backend/src/worth_it/api/routers/monte_carlo.py`
- Test: `backend/tests/test_api.py`

### Step 1: Add WebSocket endpoint for valuation Monte Carlo

```python
# In backend/src/worth_it/api/routers/monte_carlo.py

@router.websocket("/ws/valuation-monte-carlo")
async def websocket_valuation_monte_carlo(websocket: WebSocket) -> None:
    """WebSocket endpoint for streaming valuation Monte Carlo results.

    Accepts configuration, runs simulation in batches, streams progress updates.
    """
    await websocket.accept()

    try:
        # Receive configuration
        config_data = await websocket.receive_json()

        # Parse configuration
        method = config_data.get("method")
        distributions = config_data.get("distributions", [])
        n_simulations = config_data.get("n_simulations", 10000)
        batch_size = config_data.get("batch_size", 1000)

        # Get valuation function based on method
        valuation_fn = get_valuation_function(method)

        # Convert distributions to ParameterDistribution objects
        param_dists = [
            ParameterDistribution(
                name=d["name"],
                distribution_type=DistributionType(d["distribution_type"]),
                params=d["params"],
            )
            for d in distributions
        ]

        # Run simulation in batches
        all_valuations = []
        for batch_start in range(0, n_simulations, batch_size):
            batch_end = min(batch_start + batch_size, n_simulations)
            batch_count = batch_end - batch_start

            config = MonteCarloConfig(
                valuation_function=valuation_fn,
                parameter_distributions=param_dists,
                n_simulations=batch_count,
            )

            result = run_monte_carlo_simulation(config)
            all_valuations.extend(result.valuations.tolist())

            # Send progress update
            progress = batch_end / n_simulations
            await websocket.send_json({
                "type": "progress",
                "progress": progress,
                "completed": batch_end,
                "total": n_simulations,
            })

        # Calculate final statistics
        valuations = np.array(all_valuations)
        histogram_counts, histogram_bins = np.histogram(valuations, bins=50)

        await websocket.send_json({
            "type": "complete",
            "result": {
                "mean": float(np.mean(valuations)),
                "std": float(np.std(valuations)),
                "min": float(np.min(valuations)),
                "max": float(np.max(valuations)),
                "percentile_10": float(np.percentile(valuations, 10)),
                "percentile_25": float(np.percentile(valuations, 25)),
                "percentile_50": float(np.percentile(valuations, 50)),
                "percentile_75": float(np.percentile(valuations, 75)),
                "percentile_90": float(np.percentile(valuations, 90)),
                "histogram_bins": histogram_bins.tolist(),
                "histogram_counts": histogram_counts.tolist(),
            },
        })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e),
        })
        await websocket.close()
```

### Step 2: Write tests

### Step 3: Commit

```bash
git add backend/src/worth_it/api/routers/monte_carlo.py
git commit -m "feat(api): add WebSocket endpoint for valuation Monte Carlo"
```

---

## Task 4: Frontend - Monte Carlo Toggle Component

**Files:**
- Create: `frontend/components/valuation/monte-carlo-toggle.tsx`

### Step 1: Write toggle component for enabling Monte Carlo

```typescript
// In frontend/components/valuation/monte-carlo-toggle.tsx
'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MonteCarloToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  simulations: number;
  onSimulationsChange: (simulations: number) => void;
}

export function MonteCarloToggle({
  enabled,
  onEnabledChange,
  simulations,
  onSimulationsChange,
}: MonteCarloToggleProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Monte Carlo Simulation</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Run thousands of simulations with varying inputs to see the
                    range of possible valuations and their probabilities.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Number of Simulations</Label>
              <span className="font-mono">{simulations.toLocaleString()}</span>
            </div>
            <Slider
              value={[simulations]}
              onValueChange={([val]) => onSimulationsChange(val)}
              min={1000}
              max={100000}
              step={1000}
            />
            <p className="text-xs text-muted-foreground">
              More simulations = higher accuracy, longer wait time
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
```

### Step 2: Commit

```bash
git add frontend/components/valuation/monte-carlo-toggle.tsx
git commit -m "feat(frontend): add MonteCarloToggle component"
```

---

## Task 5: Frontend - Distribution Input Component

**Files:**
- Create: `frontend/components/valuation/distribution-input.tsx`

### Step 1: Write distribution configuration UI

```typescript
// In frontend/components/valuation/distribution-input.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DistributionType = 'fixed' | 'normal' | 'uniform' | 'triangular';

interface DistributionInputProps {
  name: string;
  label: string;
  value: {
    type: DistributionType;
    params: Record<string, number>;
  };
  onChange: (value: { type: DistributionType; params: Record<string, number> }) => void;
}

export function DistributionInput({ name, label, value, onChange }: DistributionInputProps) {
  const handleTypeChange = (type: DistributionType) => {
    const defaultParams: Record<DistributionType, Record<string, number>> = {
      fixed: { value: 0 },
      normal: { mean: 0, std: 0 },
      uniform: { min: 0, max: 0 },
      triangular: { min: 0, mode: 0, max: 0 },
    };
    onChange({ type, params: defaultParams[type] });
  };

  const handleParamChange = (paramName: string, paramValue: number) => {
    onChange({ ...value, params: { ...value.params, [paramName]: paramValue } });
  };

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Select value={value.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="uniform">Uniform</SelectItem>
            <SelectItem value="triangular">Triangular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        {value.type === 'fixed' && (
          <div className="flex items-center gap-2">
            <Label className="w-16 text-xs">Value</Label>
            <Input
              type="number"
              value={value.params.value}
              onChange={(e) => handleParamChange('value', parseFloat(e.target.value))}
            />
          </div>
        )}

        {value.type === 'normal' && (
          <>
            <div className="flex items-center gap-2">
              <Label className="w-16 text-xs">Mean</Label>
              <Input
                type="number"
                value={value.params.mean}
                onChange={(e) => handleParamChange('mean', parseFloat(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-16 text-xs">Std Dev</Label>
              <Input
                type="number"
                value={value.params.std}
                onChange={(e) => handleParamChange('std', parseFloat(e.target.value))}
              />
            </div>
          </>
        )}

        {value.type === 'uniform' && (
          <>
            <div className="flex items-center gap-2">
              <Label className="w-16 text-xs">Min</Label>
              <Input
                type="number"
                value={value.params.min}
                onChange={(e) => handleParamChange('min', parseFloat(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-16 text-xs">Max</Label>
              <Input
                type="number"
                value={value.params.max}
                onChange={(e) => handleParamChange('max', parseFloat(e.target.value))}
              />
            </div>
          </>
        )}

        {value.type === 'triangular' && (
          <>
            <div className="flex items-center gap-2">
              <Label className="w-16 text-xs">Min</Label>
              <Input
                type="number"
                value={value.params.min}
                onChange={(e) => handleParamChange('min', parseFloat(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-16 text-xs">Mode</Label>
              <Input
                type="number"
                value={value.params.mode}
                onChange={(e) => handleParamChange('mode', parseFloat(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-16 text-xs">Max</Label>
              <Input
                type="number"
                value={value.params.max}
                onChange={(e) => handleParamChange('max', parseFloat(e.target.value))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

### Step 2: Commit

```bash
git add frontend/components/valuation/distribution-input.tsx
git commit -m "feat(frontend): add DistributionInput component for Monte Carlo"
```

---

## Task 6: Frontend - Monte Carlo Results Visualization

**Files:**
- Create: `frontend/components/valuation/monte-carlo-results.tsx`

### Step 1: Write results component with histogram and percentiles

```typescript
// In frontend/components/valuation/monte-carlo-results.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useChartColors } from '@/lib/hooks/use-chart-colors';

interface MonteCarloResultsProps {
  result: {
    mean: number;
    std: number;
    min: number;
    max: number;
    percentile_10: number;
    percentile_25: number;
    percentile_50: number;
    percentile_75: number;
    percentile_90: number;
    histogram_bins: number[];
    histogram_counts: number[];
  };
}

export function MonteCarloResults({ result }: MonteCarloResultsProps) {
  const chartColors = useChartColors();

  // Prepare histogram data
  const histogramData = result.histogram_counts.map((count, i) => ({
    bin: (result.histogram_bins[i] + result.histogram_bins[i + 1]) / 2,
    count,
  }));

  return (
    <div className="space-y-6">
      {/* Key Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Expected Value (Mean)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(result.mean)}</p>
            <p className="text-xs text-muted-foreground">
              ± {formatCurrency(result.std)} std dev
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Conservative (10th %ile)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(result.percentile_10)}
            </p>
            <p className="text-xs text-muted-foreground">
              90% chance of exceeding this
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Optimistic (90th %ile)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(result.percentile_90)}
            </p>
            <p className="text-xs text-muted-foreground">
              10% chance of exceeding this
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Histogram */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis
                  dataKey="bin"
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                  tick={{ fill: chartColors.foreground, fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: chartColors.foreground, fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => [value, 'Frequency']}
                  labelFormatter={(label) => `Valuation: ${formatCurrency(label)}`}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />

                {/* Percentile lines */}
                <ReferenceLine
                  x={result.percentile_10}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                  label={{ value: '10%', position: 'top' }}
                />
                <ReferenceLine
                  x={result.percentile_50}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  label={{ value: '50%', position: 'top' }}
                />
                <ReferenceLine
                  x={result.percentile_90}
                  stroke="hsl(var(--success))"
                  strokeDasharray="3 3"
                  label={{ value: '90%', position: 'top' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Percentile Table */}
      <Card>
        <CardHeader>
          <CardTitle>Percentile Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Percentile</th>
                <th className="py-2 text-right">Valuation</th>
                <th className="py-2 text-right">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">10th</td>
                <td className="py-2 text-right font-mono">{formatCurrency(result.percentile_10)}</td>
                <td className="py-2 text-right text-muted-foreground">Pessimistic</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">25th</td>
                <td className="py-2 text-right font-mono">{formatCurrency(result.percentile_25)}</td>
                <td className="py-2 text-right text-muted-foreground">Conservative</td>
              </tr>
              <tr className="border-b bg-muted/50">
                <td className="py-2 font-medium">50th (Median)</td>
                <td className="py-2 text-right font-mono font-medium">{formatCurrency(result.percentile_50)}</td>
                <td className="py-2 text-right text-muted-foreground">Most Likely</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">75th</td>
                <td className="py-2 text-right font-mono">{formatCurrency(result.percentile_75)}</td>
                <td className="py-2 text-right text-muted-foreground">Optimistic</td>
              </tr>
              <tr>
                <td className="py-2">90th</td>
                <td className="py-2 text-right font-mono">{formatCurrency(result.percentile_90)}</td>
                <td className="py-2 text-right text-muted-foreground">Best Case</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 2: Commit

```bash
git add frontend/components/valuation/monte-carlo-results.tsx
git commit -m "feat(frontend): add MonteCarloResults visualization component"
```

---

## Task 7: Integration - Add Monte Carlo to Valuation Forms

**Files:**
- Modify: `frontend/components/valuation/first-chicago-form.tsx`
- Modify: `frontend/components/valuation/valuation-calculator.tsx`

### Step 1: Add Monte Carlo toggle to First Chicago form

### Step 2: Connect WebSocket for streaming results

### Step 3: Commit

```bash
git add frontend/components/valuation/first-chicago-form.tsx frontend/components/valuation/valuation-calculator.tsx
git commit -m "feat(valuation): integrate Monte Carlo enhancement layer"
```

---

## Final Verification

Run all tests and push:
```bash
cd backend && uv run pytest -v
cd frontend && npm run test:unit && npm run type-check
./scripts/run-e2e-tests.sh
git push origin feat/valuation-monte-carlo
```

---

## Summary

Phase 3 adds Monte Carlo simulation as an enhancement layer:

| Feature | Description |
|---------|-------------|
| Distribution Types | Normal, Uniform, Triangular, Lognormal, Fixed |
| Simulation Engine | Generic wrapper for any valuation function |
| WebSocket Streaming | Real-time progress updates during simulation |
| Results Visualization | Histogram, percentiles, confidence intervals |
| Toggle UI | Enable/disable Monte Carlo per valuation method |

**Key Insight:** Monte Carlo enhances existing methods rather than replacing them. Users can:
1. Run any valuation method normally for a point estimate
2. Enable Monte Carlo to see the range of possible valuations
3. Use percentiles for negotiation (pessimistic to optimistic range)
