# Phase 6: Advanced Valuation Methods Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add advanced valuation methods including enhanced DCF, VC Method improvements, Comparable Transactions, and Real Options valuation for comprehensive coverage.

**Architecture:** Extend the valuation module with sophisticated methods that build on the foundation. Integrate with Monte Carlo layer for uncertainty analysis.

**Tech Stack:** Python/NumPy/SciPy (backend), TypeScript/React (frontend), TDD throughout.

**Prerequisites:** Phases 1-5 complete (foundation methods, Monte Carlo, benchmarks, exports)

---

## Overview

Phase 6 adds advanced valuation capabilities:

1. **Enhanced DCF** - Multi-stage growth, terminal value options, WACC calculator
2. **VC Method Enhanced** - Multiple rounds, dilution modeling, IRR targeting
3. **Comparable Transactions** - Deal database search, multiple matching
4. **Real Options** - Black-Scholes for embedded optionality
5. **Weighted Average** - Combine multiple methods with confidence weights

---

## Task 1: Enhanced DCF with Multi-Stage Growth

**Files:**
- Modify: `backend/src/worth_it/calculations/valuation.py`
- Test: `backend/tests/test_valuation.py`

### Step 1: Write failing tests for enhanced DCF

```python
# In backend/tests/test_valuation.py
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

    def test_two_stage_dcf(self) -> None:
        """Test DCF with high growth + terminal phases."""
        params = EnhancedDCFParams(
            current_revenue=10_000_000,
            stages=[
                DCFStage("High Growth", 5, 0.30, 0.15),
                DCFStage("Mature", 5, 0.10, 0.20),
            ],
            terminal_growth_rate=0.03,
            wacc=0.12,
            terminal_multiple=None,  # Use Gordon Growth
        )

        result = calculate_enhanced_dcf(params)

        assert result.enterprise_value > 0
        assert len(result.stage_values) == 2
        assert result.terminal_value > 0

    def test_three_stage_dcf(self) -> None:
        """Test DCF with three growth stages."""
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

    def test_dcf_cash_flow_projection(self) -> None:
        """Test that cash flows are projected correctly."""
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
```

### Step 2: Run tests to verify failure

Run: `cd backend && uv run pytest tests/test_valuation.py::TestEnhancedDCF -v`
Expected: FAIL with import error

### Step 3: Implement Enhanced DCF

```python
# In backend/src/worth_it/calculations/valuation.py

@dataclass(frozen=True)
class DCFStage:
    """A single stage in multi-stage DCF.

    Attributes:
        name: Stage identifier (e.g., "High Growth", "Mature")
        years: Duration of this stage
        growth_rate: Annual revenue growth rate
        margin: Free cash flow margin (FCF / Revenue)
    """
    name: str
    years: int
    growth_rate: float
    margin: float


@dataclass(frozen=True)
class EnhancedDCFParams:
    """Parameters for enhanced multi-stage DCF.

    Attributes:
        current_revenue: Current annual revenue
        stages: List of growth stages
        terminal_growth_rate: Perpetual growth rate after all stages
        wacc: Weighted average cost of capital
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
        enterprise_value: Total enterprise value
        stage_values: PV contribution from each stage
        terminal_value: PV of terminal value
        projected_cash_flows: Year-by-year cash flow projection
        projected_revenues: Year-by-year revenue projection
        method: Always "enhanced_dcf"
    """
    enterprise_value: float
    stage_values: dict[str, float]
    terminal_value: float
    projected_cash_flows: list[float]
    projected_revenues: list[float]
    method: str = "enhanced_dcf"


def calculate_enhanced_dcf(params: EnhancedDCFParams) -> EnhancedDCFResult:
    """Calculate valuation using enhanced multi-stage DCF.

    The enhanced DCF model:
    1. Projects revenue through multiple growth stages
    2. Calculates FCF for each year based on stage margin
    3. Discounts cash flows to present value
    4. Calculates terminal value using Gordon Growth or exit multiple
    5. Sums all PV components

    Args:
        params: EnhancedDCFParams with stages and rates

    Returns:
        EnhancedDCFResult with detailed breakdown
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

    # Terminal value
    final_revenue = projected_revenues[-1] if projected_revenues else current_revenue
    final_cf = projected_cash_flows[-1] if projected_cash_flows else current_revenue * 0.15

    if params.terminal_multiple is not None:
        # Exit multiple method
        terminal_value_undiscounted = final_revenue * params.terminal_multiple
    else:
        # Gordon Growth Model
        terminal_cf = final_cf * (1 + params.terminal_growth_rate)
        terminal_value_undiscounted = terminal_cf / (params.wacc - params.terminal_growth_rate)

    # Discount terminal value
    discount_factor = (1 + params.wacc) ** year
    terminal_value = terminal_value_undiscounted / discount_factor

    # Total enterprise value
    enterprise_value = sum(stage_values.values()) + terminal_value

    return EnhancedDCFResult(
        enterprise_value=enterprise_value,
        stage_values=stage_values,
        terminal_value=terminal_value,
        projected_cash_flows=projected_cash_flows,
        projected_revenues=projected_revenues,
        method="enhanced_dcf",
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

## Task 2: WACC Calculator

**Files:**
- Create: `backend/src/worth_it/calculations/wacc.py`
- Test: `backend/tests/test_wacc.py`

### Step 1: Write failing tests for WACC calculator

```python
# In backend/tests/test_wacc.py
import pytest
from worth_it.calculations.wacc import (
    WACCParams,
    WACCResult,
    calculate_wacc,
    calculate_cost_of_equity_capm,
)

class TestWACCCalculator:
    """Tests for WACC calculator."""

    def test_simple_wacc(self) -> None:
        """Test WACC with equal debt and equity."""
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

    def test_all_equity(self) -> None:
        """Test WACC with no debt."""
        params = WACCParams(
            equity_value=100_000_000,
            debt_value=0,
            cost_of_equity=0.15,
            cost_of_debt=0.06,
            tax_rate=0.25,
        )

        result = calculate_wacc(params)
        assert result.wacc == pytest.approx(0.15, rel=0.01)


class TestCAPM:
    """Tests for CAPM cost of equity calculation."""

    def test_capm_calculation(self) -> None:
        """Test CAPM: Re = Rf + Beta * (Rm - Rf)."""
        cost_of_equity = calculate_cost_of_equity_capm(
            risk_free_rate=0.04,
            beta=1.2,
            market_premium=0.06,
        )

        # Re = 0.04 + 1.2 * 0.06 = 0.04 + 0.072 = 0.112
        assert cost_of_equity == pytest.approx(0.112, rel=0.01)
```

### Step 2: Run tests to verify failure

### Step 3: Implement WACC calculator

```python
# In backend/src/worth_it/calculations/wacc.py
"""WACC (Weighted Average Cost of Capital) calculator."""

from dataclasses import dataclass


@dataclass(frozen=True)
class WACCParams:
    """Parameters for WACC calculation.

    Attributes:
        equity_value: Market value of equity
        debt_value: Market value of debt
        cost_of_equity: Required return on equity
        cost_of_debt: Interest rate on debt
        tax_rate: Corporate tax rate
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
        equity_weight: E / (E + D)
        debt_weight: D / (E + D)
        after_tax_cost_of_debt: Rd * (1 - T)
    """
    wacc: float
    equity_weight: float
    debt_weight: float
    after_tax_cost_of_debt: float


def calculate_wacc(params: WACCParams) -> WACCResult:
    """Calculate WACC using the standard formula.

    WACC = (E/V) * Re + (D/V) * Rd * (1 - T)

    Where:
        E = Market value of equity
        D = Market value of debt
        V = E + D (total value)
        Re = Cost of equity
        Rd = Cost of debt
        T = Tax rate

    Args:
        params: WACCParams with capital structure and rates

    Returns:
        WACCResult with WACC and component breakdown
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
    """Calculate cost of equity using CAPM.

    Re = Rf + β * (Rm - Rf)

    Where:
        Rf = Risk-free rate
        β = Beta (systematic risk)
        Rm - Rf = Market risk premium

    Args:
        risk_free_rate: Risk-free rate (e.g., 10-year Treasury)
        beta: Company's beta coefficient
        market_premium: Expected market premium over risk-free

    Returns:
        Cost of equity
    """
    return risk_free_rate + beta * market_premium
```

### Step 4: Run tests and commit

```bash
git add backend/src/worth_it/calculations/wacc.py backend/tests/test_wacc.py
git commit -m "feat(valuation): add WACC and CAPM calculators"
```

---

## Task 3: Comparable Transactions Method

**Files:**
- Create: `backend/src/worth_it/calculations/comparables.py`
- Test: `backend/tests/test_comparables.py`

### Step 1: Write failing tests

```python
# In backend/tests/test_comparables.py
import pytest
from worth_it.calculations.comparables import (
    ComparableTransaction,
    ComparablesParams,
    ComparablesResult,
    calculate_comparable_valuation,
)

class TestComparableTransactions:
    """Tests for Comparable Transactions Method."""

    def test_simple_comparable(self) -> None:
        """Test valuation from single comparable."""
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

    def test_multiple_comparables_median(self) -> None:
        """Test median from multiple comparables."""
        params = ComparablesParams(
            target_revenue=5_000_000,
            comparables=[
                ComparableTransaction("A", 40_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("B", 60_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("C", 80_000_000, 10_000_000, "saas", "2024-01"),
            ],
        )

        result = calculate_comparable_valuation(params)

        # Multiples: 4x, 6x, 8x -> Median = 6x
        # Target: 5M * 6x = 30M
        assert result.median_multiple == pytest.approx(6.0, rel=0.01)
        assert result.implied_valuation == pytest.approx(30_000_000, rel=0.01)

    def test_valuation_range(self) -> None:
        """Test that result includes low/mid/high range."""
        params = ComparablesParams(
            target_revenue=10_000_000,
            comparables=[
                ComparableTransaction("A", 30_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("B", 50_000_000, 10_000_000, "saas", "2024-01"),
                ComparableTransaction("C", 70_000_000, 10_000_000, "saas", "2024-01"),
            ],
        )

        result = calculate_comparable_valuation(params)

        assert result.low_valuation < result.implied_valuation < result.high_valuation
```

### Step 2: Implement

```python
# In backend/src/worth_it/calculations/comparables.py
"""Comparable Transactions valuation method."""

from dataclasses import dataclass
from statistics import median, mean
import numpy as np


@dataclass(frozen=True)
class ComparableTransaction:
    """A comparable transaction for benchmarking.

    Attributes:
        name: Company or deal name
        deal_value: Transaction value (enterprise or equity)
        revenue: Revenue at time of transaction
        industry: Industry category
        date: Transaction date (for recency weighting)
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
        target_revenue: Target company's revenue
        comparables: List of comparable transactions
        weight_by_recency: Apply time decay to older deals
    """
    target_revenue: float
    comparables: list[ComparableTransaction]
    weight_by_recency: bool = False


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
    method: str = "comparables"


def calculate_comparable_valuation(params: ComparablesParams) -> ComparablesResult:
    """Calculate valuation using Comparable Transactions.

    Steps:
    1. Calculate revenue multiple for each comparable
    2. Compute median and mean multiples
    3. Apply to target revenue for valuation range

    Args:
        params: ComparablesParams with target and comparables

    Returns:
        ComparablesResult with valuation range
    """
    if not params.comparables:
        raise ValueError("At least one comparable required")

    # Calculate multiples
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

    # Percentiles for range
    low_mult = float(np.percentile(multiple_values, 25))
    high_mult = float(np.percentile(multiple_values, 75))

    return ComparablesResult(
        implied_valuation=params.target_revenue * median_mult,
        median_multiple=median_mult,
        mean_multiple=mean_mult,
        low_valuation=params.target_revenue * low_mult,
        high_valuation=params.target_revenue * high_mult,
        multiples=multiples,
        method="comparables",
    )
```

### Step 3: Run tests and commit

```bash
git add backend/src/worth_it/calculations/comparables.py backend/tests/test_comparables.py
git commit -m "feat(valuation): implement Comparable Transactions method"
```

---

## Task 4: Real Options Valuation

**Files:**
- Create: `backend/src/worth_it/calculations/real_options.py`
- Test: `backend/tests/test_real_options.py`

### Step 1: Write failing tests for Black-Scholes based options

```python
# In backend/tests/test_real_options.py
import pytest
from worth_it.calculations.real_options import (
    RealOptionParams,
    RealOptionResult,
    calculate_real_option_value,
    OptionType,
)

class TestRealOptions:
    """Tests for Real Options valuation."""

    def test_growth_option(self) -> None:
        """Test valuing a growth option (call-like)."""
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

    def test_abandonment_option(self) -> None:
        """Test valuing an abandonment option (put-like)."""
        params = RealOptionParams(
            option_type=OptionType.ABANDONMENT,
            underlying_value=5_000_000,   # Continuing value
            exercise_price=8_000_000,      # Salvage/exit value
            time_to_expiry=2.0,
            volatility=0.35,
            risk_free_rate=0.05,
        )

        result = calculate_real_option_value(params)

        # Abandonment option has value because exit > continue
        assert result.option_value > 0
```

### Step 2: Implement using Black-Scholes

```python
# In backend/src/worth_it/calculations/real_options.py
"""Real Options valuation using Black-Scholes framework."""

from dataclasses import dataclass
from enum import Enum
import math
from scipy.stats import norm


class OptionType(Enum):
    """Types of real options."""
    GROWTH = "growth"           # Call-like: option to invest/expand
    ABANDONMENT = "abandonment" # Put-like: option to exit
    DELAY = "delay"            # Option to wait before investing
    SWITCH = "switch"          # Option to change strategy


@dataclass(frozen=True)
class RealOptionParams:
    """Parameters for Real Options valuation.

    Attributes:
        option_type: Type of real option
        underlying_value: Current value of underlying asset/project
        exercise_price: Cost to exercise (investment or exit value)
        time_to_expiry: Time until option expires (years)
        volatility: Annual volatility of underlying
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
    method: str = "real_options"


def calculate_real_option_value(params: RealOptionParams) -> RealOptionResult:
    """Calculate real option value using Black-Scholes.

    For GROWTH options (calls):
        C = S*N(d1) - X*e^(-rT)*N(d2)

    For ABANDONMENT options (puts):
        P = X*e^(-rT)*N(-d2) - S*N(-d1)

    Where:
        S = Underlying value
        X = Exercise price
        T = Time to expiry
        r = Risk-free rate
        σ = Volatility
        d1 = [ln(S/X) + (r + σ²/2)T] / (σ√T)
        d2 = d1 - σ√T

    Args:
        params: RealOptionParams

    Returns:
        RealOptionResult with option value
    """
    S = params.underlying_value
    X = params.exercise_price
    T = params.time_to_expiry
    r = params.risk_free_rate
    sigma = params.volatility

    # Calculate d1 and d2
    sqrt_t = math.sqrt(T)
    d1 = (math.log(S / X) + (r + 0.5 * sigma ** 2) * T) / (sigma * sqrt_t)
    d2 = d1 - sigma * sqrt_t

    # Calculate option value based on type
    if params.option_type in (OptionType.GROWTH, OptionType.DELAY):
        # Call option
        option_value = S * norm.cdf(d1) - X * math.exp(-r * T) * norm.cdf(d2)
    else:
        # Put option (ABANDONMENT, SWITCH)
        option_value = X * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

    return RealOptionResult(
        option_value=max(0, option_value),  # Floor at 0
        total_value=params.underlying_value + max(0, option_value),
        d1=d1,
        d2=d2,
        method="real_options",
    )
```

### Step 3: Run tests and commit

```bash
git add backend/src/worth_it/calculations/real_options.py backend/tests/test_real_options.py
git commit -m "feat(valuation): implement Real Options using Black-Scholes"
```

---

## Task 5: Weighted Average Valuation

**Files:**
- Create: `backend/src/worth_it/calculations/weighted_average.py`
- Test: `backend/tests/test_weighted_average.py`

### Step 1: Write failing tests

```python
# In backend/tests/test_weighted_average.py
import pytest
from worth_it.calculations.weighted_average import (
    ValuationInput,
    WeightedAverageParams,
    WeightedAverageResult,
    calculate_weighted_average,
)

class TestWeightedAverage:
    """Tests for Weighted Average valuation."""

    def test_equal_weights(self) -> None:
        """Test with equal weights across methods."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("First Chicago", 10_000_000, 0.33),
                ValuationInput("DCF", 12_000_000, 0.33),
                ValuationInput("Comparables", 11_000_000, 0.34),
            ],
        )

        result = calculate_weighted_average(params)

        # Weighted avg ≈ 11M
        expected = 10_000_000 * 0.33 + 12_000_000 * 0.33 + 11_000_000 * 0.34
        assert result.weighted_valuation == pytest.approx(expected, rel=0.01)

    def test_confidence_weighting(self) -> None:
        """Test with different confidence weights."""
        params = WeightedAverageParams(
            valuations=[
                ValuationInput("High Confidence", 10_000_000, 0.60),
                ValuationInput("Low Confidence", 15_000_000, 0.40),
            ],
        )

        result = calculate_weighted_average(params)

        # More weight on 10M
        assert result.weighted_valuation < 12_500_000
```

### Step 2: Implement

```python
# In backend/src/worth_it/calculations/weighted_average.py
"""Weighted Average of multiple valuation methods."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ValuationInput:
    """A single valuation method's result.

    Attributes:
        method: Name of valuation method
        valuation: Valuation result from that method
        weight: Confidence weight (0-1)
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
        weighted_valuation: Final weighted average
        method_contributions: Each method's contribution to final
        normalized_weights: Weights normalized to sum to 1.0
        method: Always "weighted_average"
    """
    weighted_valuation: float
    method_contributions: dict[str, float]
    normalized_weights: dict[str, float]
    method: str = "weighted_average"


def calculate_weighted_average(params: WeightedAverageParams) -> WeightedAverageResult:
    """Calculate weighted average of multiple valuations.

    Normalizes weights to sum to 1.0, then computes weighted mean.

    Args:
        params: WeightedAverageParams with valuations and weights

    Returns:
        WeightedAverageResult with combined valuation
    """
    if not params.valuations:
        raise ValueError("At least one valuation required")

    # Normalize weights
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
        method="weighted_average",
    )
```

### Step 3: Commit

```bash
git add backend/src/worth_it/calculations/weighted_average.py backend/tests/test_weighted_average.py
git commit -m "feat(valuation): implement weighted average combination method"
```

---

## Task 6: API Endpoints for Advanced Methods

**Files:**
- Modify: `backend/src/worth_it/api/routers/valuation.py`
- Modify: `backend/src/worth_it/models.py`

### Step 1: Add Pydantic models and endpoints for all new methods

### Step 2: Commit

```bash
git add backend/src/worth_it/api/routers/valuation.py backend/src/worth_it/models.py
git commit -m "feat(api): add endpoints for advanced valuation methods"
```

---

## Task 7: Frontend Components for Advanced Methods

**Files:**
- Create: `frontend/components/valuation/enhanced-dcf-form.tsx`
- Create: `frontend/components/valuation/comparables-form.tsx`
- Create: `frontend/components/valuation/real-options-form.tsx`
- Create: `frontend/components/valuation/weighted-average-form.tsx`

### Step 1: Create forms for each method

### Step 2: Add tabs to valuation calculator

### Step 3: Commit

```bash
git add frontend/components/valuation/*.tsx
git commit -m "feat(frontend): add forms for advanced valuation methods"
```

---

## Final Verification

Run all tests and push:
```bash
cd backend && uv run pytest -v
cd frontend && npm run test:unit && npm run type-check
./scripts/run-e2e-tests.sh
git push origin feat/valuation-advanced
```

---

## Summary

Phase 6 completes the Ultimate Valuation Calculator with advanced methods:

| Method | Use Case | Key Features |
|--------|----------|--------------|
| Enhanced DCF | Growth companies | Multi-stage, WACC, terminal value options |
| WACC Calculator | DCF support | CAPM, debt/equity structure |
| Comparables | Benchmarking | Multiple transaction matching, ranges |
| Real Options | Strategic decisions | Black-Scholes for embedded optionality |
| Weighted Average | Final valuation | Combine methods with confidence weights |

The complete calculator now covers:
- Pre-revenue (Berkus, Scorecard, Risk Factor)
- Early-stage (First Chicago, VC Method)
- Growth (DCF, Comparables, Revenue Multiple)
- Advanced (Real Options, Weighted Average)
- Enhancement layer (Monte Carlo on any method)
- Professional outputs (PDF reports, negotiation toolkit)
