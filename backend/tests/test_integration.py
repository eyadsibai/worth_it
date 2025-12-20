"""
Integration test to verify FastAPI backend works correctly.

This test uses FastAPI's TestClient so it doesn't require a separately
running server. It can be run with pytest normally.

Run with: pytest test_integration.py -v
"""

import json

import pytest
from fastapi.testclient import TestClient

from worth_it.api import app
from worth_it.calculations import EquityType


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


class TestSensitivityAnalysisIntegration:
    """Comprehensive integration tests for sensitivity analysis."""

    def test_sensitivity_analysis_basic(self, client):
        """Test basic sensitivity analysis with RSU scenario."""
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

    def test_sensitivity_analysis_result_structure(self, client):
        """Test that sensitivity analysis returns properly structured data."""
        base_params = {
            "exit_year": 5,
            "current_job_monthly_salary": 25000,
            "startup_monthly_salary": 18000,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.05,
            "investment_frequency": "Monthly",
            "startup_params": {
                "equity_type": EquityType.RSU.value,
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {
                    "equity_pct": 0.03,
                    "target_exit_valuation": 50_000_000,
                    "simulate_dilution": False,
                },
                "options_params": {},
            },
            "failure_probability": 0.0,
        }

        sim_param_configs = {
            "valuation": {"min_val": 20_000_000, "max_val": 80_000_000, "mode": 50_000_000},
            "roi": {"mean": 0.05, "std_dev": 0.01},
            "salary_growth": {"min_val": 0.01, "max_val": 0.05, "mode": 0.03},
        }

        response = client.post(
            "/api/sensitivity-analysis",
            json={"base_params": base_params, "sim_param_configs": sim_param_configs},
        )
        assert response.status_code == 200
        data = response.json()["data"]

        # Each row should have Variable, Low, High, Impact
        for row in data:
            assert "Variable" in row
            assert "Low" in row
            assert "High" in row
            assert "Impact" in row

    def test_sensitivity_analysis_stock_options_scenario(self, client):
        """Test sensitivity analysis with stock options scenario."""
        base_params = {
            "exit_year": 5,
            "current_job_monthly_salary": 25000,
            "startup_monthly_salary": 18000,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.05,
            "investment_frequency": "Annually",
            "startup_params": {
                "equity_type": EquityType.STOCK_OPTIONS.value,
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {},
                "options_params": {
                    "num_options": 50000,
                    "strike_price": 1.0,
                    "target_exit_valuation": 100_000_000,
                    "total_shares_outstanding": 10_000_000,
                    "exercise_strategy": "At Exit",
                },
            },
            "failure_probability": 0.25,
        }

        sim_param_configs = {
            "valuation": {"min_val": 50_000_000, "max_val": 200_000_000, "mode": 100_000_000},
            "roi": {"mean": 0.06, "std_dev": 0.02},
        }

        response = client.post(
            "/api/sensitivity-analysis",
            json={"base_params": base_params, "sim_param_configs": sim_param_configs},
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) >= 1  # At least one variable analyzed

    def test_sensitivity_analysis_multiple_variables(self, client):
        """Test sensitivity analysis with multiple variables."""
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
            "salary_growth": {"min_val": 0.01, "max_val": 0.05, "mode": 0.03},
        }

        response = client.post(
            "/api/sensitivity-analysis",
            json={"base_params": base_params, "sim_param_configs": sim_param_configs},
        )
        assert response.status_code == 200
        data = response.json()["data"]

        # Should analyze all provided variables
        assert len(data) >= 2
        # Each variable should have numeric impact values
        for row in data:
            assert isinstance(row["Impact"], (int, float))
            assert isinstance(row["Low"], (int, float))
            assert isinstance(row["High"], (int, float))


class TestWebSocketMonteCarloIntegration:
    """Comprehensive integration tests for WebSocket Monte Carlo simulation."""

    def test_websocket_connection_lifecycle(self, client):
        """Test basic WebSocket connection and message flow."""
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

        request_data = {
            "num_simulations": 100,
            "base_params": base_params,
            "sim_param_configs": {
                "valuation": {"min_val": 10_000_000, "max_val": 40_000_000, "mode": 25_000_000},
                "roi": {"mean": 0.054, "std_dev": 0.02},
            },
        }

        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text(json.dumps(request_data))

            # Collect all messages
            messages = []
            while True:
                msg = websocket.receive_json()
                messages.append(msg)
                if msg["type"] == "complete":
                    break

            # Verify message types
            progress_msgs = [m for m in messages if m["type"] == "progress"]
            complete_msgs = [m for m in messages if m["type"] == "complete"]

            assert len(progress_msgs) >= 1, "Should have at least one progress message"
            assert len(complete_msgs) == 1, "Should have exactly one complete message"

    def test_websocket_progress_events(self, client):
        """Test that progress events are sent correctly."""
        base_params = {
            "exit_year": 3,
            "current_job_monthly_salary": 20000,
            "startup_monthly_salary": 15000,
            "current_job_salary_growth_rate": 0.02,
            "annual_roi": 0.05,
            "investment_frequency": "Monthly",
            "startup_params": {
                "equity_type": EquityType.RSU.value,
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {
                    "equity_pct": 0.02,
                    "target_exit_valuation": 10_000_000,
                    "simulate_dilution": False,
                },
                "options_params": {},
            },
            "failure_probability": 0.1,
        }

        request_data = {
            "num_simulations": 500,  # Enough to generate multiple progress updates
            "base_params": base_params,
            "sim_param_configs": {
                "valuation": {"min_val": 5_000_000, "max_val": 20_000_000, "mode": 10_000_000},
            },
        }

        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text(json.dumps(request_data))

            progress_percentages = []
            while True:
                msg = websocket.receive_json()
                if msg["type"] == "progress":
                    assert "current" in msg
                    assert "total" in msg
                    assert "percentage" in msg
                    assert msg["total"] == 500
                    progress_percentages.append(msg["percentage"])
                elif msg["type"] == "complete":
                    break

            # Progress should increase
            assert len(progress_percentages) >= 2
            # Last progress should effectively be 100%, allow tiny float/rounding noise
            assert progress_percentages[-1] >= 99.9

    def test_websocket_result_aggregation(self, client):
        """Test that results are properly aggregated across batches."""
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

        num_sims = 250
        request_data = {
            "num_simulations": num_sims,
            "base_params": base_params,
            "sim_param_configs": {
                "valuation": {"min_val": 10_000_000, "max_val": 40_000_000, "mode": 25_000_000},
                "roi": {"mean": 0.054, "std_dev": 0.02},
            },
        }

        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text(json.dumps(request_data))

            complete_msg = None
            while True:
                msg = websocket.receive_json()
                if msg["type"] == "complete":
                    complete_msg = msg
                    break

            # Verify result counts match requested simulations
            assert complete_msg is not None
            assert len(complete_msg["net_outcomes"]) == num_sims
            assert len(complete_msg["simulated_valuations"]) == num_sims

    def test_websocket_error_handling_invalid_params(self, client):
        """Test error handling for invalid parameters."""
        # Missing required fields
        request_data = {
            "num_simulations": 100,
            "base_params": {
                # Missing exit_year and other required fields
                "current_job_monthly_salary": 30000,
            },
            "sim_param_configs": {},
        }

        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text(json.dumps(request_data))

            # Collect messages until we get error or complete
            # Note: WebSocket may send initial progress before validation fails
            messages = []
            while True:
                msg = websocket.receive_json()
                messages.append(msg)
                if msg["type"] in ("error", "complete"):
                    break

            # Should end with an error due to missing required fields
            assert messages[-1]["type"] == "error", f"Expected error, got: {messages[-1]}"
            assert "message" in messages[-1]

    def test_websocket_stock_options_simulation(self, client):
        """Test WebSocket Monte Carlo with stock options scenario."""
        base_params = {
            "exit_year": 5,
            "current_job_monthly_salary": 25000,
            "startup_monthly_salary": 18000,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.06,
            "investment_frequency": "Monthly",
            "startup_params": {
                "equity_type": EquityType.STOCK_OPTIONS.value,
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {},
                "options_params": {
                    "num_options": 100000,
                    "strike_price": 0.50,
                    "target_exit_valuation": 50_000_000,
                    "total_shares_outstanding": 10_000_000,
                    "exercise_strategy": "At Exit",
                },
            },
            "failure_probability": 0.30,
        }

        request_data = {
            "num_simulations": 100,
            "base_params": base_params,
            "sim_param_configs": {
                "valuation": {"min_val": 20_000_000, "max_val": 100_000_000, "mode": 50_000_000},
                "roi": {"mean": 0.06, "std_dev": 0.02},
            },
        }

        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text(json.dumps(request_data))

            complete_msg = None
            while True:
                msg = websocket.receive_json()
                if msg["type"] == "complete":
                    complete_msg = msg
                    break

            assert complete_msg is not None
            assert len(complete_msg["net_outcomes"]) == 100


if __name__ == "__main__":
    """Allow running as a script for manual testing."""
    import sys

    sys.exit(pytest.main([__file__, "-v"]))
