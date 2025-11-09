"""
Integration test to verify FastAPI backend and API client work together.

This script tests the full integration stack:
- FastAPI backend running on port 8000
- API client making HTTP requests
- All calculation endpoints working correctly

Run this after starting the backend with:
    uvicorn api:app --host 0.0.0.0 --port 8000
"""

import sys

import numpy as np

from api_client import api_client
from calculations import EquityType


def test_integration():
    """Run integration tests for the API."""
    print("=" * 70)
    print("INTEGRATION TEST: FastAPI Backend + API Client")
    print("=" * 70)
    print()

    try:
        # Test 1: Health Check
        print("Test 1: Health Check...")
        health = api_client.health_check()
        assert health["status"] == "healthy"
        print(f"  ✓ Backend is healthy (version {health['version']})")
        print()

        # Test 2: Monthly Data Grid
        print("Test 2: Monthly Data Grid...")
        monthly_df = api_client.create_monthly_data_grid(
            exit_year=5,
            current_job_monthly_salary=30000,
            startup_monthly_salary=20000,
            current_job_salary_growth_rate=0.03,
        )
        assert len(monthly_df) == 60  # 5 years * 12 months
        print(f"  ✓ Created monthly data: {len(monthly_df)} rows")
        print()

        # Test 3: Opportunity Cost
        print("Test 3: Opportunity Cost Calculation...")
        startup_params = {
            "equity_type": EquityType.RSU.value,
            "total_vesting_years": 4,
            "cliff_years": 1,
            "exit_year": 5,
            "rsu_params": {
                "equity_pct": 0.05,
                "target_exit_valuation": 25_000_000,
                "simulate_dilution": False,
            },
            "options_params": {},
        }

        opportunity_df = api_client.calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=0.054,
            investment_frequency="Monthly",
            startup_params=startup_params,
        )
        assert len(opportunity_df) == 5  # 5 years
        print(f"  ✓ Calculated opportunity cost: {len(opportunity_df)} years")
        print()

        # Test 4: Startup Scenario
        print("Test 4: Startup Scenario Calculation...")
        results = api_client.calculate_startup_scenario(opportunity_df, startup_params)
        assert "final_payout_value" in results
        assert "final_opportunity_cost" in results
        print(f"  ✓ Final payout: {results['final_payout_value']:,.0f} SAR")
        print(f"  ✓ Opportunity cost: {results['final_opportunity_cost']:,.0f} SAR")
        net_outcome = results["final_payout_value"] - results["final_opportunity_cost"]
        print(f"  ✓ Net outcome: {net_outcome:,.0f} SAR")
        print()

        # Test 5: IRR Calculation
        print("Test 5: IRR Calculation...")
        irr = api_client.calculate_irr(
            monthly_df["MonthlySurplus"], results["final_payout_value"]
        )
        assert irr is not None
        print(f"  ✓ IRR: {irr:.2f}%")
        print()

        # Test 6: NPV Calculation
        print("Test 6: NPV Calculation...")
        npv = api_client.calculate_npv(
            monthly_df["MonthlySurplus"], 0.054, results["final_payout_value"]
        )
        assert npv is not None
        print(f"  ✓ NPV: {npv:,.0f} SAR")
        print()

        # Test 7: Dilution Calculation
        print("Test 7: Dilution Calculation...")
        dilution = api_client.calculate_dilution_from_valuation(
            pre_money_valuation=10_000_000, amount_raised=2_000_000
        )
        expected_dilution = 2_000_000 / (10_000_000 + 2_000_000)
        assert abs(dilution - expected_dilution) < 0.001
        print(f"  ✓ Dilution: {dilution:.2%}")
        print()

        # Test 8: Monte Carlo Simulation
        print("Test 8: Monte Carlo Simulation (100 simulations)...")
        base_params = {
            "exit_year": 5,
            "current_job_monthly_salary": 30000,
            "startup_monthly_salary": 20000,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.054,
            "investment_frequency": "Monthly",
            "startup_params": {
                "equity_type": EquityType.RSU.value,
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {
                    "equity_pct": 0.05,
                    "target_exit_valuation": 25_000_000,
                    "simulate_dilution": False,
                },
                "options_params": {},
            },
            "failure_probability": 0.25,
        }

        sim_param_configs = {
            "valuation": {"min_val": 10_000_000, "max_val": 40_000_000, "mode": 25_000_000},
            "roi": {"mean": 0.054, "std_dev": 0.02},
        }

        mc_results = api_client.run_monte_carlo_simulation(
            num_simulations=100, base_params=base_params, sim_param_configs=sim_param_configs
        )
        net_outcomes = mc_results["net_outcomes"]
        assert len(net_outcomes) == 100
        print(f"  ✓ Completed 100 simulations")
        print(f"  ✓ Mean outcome: {np.mean(net_outcomes):,.0f} SAR")
        print(f"  ✓ Positive outcome probability: {(net_outcomes > 0).sum() / len(net_outcomes):.1%}")
        print()

        # Test 9: Sensitivity Analysis
        print("Test 9: Sensitivity Analysis...")
        sensitivity_df = api_client.run_sensitivity_analysis(
            base_params=base_params, sim_param_configs=sim_param_configs
        )
        assert len(sensitivity_df) > 0
        print(f"  ✓ Analyzed {len(sensitivity_df)} variables")
        print()

        # All tests passed!
        print("=" * 70)
        print("ALL INTEGRATION TESTS PASSED! ✅")
        print("=" * 70)
        print()
        print("The FastAPI backend is fully operational and the API client")
        print("is successfully communicating with all endpoints.")
        print()
        return True

    except Exception as e:
        print(f"\n❌ INTEGRATION TEST FAILED: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_integration()
    sys.exit(0 if success else 1)
