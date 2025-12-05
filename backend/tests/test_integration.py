"""
Integration test to verify FastAPI backend works correctly.

This test uses FastAPI's TestClient so it doesn't require a separately
running server. It can be run with pytest normally.

Run with: pytest test_integration.py -v
"""

import pytest
from fastapi.testclient import TestClient

from worth_it.api import app
from worth_it.equity import EquityType


@pytest.fixture
def client():
    """Provide a TestClient for the FastAPI app."""
    return TestClient(app)


def test_health_check(client):
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    health = response.json()
    assert health["status"] == "healthy"
    assert "version" in health


def test_full_integration_workflow(client):
    """Test a complete workflow through all endpoints."""
    # Test 1: Monthly Data Grid
    monthly_request = {
        "exit_year": 5,
        "current_job_monthly_salary": 30000,
        "startup_monthly_salary": 20000,
        "current_job_salary_growth_rate": 0.03,
        "dilution_rounds": None,
    }
    response = client.post("/api/monthly-data-grid", json=monthly_request)
    assert response.status_code == 200
    monthly_data = response.json()["data"]
    assert len(monthly_data) == 60  # 5 years * 12 months

    # Test 2: Opportunity Cost
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

    opp_request = {
        "monthly_data": monthly_data,
        "annual_roi": 0.054,
        "investment_frequency": "Monthly",
        "options_params": None,
        "startup_params": startup_params,
    }
    response = client.post("/api/opportunity-cost", json=opp_request)
    assert response.status_code == 200
    opp_data = response.json()["data"]
    assert len(opp_data) == 5  # 5 years

    # Test 3: Startup Scenario
    scenario_request = {
        "opportunity_cost_data": opp_data,
        "startup_params": startup_params,
    }
    response = client.post("/api/startup-scenario", json=scenario_request)
    assert response.status_code == 200
    results = response.json()
    assert "final_payout_value" in results
    assert "final_opportunity_cost" in results
    assert results["final_payout_value"] > 0

    # Test 4: IRR Calculation
    monthly_surpluses = [row["MonthlySurplus"] for row in monthly_data]
    irr_request = {
        "monthly_surpluses": monthly_surpluses,
        "final_payout_value": results["final_payout_value"],
    }
    response = client.post("/api/irr", json=irr_request)
    assert response.status_code == 200
    irr_result = response.json()
    assert irr_result["irr"] is not None

    # Test 5: NPV Calculation
    npv_request = {
        "monthly_surpluses": monthly_surpluses,
        "annual_roi": 0.054,
        "final_payout_value": results["final_payout_value"],
    }
    response = client.post("/api/npv", json=npv_request)
    assert response.status_code == 200
    npv_result = response.json()
    assert npv_result["npv"] is not None

    # Test 6: Dilution Calculation
    dilution_request = {
        "pre_money_valuation": 10_000_000,
        "amount_raised": 2_000_000,
    }
    response = client.post("/api/dilution", json=dilution_request)
    assert response.status_code == 200
    dilution_result = response.json()
    expected_dilution = 2_000_000 / (10_000_000 + 2_000_000)
    assert abs(dilution_result["dilution"] - expected_dilution) < 0.001


def test_monte_carlo_simulation(client):
    """Test Monte Carlo simulation endpoint."""
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

    mc_request = {
        "num_simulations": 50,  # Reduced for faster test
        "base_params": base_params,
        "sim_param_configs": sim_param_configs,
    }
    response = client.post("/api/monte-carlo", json=mc_request)
    assert response.status_code == 200
    mc_results = response.json()
    assert len(mc_results["net_outcomes"]) == 50
    assert len(mc_results["simulated_valuations"]) == 50


def test_sensitivity_analysis(client):
    """Test sensitivity analysis endpoint."""
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
        "failure_probability": 0.0,
    }

    sim_param_configs = {
        "valuation": {"min_val": 10_000_000, "max_val": 40_000_000, "mode": 25_000_000},
        "roi": {"mean": 0.054, "std_dev": 0.02},
    }

    sa_request = {
        "base_params": base_params,
        "sim_param_configs": sim_param_configs,
    }
    response = client.post("/api/sensitivity-analysis", json=sa_request)
    assert response.status_code == 200
    sa_results = response.json()
    assert len(sa_results["data"]) > 0


if __name__ == "__main__":
    """Allow running as a script for manual testing."""
    import sys

    sys.exit(pytest.main([__file__, "-v"]))
