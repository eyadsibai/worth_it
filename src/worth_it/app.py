"""FastAPI application exposing the Worth It financial simulator."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from importlib import resources
from pathlib import Path
from typing import Any, Dict, Literal

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field, model_validator

from . import calculations


def _round_numeric(value: Any, decimals: int = 2) -> Any:
    """Round numeric inputs while leaving non-numeric values untouched."""

    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return value

    return float(np.round(numeric, decimals))


class EquityType(str, Enum):
    """Enum describing the available equity packages."""

    RSU = "Equity (RSUs)"
    STOCK_OPTIONS = "Stock Options"


class OptionsExerciseStrategy(str, Enum):
    """Exercise strategies available for stock options."""

    AT_EXIT = "Exercise at Exit"
    AFTER_VESTING = "Exercise After Vesting"


class DilutionRound(BaseModel):
    """Represents a dilution event from a fundraising round."""

    year: int = Field(ge=1, le=40)
    dilution: float = Field(ge=0.0, le=1.0)


class RSUParams(BaseModel):
    """Parameters specific to RSU based offers."""

    equity_pct: float = Field(..., ge=0.0)
    target_exit_valuation: float = Field(..., ge=0.0)
    simulate_dilution: bool = False
    dilution_rounds: list[DilutionRound] = Field(default_factory=list)

    @model_validator(mode="after")
    def ensure_flag_matches_rounds(self) -> "RSUParams":
        if self.dilution_rounds and not self.simulate_dilution:
            raise ValueError(
                "simulate_dilution must be true when dilution rounds are provided"
            )
        return self


class OptionsParams(BaseModel):
    """Parameters specific to stock option offers."""

    num_options: int = Field(..., ge=0)
    strike_price: float = Field(..., ge=0.0)
    target_exit_price_per_share: float = Field(..., ge=0.0)
    exercise_strategy: OptionsExerciseStrategy = OptionsExerciseStrategy.AT_EXIT
    exercise_year: int | None = Field(default=None, ge=1, le=40)

    @model_validator(mode="after")
    def validate_strategy(self) -> "OptionsParams":
        if (
            self.exercise_strategy == OptionsExerciseStrategy.AFTER_VESTING
            and self.exercise_year is None
        ):
            raise ValueError("exercise_year is required when exercising after vesting")
        return self


class CalculationRequest(BaseModel):
    """Payload accepted by the calculation endpoint."""

    current_salary: float = Field(..., gt=0.0, description="Current monthly salary")
    startup_salary: float = Field(..., gt=0.0, description="Startup monthly salary offer")
    salary_growth_rate: float = Field(..., ge=0.0, description="Expected annual salary growth (decimal)")
    exit_year: int = Field(..., ge=1, le=40, description="Exit horizon in years")
    annual_roi: float = Field(..., ge=0.0, description="Expected annual ROI on invested surplus (decimal)")
    investment_frequency: Literal["Monthly", "Annually"]
    equity_type: EquityType
    total_vesting_years: int = Field(..., ge=1, le=15)
    cliff_years: int = Field(..., ge=0, le=15)
    rsu_params: RSUParams | None = None
    options_params: OptionsParams | None = None
    failure_probability: float = Field(0.0, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_configuration(self) -> "CalculationRequest":
        if self.equity_type == EquityType.RSU:
            if self.rsu_params is None:
                raise ValueError("rsu_params must be provided for RSU equity type")
        elif self.equity_type == EquityType.STOCK_OPTIONS:
            if self.options_params is None:
                raise ValueError("options_params must be provided for Stock Options equity type")
            if (
                self.options_params.exercise_strategy
                == OptionsExerciseStrategy.AFTER_VESTING
                and self.options_params.exercise_year
                and self.options_params.exercise_year > self.exit_year
            ):
                raise ValueError("exercise_year cannot exceed the exit year")

        if self.cliff_years > self.total_vesting_years:
            raise ValueError("cliff_years cannot exceed total_vesting_years")

        return self


class PertConfig(BaseModel):
    """Parameters for a PERT distribution."""

    min_val: float
    max_val: float
    mode: float

    @model_validator(mode="after")
    def validate_bounds(self) -> "PertConfig":
        if self.max_val < self.min_val:
            raise ValueError("max_val must be greater than or equal to min_val")
        if not (self.min_val <= self.mode <= self.max_val):
            raise ValueError("mode must be between min_val and max_val")
        return self


class NormalConfig(BaseModel):
    """Parameters for a normal distribution."""

    mean: float
    std_dev: float = Field(..., ge=0.0)


class SimulationParameters(BaseModel):
    """Variables to simulate in the Monte Carlo engine."""

    roi: NormalConfig | None = None
    valuation: PertConfig | None = None
    yearly_valuation: dict[str, PertConfig] | None = None
    salary_growth: PertConfig | None = None
    exit_year: PertConfig | None = None
    dilution: PertConfig | None = None

    @model_validator(mode="before")
    @classmethod
    def coerce_year_keys(
        cls, values: Dict[str, Any]
    ) -> Dict[str, Any]:
        if values is None:
            return values
        yearly = values.get("yearly_valuation")
        if yearly is not None:
            values = values.copy()
            values["yearly_valuation"] = {str(key): val for key, val in yearly.items()}
        return values


class SimulationRequest(BaseModel):
    """Payload accepted by the Monte Carlo endpoint."""

    inputs: CalculationRequest
    num_simulations: int = Field(..., ge=100, le=20000)
    simulation_params: SimulationParameters


@dataclass
class CalculationResult:
    """Structured response returned to the front-end for deterministic runs."""

    years: list[int]
    current_path: list[float]
    startup_path: list[float]
    projected_net_worth: float
    opportunity_cost: float
    net_outcome: float
    npv: float
    irr: float | None
    total_dilution: float
    diluted_equity_pct: float
    payout_label: str
    breakeven_label: str
    principal_label: str
    salary_surplus_total: float
    is_clear_win: bool
    yearly_breakdown: list[dict[str, float]]

    def json_ready(self) -> dict[str, Any]:
        """Return a dictionary with clean JSON serialisable values."""

        def _round(values: list[float]) -> list[float]:
            return [float(np.round(v, 2)) for v in values]

        irr_value = None if self.irr is None or np.isnan(self.irr) else float(np.round(self.irr, 2))

        payload = asdict(self)
        payload.update(
            {
                "current_path": _round(self.current_path),
                "startup_path": _round(self.startup_path),
                "projected_net_worth": float(np.round(self.projected_net_worth, 2)),
                "opportunity_cost": float(np.round(self.opportunity_cost, 2)),
                "net_outcome": float(np.round(self.net_outcome, 2)),
                "npv": float(np.round(self.npv, 2)),
                "irr": irr_value,
                "total_dilution": float(np.round(self.total_dilution, 4)),
                "diluted_equity_pct": float(np.round(self.diluted_equity_pct, 6)),
                "salary_surplus_total": float(np.round(self.salary_surplus_total, 2)),
                "yearly_breakdown": [
                    {
                        **row,
                        **{
                            key: _round_numeric(value, 2)
                            for key, value in row.items()
                            if key != "year"
                        },
                    }
                    for row in self.yearly_breakdown
                ],
            }
        )
        return payload


@dataclass
class SimulationSummary:
    """Response returned for Monte Carlo runs."""

    net_outcomes: list[float]
    probability_positive: float
    mean_outcome: float
    median_outcome: float
    std_dev: float
    simulated_valuations: list[float]
    sensitivity: list[dict[str, float]]
    stats: dict[str, float]

    def json_ready(self) -> dict[str, Any]:
        return {
            "net_outcomes": [float(np.round(v, 2)) for v in self.net_outcomes],
            "probability_positive": float(np.round(self.probability_positive, 4)),
            "mean_outcome": float(np.round(self.mean_outcome, 2)),
            "median_outcome": float(np.round(self.median_outcome, 2)),
            "std_dev": float(np.round(self.std_dev, 2)),
            "simulated_valuations": [
                float(np.round(v, 2)) for v in self.simulated_valuations
            ],
            "sensitivity": [
                {key: _round_numeric(val, 2) for key, val in row.items()}
                for row in self.sensitivity
            ],
            "stats": {key: _round_numeric(val, 2) for key, val in self.stats.items()},
        }


BASE_DIR = Path(resources.files(__package__))
app = FastAPI(title="Worth It Financial Simulator", version="2.1.0")

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    """Serve the dashboard template."""

    return templates.TemplateResponse("index.html", {"request": request})


def _build_startup_params(payload: CalculationRequest) -> dict[str, Any]:
    """Convert the API payload into the structure expected by the calculations module."""

    startup_params: dict[str, Any] = {
        "equity_type": payload.equity_type,
        "total_vesting_years": payload.total_vesting_years,
        "cliff_years": payload.cliff_years,
        "exit_year": payload.exit_year,
    }

    if payload.equity_type == EquityType.RSU:
        rsu_params = payload.rsu_params
        assert rsu_params is not None
        startup_params["rsu_params"] = rsu_params.dict()
        startup_params["options_params"] = {}
        if rsu_params.simulate_dilution and rsu_params.dilution_rounds:
            startup_params["simulated_dilution"] = None
    else:
        options_params = payload.options_params
        assert options_params is not None
        startup_params["options_params"] = options_params.dict()
        startup_params["rsu_params"] = {}

    return startup_params


def _prepare_yearly_breakdown(
    results_df, principal_label: str
) -> list[dict[str, float]]:
    """Convert the yearly DataFrame into serialisable records."""

    breakdown: list[dict[str, float]] = []
    for _, row in results_df.iterrows():
        entry: dict[str, float] = {
            "year": int(row["Year"]),
            "principal": float(row[principal_label]),
            "opportunity_cost": float(row["Opportunity Cost (Invested Surplus)"]),
            "investment_returns": float(row.get("Investment Returns", 0.0)),
            "vested_equity_pct": float(row.get("Vested Equity (%)", 0.0)),
            "breakeven_value": float(row.get("Breakeven Value", 0.0)),
        }
        if "CumulativeDilution" in row:
            entry["cumulative_dilution"] = float(row["CumulativeDilution"])
        breakdown.append(entry)
    return breakdown


def _run_calculations(payload: CalculationRequest) -> CalculationResult:
    """Execute the financial calculations for the provided payload."""

    monthly_df = calculations.create_monthly_data_grid(
        exit_year=payload.exit_year,
        current_job_monthly_salary=payload.current_salary,
        startup_monthly_salary=payload.startup_salary,
        current_job_salary_growth_rate=payload.salary_growth_rate,
    )

    options_params_dict: Dict[str, Any] | None = (
        payload.options_params.dict() if payload.options_params else None
    )
    opportunity_cost_df = calculations.calculate_annual_opportunity_cost(
        monthly_df=monthly_df,
        annual_roi=payload.annual_roi,
        investment_frequency=payload.investment_frequency,
        options_params=options_params_dict,
    )

    if opportunity_cost_df.empty:
        raise HTTPException(status_code=400, detail="Not enough data to run calculations.")

    startup_params = _build_startup_params(payload)

    results = calculations.calculate_startup_scenario(opportunity_cost_df, startup_params)
    results_df = results["results_df"].copy()

    years = results_df["Year"].astype(int).tolist()
    principal_label = "Principal Forgone"
    if "Salary Gain" in results_df.columns:
        principal_label = "Salary Gain"

    current_path = results_df["Opportunity Cost (Invested Surplus)"].tolist()

    startup_path: list[float]
    if payload.equity_type == EquityType.RSU:
        exit_valuation = payload.rsu_params.target_exit_valuation  # type: ignore[union-attr]
        equity_percentages = (results_df["Vested Equity (%)"] / 100).to_numpy()
        dilution_factors = (
            results_df.get("CumulativeDilution", 1.0).to_numpy()
            if "CumulativeDilution" in results_df
            else np.ones_like(equity_percentages)
        )
        startup_path = (
            equity_percentages * exit_valuation * dilution_factors
        ).tolist()
    else:
        options_params = payload.options_params
        assert options_params is not None
        vested_options_series = (
            (results_df["Vested Equity (%)"] / 100) * options_params.num_options
        )
        profit_per_share = max(
            0.0,
            options_params.target_exit_price_per_share - options_params.strike_price,
        )
        startup_path = (vested_options_series * profit_per_share).tolist()

    final_payout_value = float(results.get("final_payout_value", 0.0))
    final_opportunity_cost = float(results.get("final_opportunity_cost", 0.0))
    net_outcome = final_payout_value - final_opportunity_cost
    irr_value = calculations.calculate_irr(
        monthly_df["MonthlySurplus"], final_payout_value
    )
    npv_value = calculations.calculate_npv(
        monthly_df["MonthlySurplus"], payload.annual_roi, final_payout_value
    )

    total_dilution = float(results.get("total_dilution", 0.0))
    diluted_equity_pct = float(
        results.get(
            "diluted_equity_pct",
            payload.rsu_params.equity_pct if payload.equity_type == EquityType.RSU else 0.0,  # type: ignore[union-attr]
        )
    )

    salary_surplus_total = float(monthly_df["MonthlySurplus"].sum())
    is_clear_win = salary_surplus_total < 0

    yearly_breakdown = _prepare_yearly_breakdown(results_df, principal_label)

    return CalculationResult(
        years=years,
        current_path=current_path,
        startup_path=startup_path,
        projected_net_worth=final_payout_value,
        opportunity_cost=final_opportunity_cost,
        net_outcome=net_outcome,
        npv=npv_value,
        irr=irr_value,
        total_dilution=total_dilution,
        diluted_equity_pct=diluted_equity_pct,
        payout_label=results.get("payout_label", "Equity Value"),
        breakeven_label=results.get("breakeven_label", "Breakeven Value"),
        principal_label=principal_label,
        salary_surplus_total=salary_surplus_total,
        is_clear_win=is_clear_win,
        yearly_breakdown=yearly_breakdown,
    )


def _build_simulation_config(params: SimulationParameters) -> dict[str, Any]:
    """Convert the Pydantic simulation parameters into dictionaries."""

    config: dict[str, Any] = {}
    if params.roi:
        config["roi"] = params.roi.dict()
    if params.valuation:
        config["valuation"] = params.valuation.dict()
    if params.yearly_valuation:
        config["yearly_valuation"] = {
            key: value.dict() for key, value in params.yearly_valuation.items()
        }
    if params.salary_growth:
        config["salary_growth"] = params.salary_growth.dict()
    if params.exit_year:
        config["exit_year"] = params.exit_year.dict()
    if params.dilution:
        config["dilution"] = params.dilution.dict()
    return config


def _run_simulation(request: SimulationRequest) -> SimulationSummary:
    """Execute the Monte Carlo simulation for the provided payload."""

    base_params = {
        "exit_year": request.inputs.exit_year,
        "current_job_monthly_salary": request.inputs.current_salary,
        "startup_monthly_salary": request.inputs.startup_salary,
        "current_job_salary_growth_rate": request.inputs.salary_growth_rate,
        "annual_roi": request.inputs.annual_roi,
        "investment_frequency": request.inputs.investment_frequency,
        "startup_params": _build_startup_params(request.inputs),
        "failure_probability": request.inputs.failure_probability,
    }

    sim_param_configs = _build_simulation_config(request.simulation_params)

    if not sim_param_configs:
        raise HTTPException(
            status_code=400,
            detail="No simulation parameters provided. Select at least one variable to simulate.",
        )

    sim_results = calculations.run_monte_carlo_simulation(
        num_simulations=request.num_simulations,
        base_params=base_params,
        sim_param_configs=sim_param_configs,
    )

    net_outcomes = sim_results["net_outcomes"]
    probability_positive = float((net_outcomes > 0).sum() / len(net_outcomes))
    mean_outcome = float(np.mean(net_outcomes))
    median_outcome = float(np.median(net_outcomes))
    std_dev = float(np.std(net_outcomes))

    stats = {
        "min": float(np.min(net_outcomes)),
        "p5": float(np.percentile(net_outcomes, 5)),
        "p25": float(np.percentile(net_outcomes, 25)),
        "p50": median_outcome,
        "p75": float(np.percentile(net_outcomes, 75)),
        "p95": float(np.percentile(net_outcomes, 95)),
        "max": float(np.max(net_outcomes)),
    }

    sensitivity: list[dict[str, float]] = []
    if len(sim_param_configs) >= 2:
        sensitivity_df = calculations.run_sensitivity_analysis(
            base_params=base_params, sim_param_configs=sim_param_configs
        )
        if not sensitivity_df.empty:
            sensitivity = sensitivity_df.to_dict(orient="records")

    simulated_valuations = sim_results.get("simulated_valuations", np.array([]))

    return SimulationSummary(
        net_outcomes=net_outcomes.tolist(),
        probability_positive=probability_positive,
        mean_outcome=mean_outcome,
        median_outcome=median_outcome,
        std_dev=std_dev,
        simulated_valuations=simulated_valuations.tolist(),
        sensitivity=sensitivity,
        stats=stats,
    )


@app.post("/calculate")
async def calculate(request: CalculationRequest) -> dict[str, Any]:
    """Return calculation results for the provided payload."""

    result = _run_calculations(request)
    return result.json_ready()


@app.post("/simulate")
async def simulate(request: SimulationRequest) -> dict[str, Any]:
    """Run the Monte Carlo simulation for the provided payload."""

    summary = _run_simulation(request)
    return summary.json_ready()


__all__ = [
    "app",
    "EquityType",
    "OptionsExerciseStrategy",
    "DilutionRound",
    "RSUParams",
    "OptionsParams",
    "CalculationRequest",
    "SimulationRequest",
]
