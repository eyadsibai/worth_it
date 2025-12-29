"""Pydantic models for API request/response validation.

This module defines the data models used for communication between
the Streamlit frontend and the FastAPI backend.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Self

from pydantic import BaseModel, Field, field_validator, model_validator

from worth_it.types import DilutionRound

# --- Error Response Models (Issue #244) ---


class ErrorCode(str, Enum):
    """Standardized error codes for API responses."""

    VALIDATION_ERROR = "VALIDATION_ERROR"
    CALCULATION_ERROR = "CALCULATION_ERROR"
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR"
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class FieldError(BaseModel):
    """Individual field validation error."""

    field: str = Field(..., description="The field path that caused the error")
    message: str = Field(..., description="Human-readable error message for this field")


class ErrorDetail(BaseModel):
    """Structured error information."""

    code: ErrorCode = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    details: list[FieldError] | None = Field(
        default=None, description="Field-level error details for validation errors"
    )


class ErrorResponse(BaseModel):
    """Standard API error response wrapper."""

    error: ErrorDetail = Field(..., description="Error details")


# --- Typed Request Payload Models (Issue #248) ---


class VariableParam(str, Enum):
    """Parameters that can be varied in Monte Carlo/Sensitivity analysis.

    These are the allowed keys for sim_param_configs dictionary,
    providing type safety and IDE autocomplete.
    """

    EXIT_VALUATION = "exit_valuation"
    EXIT_YEAR = "exit_year"
    FAILURE_PROBABILITY = "failure_probability"
    CURRENT_JOB_MONTHLY_SALARY = "current_job_monthly_salary"
    STARTUP_MONTHLY_SALARY = "startup_monthly_salary"
    CURRENT_JOB_SALARY_GROWTH_RATE = "current_job_salary_growth_rate"
    ANNUAL_ROI = "annual_roi"
    TOTAL_EQUITY_GRANT_PCT = "total_equity_grant_pct"
    NUM_OPTIONS = "num_options"
    STRIKE_PRICE = "strike_price"
    EXIT_PRICE_PER_SHARE = "exit_price_per_share"


class SimParamRange(BaseModel):
    """Range for a simulation parameter with validation.

    Used in sim_param_configs to specify the min/max range for
    Monte Carlo and Sensitivity Analysis simulations.
    """

    min: float
    max: float

    @model_validator(mode="after")
    def validate_min_less_than_max(self) -> Self:
        """Ensure min <= max."""
        if self.min > self.max:
            raise ValueError(f"min ({self.min}) must be <= max ({self.max})")
        return self


class RSUParams(BaseModel):
    """RSU equity parameters for API requests.

    Used as part of the discriminated union for startup_params,
    identified by equity_type="RSU".

    Note: total_equity_grant_pct is in percentage form (0-100) for user convenience.
    The conversion layer (serializers.py) converts to decimal (0-1) for internal use.
    """

    equity_type: Literal["RSU"]
    monthly_salary: float = Field(..., ge=0)
    total_equity_grant_pct: float = Field(..., ge=0, le=100)
    vesting_period: int = Field(default=4, ge=1, le=10)
    cliff_period: int = Field(default=1, ge=0, le=5)
    exit_valuation: float = Field(..., ge=0)
    simulate_dilution: bool = False
    dilution_rounds: list[DilutionRound] | None = None
    discount_rate: float | None = Field(
        default=None,
        ge=0,
        le=1,
        description="Discount rate for NPV calculation. Defaults to annual_roi if not provided.",
    )


class StockOptionsParams(BaseModel):
    """Stock options equity parameters for API requests.

    Used as part of the discriminated union for startup_params,
    identified by equity_type="STOCK_OPTIONS".
    """

    equity_type: Literal["STOCK_OPTIONS"]
    monthly_salary: float = Field(..., ge=0)
    num_options: int = Field(..., ge=0)
    strike_price: float = Field(..., ge=0)
    vesting_period: int = Field(default=4, ge=1, le=10)
    cliff_period: int = Field(default=1, ge=0, le=5)
    exit_price_per_share: float = Field(..., ge=0)
    exercise_strategy: Literal["AT_EXIT", "AFTER_VESTING"] = "AT_EXIT"
    exercise_year: int | None = None
    discount_rate: float | None = Field(
        default=None,
        ge=0,
        le=1,
        description="Discount rate for NPV calculation. Defaults to annual_roi if not provided.",
    )


class TypedBaseParams(BaseModel):
    """Typed base parameters for Monte Carlo and Sensitivity Analysis requests.

    Replaces the old dict[str, Any] base_params with full type safety.
    Uses discriminated union for startup_params (RSU or Stock Options).
    """

    exit_year: int = Field(..., ge=1, le=20)
    current_job_monthly_salary: float = Field(..., ge=0)
    startup_monthly_salary: float = Field(..., ge=0)
    current_job_salary_growth_rate: float = Field(..., ge=0, le=1)
    annual_roi: float = Field(..., ge=0, le=1)
    investment_frequency: Literal["Monthly", "Annually"]
    failure_probability: float = Field(..., ge=0, le=1)
    startup_params: RSUParams | StockOptionsParams

    @field_validator("exit_year", mode="before")
    @classmethod
    def reject_boolean_exit_year(cls, v: Any) -> int:
        """Reject boolean values for exit_year.

        In Python, bool is a subclass of int, so isinstance(True, int) returns True.
        We must explicitly check for bool first to reject boolean values.
        """
        if isinstance(v, bool):
            raise ValueError("exit_year must be an integer, not a boolean")
        # v is validated as int by Pydantic, cast for type checker
        return int(v) if isinstance(v, int | float) else v  # type: ignore[return-value]


# --- Shared Validators ---

# Required fields for base_params in Monte Carlo and Sensitivity Analysis requests
_BASE_PARAMS_REQUIRED_FIELDS = [
    "exit_year",
    "current_job_monthly_salary",
    "startup_monthly_salary",
    "current_job_salary_growth_rate",
    "annual_roi",
    "investment_frequency",
    "failure_probability",
    "startup_params",
]


def validate_base_params(base_params: dict[str, Any]) -> None:
    """Validate that base_params contains all required fields.

    Args:
        base_params: The base_params dictionary to validate.

    Raises:
        ValueError: If required fields are missing or exit_year is invalid.
    """
    # Check for missing required fields
    missing = [f for f in _BASE_PARAMS_REQUIRED_FIELDS if f not in base_params]
    if missing:
        raise ValueError(
            f"base_params missing required field(s): {', '.join(missing)}. "
            f"Ensure all required fields are included in the request payload."
        )

    # Validate exit_year is a positive integer (not a boolean)
    # Note: In Python, bool is a subclass of int, so isinstance(True, int) returns True.
    # We must explicitly check for bool first to reject boolean values.
    exit_year = base_params.get("exit_year")
    if isinstance(exit_year, bool) or not isinstance(exit_year, int):
        raise ValueError(f"exit_year must be an integer between 1 and 20, got: {exit_year}")
    if exit_year < 1 or exit_year > 20:
        raise ValueError(f"exit_year must be an integer between 1 and 20, got: {exit_year}")


# --- Cap Table Models ---


class VestingSchedule(BaseModel):
    """Vesting schedule for a stakeholder."""

    total_shares: int = Field(..., ge=0)
    vesting_months: int = Field(..., ge=1, le=120)  # 1 month to 10 years
    cliff_months: int = Field(..., ge=0, le=48)  # Up to 4 year cliff
    start_date: str | None = None  # ISO date string
    vested_shares: int = Field(default=0, ge=0)


class Stakeholder(BaseModel):
    """A shareholder in the cap table."""

    id: str
    name: str = Field(..., min_length=1)
    type: Literal["founder", "employee", "investor", "advisor"]
    shares: int = Field(..., ge=0)
    ownership_pct: float = Field(..., ge=0, le=100)
    share_class: Literal["common", "preferred"]
    vesting: VestingSchedule | None = None


class CapTable(BaseModel):
    """Cap table with all stakeholders."""

    stakeholders: list[Stakeholder] = Field(default_factory=list)
    total_shares: int = Field(default=10_000_000, ge=0)
    option_pool_pct: float = Field(default=10, ge=0, le=100)


class SAFE(BaseModel):
    """Simple Agreement for Future Equity."""

    id: str
    type: Literal["SAFE"] = "SAFE"
    investor_name: str = Field(..., min_length=1)
    investment_amount: float = Field(..., gt=0)
    valuation_cap: float | None = Field(default=None, gt=0)
    discount_pct: float | None = Field(default=None, ge=0, le=100)
    pro_rata_rights: bool = False
    mfn_clause: bool = False
    date: str | None = None  # ISO date string
    status: Literal["outstanding", "converted", "cancelled"] = "outstanding"
    converted_shares: int | None = None
    conversion_price: float | None = None

    @model_validator(mode="after")
    def validate_cap_or_discount(self) -> SAFE:
        """Ensure SAFE has at least a cap or discount."""
        if self.valuation_cap is None and self.discount_pct is None:
            raise ValueError("SAFE must have at least a valuation_cap or discount_pct")
        return self


class ConvertibleNote(BaseModel):
    """Convertible promissory note."""

    id: str
    type: Literal["CONVERTIBLE_NOTE"] = "CONVERTIBLE_NOTE"
    investor_name: str = Field(..., min_length=1)
    principal_amount: float = Field(..., gt=0)
    interest_rate: float = Field(..., ge=0, le=100)  # Annual percentage
    interest_type: Literal["simple", "compound"] = "simple"
    valuation_cap: float | None = Field(default=None, gt=0)
    discount_pct: float | None = Field(default=None, ge=0, le=100)
    maturity_months: int = Field(..., ge=1, le=120)
    date: str | None = None  # ISO date string
    status: Literal["outstanding", "converted", "cancelled"] = "outstanding"
    accrued_interest: float | None = None
    converted_shares: int | None = None
    conversion_price: float | None = None

    @model_validator(mode="after")
    def validate_cap_or_discount(self) -> ConvertibleNote:
        """Ensure note has at least a cap or discount."""
        if self.valuation_cap is None and self.discount_pct is None:
            raise ValueError("Convertible note must have at least a valuation_cap or discount_pct")
        return self


class PricedRound(BaseModel):
    """A priced equity financing round."""

    id: str
    type: Literal["PRICED_ROUND"] = "PRICED_ROUND"
    round_name: str = Field(..., min_length=1)
    lead_investor: str | None = None
    pre_money_valuation: float = Field(..., gt=0)
    amount_raised: float = Field(..., gt=0)
    price_per_share: float = Field(..., gt=0)
    date: str | None = None  # ISO date string
    liquidation_multiplier: float = Field(default=1.0, ge=1.0)
    participating: bool = False
    participation_cap: float | None = None
    new_shares_issued: int = Field(..., ge=0)
    post_money_valuation: float | None = None


class ConvertedInstrumentDetail(BaseModel):
    """Details of a single converted instrument."""

    instrument_id: str
    instrument_type: Literal["SAFE", "CONVERTIBLE_NOTE"]
    investor_name: str
    investment_amount: float
    conversion_price: float
    price_source: Literal["cap", "discount"]
    shares_issued: int
    ownership_pct: float
    accrued_interest: float | None = None  # Only for notes


class ConversionSummary(BaseModel):
    """Summary of conversion results."""

    instruments_converted: int
    total_shares_issued: int
    total_dilution_pct: float


class CapTableConversionRequest(BaseModel):
    """Request to convert SAFEs/Notes when a priced round occurs."""

    cap_table: CapTable
    instruments: list[SAFE | ConvertibleNote]
    priced_round: PricedRound


class CapTableConversionResponse(BaseModel):
    """Response with converted cap table and details."""

    updated_cap_table: CapTable
    converted_instruments: list[ConvertedInstrumentDetail]
    summary: ConversionSummary


# --- Request Models ---


class MonthlyDataGridRequest(BaseModel):
    """Request model for creating monthly data grid."""

    exit_year: int = Field(..., ge=1, le=20)
    current_job_monthly_salary: float = Field(..., ge=0)
    startup_monthly_salary: float = Field(..., ge=0)
    current_job_salary_growth_rate: float = Field(..., ge=0, le=1)
    dilution_rounds: list[DilutionRound] | None = None


class OpportunityCostRequest(BaseModel):
    """Request model for calculating opportunity cost."""

    monthly_data: list[dict[str, Any]]  # MonthlyDataRow - kept flexible for dynamic columns
    annual_roi: float = Field(..., ge=0, le=1)
    investment_frequency: str = Field(..., pattern="^(Monthly|Annually)$")
    options_params: dict[str, Any] | None = None  # OptionsParams - kept flexible for API
    startup_params: dict[str, Any] | None = None  # StartupParams - kept flexible for API


class StartupScenarioRequest(BaseModel):
    """Request model for calculating startup scenario - typed startup_params.

    Uses RSUParams | StockOptionsParams discriminated union for startup_params.
    opportunity_cost_data remains flexible (tabular row data with dynamic columns).
    """

    opportunity_cost_data: list[dict[str, Any]]  # Flexible for dynamic columns
    startup_params: RSUParams | StockOptionsParams


class IRRRequest(BaseModel):
    """Request model for calculating IRR."""

    monthly_surpluses: list[float]
    final_payout_value: float


class NPVRequest(BaseModel):
    """Request model for calculating NPV."""

    monthly_surpluses: list[float]
    annual_roi: float = Field(..., ge=0, le=1)
    final_payout_value: float


class MonteCarloRequest(BaseModel):
    """Request model for Monte Carlo simulation - fully typed.

    Uses TypedBaseParams for type-safe base parameters and
    dict[VariableParam, SimParamRange] for typed simulation configs.
    num_simulations is validated against the configurable MAX_SIMULATIONS setting.
    """

    num_simulations: int = Field(..., ge=1, le=100000)
    base_params: TypedBaseParams
    sim_param_configs: dict[VariableParam, SimParamRange]

    @model_validator(mode="after")
    def validate_num_simulations_against_config(self) -> Self:
        """Validate num_simulations against the configured MAX_SIMULATIONS limit."""
        from worth_it.config import settings

        if self.num_simulations > settings.MAX_SIMULATIONS:
            raise ValueError(
                f"num_simulations ({self.num_simulations}) exceeds the maximum allowed "
                f"({settings.MAX_SIMULATIONS})."
            )
        return self


class SensitivityAnalysisRequest(BaseModel):
    """Request model for sensitivity analysis - fully typed.

    Uses TypedBaseParams for type-safe base parameters and
    dict[VariableParam, SimParamRange] for typed simulation configs.
    """

    base_params: TypedBaseParams
    sim_param_configs: dict[VariableParam, SimParamRange]


class DilutionFromValuationRequest(BaseModel):
    """Request model for calculating dilution from valuation."""

    pre_money_valuation: float = Field(..., ge=0)
    amount_raised: float = Field(..., ge=0)


# --- Response Models ---


class MonthlyDataGridResponse(BaseModel):
    """Response model for monthly data grid."""

    data: list[dict[str, Any]]  # MonthlyDataRow - kept flexible for dynamic columns


class OpportunityCostResponse(BaseModel):
    """Response model for opportunity cost calculation."""

    data: list[dict[str, Any]]  # OpportunityCostRow - kept flexible for dynamic columns


class StartupScenarioResponse(BaseModel):
    """Response model for startup scenario calculation."""

    results_df: list[dict[str, Any]]  # StartupScenarioResultRow - kept flexible for dynamic columns
    final_payout_value: float
    final_payout_value_npv: float | None = None  # Payout discounted to present value
    final_opportunity_cost: float
    final_opportunity_cost_npv: float | None = None  # Opportunity cost discounted to present value
    payout_label: str
    breakeven_label: str
    total_dilution: float | None = None
    diluted_equity_pct: float | None = None


class IRRResponse(BaseModel):
    """Response model for IRR calculation."""

    irr: float | None


class NPVResponse(BaseModel):
    """Response model for NPV calculation."""

    npv: float | None


class MonteCarloResponse(BaseModel):
    """Response model for Monte Carlo simulation."""

    net_outcomes: list[float]
    simulated_valuations: list[float]


class SensitivityAnalysisResponse(BaseModel):
    """Response model for sensitivity analysis."""

    data: list[dict[str, Any]] | None  # Sensitivity analysis has dynamic structure


class DilutionFromValuationResponse(BaseModel):
    """Response model for dilution from valuation."""

    dilution: float


class HealthCheckResponse(BaseModel):
    """Response model for health check endpoint."""

    status: str
    version: str


# --- Dilution Preview Models ---


class DilutionStakeholderInput(BaseModel):
    """Input stakeholder for dilution preview."""

    name: str = Field(..., min_length=1)
    type: Literal["founder", "employee", "investor", "advisor"]
    ownership_pct: float = Field(..., ge=0, le=100)


class DilutionPreviewRequest(BaseModel):
    """Request for dilution preview calculation."""

    stakeholders: list[DilutionStakeholderInput] = Field(default_factory=list)
    option_pool_pct: float = Field(default=0, ge=0, le=100)
    pre_money_valuation: float = Field(..., gt=0)
    amount_raised: float = Field(..., gt=0)
    investor_name: str = Field(default="New Investor", min_length=1)


class DilutionResultItem(BaseModel):
    """A single dilution result for one party."""

    name: str
    type: Literal["founder", "employee", "investor", "advisor", "option_pool", "new_investor"]
    before_pct: float
    after_pct: float
    dilution_pct: float
    is_new: bool


class DilutionPreviewResponse(BaseModel):
    """Response from dilution preview calculation."""

    dilution_results: list[DilutionResultItem]
    post_money_valuation: float
    dilution_factor: float


# --- Scenario Comparison Models ---


class ScenarioEquityInfo(BaseModel):
    """Equity information for a scenario."""

    monthly_salary: float = Field(alias="monthlySalary")

    model_config = {"populate_by_name": True}


class ScenarioResultsInfo(BaseModel):
    """Results information for a scenario."""

    net_outcome: float = Field(alias="netOutcome")
    final_payout_value: float = Field(alias="finalPayoutValue")
    final_opportunity_cost: float = Field(alias="finalOpportunityCost")
    breakeven: str | None = None

    model_config = {"populate_by_name": True}


class ScenarioInput(BaseModel):
    """A single scenario for comparison."""

    name: str = Field(..., min_length=1)
    results: ScenarioResultsInfo
    equity: ScenarioEquityInfo


class ScenarioComparisonRequest(BaseModel):
    """Request for scenario comparison."""

    scenarios: list[ScenarioInput] = Field(..., min_length=1)


class WinnerResult(BaseModel):
    """Result of identifying the winning scenario."""

    winner_name: str
    winner_index: int
    net_outcome_advantage: float
    is_tie: bool


class MetricDiff(BaseModel):
    """Difference between scenarios for a specific metric."""

    metric: str
    label: str
    values: list[float]
    scenario_names: list[str]
    absolute_diff: float
    percentage_diff: float
    better_scenario: str
    higher_is_better: bool


class ComparisonInsight(BaseModel):
    """Insight generated from comparing scenarios."""

    type: Literal["winner", "tradeoff", "observation"]
    title: str
    description: str
    scenario_name: str | None = None
    icon: Literal["trophy", "scale", "info"] | None = None


class ScenarioComparisonResponse(BaseModel):
    """Response from scenario comparison."""

    winner: WinnerResult
    metric_diffs: list[MetricDiff]
    insights: list[ComparisonInsight]


# --- Waterfall Analysis Models ---


class PreferenceTier(BaseModel):
    """A single tier in the liquidation preference stack."""

    id: str
    name: str = Field(..., min_length=1)  # e.g., "Series B", "Series A"
    seniority: int = Field(..., ge=1)  # 1 = most senior (paid first)
    investment_amount: float = Field(..., gt=0)  # Total invested at this tier
    liquidation_multiplier: float = Field(default=1.0, ge=1.0)  # 1x, 2x, etc.
    participating: bool = False
    participation_cap: float | None = Field(default=None, ge=1.0)  # e.g., 3.0 for 3x cap
    stakeholder_ids: list[str] = Field(default_factory=list)  # Links to Stakeholder records


class StakeholderPayout(BaseModel):
    """Payout for a single stakeholder in a waterfall distribution."""

    stakeholder_id: str
    name: str
    payout_amount: float = Field(..., ge=0)
    payout_pct: float = Field(..., ge=0, le=100)  # Percentage of total exit
    investment_amount: float | None = None  # For investors
    roi: float | None = None  # Return on investment (MOIC) for investors


class WaterfallStep(BaseModel):
    """A single step in the waterfall breakdown."""

    step_number: int = Field(..., ge=1)
    description: str
    amount: float = Field(..., ge=0)
    recipients: list[str]  # Stakeholder names
    remaining_proceeds: float = Field(..., ge=0)


class WaterfallDistribution(BaseModel):
    """Distribution result for a single exit valuation."""

    exit_valuation: float = Field(..., gt=0)
    waterfall_steps: list[WaterfallStep]
    stakeholder_payouts: list[StakeholderPayout]
    common_pct: float = Field(..., ge=0, le=100)
    preferred_pct: float = Field(..., ge=0, le=100)


class WaterfallRequest(BaseModel):
    """Request to calculate waterfall distribution."""

    cap_table: CapTable
    preference_tiers: list[PreferenceTier]
    exit_valuations: list[float] = Field(..., min_length=1)


class WaterfallResponse(BaseModel):
    """Full waterfall analysis response."""

    distributions_by_valuation: list[WaterfallDistribution]
    breakeven_points: dict[str, float]  # {"founders": 25M, "series_a": 5M}


# --- Valuation Calculator Models (#229) ---


class RevenueMultipleRequest(BaseModel):
    """Request for Revenue Multiple valuation method."""

    annual_revenue: float = Field(..., ge=0, description="Annual revenue (ARR or TTM)")
    revenue_multiple: float = Field(..., gt=0, le=100, description="Revenue multiple (e.g., 10x)")
    growth_rate: float | None = Field(
        default=None, ge=-1, le=10, description="YoY revenue growth rate (e.g., 0.5 for 50%)"
    )
    industry_benchmark_multiple: float | None = Field(
        default=None, gt=0, description="Industry average revenue multiple for comparison"
    )


class DCFRequest(BaseModel):
    """Request for Discounted Cash Flow valuation method."""

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
    def validate_growth_vs_discount(self) -> Self:
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


class VCMethodRequest(BaseModel):
    """Request for VC Method valuation."""

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
    def validate_multiple_or_irr(self) -> Self:
        """Must provide either target multiple or IRR."""
        if self.target_return_multiple is None and self.target_irr is None:
            raise ValueError("Must provide either target_return_multiple or target_irr")
        return self


class ValuationResultResponse(BaseModel):
    """Response from a valuation method."""

    method: Literal["revenue_multiple", "dcf", "vc_method"]
    valuation: float
    confidence: float
    inputs: dict[str, Any]
    notes: str


class ValuationCompareRequest(BaseModel):
    """Request to calculate and compare multiple valuation methods."""

    revenue_multiple: RevenueMultipleRequest | None = None
    dcf: DCFRequest | None = None
    vc_method: VCMethodRequest | None = None

    @model_validator(mode="after")
    def validate_at_least_one_method(self) -> Self:
        """At least one valuation method must be provided."""
        if all(m is None for m in [self.revenue_multiple, self.dcf, self.vc_method]):
            raise ValueError("At least one valuation method must be provided")
        return self


class ValuationCompareResponse(BaseModel):
    """Response from valuation comparison."""

    results: list[ValuationResultResponse]
    min_valuation: float
    max_valuation: float
    average_valuation: float
    weighted_average: float
    range_pct: float
    outliers: list[str]
    insights: list[str]


# --- First Chicago Method Models ---


class FirstChicagoScenarioRequest(BaseModel):
    """API request model for a single First Chicago scenario."""

    name: str = Field(..., min_length=1, max_length=50, description="Scenario name")
    probability: float = Field(..., ge=0.0, le=1.0, description="Probability (0-1)")
    exit_value: float = Field(..., gt=0, description="Expected exit value")
    years_to_exit: int = Field(..., ge=1, le=20, description="Years until exit")

    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Base Case",
                "probability": 0.50,
                "exit_value": 20000000,
                "years_to_exit": 5,
            }
        }
    }


class FirstChicagoRequest(BaseModel):
    """API request model for First Chicago Method valuation."""

    scenarios: list[FirstChicagoScenarioRequest] = Field(
        ..., min_length=1, max_length=10, description="Valuation scenarios"
    )
    discount_rate: float = Field(
        ..., gt=0, lt=1, description="Required rate of return (e.g., 0.25 for 25%)"
    )
    current_investment: float | None = Field(
        default=None, gt=0, description="Current investment amount (optional)"
    )

    @model_validator(mode="after")
    def validate_probabilities_sum_to_one(self) -> Self:
        """Probabilities must sum to approximately 1.0."""
        total = sum(s.probability for s in self.scenarios)
        if not (0.99 <= total <= 1.01):  # Allow small floating point tolerance
            raise ValueError(f"Scenario probabilities must sum to 1.0 (got {total:.4f})")
        return self

    model_config = {
        "json_schema_extra": {
            "example": {
                "scenarios": [
                    {
                        "name": "Best",
                        "probability": 0.25,
                        "exit_value": 50000000,
                        "years_to_exit": 5,
                    },
                    {
                        "name": "Base",
                        "probability": 0.50,
                        "exit_value": 20000000,
                        "years_to_exit": 5,
                    },
                    {
                        "name": "Worst",
                        "probability": 0.25,
                        "exit_value": 5000000,
                        "years_to_exit": 5,
                    },
                ],
                "discount_rate": 0.25,
            }
        }
    }


class FirstChicagoResponse(BaseModel):
    """API response model for First Chicago Method valuation."""

    weighted_value: float = Field(..., description="Probability-weighted exit value")
    present_value: float = Field(..., description="Present value of weighted outcome")
    scenario_values: dict[str, float] = Field(..., description="Exit value per scenario")
    scenario_present_values: dict[str, float] = Field(..., description="PV per scenario")
    method: str = Field(default="first_chicago", description="Valuation method used")

    model_config = {
        "json_schema_extra": {
            "example": {
                "weighted_value": 23750000,
                "present_value": 7782387,
                "scenario_values": {"Best": 50000000, "Base": 20000000, "Worst": 5000000},
                "scenario_present_values": {"Best": 16384000, "Base": 6553600, "Worst": 1638400},
                "method": "first_chicago",
            }
        }
    }


# --- Pre-Revenue Valuation Methods (Phase 2) ---


class BerkusRequest(BaseModel):
    """API request for Berkus Method valuation.

    Each criterion is scored from $0 to $500K (default max).
    Total valuation = sum of all criteria.
    """

    sound_idea: float = Field(..., ge=0, le=500_000, description="Value for basic value/idea")
    prototype: float = Field(..., ge=0, le=500_000, description="Value for technology/prototype")
    quality_team: float = Field(
        ..., ge=0, le=500_000, description="Value for execution/management team"
    )
    strategic_relationships: float = Field(
        ..., ge=0, le=500_000, description="Value for strategic relationships"
    )
    product_rollout: float = Field(
        ..., ge=0, le=500_000, description="Value for product rollout/sales"
    )
    max_per_criterion: float = Field(
        default=500_000, ge=0, description="Maximum value per criterion"
    )


class BerkusResponse(BaseModel):
    """API response for Berkus Method valuation."""

    valuation: float
    breakdown: dict[str, float]
    method: Literal["berkus"] = "berkus"


class ScorecardFactorRequest(BaseModel):
    """A single factor for Scorecard Method."""

    name: str = Field(..., min_length=1, max_length=50)
    weight: float = Field(..., ge=0, le=1, description="Weight of this factor (sum should be 1.0)")
    score: float = Field(
        ..., ge=0, le=2, description="Score relative to average (1.0 = average, 1.5 = 50% better)"
    )


class ScorecardRequest(BaseModel):
    """API request for Scorecard Method valuation."""

    base_valuation: float = Field(
        ..., gt=0, description="Average pre-money valuation for comparable companies"
    )
    factors: list[ScorecardFactorRequest] = Field(
        ..., min_length=1, description="Weighted scoring factors"
    )


class ScorecardResponse(BaseModel):
    """API response for Scorecard Method valuation."""

    valuation: float
    adjustment_factor: float
    factor_contributions: dict[str, float]
    method: Literal["scorecard"] = "scorecard"


class RiskFactorRequest(BaseModel):
    """A single risk factor for Risk Factor Summation."""

    name: str = Field(..., min_length=1, max_length=50)
    adjustment: float = Field(
        ...,
        ge=-500_000,
        le=500_000,
        description="Dollar adjustment (+500K to -500K). Positive = reduces risk, adds value.",
    )


class RiskFactorSummationRequest(BaseModel):
    """API request for Risk Factor Summation valuation."""

    base_valuation: float = Field(
        ..., gt=0, description="Starting valuation (average for stage/region)"
    )
    factors: list[RiskFactorRequest] = Field(
        ..., min_length=1, description="Risk factors with adjustments"
    )


class RiskFactorSummationResponse(BaseModel):
    """API response for Risk Factor Summation valuation."""

    valuation: float
    total_adjustment: float
    factor_adjustments: dict[str, float]
    method: Literal["risk_factor_summation"] = "risk_factor_summation"


# --- Industry Benchmark Models (Phase 4) ---


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
    severity: Literal["ok", "warning", "error"]
    message: str
    benchmark_median: float
    suggested_range: tuple[float, float] | None = None
