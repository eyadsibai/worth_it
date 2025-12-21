# Dilution Engine Design

**Issue:** #236 - Extract Dilution Logic from Startup Scenario Calculation
**Date:** 2025-12-21
**Status:** Approved

## Overview

Extract the dilution calculation logic from `startup_scenario.py` into a dedicated module using a **fluent pipeline pattern**. This establishes a reusable architectural pattern for the entire backend.

## Architecture Decision

### Fluent Pipeline Pattern

We're adopting immutable fluent builders for calculations because:
- **Readable**: Each step is explicit and self-documenting
- **Testable**: Intermediate states can be inspected
- **Composable**: Steps can be reordered or extended
- **Immutable**: No side effects, thread-safe

This pattern will be incrementally adopted across all backend calculation modules.

## Module Structure

**File:** `backend/src/worth_it/calculations/dilution_engine.py`

### Data Classes

```python
@dataclass(frozen=True)
class DilutionResult:
    """Immutable result from dilution pipeline."""
    yearly_factors: np.ndarray
    total_dilution: float
    historical_factor: float = 1.0


@dataclass(frozen=True)
class DilutionPipeline:
    """Fluent pipeline for calculating dilution schedules."""
    years: pd.Index | range
    rounds: list[dict[str, Any]] = field(default_factory=list)
    _completed: list[dict[str, Any]] = field(default_factory=list)
    _upcoming: list[dict[str, Any]] = field(default_factory=list)
    _historical_factor: float = 1.0
    _safe_conversions: dict[int, int | None] = field(default_factory=dict)
    _yearly_factors: np.ndarray | None = None
```

### Pipeline Methods

| Method | Purpose |
|--------|---------|
| `with_rounds(rounds)` | Add funding rounds to pipeline |
| `with_simulated_dilution(dilution)` | Shortcut for pre-computed dilution |
| `classify()` | Separate completed vs upcoming rounds |
| `apply_historical()` | Calculate historical dilution factor |
| `apply_safe_conversions()` | Map SAFEs to conversion years |
| `apply_future_rounds()` | Calculate yearly factors |
| `build()` | Finalize and return `DilutionResult` |

### Public API

```python
def calculate_dilution_schedule(
    years: pd.Index | range,
    rounds: list[dict[str, Any]] | None = None,
    simulated_dilution: float | None = None,
) -> DilutionResult:
    """Convenience wrapper for common dilution calculations."""
```

## Usage Example

```python
# Full pipeline (explicit)
result = (
    DilutionPipeline(years)
    .with_rounds(rounds)
    .classify()
    .apply_historical()
    .apply_safe_conversions()
    .apply_future_rounds()
    .build()
)

# Convenience function (simple API)
result = calculate_dilution_schedule(
    years=results_df.index,
    rounds=rsu_params.get("dilution_rounds"),
    simulated_dilution=startup_params.get("simulated_dilution"),
)
```

## Integration

### Changes to `startup_scenario.py`

Replace lines 81-160 with:

```python
from worth_it.calculations.dilution_engine import calculate_dilution_schedule

result = calculate_dilution_schedule(
    years=results_df.index,
    rounds=rsu_params.get("dilution_rounds"),
    simulated_dilution=startup_params.get("simulated_dilution"),
)
results_df["CumulativeDilution"] = result.yearly_factors
total_dilution = result.total_dilution
diluted_equity_pct = initial_equity_pct * result.yearly_factors[-1]
```

## Classification Logic

### Round Classification Rules

| Condition | Classification |
|-----------|----------------|
| `status == "completed"` | Completed (historical) |
| `status == "upcoming"` | Upcoming (future) |
| No status AND `year < 0` | Completed (historical) |
| No status AND `year >= 0` | Upcoming (future) |

### SAFE Conversion Rules

- SAFE notes don't dilute immediately
- They convert at the **next priced round** at or after their year
- If no priced round follows, SAFE never converts (no dilution)

## Testing Strategy

### Test Categories

1. **Pipeline immutability** - Each method returns new instance
2. **Classification tests** - Completed vs upcoming separation
3. **SAFE conversion tests** - Timing edge cases
4. **Integration tests** - Works with `startup_scenario.py`

### Key Test Cases

- Empty rounds returns no dilution
- Simulated dilution bypasses round calculation
- Negative year rounds are classified as completed
- SAFEs convert at correct year
- Historical dilution applied from day 0

## Rollout Strategy

1. **This PR**: Create `dilution_engine.py` with pipeline pattern
2. **Documentation**: Update `backend/CLAUDE.md` with pattern guide
3. **Future issues**: One issue per module to adopt pattern
   - `opportunity_cost.py`
   - `financial_metrics.py`
   - `cap_table.py`
   - `waterfall.py`
   - `monte_carlo.py`

## Files Changed

| File | Change |
|------|--------|
| `calculations/dilution_engine.py` | New file |
| `calculations/__init__.py` | Export new module |
| `calculations/startup_scenario.py` | Use new module |
| `tests/test_dilution_engine.py` | New tests |
