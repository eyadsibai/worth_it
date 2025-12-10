"""Pydantic models for API request/response validation.

This module defines the data models used for communication between
the Streamlit frontend and the FastAPI backend.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from worth_it.types import DilutionRound

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
            raise ValueError(
                "Convertible note must have at least a valuation_cap or discount_pct"
            )
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
    """Request model for calculating startup scenario."""

    opportunity_cost_data: list[
        dict[str, Any]
    ]  # OpportunityCostRow - kept flexible for dynamic columns
    startup_params: dict[str, Any]  # StartupParams - kept flexible for API


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
    """Request model for Monte Carlo simulation."""

    num_simulations: int = Field(..., ge=1, le=10000)
    base_params: dict[str, Any]  # BaseParams - kept flexible for dynamic structure
    sim_param_configs: dict[str, Any]  # SimParamConfigs - kept flexible for dynamic structure


class SensitivityAnalysisRequest(BaseModel):
    """Request model for sensitivity analysis."""

    base_params: dict[str, Any]  # BaseParams - kept flexible for dynamic structure
    sim_param_configs: dict[str, Any]  # SimParamConfigs - kept flexible for dynamic structure


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
    final_opportunity_cost: float
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
