"""
FastAPI backend for the Worth It application.

This module provides REST API endpoints for all financial calculation functions,
enabling the Streamlit frontend to communicate with the backend via HTTP instead
of direct function calls.
"""

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import calculations
from models import (
    DilutionFromValuationRequest,
    DilutionFromValuationResponse,
    HealthCheckResponse,
    IRRRequest,
    IRRResponse,
    MonteCarloRequest,
    MonteCarloResponse,
    MonthlyDataGridRequest,
    MonthlyDataGridResponse,
    NPVRequest,
    NPVResponse,
    OpportunityCostRequest,
    OpportunityCostResponse,
    SensitivityAnalysisRequest,
    SensitivityAnalysisResponse,
    StartupScenarioRequest,
    StartupScenarioResponse,
)

# Create FastAPI app
app = FastAPI(
    title="Worth It API",
    description="Backend API for startup job offer financial analysis",
    version="1.0.0",
)

# Add CORS middleware to allow Streamlit to communicate with the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint to verify API is running."""
    return HealthCheckResponse(status="healthy", version="1.0.0")


@app.post("/api/monthly-data-grid", response_model=MonthlyDataGridResponse)
async def create_monthly_data_grid(request: MonthlyDataGridRequest):
    """
    Create a DataFrame with monthly financial projections.

    This endpoint creates a monthly data grid showing salary differences,
    surplus calculations, and cash flows over the analysis period.
    """
    try:
        df = calculations.create_monthly_data_grid(
            exit_year=request.exit_year,
            current_job_monthly_salary=request.current_job_monthly_salary,
            startup_monthly_salary=request.startup_monthly_salary,
            current_job_salary_growth_rate=request.current_job_salary_growth_rate,
            dilution_rounds=request.dilution_rounds,
        )
        return MonthlyDataGridResponse(data=df.to_dict(orient="records"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/opportunity-cost", response_model=OpportunityCostResponse)
async def calculate_opportunity_cost(request: OpportunityCostRequest):
    """
    Calculate the opportunity cost of foregone salary.

    This endpoint calculates the future value of the salary difference
    between current job and startup job, accounting for investment returns.
    """
    try:
        monthly_df = pd.DataFrame(request.monthly_data)
        
        # Convert equity_type string to EquityType enum if needed
        startup_params = request.startup_params.copy() if request.startup_params else None
        if startup_params and "equity_type" in startup_params:
            if isinstance(startup_params["equity_type"], str):
                startup_params["equity_type"] = calculations.EquityType(startup_params["equity_type"])
        
        df = calculations.calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=request.annual_roi,
            investment_frequency=request.investment_frequency,
            options_params=request.options_params,
            startup_params=startup_params,
        )
        return OpportunityCostResponse(data=df.to_dict(orient="records"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/startup-scenario", response_model=StartupScenarioResponse)
async def calculate_startup_scenario(request: StartupScenarioRequest):
    """
    Calculate financial outcomes for a startup equity package.

    This endpoint evaluates both RSU and Stock Option scenarios,
    including dilution effects and breakeven analysis.
    """
    try:
        opportunity_cost_df = pd.DataFrame(request.opportunity_cost_data)
        
        # Convert equity_type string to EquityType enum if needed
        startup_params = request.startup_params
        if "equity_type" in startup_params:
            if isinstance(startup_params["equity_type"], str):
                startup_params["equity_type"] = calculations.EquityType(startup_params["equity_type"])
        
        results = calculations.calculate_startup_scenario(
            opportunity_cost_df, startup_params
        )

        # Convert DataFrame to dict
        results_df_dict = results["results_df"].to_dict(orient="records")

        return StartupScenarioResponse(
            results_df=results_df_dict,
            final_payout_value=results["final_payout_value"],
            final_opportunity_cost=results["final_opportunity_cost"],
            payout_label=results["payout_label"],
            breakeven_label=results["breakeven_label"],
            total_dilution=results.get("total_dilution"),
            diluted_equity_pct=results.get("diluted_equity_pct"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/irr", response_model=IRRResponse)
async def calculate_irr(request: IRRRequest):
    """
    Calculate the Internal Rate of Return (IRR).

    This endpoint computes the annualized IRR based on monthly cash flows
    and the final equity payout.
    """
    try:
        monthly_surpluses = pd.Series(request.monthly_surpluses)
        irr = calculations.calculate_irr(monthly_surpluses, request.final_payout_value)
        return IRRResponse(irr=irr if pd.notna(irr) else None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/npv", response_model=NPVResponse)
async def calculate_npv(request: NPVRequest):
    """
    Calculate the Net Present Value (NPV).

    This endpoint computes the NPV of the investment decision,
    accounting for the time value of money.
    """
    try:
        monthly_surpluses = pd.Series(request.monthly_surpluses)
        npv = calculations.calculate_npv(
            monthly_surpluses, request.annual_roi, request.final_payout_value
        )
        return NPVResponse(npv=npv if pd.notna(npv) else None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/monte-carlo", response_model=MonteCarloResponse)
async def run_monte_carlo_simulation(request: MonteCarloRequest):
    """
    Run Monte Carlo simulation for probabilistic analysis.

    This endpoint performs thousands of simulations with varying parameters
    to understand the range of potential outcomes.
    """
    try:
        # Convert equity_type string to EquityType enum if needed
        base_params = request.base_params
        if "startup_params" in base_params and "equity_type" in base_params["startup_params"]:
            if isinstance(base_params["startup_params"]["equity_type"], str):
                base_params["startup_params"]["equity_type"] = calculations.EquityType(
                    base_params["startup_params"]["equity_type"]
                )
        
        results = calculations.run_monte_carlo_simulation(
            num_simulations=request.num_simulations,
            base_params=base_params,
            sim_param_configs=request.sim_param_configs,
        )
        return MonteCarloResponse(
            net_outcomes=results["net_outcomes"].tolist(),
            simulated_valuations=results["simulated_valuations"].tolist(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sensitivity-analysis", response_model=SensitivityAnalysisResponse)
async def run_sensitivity_analysis(request: SensitivityAnalysisRequest):
    """
    Run sensitivity analysis to identify key variables.

    This endpoint analyzes how each variable impacts the final outcome
    to identify the most influential factors.
    """
    try:
        # Convert equity_type string to EquityType enum if needed
        base_params = request.base_params
        if "startup_params" in base_params and "equity_type" in base_params["startup_params"]:
            if isinstance(base_params["startup_params"]["equity_type"], str):
                base_params["startup_params"]["equity_type"] = calculations.EquityType(
                    base_params["startup_params"]["equity_type"]
                )
        
        df = calculations.run_sensitivity_analysis(
            base_params=base_params, sim_param_configs=request.sim_param_configs
        )
        return SensitivityAnalysisResponse(data=df.to_dict(orient="records"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/dilution", response_model=DilutionFromValuationResponse)
async def calculate_dilution_from_valuation(request: DilutionFromValuationRequest):
    """
    Calculate dilution percentage from fundraising round.

    This endpoint computes how much ownership dilution occurs
    based on pre-money valuation and amount raised.
    """
    try:
        dilution = calculations.calculate_dilution_from_valuation(
            request.pre_money_valuation, request.amount_raised
        )
        return DilutionFromValuationResponse(dilution=dilution)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
