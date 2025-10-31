"""API routes for worth-it calculations."""

import sys
from pathlib import Path
from enum import Enum

# Add parent directory to path to import calculations module
sys.path.append(str(Path(__file__).parent.parent.parent))

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
import numpy as np
import pandas as pd

from backend.models import (
    CalculationRequest,
    CalculationResponse,
    FinancialMetrics,
    BreakevenAnalysis,
    YearlyBreakdown,
    MonteCarloResults,
    SimulationResult,
    SensitivityAnalysis,
    EquityType as APIEquityType,
)
from calculations import (
    create_monthly_data_grid,
    calculate_annual_opportunity_cost,
    calculate_startup_scenario,
    calculate_npv,
    calculate_irr,
)


# Match the enum from app.py for calculations module
class EquityTypeCalc(str, Enum):
    """Enum for equity types as expected by calculations module."""
    RSU = "Equity (RSUs)"
    STOCK_OPTIONS = "Stock Options"


router = APIRouter()


def create_yearly_breakdown(
    monthly_df: pd.DataFrame,
    exit_year: int,
    results_df: pd.DataFrame,
) -> List[YearlyBreakdown]:
    """Create year-by-year breakdown from monthly data."""
    breakdown = []

    for year in range(1, exit_year + 1):
        # Get data at end of this year
        year_end_month = year * 12 - 1
        if year_end_month >= len(results_df):
            year_end_month = len(results_df) - 1

        year_data = results_df.iloc[year_end_month]

        breakdown.append(
            YearlyBreakdown(
                year=year,
                current_job_salary=float(year_data.get('CurrentJobSalary', 0)) * 12,  # Convert to annual
                startup_salary=float(year_data.get('StartupSalary', 0)) * 12,  # Convert to annual
                salary_difference=(float(year_data.get('StartupSalary', 0)) - float(year_data.get('CurrentJobSalary', 0))) * 12,
                cumulative_investment=float(year_data.get('CumulativeOpportunityCost', 0)),
                vested_equity_percentage=float(year_data.get('VestedPercentage', 0)) * 100,
            )
        )

    return breakdown


@router.post("/calculate", response_model=CalculationResponse)
async def calculate_worth_it(request: CalculationRequest) -> CalculationResponse:
    """
    Calculate the financial worth of a startup offer compared to current job.
    """
    try:
        # Extract parameters
        exit_year = request.exit_year
        discount_rate = request.discount_rate / 100
        current_job = request.current_job
        startup_offer = request.startup_offer

        # Create monthly data grid
        monthly_df = create_monthly_data_grid(
            exit_year=exit_year,
            current_job_monthly_salary=current_job.monthly_salary,
            startup_monthly_salary=startup_offer.monthly_salary,
            current_job_salary_growth_rate=current_job.annual_growth_rate / 100,
        )

        # Prepare parameters based on equity type
        options_params = None
        rsu_params = None

        if startup_offer.equity_type == APIEquityType.RSU:
            if not startup_offer.rsu:
                raise HTTPException(status_code=400, detail="RSU parameters required")

            rsu = startup_offer.rsu
            rsu_params = {
                'equity_pct': rsu.equity_percentage / 100,
                'target_exit_valuation': rsu.target_exit_valuation,
            }

            # Add dilution if applicable
            if rsu.simulate_dilution and rsu.dilution:
                dilution_rounds = []
                for round_name in ['round_a', 'round_b', 'round_c', 'round_d']:
                    round_data = getattr(rsu.dilution, round_name)
                    if round_data.enabled and round_data.valuation and round_data.new_investment:
                        dilution_rounds.append({
                            'post_money_valuation': round_data.valuation,
                            'new_money_in': round_data.new_investment
                        })
                if dilution_rounds:
                    rsu_params['simulate_dilution'] = True
                    rsu_params['dilution_rounds'] = dilution_rounds
                else:
                    rsu_params['simulate_dilution'] = False
            else:
                rsu_params['simulate_dilution'] = False

            vesting_years = rsu.vesting_years
            cliff_years = rsu.cliff_years
            equity_type_calc = EquityTypeCalc.RSU

        else:  # Stock Options
            if not startup_offer.stock_options:
                raise HTTPException(status_code=400, detail="Stock options parameters required")

            opts = startup_offer.stock_options
            options_params = {
                'num_options_granted': opts.num_options,
                'strike_price_per_share': opts.strike_price,
                'target_exit_price_per_share': opts.target_exit_price,
                'exercise_strategy': opts.exercise_strategy,
            }

            vesting_years = opts.vesting_years
            cliff_years = opts.cliff_years
            equity_type_calc = EquityTypeCalc.STOCK_OPTIONS

        # Calculate opportunity cost
        opportunity_cost_df = calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=current_job.annual_roi / 100 if current_job.invest_surplus else 0,
            investment_frequency=current_job.investment_frequency,
            options_params=options_params,
        )

        # Prepare startup parameters
        startup_params = {
            "equity_type": equity_type_calc,
            "total_vesting_years": vesting_years,
            "cliff_years": cliff_years,
            "rsu_params": rsu_params,
            "options_params": options_params,
            "exit_year": exit_year,
        }

        # Calculate startup scenario
        results = calculate_startup_scenario(opportunity_cost_df, startup_params)
        results_df = results["results_df"]
        final_payout_value = results["final_payout_value"]
        final_opportunity_cost = results["final_opportunity_cost"]
        total_dilution = results.get("total_dilution")
        diluted_equity_pct = results.get("diluted_equity_pct")

        net_outcome = final_payout_value - final_opportunity_cost

        # Calculate vested percentage
        if not results_df.empty:
            vested_percentage = float(results_df.iloc[-1].get('VestedPercentage', 0))
        else:
            vested_percentage = 0.0

        # Calculate NPV and IRR
        monthly_surplus = monthly_df["MonthlySurplus"].values
        irr = calculate_irr(monthly_surplus, final_payout_value)
        npv = calculate_npv(monthly_surplus, current_job.annual_roi / 100 if current_job.invest_surplus else discount_rate, final_payout_value)

        # Create financial metrics
        metrics = FinancialMetrics(
            equity_payout=final_payout_value,
            opportunity_cost=final_opportunity_cost,
            net_outcome=net_outcome,
            npv=npv,
            irr=irr * 100 if irr is not None else None,  # Convert to percentage
            vested_percentage=vested_percentage * 100,  # Convert to percentage
            diluted_equity_percentage=diluted_equity_pct * 100 if diluted_equity_pct is not None else None,
        )

        # Calculate breakeven
        breakeven_valuation = None
        breakeven_price = None

        if final_opportunity_cost > 0 and vested_percentage > 0:
            if startup_offer.equity_type == APIEquityType.RSU and rsu_params:
                equity_pct = rsu_params['equity_pct']
                if diluted_equity_pct:
                    equity_pct = diluted_equity_pct
                if equity_pct > 0:
                    breakeven_valuation = final_opportunity_cost / equity_pct

            elif startup_offer.equity_type == APIEquityType.STOCK_OPTIONS and options_params:
                num_options = options_params['num_options_granted']
                strike_price = options_params['strike_price_per_share']
                if num_options > 0:
                    vested_options = num_options * vested_percentage
                    breakeven_price = (final_opportunity_cost / vested_options) + strike_price

        breakeven = BreakevenAnalysis(
            breakeven_valuation=breakeven_valuation,
            breakeven_price=breakeven_price,
        )

        # Create yearly breakdown
        yearly_breakdown = create_yearly_breakdown(
            monthly_df=monthly_df,
            exit_year=exit_year,
            results_df=results_df,
        )

        return CalculationResponse(
            metrics=metrics,
            breakeven=breakeven,
            yearly_breakdown=yearly_breakdown,
            monte_carlo=None,  # TODO: Implement Monte Carlo
            sensitivity=None,  # TODO: Implement sensitivity analysis
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "worth-it-api"}
