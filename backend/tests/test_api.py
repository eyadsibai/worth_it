"""
Tests for the FastAPI backend.

This module tests all API endpoints to ensure they properly handle
requests and return correct responses.
"""

from fastapi.testclient import TestClient

from worth_it.api import app

client = TestClient(app)


def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_monthly_data_grid():
    """Test creating monthly data grid."""
    request_data = {
        "exit_year": 5,
        "current_job_monthly_salary": 30000,
        "startup_monthly_salary": 20000,
        "current_job_salary_growth_rate": 0.03,
        "dilution_rounds": None,
    }
    response = client.post("/api/monthly-data-grid", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) == 60  # 5 years * 12 months


def test_opportunity_cost():
    """Test calculating opportunity cost."""
    # First create monthly data
    monthly_request = {
        "exit_year": 4,
        "current_job_monthly_salary": 10000,
        "startup_monthly_salary": 8000,
        "current_job_salary_growth_rate": 0.0,
        "dilution_rounds": None,
    }
    monthly_response = client.post("/api/monthly-data-grid", json=monthly_request)
    monthly_data = monthly_response.json()["data"]

    # Now calculate opportunity cost
    opp_request = {
        "monthly_data": monthly_data,
        "annual_roi": 0.05,
        "investment_frequency": "Annually",
        "options_params": None,
        "startup_params": None,
    }
    response = client.post("/api/opportunity-cost", json=opp_request)
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) == 4  # 4 years


def test_startup_scenario_rsu():
    """Test calculating startup scenario with RSUs."""
    # Setup data
    monthly_request = {
        "exit_year": 4,
        "current_job_monthly_salary": 10000,
        "startup_monthly_salary": 8000,
        "current_job_salary_growth_rate": 0.0,
        "dilution_rounds": None,
    }
    monthly_response = client.post("/api/monthly-data-grid", json=monthly_request)
    monthly_data = monthly_response.json()["data"]

    startup_params = {
        "equity_type": "Equity (RSUs)",
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 4,
        "rsu_params": {
            "equity_pct": 0.05,
            "target_exit_valuation": 10_000_000,
            "simulate_dilution": False,
        },
        "options_params": {},
    }

    opp_request = {
        "monthly_data": monthly_data,
        "annual_roi": 0.05,
        "investment_frequency": "Annually",
        "options_params": None,
        "startup_params": startup_params,
    }
    opp_response = client.post("/api/opportunity-cost", json=opp_request)
    opp_data = opp_response.json()["data"]

    # Calculate scenario
    scenario_request = {
        "opportunity_cost_data": opp_data,
        "startup_params": startup_params,
    }
    response = client.post("/api/startup-scenario", json=scenario_request)
    assert response.status_code == 200
    data = response.json()
    assert "final_payout_value" in data
    assert "final_opportunity_cost" in data
    assert "results_df" in data
    assert data["payout_label"] == "Your Equity Value (Post-Dilution)"


def test_startup_scenario_options():
    """Test calculating startup scenario with stock options."""
    # Setup data
    monthly_request = {
        "exit_year": 4,
        "current_job_monthly_salary": 10000,
        "startup_monthly_salary": 8000,
        "current_job_salary_growth_rate": 0.0,
        "dilution_rounds": None,
    }
    monthly_response = client.post("/api/monthly-data-grid", json=monthly_request)
    monthly_data = monthly_response.json()["data"]

    startup_params = {
        "equity_type": "Stock Options",
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 4,
        "rsu_params": {},
        "options_params": {
            "num_options": 10000,
            "strike_price": 1.0,
            "target_exit_price_per_share": 10.0,
        },
    }

    opp_request = {
        "monthly_data": monthly_data,
        "annual_roi": 0.05,
        "investment_frequency": "Annually",
        "options_params": startup_params["options_params"],
        "startup_params": startup_params,
    }
    opp_response = client.post("/api/opportunity-cost", json=opp_request)
    opp_data = opp_response.json()["data"]

    # Calculate scenario
    scenario_request = {
        "opportunity_cost_data": opp_data,
        "startup_params": startup_params,
    }
    response = client.post("/api/startup-scenario", json=scenario_request)
    assert response.status_code == 200
    data = response.json()
    assert "final_payout_value" in data
    assert data["payout_label"] == "Your Options Value"


def test_calculate_irr():
    """Test IRR calculation."""
    request_data = {
        "monthly_surpluses": [100] * 12,
        "final_payout_value": 1500,
    }
    response = client.post("/api/irr", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "irr" in data
    assert data["irr"] is not None
    assert 59 < data["irr"] < 60


def test_calculate_npv():
    """Test NPV calculation."""
    request_data = {
        "monthly_surpluses": [100] * 12,
        "annual_roi": 0.10,
        "final_payout_value": 1500,
    }
    response = client.post("/api/npv", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "npv" in data
    assert data["npv"] is not None
    assert data["npv"] > 0


def test_monte_carlo_simulation():
    """Test Monte Carlo simulation."""
    request_data = {
        "num_simulations": 50,
        "base_params": {
            "exit_year": 5,
            "current_job_monthly_salary": 10000,
            "startup_monthly_salary": 8000,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.05,
            "investment_frequency": "Annually",
            "startup_params": {
                "equity_type": "Equity (RSUs)",
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {
                    "equity_pct": 0.05,
                    "target_exit_valuation": 20_000_000,
                    "simulate_dilution": False,
                },
                "options_params": {},
            },
            "failure_probability": 0.25,
        },
        "sim_param_configs": {
            "valuation": {"min_val": 10_000_000, "max_val": 30_000_000, "mode": 20_000_000},
            "roi": {"mean": 0.05, "std_dev": 0.02},
        },
    }
    response = client.post("/api/monte-carlo", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "net_outcomes" in data
    assert "simulated_valuations" in data
    assert len(data["net_outcomes"]) == 50
    assert len(data["simulated_valuations"]) == 50


def test_sensitivity_analysis():
    """Test sensitivity analysis."""
    request_data = {
        "base_params": {
            "exit_year": 5,
            "current_job_monthly_salary": 10000,
            "startup_monthly_salary": 8000,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.05,
            "investment_frequency": "Annually",
            "startup_params": {
                "equity_type": "Equity (RSUs)",
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {
                    "equity_pct": 0.05,
                    "target_exit_valuation": 20_000_000,
                    "simulate_dilution": False,
                },
                "options_params": {},
            },
            "failure_probability": 0.0,
        },
        "sim_param_configs": {
            "valuation": {"min_val": 10_000_000, "max_val": 30_000_000, "mode": 20_000_000},
            "roi": {"mean": 0.05, "std_dev": 0.02},
        },
    }
    response = client.post("/api/sensitivity-analysis", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) > 0


def test_dilution_calculation():
    """Test dilution calculation."""
    request_data = {
        "pre_money_valuation": 10_000_000,
        "amount_raised": 2_000_000,
    }
    response = client.post("/api/dilution", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert "dilution" in data
    # 2M / (10M + 2M) = 0.1667
    assert abs(data["dilution"] - 0.1667) < 0.001


def test_invalid_request():
    """Test that invalid requests return proper error codes."""
    # Missing required fields
    request_data = {
        "exit_year": 5,
        # Missing other required fields
    }
    response = client.post("/api/monthly-data-grid", json=request_data)
    assert response.status_code == 422  # Validation error


def test_calculation_error_returns_sanitized_message():
    """Test that CalculationError returns 400 with sanitized message."""
    # Use monkey patching to force a calculation error
    from unittest.mock import patch

    from worth_it import calculations

    with patch.object(
        calculations, "calculate_dilution_from_valuation", side_effect=ValueError("Internal error: NoneType object")
    ):
        request_data = {
            "pre_money_valuation": 10000000,
            "amount_raised": 1000000,
        }
        response = client.post("/api/dilution", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "calculation_error"
        assert data["message"] == "Invalid calculation parameters"
        # Verify no Python internals are exposed
        assert "NoneType" not in data["message"]
        assert "ValueError" not in data["message"]
        assert "Internal error" not in data["message"]


def test_invalid_parameters_trigger_calculation_error():
    """Test that invalid calculation parameters return sanitized error."""
    # Use monkey patching to force a TypeError
    from unittest.mock import patch

    from worth_it import calculations

    with patch.object(
        calculations, "calculate_irr", side_effect=TypeError("'NoneType' object is not iterable")
    ):
        request_data = {
            "monthly_surpluses": [100] * 12,
            "final_payout_value": 1000,
        }
        response = client.post("/api/irr", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "calculation_error"
        # Verify the message is sanitized
        assert data["message"] == "Invalid calculation parameters"
        # No Python exception details
        assert "NoneType" not in data["message"]
        assert "TypeError" not in data["message"]
        assert "iterable" not in data["message"]


def test_error_messages_do_not_expose_implementation_details():
    """Test that error responses don't leak implementation details."""
    # Use monkey patching to test various error scenarios
    from unittest.mock import patch

    from worth_it import calculations

    # Test ValueError (caught by dilution endpoint)
    with patch.object(calculations, "calculate_dilution_from_valuation", side_effect=ValueError("'key' not found in dict")):
        request_data = {
            "pre_money_valuation": 10000000,
            "amount_raised": 1000000,
        }
        response = client.post("/api/dilution", json=request_data)
        assert response.status_code == 400
        data = response.json()

        # Verify sanitized message
        assert data["error"] == "calculation_error"
        assert data["message"] == "Invalid calculation parameters"

        # Verify no implementation details leaked
        assert "ValueError" not in data["message"]
        assert "key" not in data["message"].lower()
        assert "dict" not in data["message"].lower()

    # Test ZeroDivisionError (caught by dilution endpoint)
    with patch.object(calculations, "calculate_dilution_from_valuation", side_effect=ZeroDivisionError("division by zero")):
        request_data = {
            "pre_money_valuation": 10000000,
            "amount_raised": 1000000,
        }
        response = client.post("/api/dilution", json=request_data)
        assert response.status_code == 400
        data = response.json()

        # Verify sanitized message
        assert data["error"] == "calculation_error"
        assert data["message"] == "Invalid calculation parameters"

        # Verify no implementation details leaked
        assert "ZeroDivisionError" not in data["message"]
        assert "division" not in data["message"].lower()
        assert "zero" not in data["message"].lower()
