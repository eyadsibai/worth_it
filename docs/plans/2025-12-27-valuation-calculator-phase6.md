# Phase 6: Advanced Valuation Methods Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add advanced valuation methods including Enhanced DCF with multi-stage growth, WACC calculator, Comparable Transactions, Real Options, and Weighted Average synthesis.

**Architecture:** Extend the valuation module with sophisticated methods that build on Phase 1-5 foundation. Each advanced method follows the established pattern: Pydantic models for API, frozen dataclasses for results, TDD throughout.

**Tech Stack:** Python 3.13/NumPy/SciPy (backend), TypeScript/React/Zod (frontend), Playwright (E2E)

**Prerequisites:** Phases 1-5 complete (First Chicago, Pre-Revenue, Monte Carlo, Benchmarks, Exports). Phase 2 patterns: frozen dataclasses for all params/results, Pydantic for API validation.

**Branch:** Create from `master` (after Phase 5 merge) as `feature/valuation-phase6`

---

## Overview

Phase 6 adds advanced valuation capabilities:

1. **Enhanced DCF** - Multi-stage growth, terminal value options
2. **WACC Calculator** - Weighted average cost of capital with CAPM
3. **Comparable Transactions** - Deal database matching, valuation ranges
4. **Real Options** - Black-Scholes for embedded optionality
5. **Weighted Average** - Combine multiple methods with confidence weights

---

## Task 1: Enhanced DCF with Multi-Stage Growth

**Files:**
- Modify: `backend/src/worth_it/calculations/valuation.py`
- Test: `backend/tests/test_valuation.py`

### Step 1: Write failing tests for Enhanced DCF

```python
# In backend/tests/test_valuation.py - add to existing file
import pytest
from worth_it.calculations.valuation import (
    DCFStage,
    EnhancedDCFParams,
    EnhancedDCFResult,
    calculate_enhanced_dcf,
)


class TestEnhancedDCF:
    """Tests for Enhanced DCF with multi-stage growth."""

    def test_dcf_stage_creation(self) -> None:
        """Test creating a DCF growth stage."""
        stage = DCFStage(
            name="High Growth",
            years=5,
            growth_rate=0.30,
            margin=0.20,
        )
        assert stage.name == "High Growth"
        assert stage.years == 5
        assert stage.growth_rate == 0.30
        assert stage.margin == 0.20

    def test_two_stage_dcf(self) -> None:
        """Test DCF with high growth + mature phases."""
        params = EnhancedDCFParams(
            current_revenue=10_000_000,
            stages=[
                DCFStage("High Growth", 5, 0.30, 0.15),
                DCFStage("Mature", 5, 0.10, 0.20),
            ],
            terminal_growth_rate=0.03,
            wacc=0.12,
        )

        result = calculate_enhanced_dcf(params)

        assert result.enterprise_value > 0
        assert len(result.stage_values) == 2
        assert result.terminal_value > 0
        assert "High Growth" in result.stage_values
        assert "Mature" in result.stage_values

    def test_three_stage_dcf(self) -> None:
        """Test DCF with three growth stages (hypergrowth → high → mature)."""
        params = EnhancedDCFParams(
            current_revenue=5_000_000,
            stages=[
                DCFStage("Hypergrowth", 3, 0.50, 0.10),
                DCFStage("High Growth", 4, 0.25, 0.18),
                DCFStage("Mature", 3, 0.08, 0.22),
            ],
            terminal_growth_rate=0.025,
            wacc=0.15,
        )

        result = calculate_enhanced_dcf(params)
        assert len(result.stage_values) == 3
        assert len(result.projected_cash_flows) == 10  # 3 + 4 + 3 years

    def test_dcf_with_terminal_multiple(self) -> None:
        """Test DCF using exit multiple instead of Gordon Growth."""
        params = EnhancedDCFParams(
            current_revenue=10_000_000,
            stages=[
                DCFStage("Growth", 5, 0.20, 0.18),
            ],
            terminal_growth_rate=0.03,
            wacc=0.12,
            terminal_multiple=8.0,  # 8x revenue multiple
        )

        result = calculate_enhanced_dcf(params)
        assert result.terminal_value > 0
        assert result.terminal_method == "exit_multiple"

    def test_dcf_cash_flow_projection(self) -> None:
        """Test that cash flows are projected correctly year-over-year."""
        params = EnhancedDCFParams(
            current_revenue=1_000_000,
            stages=[
                DCFStage("Growth", 3, 0.20, 0.10),
            ],
            terminal_growth_rate=0.03,
            wacc=0.10,
        )

        result = calculate_enhanced_dcf(params)

        # Year 1: 1M * 1.2 = 1.2M revenue, 10% margin = 120K cash flow
        # Year 2: 1.2M * 1.2 = 1.44M revenue, 10% margin = 144K
        # Year 3: 1.44M * 1.2 = 1.728M revenue, 10% margin = 172.8K
        assert len(result.projected_cash_flows) == 3
        assert result.projected_cash_flows[0] == pytest.approx(120_000, rel=0.01)
        assert result.projected_cash_flows[1] == pytest.approx(144_000, rel=0.01)
        assert result.projected_cash_flows[2] == pytest.approx(172_800, rel=0.01)
```

### Step 2: Run tests to verify failure

Run: `cd backend && uv run pytest tests/test_valuation.py::TestEnhancedDCF -v`
Expected: FAIL with `ImportError: cannot import name 'DCFStage'`

### Step 3: Implement Enhanced DCF dataclasses and calculation

```python
# In backend/src/worth_it/calculations/valuation.py - add after existing models

@dataclass(frozen=True)
class DCFStage:
    """A single stage in multi-stage DCF.

    Attributes:
        name: Stage identifier (e.g., "Hypergrowth", "High Growth", "Mature")
        years: Duration of this stage in years
        growth_rate: Annual revenue growth rate (e.g., 0.30 for 30%)
        margin: Free cash flow margin as percentage of revenue
    """
    name: str
    years: int
    growth_rate: float
    margin: float


@dataclass(frozen=True)
class EnhancedDCFParams:
    """Parameters for enhanced multi-stage DCF.

    Attributes:
        current_revenue: Current annual revenue (starting point)
        stages: List of growth stages to model
        terminal_growth_rate: Perpetual growth rate after all stages
        wacc: Weighted average cost of capital (discount rate)
        terminal_multiple: Optional exit multiple (if None, use Gordon Growth)
    """
    current_revenue: float
    stages: list[DCFStage]
    terminal_growth_rate: float
    wacc: float
    terminal_multiple: float | None = None


@dataclass(frozen=True)
class EnhancedDCFResult:
    """Result of enhanced DCF valuation.

    Attributes:
        enterprise_value: Total enterprise value (sum of all PVs)
        stage_values: Present value contribution from each stage
        terminal_value: Present value of terminal value
        terminal_method: Either "gordon_growth" or "exit_multiple"
        projected_cash_flows: Year-by-year cash flow projection
        projected_revenues: Year-by-year revenue projection
        method: Always "enhanced_dcf"
    """
    enterprise_value: float
    stage_values: dict[str, float]
    terminal_value: float
    terminal_method: str
    projected_cash_flows: list[float]
    projected_revenues: list[float]
    method: Literal["enhanced_dcf"] = "enhanced_dcf"


def calculate_enhanced_dcf(params: EnhancedDCFParams) -> EnhancedDCFResult:
    """Calculate valuation using enhanced multi-stage DCF.

    The enhanced DCF model:
    1. Projects revenue through multiple growth stages
    2. Calculates FCF for each year based on stage margin
    3. Discounts cash flows to present value by WACC
    4. Calculates terminal value using Gordon Growth or exit multiple
    5. Sums all PV components for enterprise value

    Args:
        params: EnhancedDCFParams with stages, rates, and optional exit multiple

    Returns:
        EnhancedDCFResult with detailed breakdown of value components
    """
    projected_revenues: list[float] = []
    projected_cash_flows: list[float] = []
    stage_values: dict[str, float] = {}

    current_revenue = params.current_revenue
    year = 0

    # Project through each stage
    for stage in params.stages:
        stage_pv = 0.0

        for _ in range(stage.years):
            year += 1
            current_revenue *= (1 + stage.growth_rate)
            cash_flow = current_revenue * stage.margin

            projected_revenues.append(current_revenue)
            projected_cash_flows.append(cash_flow)

            # Discount to present value
            discount_factor = (1 + params.wacc) ** year
            stage_pv += cash_flow / discount_factor

        stage_values[stage.name] = stage_pv

    # Terminal value calculation
    final_revenue = projected_revenues[-1] if projected_revenues else current_revenue
    final_cf = projected_cash_flows[-1] if projected_cash_flows else current_revenue * 0.15

    if params.terminal_multiple is not None:
        # Exit multiple method: Terminal Value = Final Revenue × Multiple
        terminal_value_undiscounted = final_revenue * params.terminal_multiple
        terminal_method = "exit_multiple"
    else:
        # Gordon Growth Model: TV = CF_n × (1+g) / (r-g)
        terminal_cf = final_cf * (1 + params.terminal_growth_rate)
        terminal_value_undiscounted = terminal_cf / (params.wacc - params.terminal_growth_rate)
        terminal_method = "gordon_growth"

    # Discount terminal value to present
    discount_factor = (1 + params.wacc) ** year
    terminal_value = terminal_value_undiscounted / discount_factor

    # Total enterprise value
    enterprise_value = sum(stage_values.values()) + terminal_value

    return EnhancedDCFResult(
        enterprise_value=enterprise_value,
        stage_values=stage_values,
        terminal_value=terminal_value,
        terminal_method=terminal_method,
        projected_cash_flows=projected_cash_flows,
        projected_revenues=projected_revenues,
    )
```

### Step 4: Run tests to verify pass

Run: `cd backend && uv run pytest tests/test_valuation.py::TestEnhancedDCF -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/src/worth_it/calculations/valuation.py backend/tests/test_valuation.py
git commit -m "feat(valuation): implement enhanced multi-stage DCF"
```

---

## Task 2: WACC Calculator with CAPM

**Files:**
- Create: `backend/src/worth_it/calculations/wacc.py`
- Test: `backend/tests/test_wacc.py`

### Step 1: Write failing tests for WACC calculator

```python
# Create backend/tests/test_wacc.py
import pytest
from worth_it.calculations.wacc import (
    WACCParams,
    WACCResult,
    calculate_wacc,
    calculate_cost_of_equity_capm,
)


class TestWACCCalculator:
    """Tests for WACC calculator."""

    def test_simple_wacc_equal_weights(self) -> None:
        """Test WACC with equal debt and equity weights."""
        params = WACCParams(
            equity_value=50_000_000,
            debt_value=50_000_000,
            cost_of_equity=0.12,
            cost_of_debt=0.06,
            tax_rate=0.25,
        )

        result = calculate_wacc(params)

        # WACC = (E/V)*Re + (D/V)*Rd*(1-T)
        # = 0.5 * 0.12 + 0.5 * 0.06 * 0.75
        # = 0.06 + 0.0225 = 0.0825
        assert result.wacc == pytest.approx(0.0825, rel=0.01)
        assert result.equity_weight == pytest.approx(0.5, rel=0.01)
        assert result.debt_weight == pytest.approx(0.5, rel=0.01)

    def test_all_equity_company(self) -> None:
        """Test WACC with no debt (startup typical structure)."""
        params = WACCParams(
            equity_value=100_000_000,
            debt_value=0,
            cost_of_equity=0.15,
            cost_of_debt=0.06,
            tax_rate=0.25,
        )

        result = calculate_wacc(params)
        assert result.wacc == pytest.approx(0.15, rel=0.01)
        assert result.equity_weight == 1.0
        assert result.debt_weight == 0.0

    def test_high_leverage(self) -> None:
        """Test WACC with high debt ratio."""
        params = WACCParams(
            equity_value=20_000_000,
            debt_value=80_000_000,
            cost_of_equity=0.18,
            cost_of_debt=0.08,
            tax_rate=0.30,
        )

        result = calculate_wacc(params)

        # WACC = 0.2 * 0.18 + 0.8 * 0.08 * 0.70
        # = 0.036 + 0.0448 = 0.0808
        assert result.wacc == pytest.approx(0.0808, rel=0.01)

    def test_zero_total_value_raises(self) -> None:
        """Test that zero total value raises ValueError."""
        params = WACCParams(
            equity_value=0,
            debt_value=0,
            cost_of_equity=0.12,
            cost_of_debt=0.06,
            tax_rate=0.25,
        )

        with pytest.raises(ValueError, match="Total value.*cannot be zero"):
            calculate_wacc(params)


class TestCAPM:
    """Tests for CAPM cost of equity calculation."""

    def test_capm_standard_calculation(self) -> None:
        """Test CAPM: Re = Rf + Beta * Market Premium."""
        cost_of_equity = calculate_cost_of_equity_capm(
            risk_free_rate=0.04,
            beta=1.2,
            market_premium=0.06,
        )

        # Re = 0.04 + 1.2 * 0.06 = 0.04 + 0.072 = 0.112
        assert cost_of_equity == pytest.approx(0.112, rel=0.01)

    def test_capm_high_beta_tech_company(self) -> None:
        """Test CAPM for high-beta technology company."""
        cost_of_equity = calculate_cost_of_equity_capm(
            risk_free_rate=0.05,
            beta=1.8,  # High beta for volatile tech
            market_premium=0.055,
        )

        # Re = 0.05 + 1.8 * 0.055 = 0.05 + 0.099 = 0.149
        assert cost_of_equity == pytest.approx(0.149, rel=0.01)

    def test_capm_low_beta_utility(self) -> None:
        """Test CAPM for low-beta utility company."""
        cost_of_equity = calculate_cost_of_equity_capm(
            risk_free_rate=0.04,
            beta=0.5,  # Low beta for stable utility
            market_premium=0.06,
        )

        # Re = 0.04 + 0.5 * 0.06 = 0.04 + 0.03 = 0.07
        assert cost_of_equity == pytest.approx(0.07, rel=0.01)
```

### Step 2: Run tests to verify failure

Run: `cd backend && uv run pytest tests/test_wacc.py -v`
Expected: FAIL with `ModuleNotFoundError`

### Step 3: Implement WACC calculator

```python
# Create backend/src/worth_it/calculations/wacc.py
"""WACC (Weighted Average Cost of Capital) calculator.

Provides WACC calculation for DCF valuations and CAPM-based
cost of equity estimation.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WACCParams:
    """Parameters for WACC calculation.

    Attributes:
        equity_value: Market value of equity
        debt_value: Market value of debt
        cost_of_equity: Required return on equity (from CAPM or other)
        cost_of_debt: Interest rate on debt (pre-tax)
        tax_rate: Corporate tax rate for tax shield calculation
    """
    equity_value: float
    debt_value: float
    cost_of_equity: float
    cost_of_debt: float
    tax_rate: float


@dataclass(frozen=True)
class WACCResult:
    """Result of WACC calculation.

    Attributes:
        wacc: Weighted average cost of capital
        equity_weight: E / (E + D) - proportion of equity financing
        debt_weight: D / (E + D) - proportion of debt financing
        after_tax_cost_of_debt: Rd × (1 - T) - tax-adjusted debt cost
    """
    wacc: float
    equity_weight: float
    debt_weight: float
    after_tax_cost_of_debt: float


def calculate_wacc(params: WACCParams) -> WACCResult:
    """Calculate WACC using the standard formula.

    WACC = (E/V) × Re + (D/V) × Rd × (1 - T)

    Where:
        E = Market value of equity
        D = Market value of debt
        V = E + D (total firm value)
        Re = Cost of equity
        Rd = Cost of debt
        T = Corporate tax rate

    Args:
        params: WACCParams with capital structure and rates

    Returns:
        WACCResult with WACC and component breakdown

    Raises:
        ValueError: If total value is zero
    """
    total_value = params.equity_value + params.debt_value

    if total_value == 0:
        raise ValueError("Total value (equity + debt) cannot be zero")

    equity_weight = params.equity_value / total_value
    debt_weight = params.debt_value / total_value
    after_tax_cost_of_debt = params.cost_of_debt * (1 - params.tax_rate)

    wacc = (
        equity_weight * params.cost_of_equity +
        debt_weight * after_tax_cost_of_debt
    )

    return WACCResult(
        wacc=wacc,
        equity_weight=equity_weight,
        debt_weight=debt_weight,
        after_tax_cost_of_debt=after_tax_cost_of_debt,
    )


def calculate_cost_of_equity_capm(
    risk_free_rate: float,
    beta: float,
    market_premium: float,
) -> float:
    """Calculate cost of equity using Capital Asset Pricing Model.

    Re = Rf + β × (Rm - Rf)

    Where:
        Rf = Risk-free rate (e.g., 10-year Treasury yield)
        β = Beta coefficient (systematic risk)
        Rm - Rf = Market risk premium (expected excess return)

    Args:
        risk_free_rate: Current risk-free rate
        beta: Company's beta coefficient vs market
        market_premium: Expected market premium over risk-free

    Returns:
        Required cost of equity
    """
    return risk_free_rate + beta * market_premium
```

### Step 4: Run tests to verify pass

Run: `cd backend && uv run pytest tests/test_wacc.py -v`
Expected: PASS

### Step 5: Export from calculations package

```python
# In backend/src/worth_it/calculations/__init__.py - add exports
from worth_it.calculations.wacc import (
    WACCParams,
    WACCResult,
    calculate_wacc,
    calculate_cost_of_equity_capm,
)
```

### Step 6: Commit

```bash
git add backend/src/worth_it/calculations/wacc.py backend/tests/test_wacc.py backend/src/worth_it/calculations/__init__.py
git commit -m "feat(valuation): add WACC and CAPM calculators"
```

---

## Task 3: Comparable Transactions Method

**Files:**
- Create: `backend/src/worth_it/calculations/comparables.py`
- Test: `backend/tests/test_comparables.py`

### Step 1: Write failing tests

```python
# Create backend/tests/test_comparables.py
import pytest
from worth_it.calculations.comparables import (
    ComparableTransaction,
    ComparablesParams,
    ComparablesResult,
    calculate_comparable_valuation,
)


class TestComparableTransactions:
    """Tests for Comparable Transactions Method."""

    def test_single_comparable(self) -> None:
        """Test valuation from single comparable transaction."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[
                ComparableTransaction(
                    name="Company A",
                    deal_value=50_000_000,
                    revenue=10_000_000,
                    industry="saas",
                    date="2024-01-15",
                ),
            ],
        )

        result = calculate_comparable_valuation(params)

        # Company A: 50M / 10M = 5x multiple
        # Target: 5M * 5x = 25M
        assert result.implied_valuation == pytest.approx(25_000_000, rel=0.01)
        assert result.median_multiple == pytest.approx(5.0, rel=0.01)

    def test_multiple_comparables_median(self) -> None:
        """Test median from multiple comparables."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[
                ComparableTransaction("A", 40_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("B", 60_000_000, 10_000_000, "saas", "2024-02"),
                ComparableTransaction("C", 80_000_000, 10_000_000, "saas", "2024-03"),
            ],
        )

        result = calculate_comparable_valuation(params)

        # Multiples: 4x, 6x, 8x -> Median = 6x
        # Target: 5M * 6x = 30M
        assert result.median_multiple == pytest.approx(6.0, rel=0.01)
        assert result.implied_valuation == pytest.approx(30_000_000, rel=0.01)

    def test_valuation_range_percentiles(self) -> None:
        """Test that result includes 25th/75th percentile range."""
        params = ComparablesParams(
            target_revenue=10_000_000,
            comparables=[
                ComparableTransaction("A", 30_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("B", 50_000_000, 10_000_000, "saas", "2024-02"),
                ComparableTransaction("C", 70_000_000, 10_000_000, "saas", "2024-03"),
                ComparableTransaction("D", 90_000_000, 10_000_000, "saas", "2024-04"),
            ],
        )

        result = calculate_comparable_valuation(params)

        assert result.low_valuation < result.implied_valuation < result.high_valuation

    def test_empty_comparables_raises(self) -> None:
        """Test that empty comparables list raises ValueError."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[],
        )

        with pytest.raises(ValueError, match="At least one comparable"):
            calculate_comparable_valuation(params)

    def test_zero_revenue_comparable_skipped(self) -> None:
        """Test that comparables with zero revenue are skipped."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[
                ComparableTransaction("Valid", 50_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("Invalid", 20_000_000, 0, "saas", "2024-01"),
            ],
        )

        result = calculate_comparable_valuation(params)

        # Only Valid should be used: 5x multiple
        assert result.median_multiple == pytest.approx(5.0, rel=0.01)
        assert len(result.multiples) == 1
```

### Step 2: Run tests to verify failure

Run: `cd backend && uv run pytest tests/test_comparables.py -v`
Expected: FAIL with `ModuleNotFoundError`

### Step 3: Implement Comparable Transactions

```python
# Create backend/src/worth_it/calculations/comparables.py
"""Comparable Transactions valuation method.

Values a company by analyzing revenue multiples from similar
M&A transactions or public company valuations.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import median, mean
from typing import Literal

import numpy as np


@dataclass(frozen=True)
class ComparableTransaction:
    """A comparable transaction for benchmarking.

    Attributes:
        name: Company or deal name
        deal_value: Transaction value (enterprise or equity)
        revenue: Revenue at time of transaction
        industry: Industry category for filtering
        date: Transaction date (YYYY-MM-DD format)
    """
    name: str
    deal_value: float
    revenue: float
    industry: str
    date: str


@dataclass(frozen=True)
class ComparablesParams:
    """Parameters for Comparable Transactions valuation.

    Attributes:
        target_revenue: Target company's current revenue
        comparables: List of comparable transactions
    """
    target_revenue: float
    comparables: list[ComparableTransaction]


@dataclass(frozen=True)
class ComparablesResult:
    """Result of Comparable Transactions valuation.

    Attributes:
        implied_valuation: Valuation using median multiple
        median_multiple: Median revenue multiple from comparables
        mean_multiple: Mean revenue multiple
        low_valuation: 25th percentile valuation
        high_valuation: 75th percentile valuation
        multiples: Individual multiples from each comparable
        method: Always "comparables"
    """
    implied_valuation: float
    median_multiple: float
    mean_multiple: float
    low_valuation: float
    high_valuation: float
    multiples: dict[str, float]
    method: Literal["comparables"] = "comparables"


def calculate_comparable_valuation(params: ComparablesParams) -> ComparablesResult:
    """Calculate valuation using Comparable Transactions.

    Steps:
    1. Calculate revenue multiple for each comparable
    2. Filter out invalid comparables (zero revenue)
    3. Compute median and mean multiples
    4. Apply median to target revenue for implied valuation
    5. Calculate 25th/75th percentile range

    Args:
        params: ComparablesParams with target and comparables

    Returns:
        ComparablesResult with valuation range and breakdown

    Raises:
        ValueError: If no valid comparables provided
    """
    if not params.comparables:
        raise ValueError("At least one comparable required")

    # Calculate multiples, skipping invalid entries
    multiples: dict[str, float] = {}
    multiple_values: list[float] = []

    for comp in params.comparables:
        if comp.revenue <= 0:
            continue
        mult = comp.deal_value / comp.revenue
        multiples[comp.name] = mult
        multiple_values.append(mult)

    if not multiple_values:
        raise ValueError("No valid comparables with positive revenue")

    # Statistics
    median_mult = median(multiple_values)
    mean_mult = mean(multiple_values)

    # Percentiles for valuation range
    low_mult = float(np.percentile(multiple_values, 25))
    high_mult = float(np.percentile(multiple_values, 75))

    return ComparablesResult(
        implied_valuation=params.target_revenue * median_mult,
        median_multiple=median_mult,
        mean_multiple=mean_mult,
        low_valuation=params.target_revenue * low_mult,
        high_valuation=params.target_revenue * high_mult,
        multiples=multiples,
    )
```

### Step 4: Run tests and commit

Run: `cd backend && uv run pytest tests/test_comparables.py -v`
Expected: PASS

```bash
git add backend/src/worth_it/calculations/comparables.py backend/tests/test_comparables.py
git commit -m "feat(valuation): implement Comparable Transactions method"
```

---

## Task 4: Real Options Valuation (Black-Scholes)

**Files:**
- Create: `backend/src/worth_it/calculations/real_options.py`
- Test: `backend/tests/test_real_options.py`

### Step 1: Write failing tests for Real Options

```python
# Create backend/tests/test_real_options.py
import pytest
from worth_it.calculations.real_options import (
    OptionType,
    RealOptionParams,
    RealOptionResult,
    calculate_real_option_value,
)


class TestRealOptions:
    """Tests for Real Options valuation using Black-Scholes."""

    def test_growth_option_positive_value(self) -> None:
        """Test that growth option (call-like) has positive value."""
        params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=10_000_000,  # Current project value
            exercise_price=8_000_000,      # Investment required
            time_to_expiry=3.0,            # Years until decision
            volatility=0.40,               # Annual volatility
            risk_free_rate=0.05,
        )

        result = calculate_real_option_value(params)

        assert result.option_value > 0
        assert result.total_value >= params.underlying_value

    def test_abandonment_option_in_the_money(self) -> None:
        """Test abandonment option when exit > continue value."""
        params = RealOptionParams(
            option_type=OptionType.ABANDONMENT,
            underlying_value=5_000_000,   # Continuing value (low)
            exercise_price=8_000_000,      # Salvage/exit value (high)
            time_to_expiry=2.0,
            volatility=0.35,
            risk_free_rate=0.05,
        )

        result = calculate_real_option_value(params)

        # Abandonment option has value because exit > continue
        assert result.option_value > 0

    def test_delay_option(self) -> None:
        """Test delay option (option to wait before investing)."""
        params = RealOptionParams(
            option_type=OptionType.DELAY,
            underlying_value=12_000_000,
            exercise_price=10_000_000,
            time_to_expiry=1.5,
            volatility=0.50,
            risk_free_rate=0.04,
        )

        result = calculate_real_option_value(params)
        assert result.option_value > 0

    def test_d1_d2_calculation(self) -> None:
        """Test that d1 and d2 are calculated correctly."""
        params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=100,
            exercise_price=100,
            time_to_expiry=1.0,
            volatility=0.20,
            risk_free_rate=0.05,
        )

        result = calculate_real_option_value(params)

        # d1 = [ln(100/100) + (0.05 + 0.5*0.04)*1] / (0.2*1)
        #    = [0 + 0.07] / 0.2 = 0.35
        # d2 = d1 - 0.2 = 0.15
        assert result.d1 == pytest.approx(0.35, rel=0.05)
        assert result.d2 == pytest.approx(0.15, rel=0.05)

    def test_option_value_floors_at_zero(self) -> None:
        """Test that option value is floored at zero."""
        params = RealOptionParams(
            option_type=OptionType.GROWTH,
            underlying_value=1_000_000,    # Low underlying
            exercise_price=10_000_000,     # High exercise (deep OTM)
            time_to_expiry=0.5,            # Short time
            volatility=0.10,               # Low volatility
            risk_free_rate=0.03,
        )

        result = calculate_real_option_value(params)
        assert result.option_value >= 0
```

### Step 2: Run tests to verify failure

Run: `cd backend && uv run pytest tests/test_real_options.py -v`
Expected: FAIL with `ModuleNotFoundError`

### Step 3: Implement Real Options using Black-Scholes

```python
# Create backend/src/worth_it/calculations/real_options.py
"""Real Options valuation using Black-Scholes framework.

Applies option pricing theory to value strategic flexibility
such as growth options, abandonment options, and delay options.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import Literal

from scipy.stats import norm


class OptionType(Enum):
    """Types of real options."""
    GROWTH = "growth"           # Call-like: option to invest/expand
    ABANDONMENT = "abandonment" # Put-like: option to exit
    DELAY = "delay"             # Call-like: option to wait before investing
    SWITCH = "switch"           # Put-like: option to change strategy


@dataclass(frozen=True)
class RealOptionParams:
    """Parameters for Real Options valuation.

    Attributes:
        option_type: Type of real option being valued
        underlying_value: Current value of underlying asset/project
        exercise_price: Cost to exercise (investment or exit value)
        time_to_expiry: Time until option expires (years)
        volatility: Annual volatility of underlying value
        risk_free_rate: Risk-free interest rate
    """
    option_type: OptionType
    underlying_value: float
    exercise_price: float
    time_to_expiry: float
    volatility: float
    risk_free_rate: float


@dataclass(frozen=True)
class RealOptionResult:
    """Result of Real Options valuation.

    Attributes:
        option_value: Value of the real option
        total_value: Underlying + option value
        d1: Black-Scholes d1 parameter
        d2: Black-Scholes d2 parameter
        method: Always "real_options"
    """
    option_value: float
    total_value: float
    d1: float
    d2: float
    method: Literal["real_options"] = "real_options"


def calculate_real_option_value(params: RealOptionParams) -> RealOptionResult:
    """Calculate real option value using Black-Scholes.

    For GROWTH/DELAY options (calls):
        C = S×N(d1) - X×e^(-rT)×N(d2)

    For ABANDONMENT/SWITCH options (puts):
        P = X×e^(-rT)×N(-d2) - S×N(-d1)

    Where:
        S = Underlying value (current project value)
        X = Exercise price (investment required or salvage value)
        T = Time to expiry (years)
        r = Risk-free rate
        σ = Volatility
        d1 = [ln(S/X) + (r + σ²/2)T] / (σ√T)
        d2 = d1 - σ√T
        N(·) = Standard normal CDF

    Args:
        params: RealOptionParams

    Returns:
        RealOptionResult with option value and Black-Scholes parameters
    """
    s = params.underlying_value
    x = params.exercise_price
    t = params.time_to_expiry
    r = params.risk_free_rate
    sigma = params.volatility

    # Calculate d1 and d2
    sqrt_t = math.sqrt(t)
    d1 = (math.log(s / x) + (r + 0.5 * sigma ** 2) * t) / (sigma * sqrt_t)
    d2 = d1 - sigma * sqrt_t

    # Calculate option value based on type
    if params.option_type in (OptionType.GROWTH, OptionType.DELAY):
        # Call option: right to buy/invest
        option_value = s * norm.cdf(d1) - x * math.exp(-r * t) * norm.cdf(d2)
    else:
        # Put option: right to sell/abandon (ABANDONMENT, SWITCH)
        option_value = x * math.exp(-r * t) * norm.cdf(-d2) - s * norm.cdf(-d1)

    # Floor at zero (options can't have negative value)
    option_value = max(0.0, option_value)

    return RealOptionResult(
        option_value=option_value,
        total_value=params.underlying_value + option_value,
        d1=d1,
        d2=d2,
    )
```

### Step 4: Run tests and commit

Run: `cd backend && uv run pytest tests/test_real_options.py -v`
Expected: PASS

```bash
git add backend/src/worth_it/calculations/real_options.py backend/tests/test_real_options.py
git commit -m "feat(valuation): implement Real Options using Black-Scholes"
```

---

## Task 5: Weighted Average Valuation Synthesis

**Files:**
- Create: `backend/src/worth_it/calculations/weighted_average.py`
- Test: `backend/tests/test_weighted_average.py`

### Step 1: Write failing tests

```python
# Create backend/tests/test_weighted_average.py
import pytest
from worth_it.calculations.weighted_average import (
    ValuationInput,
    WeightedAverageParams,
    WeightedAverageResult,
    calculate_weighted_average,
)


class TestWeightedAverage:
    """Tests for Weighted Average valuation synthesis."""

    def test_equal_weights(self) -> None:
        """Test with approximately equal weights across methods."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("First Chicago", 10_000_000, 0.33),
                ValuationInput("DCF", 12_000_000, 0.33),
                ValuationInput("Comparables", 11_000_000, 0.34),
            ],
        )

        result = calculate_weighted_average(params)

        # Weighted avg ≈ 11M (normalized weights)
        expected = (10_000_000 * 0.33 + 12_000_000 * 0.33 + 11_000_000 * 0.34)
        assert result.weighted_valuation == pytest.approx(expected, rel=0.01)

    def test_confidence_weighting_favors_high(self) -> None:
        """Test that higher confidence weights more heavily."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("High Confidence", 10_000_000, 0.80),
                ValuationInput("Low Confidence", 20_000_000, 0.20),
            ],
        )

        result = calculate_weighted_average(params)

        # More weight on 10M, should be closer to 10M than 20M
        assert result.weighted_valuation < 15_000_000
        assert result.normalized_weights["High Confidence"] == pytest.approx(0.80, rel=0.01)
        assert result.normalized_weights["Low Confidence"] == pytest.approx(0.20, rel=0.01)

    def test_weights_normalized_to_one(self) -> None:
        """Test that weights are normalized even if they don't sum to 1."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("A", 10_000_000, 2.0),  # Unnormalized weights
                ValuationInput("B", 20_000_000, 3.0),
            ],
        )

        result = calculate_weighted_average(params)

        # Weights should be normalized: 2/(2+3)=0.4, 3/(2+3)=0.6
        assert result.normalized_weights["A"] == pytest.approx(0.4, rel=0.01)
        assert result.normalized_weights["B"] == pytest.approx(0.6, rel=0.01)

    def test_method_contributions(self) -> None:
        """Test that method contributions are calculated correctly."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("DCF", 10_000_000, 0.5),
                ValuationInput("Comps", 10_000_000, 0.5),
            ],
        )

        result = calculate_weighted_average(params)

        assert result.method_contributions["DCF"] == pytest.approx(5_000_000, rel=0.01)
        assert result.method_contributions["Comps"] == pytest.approx(5_000_000, rel=0.01)

    def test_empty_valuations_raises(self) -> None:
        """Test that empty valuations list raises ValueError."""
        params = WeightedAverageParams(valuations=[])

        with pytest.raises(ValueError, match="At least one valuation"):
            calculate_weighted_average(params)

    def test_zero_total_weight_raises(self) -> None:
        """Test that zero total weight raises ValueError."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("A", 10_000_000, 0.0),
            ],
        )

        with pytest.raises(ValueError, match="Total weight cannot be zero"):
            calculate_weighted_average(params)
```

### Step 2: Run tests to verify failure

Run: `cd backend && uv run pytest tests/test_weighted_average.py -v`
Expected: FAIL with `ModuleNotFoundError`

### Step 3: Implement Weighted Average

```python
# Create backend/src/worth_it/calculations/weighted_average.py
"""Weighted Average synthesis of multiple valuation methods.

Combines valuations from different methods using confidence
weights to produce a blended final valuation.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class ValuationInput:
    """A single valuation method's result.

    Attributes:
        method: Name of valuation method (e.g., "DCF", "Comparables")
        valuation: Valuation result from that method
        weight: Confidence weight (will be normalized)
    """
    method: str
    valuation: float
    weight: float


@dataclass(frozen=True)
class WeightedAverageParams:
    """Parameters for weighted average valuation.

    Attributes:
        valuations: List of method valuations with weights
    """
    valuations: list[ValuationInput]


@dataclass(frozen=True)
class WeightedAverageResult:
    """Result of weighted average valuation.

    Attributes:
        weighted_valuation: Final weighted average valuation
        method_contributions: Each method's dollar contribution to final
        normalized_weights: Weights normalized to sum to 1.0
        method: Always "weighted_average"
    """
    weighted_valuation: float
    method_contributions: dict[str, float]
    normalized_weights: dict[str, float]
    method: Literal["weighted_average"] = "weighted_average"


def calculate_weighted_average(params: WeightedAverageParams) -> WeightedAverageResult:
    """Calculate weighted average of multiple valuations.

    Normalizes weights to sum to 1.0, then computes weighted mean.
    Each method's contribution shows how much it affects the final value.

    Args:
        params: WeightedAverageParams with valuations and weights

    Returns:
        WeightedAverageResult with combined valuation

    Raises:
        ValueError: If no valuations provided or total weight is zero
    """
    if not params.valuations:
        raise ValueError("At least one valuation required")

    # Calculate total weight for normalization
    total_weight = sum(v.weight for v in params.valuations)
    if total_weight == 0:
        raise ValueError("Total weight cannot be zero")

    normalized_weights: dict[str, float] = {}
    method_contributions: dict[str, float] = {}
    weighted_sum = 0.0

    for v in params.valuations:
        norm_weight = v.weight / total_weight
        normalized_weights[v.method] = norm_weight
        contribution = v.valuation * norm_weight
        method_contributions[v.method] = contribution
        weighted_sum += contribution

    return WeightedAverageResult(
        weighted_valuation=weighted_sum,
        method_contributions=method_contributions,
        normalized_weights=normalized_weights,
    )
```

### Step 4: Run tests and commit

Run: `cd backend && uv run pytest tests/test_weighted_average.py -v`
Expected: PASS

```bash
git add backend/src/worth_it/calculations/weighted_average.py backend/tests/test_weighted_average.py
git commit -m "feat(valuation): implement weighted average synthesis method"
```

---

## Task 6: API Endpoints for Advanced Methods

**Files:**
- Modify: `backend/src/worth_it/api/routers/valuation.py`
- Modify: `backend/src/worth_it/models.py`
- Test: `backend/tests/test_api.py`

### Step 1: Add Pydantic API models

```python
# In backend/src/worth_it/models.py - add API models

class DCFStageAPI(BaseModel):
    """API model for DCF growth stage."""
    name: str = Field(..., min_length=1, description="Stage name")
    years: int = Field(..., ge=1, le=20, description="Stage duration")
    growth_rate: float = Field(..., ge=-0.5, le=2.0, description="Annual growth rate")
    margin: float = Field(..., ge=-0.5, le=0.8, description="FCF margin")


class EnhancedDCFRequest(BaseModel):
    """API request for enhanced multi-stage DCF."""
    current_revenue: float = Field(..., gt=0, description="Current annual revenue")
    stages: list[DCFStageAPI] = Field(..., min_length=1, description="Growth stages")
    terminal_growth_rate: float = Field(..., ge=0, lt=0.1, description="Terminal growth")
    wacc: float = Field(..., gt=0, le=0.5, description="Discount rate")
    terminal_multiple: float | None = Field(default=None, gt=0, description="Exit multiple")


class WACCRequest(BaseModel):
    """API request for WACC calculation."""
    equity_value: float = Field(..., ge=0, description="Market value of equity")
    debt_value: float = Field(..., ge=0, description="Market value of debt")
    cost_of_equity: float = Field(..., gt=0, le=0.5, description="Required equity return")
    cost_of_debt: float = Field(..., ge=0, le=0.3, description="Interest rate on debt")
    tax_rate: float = Field(..., ge=0, le=0.5, description="Corporate tax rate")


class ComparableTransactionAPI(BaseModel):
    """API model for a comparable transaction."""
    name: str = Field(..., min_length=1, description="Company/deal name")
    deal_value: float = Field(..., gt=0, description="Transaction value")
    revenue: float = Field(..., gt=0, description="Revenue at transaction")
    industry: str = Field(..., min_length=1, description="Industry category")
    date: str = Field(..., description="Transaction date YYYY-MM-DD")


class ComparablesRequest(BaseModel):
    """API request for Comparable Transactions valuation."""
    target_revenue: float = Field(..., gt=0, description="Target company revenue")
    comparables: list[ComparableTransactionAPI] = Field(..., min_length=1)


class RealOptionRequest(BaseModel):
    """API request for Real Options valuation."""
    option_type: str = Field(..., description="growth, abandonment, delay, switch")
    underlying_value: float = Field(..., gt=0, description="Current project value")
    exercise_price: float = Field(..., gt=0, description="Investment/exit value")
    time_to_expiry: float = Field(..., gt=0, le=20, description="Years to expiry")
    volatility: float = Field(..., gt=0, le=1.5, description="Annual volatility")
    risk_free_rate: float = Field(..., ge=0, le=0.2, description="Risk-free rate")


class ValuationInputAPI(BaseModel):
    """API model for a single valuation input."""
    method: str = Field(..., min_length=1, description="Method name")
    valuation: float = Field(..., gt=0, description="Valuation from method")
    weight: float = Field(..., gt=0, description="Confidence weight")


class WeightedAverageRequest(BaseModel):
    """API request for weighted average valuation."""
    valuations: list[ValuationInputAPI] = Field(..., min_length=1)
```

### Step 2: Add API endpoints

```python
# In backend/src/worth_it/api/routers/valuation.py - add endpoints

from worth_it.calculations.wacc import calculate_wacc, WACCParams
from worth_it.calculations.comparables import (
    calculate_comparable_valuation,
    ComparablesParams,
    ComparableTransaction,
)
from worth_it.calculations.real_options import (
    calculate_real_option_value,
    RealOptionParams,
    OptionType,
)
from worth_it.calculations.weighted_average import (
    calculate_weighted_average,
    WeightedAverageParams,
    ValuationInput,
)


@router.post("/enhanced-dcf")
def enhanced_dcf_valuation(request: EnhancedDCFRequest) -> dict:
    """Calculate enhanced multi-stage DCF valuation."""
    stages = [
        DCFStage(s.name, s.years, s.growth_rate, s.margin)
        for s in request.stages
    ]
    params = EnhancedDCFParams(
        current_revenue=request.current_revenue,
        stages=stages,
        terminal_growth_rate=request.terminal_growth_rate,
        wacc=request.wacc,
        terminal_multiple=request.terminal_multiple,
    )
    result = calculate_enhanced_dcf(params)
    return asdict(result)


@router.post("/wacc")
def wacc_calculation(request: WACCRequest) -> dict:
    """Calculate WACC."""
    params = WACCParams(
        equity_value=request.equity_value,
        debt_value=request.debt_value,
        cost_of_equity=request.cost_of_equity,
        cost_of_debt=request.cost_of_debt,
        tax_rate=request.tax_rate,
    )
    result = calculate_wacc(params)
    return asdict(result)


@router.post("/comparables")
def comparables_valuation(request: ComparablesRequest) -> dict:
    """Calculate valuation using Comparable Transactions."""
    comparables = [
        ComparableTransaction(c.name, c.deal_value, c.revenue, c.industry, c.date)
        for c in request.comparables
    ]
    params = ComparablesParams(
        target_revenue=request.target_revenue,
        comparables=comparables,
    )
    result = calculate_comparable_valuation(params)
    return asdict(result)


@router.post("/real-options")
def real_options_valuation(request: RealOptionRequest) -> dict:
    """Calculate Real Options valuation using Black-Scholes."""
    option_type = OptionType(request.option_type)
    params = RealOptionParams(
        option_type=option_type,
        underlying_value=request.underlying_value,
        exercise_price=request.exercise_price,
        time_to_expiry=request.time_to_expiry,
        volatility=request.volatility,
        risk_free_rate=request.risk_free_rate,
    )
    result = calculate_real_option_value(params)
    return asdict(result)


@router.post("/weighted-average")
def weighted_average_valuation(request: WeightedAverageRequest) -> dict:
    """Calculate weighted average of multiple valuation methods."""
    valuations = [
        ValuationInput(v.method, v.valuation, v.weight)
        for v in request.valuations
    ]
    params = WeightedAverageParams(valuations=valuations)
    result = calculate_weighted_average(params)
    return asdict(result)
```

### Step 3: Add API tests

```python
# In backend/tests/test_api.py - add tests

class TestAdvancedValuationAPI:
    """Tests for advanced valuation API endpoints."""

    def test_enhanced_dcf_endpoint(self, client: TestClient) -> None:
        response = client.post("/api/valuation/enhanced-dcf", json={
            "current_revenue": 10_000_000,
            "stages": [
                {"name": "Growth", "years": 5, "growth_rate": 0.25, "margin": 0.15}
            ],
            "terminal_growth_rate": 0.03,
            "wacc": 0.12,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["enterprise_value"] > 0

    def test_wacc_endpoint(self, client: TestClient) -> None:
        response = client.post("/api/valuation/wacc", json={
            "equity_value": 80_000_000,
            "debt_value": 20_000_000,
            "cost_of_equity": 0.12,
            "cost_of_debt": 0.06,
            "tax_rate": 0.25,
        })
        assert response.status_code == 200
        data = response.json()
        assert 0 < data["wacc"] < 0.20

    def test_comparables_endpoint(self, client: TestClient) -> None:
        response = client.post("/api/valuation/comparables", json={
            "target_revenue": 5_000_000,
            "comparables": [
                {"name": "CompA", "deal_value": 50_000_000, "revenue": 10_000_000, "industry": "saas", "date": "2024-01-01"},
            ],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["implied_valuation"] > 0

    def test_real_options_endpoint(self, client: TestClient) -> None:
        response = client.post("/api/valuation/real-options", json={
            "option_type": "growth",
            "underlying_value": 10_000_000,
            "exercise_price": 8_000_000,
            "time_to_expiry": 3.0,
            "volatility": 0.40,
            "risk_free_rate": 0.05,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["option_value"] >= 0

    def test_weighted_average_endpoint(self, client: TestClient) -> None:
        response = client.post("/api/valuation/weighted-average", json={
            "valuations": [
                {"method": "DCF", "valuation": 10_000_000, "weight": 0.5},
                {"method": "Comps", "valuation": 12_000_000, "weight": 0.5},
            ],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["weighted_valuation"] == pytest.approx(11_000_000, rel=0.01)
```

### Step 4: Run tests and commit

```bash
cd backend && uv run pytest tests/test_api.py::TestAdvancedValuationAPI -v
git add backend/src/worth_it/api/routers/valuation.py backend/src/worth_it/models.py backend/tests/test_api.py
git commit -m "feat(api): add endpoints for advanced valuation methods"
```

---

## Task 7: Frontend Zod Schemas

**Files:**
- Modify: `frontend/lib/schemas.ts`

### Step 1: Add Zod schemas for advanced methods

```typescript
// In frontend/lib/schemas.ts - add schemas

// Enhanced DCF
export const DCFStageSchema = z.object({
  name: z.string().min(1),
  years: z.number().int().min(1).max(20),
  growth_rate: z.number().min(-0.5).max(2.0),
  margin: z.number().min(-0.5).max(0.8),
});

export const EnhancedDCFRequestSchema = z.object({
  current_revenue: z.number().positive(),
  stages: z.array(DCFStageSchema).min(1),
  terminal_growth_rate: z.number().min(0).max(0.1),
  wacc: z.number().positive().max(0.5),
  terminal_multiple: z.number().positive().optional(),
});

export const EnhancedDCFResultSchema = z.object({
  enterprise_value: z.number(),
  stage_values: z.record(z.string(), z.number()),
  terminal_value: z.number(),
  terminal_method: z.string(),
  projected_cash_flows: z.array(z.number()),
  projected_revenues: z.array(z.number()),
  method: z.literal("enhanced_dcf"),
});

// WACC
export const WACCRequestSchema = z.object({
  equity_value: z.number().min(0),
  debt_value: z.number().min(0),
  cost_of_equity: z.number().positive().max(0.5),
  cost_of_debt: z.number().min(0).max(0.3),
  tax_rate: z.number().min(0).max(0.5),
});

export const WACCResultSchema = z.object({
  wacc: z.number(),
  equity_weight: z.number(),
  debt_weight: z.number(),
  after_tax_cost_of_debt: z.number(),
});

// Comparables
export const ComparableTransactionSchema = z.object({
  name: z.string().min(1),
  deal_value: z.number().positive(),
  revenue: z.number().positive(),
  industry: z.string().min(1),
  date: z.string(),
});

export const ComparablesRequestSchema = z.object({
  target_revenue: z.number().positive(),
  comparables: z.array(ComparableTransactionSchema).min(1),
});

export const ComparablesResultSchema = z.object({
  implied_valuation: z.number(),
  median_multiple: z.number(),
  mean_multiple: z.number(),
  low_valuation: z.number(),
  high_valuation: z.number(),
  multiples: z.record(z.string(), z.number()),
  method: z.literal("comparables"),
});

// Real Options
export const OptionTypeSchema = z.enum(["growth", "abandonment", "delay", "switch"]);

export const RealOptionRequestSchema = z.object({
  option_type: OptionTypeSchema,
  underlying_value: z.number().positive(),
  exercise_price: z.number().positive(),
  time_to_expiry: z.number().positive().max(20),
  volatility: z.number().positive().max(1.5),
  risk_free_rate: z.number().min(0).max(0.2),
});

export const RealOptionResultSchema = z.object({
  option_value: z.number(),
  total_value: z.number(),
  d1: z.number(),
  d2: z.number(),
  method: z.literal("real_options"),
});

// Weighted Average
export const ValuationInputSchema = z.object({
  method: z.string().min(1),
  valuation: z.number().positive(),
  weight: z.number().positive(),
});

export const WeightedAverageRequestSchema = z.object({
  valuations: z.array(ValuationInputSchema).min(1),
});

export const WeightedAverageResultSchema = z.object({
  weighted_valuation: z.number(),
  method_contributions: z.record(z.string(), z.number()),
  normalized_weights: z.record(z.string(), z.number()),
  method: z.literal("weighted_average"),
});

// Type exports
export type DCFStage = z.infer<typeof DCFStageSchema>;
export type EnhancedDCFRequest = z.infer<typeof EnhancedDCFRequestSchema>;
export type EnhancedDCFResult = z.infer<typeof EnhancedDCFResultSchema>;
export type WACCRequest = z.infer<typeof WACCRequestSchema>;
export type WACCResult = z.infer<typeof WACCResultSchema>;
export type ComparableTransaction = z.infer<typeof ComparableTransactionSchema>;
export type ComparablesRequest = z.infer<typeof ComparablesRequestSchema>;
export type ComparablesResult = z.infer<typeof ComparablesResultSchema>;
export type OptionType = z.infer<typeof OptionTypeSchema>;
export type RealOptionRequest = z.infer<typeof RealOptionRequestSchema>;
export type RealOptionResult = z.infer<typeof RealOptionResultSchema>;
export type ValuationInput = z.infer<typeof ValuationInputSchema>;
export type WeightedAverageRequest = z.infer<typeof WeightedAverageRequestSchema>;
export type WeightedAverageResult = z.infer<typeof WeightedAverageResultSchema>;
```

### Step 2: Add API client methods

```typescript
// In frontend/lib/api-client.ts - add methods

async calculateEnhancedDCF(request: EnhancedDCFRequest): Promise<EnhancedDCFResult> {
  return this.post('/valuation/enhanced-dcf', request, EnhancedDCFResultSchema);
}

async calculateWACC(request: WACCRequest): Promise<WACCResult> {
  return this.post('/valuation/wacc', request, WACCResultSchema);
}

async calculateComparables(request: ComparablesRequest): Promise<ComparablesResult> {
  return this.post('/valuation/comparables', request, ComparablesResultSchema);
}

async calculateRealOptions(request: RealOptionRequest): Promise<RealOptionResult> {
  return this.post('/valuation/real-options', request, RealOptionResultSchema);
}

async calculateWeightedAverage(request: WeightedAverageRequest): Promise<WeightedAverageResult> {
  return this.post('/valuation/weighted-average', request, WeightedAverageResultSchema);
}
```

### Step 3: Commit

```bash
git add frontend/lib/schemas.ts frontend/lib/api-client.ts
git commit -m "feat(frontend): add Zod schemas for advanced valuation methods"
```

---

## Task 8: Frontend Components for Advanced Methods

**Files:**
- Create: `frontend/components/valuation/enhanced-dcf-form.tsx`
- Create: `frontend/components/valuation/wacc-calculator.tsx`
- Create: `frontend/components/valuation/comparables-form.tsx`
- Create: `frontend/components/valuation/real-options-form.tsx`
- Create: `frontend/components/valuation/weighted-average-form.tsx`
- Modify: `frontend/components/valuation/index.ts`

### Step 1: Create Enhanced DCF Form

```tsx
// Create frontend/components/valuation/enhanced-dcf-form.tsx
"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { EnhancedDCFRequestSchema, type EnhancedDCFRequest } from "@/lib/schemas";

interface EnhancedDCFFormProps {
  onSubmit: (data: EnhancedDCFRequest) => void;
  isLoading?: boolean;
}

export function EnhancedDCFForm({ onSubmit, isLoading }: EnhancedDCFFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EnhancedDCFRequest>({
    resolver: zodResolver(EnhancedDCFRequestSchema),
    defaultValues: {
      current_revenue: 5_000_000,
      stages: [
        { name: "High Growth", years: 5, growth_rate: 0.30, margin: 0.15 },
        { name: "Mature", years: 5, growth_rate: 0.10, margin: 0.20 },
      ],
      terminal_growth_rate: 0.03,
      wacc: 0.12,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "stages",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enhanced Multi-Stage DCF</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Current Revenue</Label>
              <Input
                type="number"
                {...register("current_revenue", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label>WACC (Discount Rate)</Label>
              <Input
                type="number"
                step="0.01"
                {...register("wacc", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Growth Stages</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ name: "", years: 3, growth_rate: 0.15, margin: 0.15 })
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Add Stage
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-5 gap-2 mb-2">
                <Input
                  placeholder="Stage Name"
                  {...register(`stages.${index}.name`)}
                />
                <Input
                  type="number"
                  placeholder="Years"
                  {...register(`stages.${index}.years`, { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Growth %"
                  {...register(`stages.${index}.growth_rate`, { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Margin %"
                  {...register(`stages.${index}.margin`, { valueAsNumber: true })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Terminal Growth Rate</Label>
              <Input
                type="number"
                step="0.01"
                {...register("terminal_growth_rate", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label>Exit Multiple (Optional)</Label>
              <Input
                type="number"
                step="0.5"
                {...register("terminal_multiple", { valueAsNumber: true })}
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Calculating..." : "Calculate Valuation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

### Step 2: Create other form components (similar pattern)

Create `wacc-calculator.tsx`, `comparables-form.tsx`, `real-options-form.tsx`, and `weighted-average-form.tsx` following the same pattern.

### Step 3: Export from index

```typescript
// In frontend/components/valuation/index.ts - add exports
export { EnhancedDCFForm } from "./enhanced-dcf-form";
export { WACCCalculator } from "./wacc-calculator";
export { ComparablesForm } from "./comparables-form";
export { RealOptionsForm } from "./real-options-form";
export { WeightedAverageForm } from "./weighted-average-form";
```

### Step 4: Commit

```bash
git add frontend/components/valuation/*.tsx frontend/components/valuation/index.ts
git commit -m "feat(frontend): add forms for advanced valuation methods"
```

---

## Task 9: E2E Tests

**Files:**
- Create: `playwright/tests/17-advanced-valuation.spec.ts`

### Step 1: Write E2E tests

```typescript
// Create playwright/tests/17-advanced-valuation.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Advanced Valuation Methods", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/valuation");
  });

  test("should calculate Enhanced DCF with multiple stages", async ({ page }) => {
    // Select Enhanced DCF tab
    await page.getByRole("tab", { name: /Enhanced DCF/i }).click();

    // Fill form
    await page.getByLabel(/Current Revenue/i).fill("10000000");
    await page.getByLabel(/WACC/i).fill("0.12");
    await page.getByLabel(/Terminal Growth/i).fill("0.03");

    // Submit
    await page.getByRole("button", { name: /Calculate/i }).click();

    // Verify result
    await expect(page.getByText(/Enterprise Value/i)).toBeVisible();
    await expect(page.getByText(/\$[\d,]+/)).toBeVisible();
  });

  test("should calculate WACC with CAPM", async ({ page }) => {
    await page.getByRole("tab", { name: /WACC/i }).click();

    await page.getByLabel(/Equity Value/i).fill("80000000");
    await page.getByLabel(/Debt Value/i).fill("20000000");
    await page.getByLabel(/Cost of Equity/i).fill("0.12");
    await page.getByLabel(/Cost of Debt/i).fill("0.06");
    await page.getByLabel(/Tax Rate/i).fill("0.25");

    await page.getByRole("button", { name: /Calculate/i }).click();

    await expect(page.getByText(/WACC:/i)).toBeVisible();
  });

  test("should calculate Comparable Transactions valuation", async ({ page }) => {
    await page.getByRole("tab", { name: /Comparables/i }).click();

    await page.getByLabel(/Target Revenue/i).fill("5000000");

    // Add comparable
    await page.getByRole("button", { name: /Add Comparable/i }).click();
    await page.getByPlaceholder(/Company Name/i).fill("TechCo");
    await page.getByPlaceholder(/Deal Value/i).fill("50000000");
    await page.getByPlaceholder(/Revenue/i).fill("10000000");

    await page.getByRole("button", { name: /Calculate/i }).click();

    await expect(page.getByText(/Implied Valuation/i)).toBeVisible();
    await expect(page.getByText(/Median Multiple/i)).toBeVisible();
  });

  test("should calculate Real Options valuation", async ({ page }) => {
    await page.getByRole("tab", { name: /Real Options/i }).click();

    await page.getByRole("combobox", { name: /Option Type/i }).click();
    await page.getByRole("option", { name: /Growth/i }).click();

    await page.getByLabel(/Underlying Value/i).fill("10000000");
    await page.getByLabel(/Exercise Price/i).fill("8000000");
    await page.getByLabel(/Time to Expiry/i).fill("3");
    await page.getByLabel(/Volatility/i).fill("0.40");
    await page.getByLabel(/Risk-Free Rate/i).fill("0.05");

    await page.getByRole("button", { name: /Calculate/i }).click();

    await expect(page.getByText(/Option Value/i)).toBeVisible();
  });

  test("should calculate Weighted Average from multiple methods", async ({ page }) => {
    await page.getByRole("tab", { name: /Weighted Average/i }).click();

    // Add valuations
    await page.getByRole("button", { name: /Add Method/i }).click();
    await page.getByPlaceholder(/Method Name/i).first().fill("DCF");
    await page.getByPlaceholder(/Valuation/i).first().fill("10000000");
    await page.getByPlaceholder(/Weight/i).first().fill("0.5");

    await page.getByRole("button", { name: /Add Method/i }).click();
    await page.getByPlaceholder(/Method Name/i).last().fill("Comps");
    await page.getByPlaceholder(/Valuation/i).last().fill("12000000");
    await page.getByPlaceholder(/Weight/i).last().fill("0.5");

    await page.getByRole("button", { name: /Calculate/i }).click();

    await expect(page.getByText(/Weighted Valuation/i)).toBeVisible();
    await expect(page.getByText(/\$11,000,000/)).toBeVisible();
  });
});
```

### Step 2: Run E2E tests

```bash
./scripts/run-e2e-tests.sh
```

### Step 3: Commit

```bash
git add playwright/tests/17-advanced-valuation.spec.ts
git commit -m "test(e2e): add tests for advanced valuation methods"
```

---

## Final Verification

Run all tests and push:

```bash
# Backend tests
cd backend && uv run pytest -v

# Frontend checks
cd frontend && npm run type-check && npm run lint

# E2E tests
./scripts/run-e2e-tests.sh

# Push feature branch
git push origin feature/valuation-phase6
```

---

## Summary

Phase 6 completes the Ultimate Valuation Calculator with advanced methods:

| Method | Use Case | Key Features |
|--------|----------|--------------|
| Enhanced DCF | Growth companies | Multi-stage, WACC integration, terminal value options |
| WACC Calculator | DCF support | CAPM, debt/equity structure, tax shield |
| Comparables | Benchmarking | Multiple transaction matching, percentile ranges |
| Real Options | Strategic decisions | Black-Scholes for growth/abandonment optionality |
| Weighted Average | Final valuation | Combine methods with confidence weights |

The complete calculator now covers:

- **Pre-revenue**: Berkus, Scorecard, Risk Factor (Phase 2)
- **Early-stage**: First Chicago, VC Method (Phase 1)
- **Growth**: DCF, Comparables, Revenue Multiple
- **Advanced**: Enhanced DCF, Real Options, Weighted Average (Phase 6)
- **Enhancement layer**: Monte Carlo on any method (Phase 3)
- **Industry context**: Benchmarks and validation (Phase 4)
- **Professional outputs**: PDF reports, negotiation toolkit (Phase 5)
