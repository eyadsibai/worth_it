"""
Pydantic models for API request/response validation.

This module defines the data models used for communication between
the Streamlit frontend and the FastAPI backend.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# --- Request Models ---


class MonthlyDataGridRequest(BaseModel):
    """Request model for creating monthly data grid."""

    exit_year: int = Field(..., ge=1, le=20)
    current_job_monthly_salary: float = Field(..., ge=0)
    startup_monthly_salary: float = Field(..., ge=0)
    current_job_salary_growth_rate: float = Field(..., ge=0, le=1)
    dilution_rounds: Optional[List[Dict[str, Any]]] = None


class OpportunityCostRequest(BaseModel):
    """Request model for calculating opportunity cost."""

    monthly_data: List[Dict[str, Any]]
    annual_roi: float = Field(..., ge=0, le=1)
    investment_frequency: str = Field(..., pattern="^(Monthly|Annually)$")
    options_params: Optional[Dict[str, Any]] = None
    startup_params: Optional[Dict[str, Any]] = None


class StartupScenarioRequest(BaseModel):
    """Request model for calculating startup scenario."""

    opportunity_cost_data: List[Dict[str, Any]]
    startup_params: Dict[str, Any]


class IRRRequest(BaseModel):
    """Request model for calculating IRR."""

    monthly_surpluses: List[float]
    final_payout_value: float


class NPVRequest(BaseModel):
    """Request model for calculating NPV."""

    monthly_surpluses: List[float]
    annual_roi: float = Field(..., ge=0, le=1)
    final_payout_value: float


class MonteCarloRequest(BaseModel):
    """Request model for Monte Carlo simulation."""

    num_simulations: int = Field(..., ge=1, le=10000)
    base_params: Dict[str, Any]
    sim_param_configs: Dict[str, Any]


class SensitivityAnalysisRequest(BaseModel):
    """Request model for sensitivity analysis."""

    base_params: Dict[str, Any]
    sim_param_configs: Dict[str, Any]


class DilutionFromValuationRequest(BaseModel):
    """Request model for calculating dilution from valuation."""

    pre_money_valuation: float = Field(..., ge=0)
    amount_raised: float = Field(..., ge=0)


# --- Response Models ---


class MonthlyDataGridResponse(BaseModel):
    """Response model for monthly data grid."""

    data: List[Dict[str, Any]]


class OpportunityCostResponse(BaseModel):
    """Response model for opportunity cost calculation."""

    data: List[Dict[str, Any]]


class StartupScenarioResponse(BaseModel):
    """Response model for startup scenario calculation."""

    results_df: List[Dict[str, Any]]
    final_payout_value: float
    final_opportunity_cost: float
    payout_label: str
    breakeven_label: str
    total_dilution: Optional[float] = None
    diluted_equity_pct: Optional[float] = None


class IRRResponse(BaseModel):
    """Response model for IRR calculation."""

    irr: Optional[float]


class NPVResponse(BaseModel):
    """Response model for NPV calculation."""

    npv: Optional[float]


class MonteCarloResponse(BaseModel):
    """Response model for Monte Carlo simulation."""

    net_outcomes: List[float]
    simulated_valuations: List[float]


class SensitivityAnalysisResponse(BaseModel):
    """Response model for sensitivity analysis."""

    data: List[Dict[str, Any]]


class DilutionFromValuationResponse(BaseModel):
    """Response model for dilution from valuation."""

    dilution: float


class HealthCheckResponse(BaseModel):
    """Response model for health check endpoint."""

    status: str
    version: str
