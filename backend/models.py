"""Pydantic models for API request/response validation."""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class EquityType(str, Enum):
    """Type of equity compensation."""
    RSU = "RSU"
    STOCK_OPTIONS = "Stock Options"


class InvestmentFrequency(str, Enum):
    """Frequency of investment."""
    MONTHLY = "Monthly"
    ANNUALLY = "Annually"


class ExerciseStrategy(str, Enum):
    """When to exercise stock options."""
    AT_EXIT = "At Exit"
    AFTER_VESTING = "After Vesting"


class CurrentJobInput(BaseModel):
    """Input parameters for current job."""
    monthly_salary: float = Field(..., gt=0, description="Current monthly salary in SAR")
    annual_growth_rate: float = Field(default=0.0, ge=0, le=100, description="Annual salary growth rate (%)")
    invest_surplus: bool = Field(default=False, description="Whether to invest salary surplus")
    annual_roi: float = Field(default=8.0, ge=-100, le=100, description="Expected annual ROI (%)")
    investment_frequency: InvestmentFrequency = Field(default=InvestmentFrequency.MONTHLY)


class DilutionRound(BaseModel):
    """Dilution parameters for a funding round."""
    enabled: bool = Field(default=False)
    valuation: Optional[float] = Field(default=None, gt=0, description="Post-money valuation in SAR")
    new_investment: Optional[float] = Field(default=None, gt=0, description="New investment amount in SAR")


class DilutionInput(BaseModel):
    """Dilution simulation for multiple funding rounds."""
    round_a: DilutionRound = Field(default_factory=DilutionRound)
    round_b: DilutionRound = Field(default_factory=DilutionRound)
    round_c: DilutionRound = Field(default_factory=DilutionRound)
    round_d: DilutionRound = Field(default_factory=DilutionRound)


class RSUInput(BaseModel):
    """Input parameters for RSU equity."""
    equity_percentage: float = Field(..., gt=0, le=100, description="Equity grant percentage")
    target_exit_valuation: float = Field(..., gt=0, description="Target exit valuation in SAR")
    vesting_years: int = Field(default=4, ge=1, le=10, description="Total vesting period in years")
    cliff_years: int = Field(default=1, ge=0, le=5, description="Cliff period in years")
    simulate_dilution: bool = Field(default=False, description="Whether to simulate dilution")
    dilution: Optional[DilutionInput] = Field(default=None)


class StockOptionsInput(BaseModel):
    """Input parameters for stock options."""
    num_options: int = Field(..., gt=0, description="Number of stock options granted")
    strike_price: float = Field(..., ge=0, description="Strike price per share in SAR")
    target_exit_price: float = Field(..., gt=0, description="Target exit price per share in SAR")
    vesting_years: int = Field(default=4, ge=1, le=10, description="Total vesting period in years")
    cliff_years: int = Field(default=1, ge=0, le=5, description="Cliff period in years")
    exercise_strategy: ExerciseStrategy = Field(default=ExerciseStrategy.AT_EXIT)


class StartupOfferInput(BaseModel):
    """Input parameters for startup offer."""
    monthly_salary: float = Field(..., gt=0, description="Startup monthly salary in SAR")
    equity_type: EquityType = Field(..., description="Type of equity compensation")
    rsu: Optional[RSUInput] = Field(default=None, description="RSU parameters if applicable")
    stock_options: Optional[StockOptionsInput] = Field(default=None, description="Stock options parameters if applicable")


class MonteCarloInput(BaseModel):
    """Input parameters for Monte Carlo simulation."""
    enabled: bool = Field(default=False)
    num_simulations: int = Field(default=10000, ge=100, le=100000)
    failure_probability: float = Field(default=0.7, ge=0, le=1, description="Probability of startup failure")
    valuation_volatility: float = Field(default=0.3, ge=0, le=1, description="Valuation uncertainty")
    roi_volatility: float = Field(default=0.1, ge=0, le=1, description="ROI uncertainty")
    salary_growth_volatility: float = Field(default=0.05, ge=0, le=1, description="Salary growth uncertainty")
    simulate_exit_year: bool = Field(default=False, description="Whether exit year is uncertain")


class CalculationRequest(BaseModel):
    """Request for worth-it calculation."""
    exit_year: int = Field(..., ge=1, le=20, description="Years until exit/evaluation")
    discount_rate: float = Field(default=10.0, ge=0, le=100, description="Discount rate for NPV (%)")
    current_job: CurrentJobInput
    startup_offer: StartupOfferInput
    monte_carlo: Optional[MonteCarloInput] = Field(default=None)


class FinancialMetrics(BaseModel):
    """Core financial metrics from calculation."""
    equity_payout: float = Field(..., description="Total equity payout value in SAR")
    opportunity_cost: float = Field(..., description="Opportunity cost in SAR")
    net_outcome: float = Field(..., description="Net outcome (payout - opportunity cost) in SAR")
    npv: Optional[float] = Field(default=None, description="Net Present Value in SAR")
    irr: Optional[float] = Field(default=None, description="Internal Rate of Return (%)")
    vested_percentage: float = Field(..., ge=0, le=100, description="Percentage of equity vested")
    diluted_equity_percentage: Optional[float] = Field(default=None, description="Post-dilution equity %")


class BreakevenAnalysis(BaseModel):
    """Breakeven analysis results."""
    breakeven_valuation: Optional[float] = Field(default=None, description="Required exit valuation to break even")
    breakeven_price: Optional[float] = Field(default=None, description="Required exit price per share to break even")


class YearlyBreakdown(BaseModel):
    """Year-by-year financial breakdown."""
    year: int
    current_job_salary: float
    startup_salary: float
    salary_difference: float
    cumulative_investment: float
    vested_equity_percentage: float


class SimulationResult(BaseModel):
    """Single simulation result."""
    net_outcome: float
    equity_payout: float
    opportunity_cost: float
    exit_valuation: Optional[float] = Field(default=None)
    exit_price: Optional[float] = Field(default=None)


class MonteCarloResults(BaseModel):
    """Monte Carlo simulation results."""
    simulations: List[SimulationResult]
    mean_outcome: float
    median_outcome: float
    std_outcome: float
    probability_positive: float
    percentile_5: float
    percentile_25: float
    percentile_75: float
    percentile_95: float


class SensitivityAnalysis(BaseModel):
    """Sensitivity analysis for a parameter."""
    parameter_name: str
    values: List[float]
    outcomes: List[float]


class CalculationResponse(BaseModel):
    """Response from worth-it calculation."""
    metrics: FinancialMetrics
    breakeven: BreakevenAnalysis
    yearly_breakdown: List[YearlyBreakdown]
    monte_carlo: Optional[MonteCarloResults] = Field(default=None)
    sensitivity: Optional[List[SensitivityAnalysis]] = Field(default=None)
