"""FastAPI application that powers the Worth It financial comparison tool.

This module exposes a modern REST API used by the new dashboard UI.
It replaces the previous Streamlit experience with a custom interface while
reusing the underlying financial calculations.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
from typing import Literal

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

import calculations


class EquityType(str, Enum):
    """Enum for different types of equity packages."""

    RSU = "Equity (RSUs)"
    STOCK_OPTIONS = "Stock Options"


@dataclass
class CalculationResult:
    """Structured response returned to the front-end."""

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

    def json_ready(self) -> dict[str, object]:
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
            }
        )
        return payload


class CalculationRequest(BaseModel):
    """Payload accepted by the calculation endpoint."""

    current_salary: float = Field(gt=0, description="Current monthly salary")
    startup_salary: float = Field(gt=0, description="Startup monthly salary offer")
    salary_growth_rate: float = Field(ge=0, description="Expected annual salary growth (decimal)")
    exit_year: int = Field(ge=1, le=30, description="Exit horizon in years")
    annual_roi: float = Field(ge=0, description="Expected annual ROI on invested surplus (decimal)")
    investment_frequency: Literal["Monthly", "Annually"] = Field(
        description="How often the surplus is invested"
    )
    equity_pct: float = Field(ge=0, description="Equity grant as a decimal fraction")
    exit_valuation: float = Field(ge=0, description="Projected company valuation at exit in SAR")
    total_vesting_years: int = Field(ge=1, le=10, description="Total vesting schedule length")
    cliff_years: int = Field(ge=0, le=10, description="Cliff period in years")
    simulate_dilution: bool = Field(False, description="Whether to apply dilution")
    dilution_pct: float | None = Field(
        default=None,
        ge=0,
        le=1,
        description="Total dilution expressed as a decimal fraction (optional)",
    )


BASE_DIR = Path(__file__).parent
app = FastAPI(title="Worth It Financial Simulator", version="2.0.0")

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    """Serve the dashboard template."""

    return templates.TemplateResponse("index.html", {"request": request})


def _run_calculations(payload: CalculationRequest) -> CalculationResult:
    """Execute the financial calculations for the provided payload."""

    monthly_df = calculations.create_monthly_data_grid(
        exit_year=payload.exit_year,
        current_job_monthly_salary=payload.current_salary,
        startup_monthly_salary=payload.startup_salary,
        current_job_salary_growth_rate=payload.salary_growth_rate,
    )

    opportunity_cost_df = calculations.calculate_annual_opportunity_cost(
        monthly_df=monthly_df,
        annual_roi=payload.annual_roi,
        investment_frequency=payload.investment_frequency,
    )

    if opportunity_cost_df.empty:
        raise HTTPException(status_code=400, detail="Not enough data to run calculations.")

    startup_params = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": payload.total_vesting_years,
        "cliff_years": payload.cliff_years,
        "exit_year": payload.exit_year,
        "rsu_params": {
            "equity_pct": payload.equity_pct,
            "target_exit_valuation": payload.exit_valuation,
            "simulate_dilution": payload.simulate_dilution,
            "dilution_rounds": [
                {"year": payload.exit_year, "dilution": payload.dilution_pct or 0.0}
            ]
            if payload.simulate_dilution and payload.dilution_pct
            else [],
        },
        "options_params": {},
    }

    if payload.simulate_dilution and payload.dilution_pct is not None:
        startup_params["simulated_dilution"] = payload.dilution_pct

    results = calculations.calculate_startup_scenario(opportunity_cost_df, startup_params)
    results_df = results["results_df"].copy()

    years = results_df["Year"].tolist()
    current_path = results_df["Opportunity Cost (Invested Surplus)"].tolist()

    equity_percentages = (results_df["Vested Equity (%)"] / 100).to_numpy()
    if "CumulativeDilution" in results_df:
        dilution_factors = results_df["CumulativeDilution"].to_numpy()
    else:
        dilution_factors = np.ones_like(equity_percentages)

    startup_path = (equity_percentages * payload.exit_valuation * dilution_factors).tolist()

    final_payout_value = float(results.get("final_payout_value", 0.0))
    final_opportunity_cost = float(results.get("final_opportunity_cost", 0.0))
    net_outcome = final_payout_value - final_opportunity_cost
    irr_value = calculations.calculate_irr(monthly_df["MonthlySurplus"], final_payout_value)
    npv_value = calculations.calculate_npv(
        monthly_df["MonthlySurplus"], payload.annual_roi, final_payout_value
    )

    total_dilution = float(results.get("total_dilution", 0.0))
    diluted_equity_pct = float(results.get("diluted_equity_pct", payload.equity_pct))

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
    )


@app.post("/calculate")
async def calculate(request: CalculationRequest) -> dict[str, object]:
    """Return calculation results for the provided payload."""

    result = _run_calculations(request)
    return result.json_ready()


__all__ = ["app", "EquityType"]
