"""Pydantic models for API request/response validation.

This module defines the data models used for communication between
the Streamlit frontend and the FastAPI backend.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# --- Request Models ---


class MonthlyDataGridRequest(BaseModel):
    """Request model for creating monthly data grid."""

    exit_year: int = Field(..., ge=1, le=20)
    current_job_monthly_salary: float = Field(..., ge=0)
    startup_monthly_salary: float = Field(..., ge=0)
    current_job_salary_growth_rate: float = Field(..., ge=0, le=1)
    dilution_rounds: list[dict[str, Any]] | None = None


class OpportunityCostRequest(BaseModel):
    """Request model for calculating opportunity cost."""

    monthly_data: list[dict[str, Any]]
    annual_roi: float = Field(..., ge=0, le=1)
    investment_frequency: str = Field(..., pattern="^(Monthly|Annually)$")
    options_params: dict[str, Any] | None = None
    startup_params: dict[str, Any] | None = None


class StartupScenarioRequest(BaseModel):
    """Request model for calculating startup scenario."""

    opportunity_cost_data: list[dict[str, Any]]
    startup_params: dict[str, Any]


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
    base_params: dict[str, Any]
    sim_param_configs: dict[str, Any]


class SensitivityAnalysisRequest(BaseModel):
    """Request model for sensitivity analysis."""

    base_params: dict[str, Any]
    sim_param_configs: dict[str, Any]


class DilutionFromValuationRequest(BaseModel):
    """Request model for calculating dilution from valuation."""

    pre_money_valuation: float = Field(..., ge=0)
    amount_raised: float = Field(..., ge=0)


# --- Response Models ---


class MonthlyDataGridResponse(BaseModel):
    """Response model for monthly data grid."""

    data: list[dict[str, Any]]


class OpportunityCostResponse(BaseModel):
    """Response model for opportunity cost calculation."""

    data: list[dict[str, Any]]


class StartupScenarioResponse(BaseModel):
    """Response model for startup scenario calculation."""

    results_df: list[dict[str, Any]]
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

    data: list[dict[str, Any]] | None


class DilutionFromValuationResponse(BaseModel):
    """Response model for dilution from valuation."""

    dilution: float


class HealthCheckResponse(BaseModel):
    """Response model for health check endpoint."""

    status: str
    version: str
