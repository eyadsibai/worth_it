# Dilution Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract dilution logic from `startup_scenario.py` into a fluent pipeline pattern that becomes the architectural template for all backend calculations.

**Architecture:** Immutable dataclass-based pipeline using `frozen=True` and `dataclasses.replace()` for state transitions. Each method returns a new instance, enabling method chaining while maintaining testability.

**Tech Stack:** Python 3.13, dataclasses, numpy, pandas, pytest

---

## Task 1: Create DilutionResult Dataclass

**Files:**

- Create: `backend/src/worth_it/calculations/dilution_engine.py`
- Create: `backend/tests/test_dilution_engine.py`

**Step 1: Write the failing test**

```python
# backend/tests/test_dilution_engine.py
"""Tests for the dilution engine fluent pipeline."""

import numpy as np
import pytest

from worth_it.calculations.dilution_engine import DilutionResult


class TestDilutionResult:
    """Tests for the DilutionResult dataclass."""

    def test_dilution_result_creation(self):
        """DilutionResult stores yearly factors and total dilution."""
        factors = np.array([1.0, 0.9, 0.8])
        result = DilutionResult(
            yearly_factors=factors,
            total_dilution=0.2,
            historical_factor=0.9,
        )
        assert np.array_equal(result.yearly_factors, factors)
        assert result.total_dilution == 0.2
        assert result.historical_factor == 0.9

    def test_dilution_result_default_historical_factor(self):
        """DilutionResult defaults historical_factor to 1.0."""
        result = DilutionResult(
            yearly_factors=np.array([1.0]),
            total_dilution=0.0,
        )
        assert result.historical_factor == 1.0

    def test_dilution_result_is_immutable(self):
        """DilutionResult cannot be modified after creation."""
        result = DilutionResult(
            yearly_factors=np.array([1.0]),
            total_dilution=0.0,
        )
        with pytest.raises(AttributeError):
            result.total_dilution = 0.5
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'worth_it.calculations.dilution_engine'`

**Step 3: Write minimal implementation**

```python
# backend/src/worth_it/calculations/dilution_engine.py
"""
Dilution calculation engine using fluent pipeline pattern.

This module provides a composable, immutable pipeline for calculating
dilution schedules from funding rounds. It handles:
- Historical (completed) dilution applied from day 0
- Future dilution applied at round year
- SAFE note conversion timing (converts at next priced round)
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class DilutionResult:
    """Immutable result from dilution pipeline."""

    yearly_factors: np.ndarray
    total_dilution: float
    historical_factor: float = 1.0
```

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestDilutionResult -v
```

Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/dilution_engine.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): add DilutionResult dataclass

Immutable result type for dilution pipeline with:
- yearly_factors: cumulative dilution factors per year
- total_dilution: final dilution percentage
- historical_factor: dilution from completed rounds"
```

---

## Task 2: Create DilutionPipeline Base Structure

**Files:**

- Modify: `backend/src/worth_it/calculations/dilution_engine.py`
- Modify: `backend/tests/test_dilution_engine.py`

**Step 1: Write the failing test**

```python
# Add to backend/tests/test_dilution_engine.py
import pandas as pd

from worth_it.calculations.dilution_engine import DilutionPipeline


class TestDilutionPipelineBase:
    """Tests for DilutionPipeline base structure."""

    def test_pipeline_creation_with_range(self):
        """Pipeline can be created with a range of years."""
        pipeline = DilutionPipeline(years=range(5))
        assert len(list(pipeline.years)) == 5

    def test_pipeline_creation_with_pandas_index(self):
        """Pipeline can be created with a pandas Index."""
        years = pd.RangeIndex(start=0, stop=5)
        pipeline = DilutionPipeline(years=years)
        assert len(pipeline.years) == 5

    def test_pipeline_is_immutable(self):
        """Pipeline cannot be modified after creation."""
        pipeline = DilutionPipeline(years=range(5))
        with pytest.raises(AttributeError):
            pipeline.rounds = [{"year": 1}]

    def test_with_rounds_returns_new_instance(self):
        """with_rounds returns a new pipeline instance."""
        pipeline1 = DilutionPipeline(years=range(5))
        pipeline2 = pipeline1.with_rounds([{"year": 1, "dilution": 0.1}])
        assert pipeline1 is not pipeline2
        assert len(pipeline1.rounds) == 0
        assert len(pipeline2.rounds) == 1

    def test_with_rounds_handles_none(self):
        """with_rounds handles None input gracefully."""
        pipeline = DilutionPipeline(years=range(5)).with_rounds(None)
        assert pipeline.rounds == []
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestDilutionPipelineBase -v
```

Expected: FAIL with `ImportError: cannot import name 'DilutionPipeline'`

**Step 3: Write minimal implementation**

```python
# Add to backend/src/worth_it/calculations/dilution_engine.py
import dataclasses
from dataclasses import dataclass, field
from typing import Any

import pandas as pd


@dataclass(frozen=True)
class DilutionPipeline:
    """
    Fluent pipeline for calculating dilution schedules.

    Each method returns a new immutable instance, allowing chaining.

    Usage:
        result = (
            DilutionPipeline(years)
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
            .build()
        )
    """

    years: pd.Index | range
    rounds: list[dict[str, Any]] = field(default_factory=list)
    _completed: list[dict[str, Any]] = field(default_factory=list)
    _upcoming: list[dict[str, Any]] = field(default_factory=list)
    _historical_factor: float = 1.0
    _safe_conversions: dict[int, int | None] = field(default_factory=dict)
    _yearly_factors: np.ndarray | None = None

    def with_rounds(self, rounds: list[dict[str, Any]] | None) -> DilutionPipeline:
        """Add funding rounds to the pipeline."""
        return dataclasses.replace(self, rounds=rounds or [])
```

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestDilutionPipelineBase -v
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/dilution_engine.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): add DilutionPipeline base with with_rounds

Immutable fluent pipeline structure with:
- years: Index of years to calculate dilution for
- rounds: List of funding round dicts
- Internal state fields for pipeline processing
- with_rounds() for adding rounds immutably"
```

---

## Task 3: Add with_simulated_dilution Method

**Files:**

- Modify: `backend/src/worth_it/calculations/dilution_engine.py`
- Modify: `backend/tests/test_dilution_engine.py`

**Step 1: Write the failing test**

```python
# Add to backend/tests/test_dilution_engine.py
class TestWithSimulatedDilution:
    """Tests for with_simulated_dilution shortcut."""

    def test_simulated_dilution_returns_result(self):
        """with_simulated_dilution returns DilutionResult directly."""
        pipeline = DilutionPipeline(years=range(5))
        result = pipeline.with_simulated_dilution(0.3)
        assert isinstance(result, DilutionResult)
        assert result.total_dilution == 0.3

    def test_simulated_dilution_fills_factors(self):
        """All yearly factors are set to (1 - dilution)."""
        result = DilutionPipeline(years=range(5)).with_simulated_dilution(0.2)
        expected = np.full(5, 0.8)
        assert np.allclose(result.yearly_factors, expected)

    def test_simulated_dilution_sets_historical_factor(self):
        """Historical factor equals (1 - dilution)."""
        result = DilutionPipeline(years=range(5)).with_simulated_dilution(0.25)
        assert result.historical_factor == 0.75

    def test_simulated_dilution_zero(self):
        """Zero dilution returns all ones."""
        result = DilutionPipeline(years=range(3)).with_simulated_dilution(0.0)
        assert np.allclose(result.yearly_factors, [1.0, 1.0, 1.0])
        assert result.total_dilution == 0.0
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestWithSimulatedDilution -v
```

Expected: FAIL with `AttributeError: 'DilutionPipeline' object has no attribute 'with_simulated_dilution'`

**Step 3: Write minimal implementation**

```python
# Add method to DilutionPipeline class in dilution_engine.py
    def with_simulated_dilution(self, dilution: float) -> DilutionResult:
        """Shortcut: apply pre-computed dilution and return result immediately."""
        factor = 1 - dilution
        factors = np.full(len(self.years), factor)
        return DilutionResult(
            yearly_factors=factors,
            total_dilution=dilution,
            historical_factor=factor,
        )
```

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestWithSimulatedDilution -v
```

Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/dilution_engine.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): add with_simulated_dilution shortcut

Fast path for Monte Carlo simulations that provide
pre-computed dilution values. Bypasses full pipeline."
```

---

## Task 4: Add classify Method

**Files:**

- Modify: `backend/src/worth_it/calculations/dilution_engine.py`
- Modify: `backend/tests/test_dilution_engine.py`

**Step 1: Write the failing test**

```python
# Add to backend/tests/test_dilution_engine.py
class TestClassify:
    """Tests for classify() method."""

    def test_classify_by_status_completed(self):
        """Rounds with status='completed' go to completed list."""
        rounds = [
            {"year": 1, "dilution": 0.1, "status": "completed"},
            {"year": 2, "dilution": 0.2, "status": "upcoming"},
        ]
        pipeline = DilutionPipeline(years=range(5)).with_rounds(rounds).classify()
        assert len(pipeline._completed) == 1
        assert len(pipeline._upcoming) == 1
        assert pipeline._completed[0]["year"] == 1

    def test_classify_by_negative_year(self):
        """Rounds with negative year (no status) go to completed."""
        rounds = [
            {"year": -2, "dilution": 0.1},
            {"year": -1, "dilution": 0.15},
            {"year": 1, "dilution": 0.2},
        ]
        pipeline = DilutionPipeline(years=range(5)).with_rounds(rounds).classify()
        assert len(pipeline._completed) == 2
        assert len(pipeline._upcoming) == 1

    def test_classify_zero_year_is_upcoming(self):
        """Year 0 with no status is classified as upcoming."""
        rounds = [{"year": 0, "dilution": 0.1}]
        pipeline = DilutionPipeline(years=range(5)).with_rounds(rounds).classify()
        assert len(pipeline._completed) == 0
        assert len(pipeline._upcoming) == 1

    def test_classify_status_overrides_year(self):
        """Explicit status overrides year-based classification."""
        rounds = [
            {"year": -1, "dilution": 0.1, "status": "upcoming"},  # Negative but upcoming
            {"year": 5, "dilution": 0.2, "status": "completed"},  # Positive but completed
        ]
        pipeline = DilutionPipeline(years=range(5)).with_rounds(rounds).classify()
        assert len(pipeline._completed) == 1
        assert pipeline._completed[0]["year"] == 5
        assert len(pipeline._upcoming) == 1
        assert pipeline._upcoming[0]["year"] == -1

    def test_classify_returns_new_instance(self):
        """classify() returns a new pipeline instance."""
        pipeline1 = DilutionPipeline(years=range(5)).with_rounds([{"year": 1, "dilution": 0.1}])
        pipeline2 = pipeline1.classify()
        assert pipeline1 is not pipeline2
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestClassify -v
```

Expected: FAIL with `AttributeError: 'DilutionPipeline' object has no attribute 'classify'`

**Step 3: Write minimal implementation**

```python
# Add method to DilutionPipeline class in dilution_engine.py
    def classify(self) -> DilutionPipeline:
        """Separate rounds into completed (historical) vs upcoming (future)."""
        completed = [
            r
            for r in self.rounds
            if r.get("status") == "completed"
            or (r.get("status") is None and r.get("year", 0) < 0)
        ]
        upcoming = [
            r
            for r in self.rounds
            if r.get("status") == "upcoming"
            or (r.get("status") is None and r.get("year", 0) >= 0)
        ]
        return dataclasses.replace(self, _completed=completed, _upcoming=upcoming)
```

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestClassify -v
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/dilution_engine.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): add classify() for round separation

Separates funding rounds into completed (historical) and
upcoming (future) based on status field or year sign."
```

---

## Task 5: Add apply_historical Method

**Files:**

- Modify: `backend/src/worth_it/calculations/dilution_engine.py`
- Modify: `backend/tests/test_dilution_engine.py`

**Step 1: Write the failing test**

```python
# Add to backend/tests/test_dilution_engine.py
class TestApplyHistorical:
    """Tests for apply_historical() method."""

    def test_apply_historical_single_round(self):
        """Single completed round applies its dilution."""
        rounds = [{"year": -1, "dilution": 0.2}]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
        )
        assert pipeline._historical_factor == 0.8

    def test_apply_historical_multiple_rounds(self):
        """Multiple completed rounds multiply dilution factors."""
        rounds = [
            {"year": -2, "dilution": 0.1},  # 0.9
            {"year": -1, "dilution": 0.2},  # 0.9 * 0.8 = 0.72
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
        )
        assert np.isclose(pipeline._historical_factor, 0.72)

    def test_apply_historical_no_completed_rounds(self):
        """No completed rounds keeps factor at 1.0."""
        rounds = [{"year": 1, "dilution": 0.2}]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
        )
        assert pipeline._historical_factor == 1.0

    def test_apply_historical_missing_dilution_defaults_zero(self):
        """Rounds without dilution key default to 0 dilution."""
        rounds = [{"year": -1}]  # No dilution key
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
        )
        assert pipeline._historical_factor == 1.0

    def test_apply_historical_returns_new_instance(self):
        """apply_historical() returns a new pipeline instance."""
        pipeline1 = DilutionPipeline(years=range(5)).with_rounds([]).classify()
        pipeline2 = pipeline1.apply_historical()
        assert pipeline1 is not pipeline2
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestApplyHistorical -v
```

Expected: FAIL with `AttributeError: 'DilutionPipeline' object has no attribute 'apply_historical'`

**Step 3: Write minimal implementation**

```python
# Add method to DilutionPipeline class in dilution_engine.py
    def apply_historical(self) -> DilutionPipeline:
        """Calculate and store historical dilution factor."""
        factor = 1.0
        for r in self._completed:
            factor *= 1 - r.get("dilution", 0)
        return dataclasses.replace(self, _historical_factor=factor)
```

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestApplyHistorical -v
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/dilution_engine.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): add apply_historical() for completed rounds

Calculates cumulative dilution from completed (historical)
rounds. This dilution applies from day 0."
```

---

## Task 6: Add apply_safe_conversions Method

**Files:**

- Modify: `backend/src/worth_it/calculations/dilution_engine.py`
- Modify: `backend/tests/test_dilution_engine.py`

**Step 1: Write the failing test**

```python
# Add to backend/tests/test_dilution_engine.py
class TestApplySafeConversions:
    """Tests for apply_safe_conversions() method."""

    def test_safe_converts_at_next_priced_round(self):
        """SAFE note maps to the next priced round's year."""
        rounds = [
            {"year": 1, "dilution": 0.1, "is_safe_note": True},
            {"year": 3, "dilution": 0.2, "is_safe_note": False},  # Priced
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        # SAFE at year 1 should convert at year 3
        safe_round = pipeline._upcoming[0]
        assert pipeline._safe_conversions[id(safe_round)] == 3

    def test_safe_with_no_following_priced_round(self):
        """SAFE with no following priced round gets None."""
        rounds = [
            {"year": 1, "dilution": 0.1, "is_safe_note": True},
            {"year": 2, "dilution": 0.2, "is_safe_note": True},  # Also SAFE
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        # Both SAFEs have no priced round to convert at
        for r in pipeline._upcoming:
            assert pipeline._safe_conversions[id(r)] is None

    def test_priced_rounds_not_in_safe_map(self):
        """Priced rounds are not added to SAFE conversion map."""
        rounds = [
            {"year": 1, "dilution": 0.1, "is_safe_note": False},  # Priced
            {"year": 2, "dilution": 0.2, "is_safe_note": False},  # Priced
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        assert len(pipeline._safe_conversions) == 0

    def test_safe_converts_at_same_year_priced_round(self):
        """SAFE can convert at priced round in same year."""
        rounds = [
            {"year": 2, "dilution": 0.1, "is_safe_note": True},
            {"year": 2, "dilution": 0.2, "is_safe_note": False},  # Same year, priced
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        safe_round = [r for r in pipeline._upcoming if r.get("is_safe_note")][0]
        assert pipeline._safe_conversions[id(safe_round)] == 2

    def test_upcoming_rounds_sorted_by_year(self):
        """apply_safe_conversions sorts upcoming rounds by year."""
        rounds = [
            {"year": 3, "dilution": 0.2},
            {"year": 1, "dilution": 0.1},
            {"year": 2, "dilution": 0.15},
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_safe_conversions()
        )
        years = [r["year"] for r in pipeline._upcoming]
        assert years == [1, 2, 3]
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestApplySafeConversions -v
```

Expected: FAIL with `AttributeError: 'DilutionPipeline' object has no attribute 'apply_safe_conversions'`

**Step 3: Write minimal implementation**

```python
# Add method to DilutionPipeline class in dilution_engine.py
    def apply_safe_conversions(self) -> DilutionPipeline:
        """Map SAFE notes to their conversion year (next priced round)."""
        sorted_upcoming = sorted(self._upcoming, key=lambda r: r["year"])
        safe_map: dict[int, int | None] = {}

        for r in sorted_upcoming:
            if r.get("is_safe_note", False):
                # Find next priced round at or after this SAFE
                conversion_year = None
                for future in sorted_upcoming:
                    if (
                        not future.get("is_safe_note", False)
                        and future["year"] >= r["year"]
                    ):
                        conversion_year = future["year"]
                        break
                safe_map[id(r)] = conversion_year

        return dataclasses.replace(
            self,
            _upcoming=sorted_upcoming,
            _safe_conversions=safe_map,
        )
```

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestApplySafeConversions -v
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/dilution_engine.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): add apply_safe_conversions() for SAFE timing

Maps SAFE notes to their conversion year (next priced round).
SAFEs don't dilute immediately - they convert when a priced
round occurs at or after their year."
```

---

## Task 7: Add apply_future_rounds Method

**Files:**

- Modify: `backend/src/worth_it/calculations/dilution_engine.py`
- Modify: `backend/tests/test_dilution_engine.py`

**Step 1: Write the failing test**

```python
# Add to backend/tests/test_dilution_engine.py
class TestApplyFutureRounds:
    """Tests for apply_future_rounds() method."""

    def test_priced_round_dilutes_at_year(self):
        """Priced round applies dilution starting at its year."""
        rounds = [{"year": 2, "dilution": 0.2, "is_safe_note": False}]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        factors = pipeline._yearly_factors
        assert factors[0] == 1.0  # Year 0
        assert factors[1] == 1.0  # Year 1
        assert factors[2] == 0.8  # Year 2 (dilution applied)
        assert factors[3] == 0.8  # Year 3
        assert factors[4] == 0.8  # Year 4

    def test_safe_dilutes_at_conversion_year(self):
        """SAFE dilution applies at conversion year, not SAFE year."""
        rounds = [
            {"year": 1, "dilution": 0.1, "is_safe_note": True},
            {"year": 3, "dilution": 0.2, "is_safe_note": False},  # Priced
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        factors = pipeline._yearly_factors
        assert factors[0] == 1.0  # Year 0
        assert factors[1] == 1.0  # Year 1 (SAFE not converted yet)
        assert factors[2] == 1.0  # Year 2 (SAFE not converted yet)
        # Year 3: both SAFE (0.9) and priced (0.8) apply = 0.72
        assert np.isclose(factors[3], 0.72)
        assert np.isclose(factors[4], 0.72)

    def test_historical_factor_applied(self):
        """Historical factor is included in yearly factors."""
        rounds = [
            {"year": -1, "dilution": 0.1},  # Historical
            {"year": 2, "dilution": 0.2},   # Future
        ]
        pipeline = (
            DilutionPipeline(years=range(4))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        factors = pipeline._yearly_factors
        assert np.isclose(factors[0], 0.9)  # Historical only
        assert np.isclose(factors[1], 0.9)  # Historical only
        assert np.isclose(factors[2], 0.72)  # 0.9 * 0.8
        assert np.isclose(factors[3], 0.72)

    def test_safe_without_conversion_never_dilutes(self):
        """SAFE with no priced round after it never applies dilution."""
        rounds = [{"year": 1, "dilution": 0.5, "is_safe_note": True}]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        # No priced round, so SAFE never converts
        assert all(f == 1.0 for f in pipeline._yearly_factors)

    def test_multiple_rounds_compound(self):
        """Multiple rounds compound their dilution."""
        rounds = [
            {"year": 1, "dilution": 0.1},  # 0.9
            {"year": 2, "dilution": 0.2},  # 0.9 * 0.8 = 0.72
            {"year": 3, "dilution": 0.1},  # 0.72 * 0.9 = 0.648
        ]
        pipeline = (
            DilutionPipeline(years=range(5))
            .with_rounds(rounds)
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
        )
        factors = pipeline._yearly_factors
        assert factors[0] == 1.0
        assert np.isclose(factors[1], 0.9)
        assert np.isclose(factors[2], 0.72)
        assert np.isclose(factors[3], 0.648)
        assert np.isclose(factors[4], 0.648)
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestApplyFutureRounds -v
```

Expected: FAIL with `AttributeError: 'DilutionPipeline' object has no attribute 'apply_future_rounds'`

**Step 3: Write minimal implementation**

```python
# Add method to DilutionPipeline class in dilution_engine.py
    def apply_future_rounds(self) -> DilutionPipeline:
        """Calculate yearly factors applying future dilution at correct years."""
        factors = []
        for year in self.years:
            cumulative = self._historical_factor
            for r in self._upcoming:
                dilution = r.get("dilution", 0)
                if r.get("is_safe_note", False):
                    # SAFE: only dilutes at conversion year
                    conv_year = self._safe_conversions.get(id(r))
                    if conv_year is not None and year >= conv_year:
                        cumulative *= 1 - dilution
                elif r["year"] <= year:
                    # Priced round: dilutes at its own year
                    cumulative *= 1 - dilution
            factors.append(cumulative)

        return dataclasses.replace(self, _yearly_factors=np.array(factors))
```

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestApplyFutureRounds -v
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/dilution_engine.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): add apply_future_rounds() for yearly factors

Calculates cumulative dilution factor for each year by:
- Starting with historical factor
- Applying priced rounds at their year
- Applying SAFEs at their conversion year"
```

---

## Task 8: Add build Method

**Files:**

- Modify: `backend/src/worth_it/calculations/dilution_engine.py`
- Modify: `backend/tests/test_dilution_engine.py`

**Step 1: Write the failing test**

```python
# Add to backend/tests/test_dilution_engine.py
class TestBuild:
    """Tests for build() method."""

    def test_build_returns_dilution_result(self):
        """build() returns a DilutionResult."""
        result = (
            DilutionPipeline(years=range(5))
            .with_rounds([{"year": 2, "dilution": 0.2}])
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
            .build()
        )
        assert isinstance(result, DilutionResult)

    def test_build_calculates_total_dilution(self):
        """build() calculates total dilution from final factor."""
        result = (
            DilutionPipeline(years=range(5))
            .with_rounds([{"year": 1, "dilution": 0.3}])
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
            .build()
        )
        assert np.isclose(result.total_dilution, 0.3)

    def test_build_includes_historical_factor(self):
        """build() includes historical factor in result."""
        result = (
            DilutionPipeline(years=range(5))
            .with_rounds([{"year": -1, "dilution": 0.2}])
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
            .build()
        )
        assert result.historical_factor == 0.8

    def test_build_empty_years(self):
        """build() handles empty years gracefully."""
        result = (
            DilutionPipeline(years=range(0))
            .with_rounds([])
            .classify()
            .apply_historical()
            .apply_safe_conversions()
            .apply_future_rounds()
            .build()
        )
        assert result.total_dilution == 0.0
        assert len(result.yearly_factors) == 0

    def test_build_without_apply_future_rounds(self):
        """build() returns ones if apply_future_rounds not called."""
        result = (
            DilutionPipeline(years=range(3))
            .with_rounds([])
            .classify()
            .apply_historical()
            .build()
        )
        assert np.allclose(result.yearly_factors, [1.0, 1.0, 1.0])
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestBuild -v
```

Expected: FAIL with `AttributeError: 'DilutionPipeline' object has no attribute 'build'`

**Step 3: Write minimal implementation**

```python
# Add method to DilutionPipeline class in dilution_engine.py
    def build(self) -> DilutionResult:
        """Finalize pipeline and return result."""
        if self._yearly_factors is not None:
            factors = self._yearly_factors
        else:
            factors = np.ones(len(self.years))

        total = 1 - factors[-1] if len(factors) > 0 else 0.0

        return DilutionResult(
            yearly_factors=factors,
            total_dilution=total,
            historical_factor=self._historical_factor,
        )
```

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestBuild -v
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/dilution_engine.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): add build() to finalize pipeline

Finalizes the pipeline and returns DilutionResult with:
- yearly_factors from pipeline (or ones if not computed)
- total_dilution calculated from final factor
- historical_factor preserved"
```

---

## Task 9: Add calculate_dilution_schedule Convenience Function

**Files:**

- Modify: `backend/src/worth_it/calculations/dilution_engine.py`
- Modify: `backend/tests/test_dilution_engine.py`

**Step 1: Write the failing test**

```python
# Add to backend/tests/test_dilution_engine.py
from worth_it.calculations.dilution_engine import calculate_dilution_schedule


class TestCalculateDilutionSchedule:
    """Tests for calculate_dilution_schedule convenience function."""

    def test_with_rounds(self):
        """Full pipeline with rounds."""
        result = calculate_dilution_schedule(
            years=range(5),
            rounds=[{"year": 2, "dilution": 0.2}],
        )
        assert isinstance(result, DilutionResult)
        assert np.isclose(result.total_dilution, 0.2)

    def test_with_simulated_dilution(self):
        """Simulated dilution bypasses rounds."""
        result = calculate_dilution_schedule(
            years=range(5),
            rounds=[{"year": 1, "dilution": 0.5}],  # Should be ignored
            simulated_dilution=0.3,
        )
        assert result.total_dilution == 0.3

    def test_no_rounds(self):
        """No rounds returns no dilution."""
        result = calculate_dilution_schedule(years=range(5), rounds=None)
        assert result.total_dilution == 0.0
        assert all(f == 1.0 for f in result.yearly_factors)

    def test_empty_rounds_list(self):
        """Empty rounds list returns no dilution."""
        result = calculate_dilution_schedule(years=range(5), rounds=[])
        assert result.total_dilution == 0.0

    def test_simulated_takes_precedence(self):
        """simulated_dilution takes precedence over rounds."""
        result = calculate_dilution_schedule(
            years=range(3),
            rounds=[{"year": 0, "dilution": 0.9}],
            simulated_dilution=0.1,
        )
        assert result.total_dilution == 0.1
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestCalculateDilutionSchedule -v
```

Expected: FAIL with `ImportError: cannot import name 'calculate_dilution_schedule'`

**Step 3: Write minimal implementation**

```python
# Add function at module level in dilution_engine.py
def calculate_dilution_schedule(
    years: pd.Index | range,
    rounds: list[dict[str, Any]] | None = None,
    simulated_dilution: float | None = None,
) -> DilutionResult:
    """
    Calculate dilution schedule using fluent pipeline.

    Convenience wrapper that handles the common cases:
    - Pre-computed simulated_dilution (from Monte Carlo)
    - Full round-based calculation
    - No dilution (empty/None rounds)

    Args:
        years: Index of years to calculate dilution for
        rounds: List of funding round dicts with year, dilution, status, is_safe_note
        simulated_dilution: Pre-computed total dilution (overrides rounds)

    Returns:
        DilutionResult with yearly_factors, total_dilution, historical_factor
    """
    pipeline = DilutionPipeline(years)

    # Fast path for simulated dilution
    if simulated_dilution is not None:
        return pipeline.with_simulated_dilution(simulated_dilution)

    # Fast path for no rounds
    if not rounds:
        return DilutionResult(
            yearly_factors=np.ones(len(years)),
            total_dilution=0.0,
        )

    # Full pipeline
    return (
        pipeline.with_rounds(rounds)
        .classify()
        .apply_historical()
        .apply_safe_conversions()
        .apply_future_rounds()
        .build()
    )
```

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestCalculateDilutionSchedule -v
```

Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/dilution_engine.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): add calculate_dilution_schedule convenience function

Public API that wraps the fluent pipeline for common use cases:
- Simulated dilution (fast path for Monte Carlo)
- Round-based calculation (full pipeline)
- No dilution (fast path for empty rounds)"
```

---

## Task 10: Export from calculations package

**Files:**

- Modify: `backend/src/worth_it/calculations/__init__.py`

**Step 1: Write the failing test**

```python
# Add to backend/tests/test_dilution_engine.py
class TestModuleExports:
    """Tests for module exports."""

    def test_can_import_from_calculations_package(self):
        """Key symbols exported from calculations package."""
        from worth_it.calculations import (
            DilutionPipeline,
            DilutionResult,
            calculate_dilution_schedule,
        )
        assert DilutionPipeline is not None
        assert DilutionResult is not None
        assert calculate_dilution_schedule is not None
```

**Step 2: Run test to verify it fails**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestModuleExports -v
```

Expected: FAIL with `ImportError: cannot import name 'DilutionPipeline' from 'worth_it.calculations'`

**Step 3: Write minimal implementation**

```python
# Add to backend/src/worth_it/calculations/__init__.py
from worth_it.calculations.dilution_engine import (
    DilutionPipeline,
    DilutionResult,
    calculate_dilution_schedule,
)
```

Also update `__all__` list if present.

**Step 4: Run test to verify it passes**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_dilution_engine.py::TestModuleExports -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/__init__.py backend/tests/test_dilution_engine.py
git commit -m "feat(dilution): export dilution engine from calculations package"
```

---

## Task 11: Integrate into startup_scenario.py

**Files:**

- Modify: `backend/src/worth_it/calculations/startup_scenario.py:81-160`

**Step 1: Verify existing tests pass**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_calculations.py -v -k "startup"
```

Expected: All startup scenario tests PASS (baseline)

**Step 2: Replace dilution logic**

Replace lines 81-160 in `startup_scenario.py` with:

```python
        # Calculate dilution using the pipeline
        from worth_it.calculations.dilution_engine import calculate_dilution_schedule

        dilution_result = calculate_dilution_schedule(
            years=results_df.index,
            rounds=rsu_params.get("dilution_rounds") if rsu_params.get("simulate_dilution") else None,
            simulated_dilution=startup_params.get("simulated_dilution"),
        )
        results_df["CumulativeDilution"] = dilution_result.yearly_factors
        total_dilution = dilution_result.total_dilution
        diluted_equity_pct = initial_equity_pct * dilution_result.yearly_factors[-1] if len(dilution_result.yearly_factors) > 0 else initial_equity_pct

        # Get sorted_rounds for equity sale calculations
        all_rounds = rsu_params.get("dilution_rounds", [])
        sorted_rounds = sorted(all_rounds, key=lambda r: r.get("year", 0)) if all_rounds else []
```

**Step 3: Run tests to verify behavior unchanged**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest tests/test_calculations.py -v -k "startup"
```

Expected: All startup scenario tests PASS

**Step 4: Run full test suite**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest -v
```

Expected: All 229+ tests PASS

**Step 5: Commit**

```bash
git add backend/src/worth_it/calculations/startup_scenario.py
git commit -m "refactor(startup): use DilutionEngine for dilution calculations

Replace 80 lines of inline dilution logic with call to
calculate_dilution_schedule(). Behavior unchanged."
```

---

## Task 12: Update backend CLAUDE.md with pattern guide

**Files:**

- Modify: `backend/CLAUDE.md`

**Step 1: Add fluent pipeline pattern section**

Add after the "Architecture" section:

```markdown
## Fluent Pipeline Pattern

New calculation modules should use immutable fluent pipelines:

```python
@dataclass(frozen=True)
class MyPipeline:
    data: SomeType
    _intermediate: OtherType = None

    def step_one(self) -> MyPipeline:
        result = process(self.data)
        return dataclasses.replace(self, _intermediate=result)

    def build(self) -> MyResult:
        return MyResult(self._intermediate)

# Usage
result = MyPipeline(data).step_one().step_two().build()
```

**Key principles:**

- `frozen=True` for immutability
- Each method returns new instance via `dataclasses.replace()`
- Private fields prefixed with `_` for intermediate state
- `build()` returns final result type
- Convenience function wraps pipeline for simple API

**Reference implementation:** `calculations/dilution_engine.py`

```

**Step 2: Commit**

```bash
git add backend/CLAUDE.md
git commit -m "docs: add fluent pipeline pattern guide to CLAUDE.md

Documents the architectural pattern established by DilutionEngine
for incremental adoption across other calculation modules."
```

---

## Task 13: Final Verification

**Step 1: Run full backend test suite**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pytest -v
```

Expected: All tests PASS

**Step 2: Run linting**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run ruff check --fix --unsafe-fixes src/ tests/
```

Expected: No errors

**Step 3: Run type checking**

```bash
cd ~/.config/superpowers/worktrees/worth_it/feature-236-dilution-engine/backend
uv run pyright src/
```

Expected: No errors

**Step 4: Push branch**

```bash
git push -u origin feature/236-dilution-engine
```

**Step 5: Create PR**

```bash
gh pr create --title "feat: Extract dilution logic into fluent pipeline (#236)" --body "$(cat <<'EOF'
## Summary
- Extract dilution logic from `startup_scenario.py` into `dilution_engine.py`
- Implement fluent pipeline pattern with immutable dataclasses
- Add comprehensive test suite for pipeline components
- Document pattern for incremental adoption across backend

## Changes
- **New:** `calculations/dilution_engine.py` - DilutionPipeline and DilutionResult
- **New:** `tests/test_dilution_engine.py` - 40+ tests for pipeline
- **Modified:** `calculations/startup_scenario.py` - use new module
- **Modified:** `calculations/__init__.py` - export new symbols
- **Modified:** `backend/CLAUDE.md` - document pattern

## Test Plan
- [x] All new dilution engine tests pass
- [x] All existing startup scenario tests pass
- [x] Full backend test suite passes (229+ tests)
- [x] Linting passes
- [x] Type checking passes

Closes #236

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
