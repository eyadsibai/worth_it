"""
Example demonstrating how to use the calculations backend independently.

This example shows how the backend can be used with any frontend framework
(Flask, FastAPI, Django, CLI, etc.) without requiring a web frontend.

Usage:
    cd backend
    uv run python ../scripts/example_backend_usage.py
"""

import sys
from pathlib import Path

# Add backend/src to Python path for imports
backend_src = Path(__file__).parent.parent / "backend" / "src"
sys.path.insert(0, str(backend_src))

from worth_it.calculations import (
    create_monthly_data_grid,
    calculate_annual_opportunity_cost,
    calculate_startup_scenario,
    calculate_irr,
    calculate_npv,
)
from worth_it.models import EquityType


def analyze_job_offer():
    """Example function showing independent backend usage."""

    # Configuration (these would come from any frontend - web form, CLI, API, etc.)
    exit_year = 5
    current_monthly_salary = 30000
    startup_monthly_salary = 20000
    salary_growth_rate = 0.03
    annual_roi = 0.054

    # Step 1: Create monthly data grid
    monthly_df = create_monthly_data_grid(
        exit_year=exit_year,
        current_job_monthly_salary=current_monthly_salary,
        startup_monthly_salary=startup_monthly_salary,
        current_job_salary_growth_rate=salary_growth_rate,
    )

    # Step 2: Calculate opportunity cost
    opportunity_cost_df = calculate_annual_opportunity_cost(
        monthly_df=monthly_df,
        annual_roi=annual_roi,
        investment_frequency="Monthly",
    )

    # Step 3: Setup startup parameters
    startup_params = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": exit_year,
        "rsu_params": {
            "equity_pct": 0.05,  # 5% equity
            "target_exit_valuation": 25_000_000,  # 25M SAR
            "simulate_dilution": False,
        },
        "options_params": {},
    }

    # Step 4: Calculate startup scenario
    results = calculate_startup_scenario(opportunity_cost_df, startup_params)

    # Step 5: Calculate financial metrics
    irr_value = calculate_irr(monthly_df["MonthlySurplus"], results["final_payout_value"])
    npv_value = calculate_npv(
        monthly_df["MonthlySurplus"], annual_roi, results["final_payout_value"]
    )

    # Results can now be used in any format - JSON API, CLI output, web page, etc.
    return {
        "final_payout": results["final_payout_value"],
        "opportunity_cost": results["final_opportunity_cost"],
        "net_outcome": results["final_payout_value"] - results["final_opportunity_cost"],
        "irr": irr_value,
        "npv": npv_value,
    }


if __name__ == "__main__":
    # Example: Use backend from command line
    results = analyze_job_offer()

    print("=" * 60)
    print("JOB OFFER ANALYSIS (using backend independently)")
    print("=" * 60)
    print(f"Final Equity Payout:     {results['final_payout']:>15,.0f} SAR")
    print(f"Opportunity Cost:        {results['opportunity_cost']:>15,.0f} SAR")
    print(f"Net Outcome:             {results['net_outcome']:>15,.0f} SAR")
    print(f"IRR:                     {results['irr']:>15.2f}%")
    print(f"NPV:                     {results['npv']:>15,.0f} SAR")
    print("=" * 60)
