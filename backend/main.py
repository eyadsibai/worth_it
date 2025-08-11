import calculations  # Your existing calculations module
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# This allows your React app (running on http://localhost:3000) to make requests to this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request body validation
class RSUParams(BaseModel):
    rsu_grant_value: float
    rsu_strike_price: float

class OptionsParams(BaseModel):
    option_grant_shares: int
    option_strike_price: float
    exit_share_price: float

class CalculationInput(BaseModel):
    simulation_end_year: int
    current_job_monthly_salary: float
    startup_monthly_salary: float
    current_job_salary_growth_rate: float
    annual_roi: float
    investment_frequency: str
    equity_type: str # Changed to string to be compatible with JSON
    total_vesting_years: int
    cliff_years: int
    rsu_params: RSUParams
    options_params: OptionsParams


@app.post("/calculate/")
async def calculate(input_data: CalculationInput):
    """
    This endpoint receives financial data, performs a series of calculations,
    and returns the financial projection results.
    """
    try:
        # 1. Create the monthly data grid
        monthly_df = calculations.create_monthly_data_grid(
            simulation_end_year=input_data.simulation_end_year,
            current_job_monthly_salary=input_data.current_job_monthly_salary,
            startup_monthly_salary=input_data.startup_monthly_salary,
            current_job_salary_growth_rate=input_data.current_job_salary_growth_rate,
        )

        # 2. Calculate opportunity cost
        opportunity_cost_df = calculations.calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=input_data.annual_roi,
            investment_frequency=input_data.investment_frequency,
        )

        # 3. Prepare startup parameters
        startup_params = {
            "equity_type": calculations.EquityType(input_data.equity_type),
            "total_vesting_years": input_data.total_vesting_years,
            "cliff_years": input_data.cliff_years,
            "rsu_params": input_data.rsu_params.dict(),
            "options_params": input_data.options_params.dict(),
            "simulation_end_year": input_data.simulation_end_year,
        }

        # 4. Calculate the startup scenario
        results = calculations.calculate_startup_scenario(opportunity_cost_df, startup_params)

        # 5. Convert DataFrame to a JSON-serializable format (dictionary)
        results['results_df'] = results['results_df'].to_dict(orient='records')

        return results
    except Exception as e:
        # If any error occurs, return a clear error message to the frontend
        raise HTTPException(
            status_code=400,
            detail=f"An error occurred during calculation: {e}"
        )