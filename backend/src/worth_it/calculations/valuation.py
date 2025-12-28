"""
Startup Valuation Calculator (#229)

Implements three core valuation methods:
1. Revenue Multiple - Comparable company analysis
2. DCF (Discounted Cash Flow) - Intrinsic value based on projected cash flows
3. VC Method - Investor perspective based on target returns
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field, model_validator

# ============================================================================
# Data Models
# ============================================================================


class RevenueMultipleParams(BaseModel):
    """Parameters for Revenue Multiple valuation method."""

    annual_revenue: float = Field(..., ge=0, description="Annual revenue (ARR or TTM)")
    revenue_multiple: float = Field(..., gt=0, le=100, description="Revenue multiple (e.g., 10x)")
    growth_rate: float | None = Field(
        default=None, ge=-1, le=10, description="YoY revenue growth rate (e.g., 0.5 for 50%)"
    )
    industry_benchmark_multiple: float | None = Field(
        default=None, gt=0, description="Industry average revenue multiple for comparison"
    )


class DCFParams(BaseModel):
    """Parameters for Discounted Cash Flow valuation method."""

    projected_cash_flows: list[float] = Field(
        ..., min_length=1, description="Projected annual free cash flows"
    )
    discount_rate: float = Field(
        ..., gt=0, le=1, description="WACC or required rate of return (e.g., 0.12 for 12%)"
    )
    terminal_growth_rate: float | None = Field(
        default=None, ge=0, lt=1, description="Perpetual growth rate for terminal value"
    )

    @model_validator(mode="after")
    def validate_growth_vs_discount(self) -> DCFParams:
        """Terminal growth must be less than discount rate."""
        if (
            self.terminal_growth_rate is not None
            and self.terminal_growth_rate >= self.discount_rate
        ):
            raise ValueError(
                f"Terminal growth rate ({self.terminal_growth_rate}) must be less than "
                f"discount rate ({self.discount_rate})"
            )
        return self


class VCMethodParams(BaseModel):
    """Parameters for VC Method valuation."""

    projected_exit_value: float = Field(
        ..., gt=0, description="Expected exit valuation (acquisition/IPO)"
    )
    exit_year: int = Field(..., ge=1, le=15, description="Years until exit")
    target_return_multiple: float | None = Field(
        default=None, gt=1, description="Target return multiple (e.g., 10x)"
    )
    target_irr: float | None = Field(
        default=None, gt=0, le=2, description="Target IRR (e.g., 0.5 for 50%)"
    )
    expected_dilution: float = Field(
        default=0, ge=0, lt=1, description="Expected dilution from future rounds"
    )
    investment_amount: float | None = Field(
        default=None, gt=0, description="Investment amount for pre-money calculation"
    )
    exit_probability: float = Field(
        default=1.0, gt=0, le=1, description="Probability of achieving projected exit"
    )

    @model_validator(mode="after")
    def validate_multiple_or_irr(self) -> VCMethodParams:
        """Must provide either target multiple or IRR."""
        if self.target_return_multiple is None and self.target_irr is None:
            raise ValueError("Must provide either target_return_multiple or target_irr")
        return self


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


@dataclass
class ValuationResult:
    """Result from a valuation method."""

    method: Literal["revenue_multiple", "dcf", "vc_method"]
    valuation: float  # Post-money valuation
    confidence: float  # 0-1 confidence score
    inputs: dict  # Input parameters for transparency
    notes: str  # Explanation or caveats


@dataclass
class ValuationComparison:
    """Comparison of multiple valuation methods."""

    min_valuation: float
    max_valuation: float
    average_valuation: float
    weighted_average: float
    range_pct: float  # (max - min) / min
    outliers: list[str]  # Methods that are outliers
    insights: list[str]  # Actionable insights
    results: list[ValuationResult]


# ============================================================================
# Berkus Method (Pre-Revenue)
# ============================================================================


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


# ============================================================================
# Scorecard Method (Pre-Revenue)
# ============================================================================


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


# ============================================================================
# Risk Factor Summation Method (Pre-Revenue)
# ============================================================================


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


def calculate_risk_factor_summation(
    params: RiskFactorSummationParams,
) -> RiskFactorSummationResult:
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


# ============================================================================
# Revenue Multiple Valuation
# ============================================================================


def calculate_revenue_multiple(params: RevenueMultipleParams) -> ValuationResult:
    """
    Calculate valuation using Revenue Multiple method.

    Formula: Valuation = Annual Revenue × Revenue Multiple × Growth Adjustment

    This is the most common method for SaaS companies, comparing against
    publicly traded companies or recent transactions in the same industry.

    Args:
        params: Revenue multiple parameters

    Returns:
        ValuationResult with the calculated valuation
    """
    # Base valuation
    base_valuation = params.annual_revenue * params.revenue_multiple

    # Growth adjustment (higher growth = higher multiple premium)
    growth_adjustment = 1.0
    if params.growth_rate is not None and params.growth_rate > 0:
        # Premium for high growth: 1 + (growth_rate * 0.5)
        # 50% growth adds 25% premium, 100% growth adds 50% premium
        growth_adjustment = 1 + (params.growth_rate * 0.5)

    valuation = base_valuation * growth_adjustment

    # Build inputs dict
    inputs = {
        "annual_revenue": params.annual_revenue,
        "revenue_multiple": params.revenue_multiple,
        "growth_adjustment": growth_adjustment,
    }

    # Notes about industry comparison
    notes = ""
    if params.industry_benchmark_multiple is not None:
        multiple_vs_benchmark = params.revenue_multiple / params.industry_benchmark_multiple
        inputs["multiple_vs_benchmark"] = multiple_vs_benchmark
        inputs["industry_benchmark_multiple"] = params.industry_benchmark_multiple

        if multiple_vs_benchmark > 1.2:
            notes = "Premium multiple vs industry benchmark - justified if growth exceeds peers"
        elif multiple_vs_benchmark < 0.8:
            notes = "Discount to industry benchmark - consider if undervalued or challenged"
        else:
            notes = "Multiple in line with industry benchmark"

    # Confidence based on data quality
    confidence = 0.7  # Base confidence for revenue multiple
    if params.growth_rate is not None:
        confidence += 0.1  # More data = more confidence
    if params.industry_benchmark_multiple is not None:
        confidence += 0.1

    return ValuationResult(
        method="revenue_multiple",
        valuation=valuation,
        confidence=min(confidence, 0.9),  # Cap at 0.9
        inputs=inputs,
        notes=notes,
    )


# ============================================================================
# DCF (Discounted Cash Flow) Valuation
# ============================================================================


def calculate_dcf(params: DCFParams) -> ValuationResult:
    """
    Calculate valuation using Discounted Cash Flow method.

    Formula: PV = Σ(CFt / (1+r)^t) + Terminal Value
    Terminal Value = CF_n × (1+g) / (r-g) (Gordon Growth Model)

    Best for companies with predictable cash flows or when comparing
    to alternative investment returns.

    Args:
        params: DCF parameters

    Returns:
        ValuationResult with the calculated valuation
    """
    discount_rate = params.discount_rate
    cash_flows = params.projected_cash_flows

    # Calculate PV of projected cash flows
    pv_cash_flows = 0.0
    for t, cf in enumerate(cash_flows, start=1):
        pv_cash_flows += cf / ((1 + discount_rate) ** t)

    # Calculate terminal value (if perpetuity model requested)
    terminal_value = 0.0
    terminal_value_pv = 0.0

    if params.terminal_growth_rate is not None:
        # Gordon Growth Model: TV = CF_n × (1+g) / (r-g)
        last_cf = cash_flows[-1]
        g = params.terminal_growth_rate
        terminal_value = last_cf * (1 + g) / (discount_rate - g)

        # Discount terminal value to present
        n = len(cash_flows)
        terminal_value_pv = terminal_value / ((1 + discount_rate) ** n)

    valuation = pv_cash_flows + terminal_value_pv

    # Build inputs dict
    inputs = {
        "discount_rate": discount_rate,
        "num_years": len(cash_flows),
        "pv_cash_flows": pv_cash_flows,
        "terminal_value": terminal_value,
        "terminal_value_pv": terminal_value_pv,
    }

    # Notes
    notes = f"DCF based on {len(cash_flows)} years of projections"
    if params.terminal_growth_rate is not None:
        notes += f" with {params.terminal_growth_rate:.1%} terminal growth"

    # Confidence (DCF has moderate confidence due to projection uncertainty)
    confidence = 0.6
    if len(cash_flows) >= 5:
        confidence += 0.1  # More years = more reliable
    if all(cf >= 0 for cf in cash_flows):
        confidence += 0.05  # Profitable company = more predictable

    return ValuationResult(
        method="dcf",
        valuation=valuation,
        confidence=min(confidence, 0.85),
        inputs=inputs,
        notes=notes,
    )


# ============================================================================
# VC Method Valuation
# ============================================================================


def calculate_vc_method(params: VCMethodParams) -> ValuationResult:
    """
    Calculate valuation using VC Method.

    Formula: Post-Money = (Exit Value × Exit Probability × (1 - Dilution)) / Target Multiple

    This method works backwards from a target exit to determine what
    valuation makes sense today given required investor returns.

    Args:
        params: VC method parameters

    Returns:
        ValuationResult with the calculated valuation
    """
    # Calculate effective target multiple
    if params.target_return_multiple is not None:
        target_multiple = params.target_return_multiple
    else:
        # Convert IRR to multiple: Multiple = (1 + IRR) ^ years
        # Model validator ensures target_irr is set if target_return_multiple is None
        assert params.target_irr is not None  # Validated by VCMethodParams
        target_multiple = (1 + params.target_irr) ** params.exit_year

    # Risk-adjusted exit value
    adjusted_exit_value = params.projected_exit_value * params.exit_probability

    # Account for dilution
    retained_ownership = 1 - params.expected_dilution
    effective_exit_value = adjusted_exit_value * retained_ownership

    # Post-money valuation
    post_money_valuation = effective_exit_value / target_multiple

    # Pre-money valuation (if investment amount provided)
    pre_money_valuation = None
    if params.investment_amount is not None:
        pre_money_valuation = post_money_valuation - params.investment_amount

    # Build inputs dict
    inputs = {
        "projected_exit_value": params.projected_exit_value,
        "exit_year": params.exit_year,
        "target_multiple": target_multiple,
        "exit_probability": params.exit_probability,
        "expected_dilution": params.expected_dilution,
        "effective_exit_value": effective_exit_value,
        "post_money_valuation": post_money_valuation,
    }

    if pre_money_valuation is not None and params.investment_amount is not None:
        inputs["pre_money_valuation"] = pre_money_valuation
        inputs["investment_amount"] = params.investment_amount

    # Notes
    notes = f"VC method targeting {target_multiple:.1f}x return over {params.exit_year} years"
    if params.exit_probability < 1.0:
        notes += f" (risk-adjusted for {params.exit_probability:.0%} exit probability)"

    # Confidence (lower due to uncertainty in exit projections)
    confidence = 0.5
    if params.exit_probability < 1.0:
        confidence += 0.1  # Risk-adjusted = more realistic
    if params.expected_dilution > 0:
        confidence += 0.05  # Accounts for dilution = more realistic

    return ValuationResult(
        method="vc_method",
        valuation=post_money_valuation,
        confidence=min(confidence, 0.75),
        inputs=inputs,
        notes=notes,
    )


# ============================================================================
# First Chicago Method Valuation
# ============================================================================


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

        # Calculate present value for this scenario (probability-weighted)
        discount_factor = (1 + params.discount_rate) ** scenario.years_to_exit
        pv = scenario.exit_value / discount_factor
        # Store probability-weighted PV for contribution percentage display
        scenario_present_values[scenario.name] = scenario.probability * pv

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


# ============================================================================
# Valuation Comparison
# ============================================================================


def compare_valuations(results: list[ValuationResult]) -> ValuationComparison:
    """
    Compare and synthesize multiple valuation methods.

    Generates insights about the valuation range and identifies
    outliers that may need closer examination.

    Args:
        results: List of ValuationResult from different methods

    Returns:
        ValuationComparison with analysis
    """
    if not results:
        raise ValueError("Must provide at least one valuation result")

    valuations = [r.valuation for r in results]
    confidences = [r.confidence for r in results]

    # Basic statistics
    min_val = min(valuations)
    max_val = max(valuations)
    avg_val = sum(valuations) / len(valuations)

    # Weighted average by confidence
    total_weight = sum(confidences)
    weighted_avg = sum(v * c for v, c in zip(valuations, confidences, strict=False)) / total_weight

    # Range as percentage (avoid division by zero)
    range_pct = (max_val - min_val) / min_val if min_val > 0 else 0

    # Identify outliers (> 1.5x from average)
    outliers: list[str] = []
    for r in results:
        deviation = abs(r.valuation - avg_val) / avg_val if avg_val > 0 else 0
        if deviation > 0.5:  # More than 50% from average
            outliers.append(r.method)

    # Generate insights
    insights = []

    if range_pct < 0.2:
        insights.append(
            f"Valuations are tightly clustered (±{range_pct:.0%}), suggesting strong consensus"
        )
    elif range_pct < 0.5:
        insights.append(
            f"Moderate valuation range ({range_pct:.0%}). Consider weighted average of ${weighted_avg:,.0f}"
        )
    else:
        insights.append(
            f"Wide valuation range ({range_pct:.0%}). Review assumptions for outliers: {', '.join(outliers) if outliers else 'none identified'}"
        )

    if len(results) == 1:
        insights.append(
            "Single valuation method used. Consider adding additional methods for validation"
        )

    # Recommend a value
    if len(results) >= 2:
        insights.append(
            f"Recommended range: ${min_val:,.0f} to ${max_val:,.0f} (weighted avg: ${weighted_avg:,.0f})"
        )

    return ValuationComparison(
        min_valuation=min_val,
        max_valuation=max_val,
        average_valuation=avg_val,
        weighted_average=weighted_avg,
        range_pct=range_pct,
        outliers=outliers,
        insights=insights,
        results=results,
    )
