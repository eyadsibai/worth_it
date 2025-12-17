"""
Tests for the FastAPI backend.

This module tests all API endpoints to ensure they properly handle
requests and return correct responses.
"""

import pytest
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


def test_startup_scenario_results_df_column_names():
    """Test that results_df returns snake_case column names expected by frontend."""
    # Setup data
    monthly_request = {
        "exit_year": 4,
        "current_job_monthly_salary": 15000,
        "startup_monthly_salary": 10000,
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

    # Verify results_df has the expected snake_case column names
    results_df = data["results_df"]
    assert len(results_df) == 4  # 4 years

    # Check first row has expected columns
    first_row = results_df[0]
    expected_columns = [
        "year",
        "startup_monthly_salary",
        "current_job_monthly_salary",
        "monthly_surplus",
        "cumulative_opportunity_cost",
    ]
    for col in expected_columns:
        assert col in first_row, f"Missing expected column: {col}"

    # Verify the values are correct (not zeros)
    assert first_row["year"] == 1
    # Yearly totals: 12 months * monthly_salary
    assert first_row["startup_monthly_salary"] == 10000 * 12  # 120,000
    assert first_row["current_job_monthly_salary"] == 15000 * 12  # 180,000
    assert first_row["monthly_surplus"] == (15000 - 10000) * 12  # 60,000 per year
    assert first_row["cumulative_opportunity_cost"] > 0  # Should be positive


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

    from worth_it.services import cap_table_service

    with patch.object(
        cap_table_service,
        "calculate_dilution_from_valuation",
        side_effect=ValueError("Internal error: NoneType object"),
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

    from worth_it.services import startup_service

    with patch.object(
        startup_service, "calculate_irr", side_effect=TypeError("'NoneType' object is not iterable")
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

    from worth_it.services import cap_table_service

    # Test ValueError (caught by dilution endpoint)
    with patch.object(
        cap_table_service,
        "calculate_dilution_from_valuation",
        side_effect=ValueError("'key' not found in dict"),
    ):
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
    with patch.object(
        cap_table_service,
        "calculate_dilution_from_valuation",
        side_effect=ZeroDivisionError("division by zero"),
    ):
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


# --- WebSocket Tests ---
class TestWebSocketMonteCarlo:
    """Tests for the /ws/monte-carlo WebSocket endpoint."""

    @staticmethod
    def _get_valid_request():
        """Get a valid Monte Carlo request payload."""
        return {
            "num_simulations": 20,
            "base_params": {
                "exit_year": 3,
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

    def test_websocket_connection(self):
        """Test that WebSocket connection can be established."""
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            # Connection established successfully
            assert websocket is not None

    def test_websocket_receives_progress_and_complete(self):
        """Test that WebSocket receives progress updates and completion message."""
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_json(self._get_valid_request())

            messages = []
            while True:
                msg = websocket.receive_json()
                messages.append(msg)
                if msg.get("type") == "complete":
                    break
                # Prevent infinite loop
                if len(messages) > 100:
                    break

            # Should have at least one message (complete)
            assert len(messages) >= 1

            # Last message should be complete
            complete_msg = messages[-1]
            assert complete_msg["type"] == "complete"
            # Results are at top level, not nested under "result"
            assert "net_outcomes" in complete_msg
            assert "simulated_valuations" in complete_msg

    def test_websocket_progress_message_format(self):
        """Test that progress messages have correct format."""
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            request = self._get_valid_request()
            request["num_simulations"] = 100  # More simulations for progress updates
            websocket.send_json(request)

            progress_messages = []
            while True:
                msg = websocket.receive_json()
                if msg.get("type") == "progress":
                    progress_messages.append(msg)
                elif msg.get("type") == "complete":
                    break
                if len(progress_messages) > 50:
                    break

            # Should have progress messages for larger simulations
            if progress_messages:
                progress_msg = progress_messages[0]
                # Progress uses 'current' field
                assert "current" in progress_msg
                assert "total" in progress_msg
                assert "percentage" in progress_msg
                assert progress_msg["current"] >= 0
                assert progress_msg["total"] > 0

    def test_websocket_invalid_json(self):
        """Test that invalid JSON triggers error response."""
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_text("invalid json {{{")
            msg = websocket.receive_json()
            assert msg["type"] == "error"
            assert "message" in msg

    def test_websocket_validation_error(self):
        """Test that invalid request parameters trigger error response."""
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            invalid_request = {"num_simulations": -1}  # Invalid
            websocket.send_json(invalid_request)
            msg = websocket.receive_json()
            assert msg["type"] == "error"
            assert "message" in msg

    def test_websocket_complete_result_format(self):
        """Test that complete message has correct result format."""
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            websocket.send_json(self._get_valid_request())

            # Get to complete message
            complete_msg = None
            for _ in range(100):
                msg = websocket.receive_json()
                if msg.get("type") == "complete":
                    complete_msg = msg
                    break

            assert complete_msg is not None

            # Verify result structure - data is at top level, not nested under "result"
            assert isinstance(complete_msg["net_outcomes"], list)
            assert isinstance(complete_msg["simulated_valuations"], list)
            assert len(complete_msg["net_outcomes"]) == 20  # num_simulations
            assert len(complete_msg["simulated_valuations"]) == 20


class TestCapTableConversion:
    """Tests for the cap table conversion endpoint."""

    def test_convert_safe_with_cap(self):
        """Test SAFE conversion using valuation cap."""
        request_data = {
            "cap_table": {
                "stakeholders": [
                    {
                        "id": "founder-1",
                        "name": "Founder",
                        "type": "founder",
                        "shares": 8000000,
                        "ownership_pct": 80.0,
                        "share_class": "common",
                        "vesting": None,
                    }
                ],
                "total_shares": 10000000,
                "option_pool_pct": 10,
            },
            "instruments": [
                {
                    "id": "safe-1",
                    "type": "SAFE",
                    "investor_name": "Angel Investor",
                    "investment_amount": 100000,
                    "valuation_cap": 5000000,
                    "discount_pct": None,
                    "pro_rata_rights": False,
                    "mfn_clause": False,
                    "date": "2024-01-01",
                    "status": "outstanding",
                }
            ],
            "priced_round": {
                "id": "round-1",
                "type": "PRICED_ROUND",
                "round_name": "Seed",
                "pre_money_valuation": 10000000,
                "amount_raised": 2000000,
                "price_per_share": 1.0,
                "date": "2024-07-01",
                "new_shares_issued": 2000000,
            },
        }

        response = client.post("/api/cap-table/convert", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "updated_cap_table" in data
        assert "converted_instruments" in data
        assert "summary" in data

        # Verify conversion details
        assert data["summary"]["instruments_converted"] == 1
        assert data["summary"]["total_shares_issued"] == 200000  # $100K / $0.50

        # Verify converted instrument details
        converted = data["converted_instruments"][0]
        assert converted["conversion_price"] == 0.5  # Cap price: $5M / 10M shares
        assert converted["price_source"] == "cap"
        assert converted["shares_issued"] == 200000

    def test_convert_note_with_interest(self):
        """Test convertible note conversion with accrued interest."""
        request_data = {
            "cap_table": {
                "stakeholders": [],
                "total_shares": 10000000,
                "option_pool_pct": 10,
            },
            "instruments": [
                {
                    "id": "note-1",
                    "type": "CONVERTIBLE_NOTE",
                    "investor_name": "Note Investor",
                    "principal_amount": 50000,
                    "interest_rate": 5,
                    "interest_type": "simple",
                    "valuation_cap": 5000000,
                    "discount_pct": None,
                    "maturity_months": 24,
                    "date": "2024-01-01",
                    "status": "outstanding",
                }
            ],
            "priced_round": {
                "id": "round-1",
                "type": "PRICED_ROUND",
                "round_name": "Seed",
                "pre_money_valuation": 10000000,
                "amount_raised": 2000000,
                "price_per_share": 1.0,
                "date": "2024-07-01",
                "new_shares_issued": 2000000,
            },
        }

        response = client.post("/api/cap-table/convert", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Verify interest was calculated (~6 months of 5% on $50K)
        # Uses actual day counting: Jan 1 to Jul 1 = 182 days
        converted = data["converted_instruments"][0]
        assert converted["accrued_interest"] == pytest.approx(1250.0, rel=0.01)
        assert converted["investment_amount"] == pytest.approx(51250.0, rel=0.01)

    def test_convert_multiple_instruments(self):
        """Test conversion of multiple instruments."""
        request_data = {
            "cap_table": {
                "stakeholders": [],
                "total_shares": 10000000,
                "option_pool_pct": 10,
            },
            "instruments": [
                {
                    "id": "safe-1",
                    "type": "SAFE",
                    "investor_name": "Investor A",
                    "investment_amount": 100000,
                    "valuation_cap": 5000000,
                    "status": "outstanding",
                },
                {
                    "id": "safe-2",
                    "type": "SAFE",
                    "investor_name": "Investor B",
                    "investment_amount": 50000,
                    "valuation_cap": 5000000,
                    "status": "outstanding",
                },
            ],
            "priced_round": {
                "id": "round-1",
                "type": "PRICED_ROUND",
                "round_name": "Seed",
                "pre_money_valuation": 10000000,
                "amount_raised": 2000000,
                "price_per_share": 1.0,
                "date": "2024-07-01",
                "new_shares_issued": 2000000,
            },
        }

        response = client.post("/api/cap-table/convert", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert data["summary"]["instruments_converted"] == 2
        assert data["summary"]["total_shares_issued"] == 300000  # 200K + 100K

    def test_validation_error_no_cap_or_discount(self):
        """Test that SAFE without cap or discount is rejected."""
        request_data = {
            "cap_table": {
                "stakeholders": [],
                "total_shares": 10000000,
                "option_pool_pct": 10,
            },
            "instruments": [
                {
                    "id": "safe-1",
                    "type": "SAFE",
                    "investor_name": "Investor",
                    "investment_amount": 100000,
                    "valuation_cap": None,
                    "discount_pct": None,  # Neither cap nor discount
                    "status": "outstanding",
                }
            ],
            "priced_round": {
                "id": "round-1",
                "type": "PRICED_ROUND",
                "round_name": "Seed",
                "pre_money_valuation": 10000000,
                "amount_raised": 2000000,
                "price_per_share": 1.0,
                "date": "2024-07-01",
                "new_shares_issued": 2000000,
            },
        }

        response = client.post("/api/cap-table/convert", json=request_data)
        # Should fail validation (Pydantic model validator)
        assert response.status_code == 422  # Validation error


class TestWaterfallAPI:
    """Test waterfall analysis API endpoint."""

    def test_waterfall_basic_distribution(self):
        """Test basic waterfall distribution calculation."""
        request_data = {
            "cap_table": {
                "stakeholders": [
                    {
                        "id": "founder-1",
                        "name": "Founder",
                        "type": "founder",
                        "shares": 7000000,
                        "ownership_pct": 70.0,
                        "share_class": "common",
                    },
                    {
                        "id": "investor-1",
                        "name": "Series A Investor",
                        "type": "investor",
                        "shares": 3000000,
                        "ownership_pct": 30.0,
                        "share_class": "preferred",
                    },
                ],
                "total_shares": 10000000,
                "option_pool_pct": 0,
            },
            "preference_tiers": [
                {
                    "id": "tier-1",
                    "name": "Series A",
                    "seniority": 1,
                    "investment_amount": 5000000,
                    "liquidation_multiplier": 1.0,
                    "participating": False,
                    "stakeholder_ids": ["investor-1"],
                }
            ],
            "exit_valuations": [3000000, 10000000, 50000000],
        }

        response = client.post("/api/waterfall", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "distributions_by_valuation" in data
        assert "breakeven_points" in data
        assert len(data["distributions_by_valuation"]) == 3

        # Check low exit ($3M) - investor gets all, founder gets nothing
        low_exit = data["distributions_by_valuation"][0]
        assert low_exit["exit_valuation"] == 3000000
        investor_payout = next(
            p for p in low_exit["stakeholder_payouts"] if p["name"] == "Series A Investor"
        )
        founder_payout = next(
            p for p in low_exit["stakeholder_payouts"] if p["name"] == "Founder"
        )
        assert investor_payout["payout_amount"] == pytest.approx(3000000)
        assert founder_payout["payout_amount"] == pytest.approx(0)

    def test_waterfall_multiple_valuations(self):
        """Test waterfall returns results for all requested valuations."""
        request_data = {
            "cap_table": {
                "stakeholders": [
                    {
                        "id": "founder-1",
                        "name": "Founder",
                        "type": "founder",
                        "shares": 10000000,
                        "ownership_pct": 100.0,
                        "share_class": "common",
                    }
                ],
                "total_shares": 10000000,
                "option_pool_pct": 0,
            },
            "preference_tiers": [],
            "exit_valuations": [1000000, 5000000, 10000000, 50000000, 100000000],
        }

        response = client.post("/api/waterfall", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert len(data["distributions_by_valuation"]) == 5

        # Common-only scenario: founder gets everything at each valuation
        for dist in data["distributions_by_valuation"]:
            founder = next(p for p in dist["stakeholder_payouts"] if p["name"] == "Founder")
            assert founder["payout_amount"] == pytest.approx(dist["exit_valuation"])

    def test_waterfall_returns_waterfall_steps(self):
        """Test that waterfall returns step-by-step breakdown."""
        request_data = {
            "cap_table": {
                "stakeholders": [
                    {
                        "id": "founder-1",
                        "name": "Founder",
                        "type": "founder",
                        "shares": 7000000,
                        "ownership_pct": 70.0,
                        "share_class": "common",
                    },
                    {
                        "id": "investor-1",
                        "name": "Investor",
                        "type": "investor",
                        "shares": 3000000,
                        "ownership_pct": 30.0,
                        "share_class": "preferred",
                    },
                ],
                "total_shares": 10000000,
                "option_pool_pct": 0,
            },
            "preference_tiers": [
                {
                    "id": "tier-1",
                    "name": "Series A",
                    "seniority": 1,
                    "investment_amount": 5000000,
                    "liquidation_multiplier": 1.0,
                    "participating": False,
                    "stakeholder_ids": ["investor-1"],
                }
            ],
            "exit_valuations": [20000000],
        }

        response = client.post("/api/waterfall", json=request_data)
        assert response.status_code == 200
        data = response.json()

        dist = data["distributions_by_valuation"][0]
        assert len(dist["waterfall_steps"]) >= 1
        assert dist["waterfall_steps"][0]["step_number"] == 1

    def test_waterfall_invalid_request(self):
        """Test that invalid requests are rejected."""
        # Empty exit_valuations should fail
        request_data = {
            "cap_table": {
                "stakeholders": [],
                "total_shares": 10000000,
                "option_pool_pct": 0,
            },
            "preference_tiers": [],
            "exit_valuations": [],  # Invalid - must have at least one
        }

        response = client.post("/api/waterfall", json=request_data)
        assert response.status_code == 422  # Validation error


class TestRateLimiting:
    """Test rate limiting functionality.

    Note: These tests verify rate limiting configuration is correct.
    Rate limiting is disabled during normal test runs (via conftest.py)
    to prevent test interference. These tests check the configuration exists.
    """

    def test_rate_limit_configuration_exists(self):
        """Test that rate limiting is properly configured in the app.

        This verifies the rate limiting middleware is set up correctly,
        even if disabled during tests.
        """
        from worth_it.api import app, limiter

        # Verify limiter is attached to app
        assert hasattr(app.state, "limiter"), "Rate limiter should be attached to app state"

        # Verify limiter configuration
        assert limiter is not None, "Limiter should be initialized"

    def test_rate_limit_settings(self):
        """Test that rate limit settings are properly configured."""
        from worth_it.config import Settings

        # Create fresh settings to check defaults (not affected by test env)
        # Note: In production, RATE_LIMIT_ENABLED defaults to "true"
        assert hasattr(Settings, "RATE_LIMIT_ENABLED")
        assert hasattr(Settings, "RATE_LIMIT_PER_MINUTE")
        assert hasattr(Settings, "RATE_LIMIT_MONTE_CARLO_PER_MINUTE")

        # Verify default limits are sensible
        assert Settings.RATE_LIMIT_PER_MINUTE == 60, "Default rate limit should be 60/min"
        assert Settings.RATE_LIMIT_MONTE_CARLO_PER_MINUTE == 10, (
            "Monte Carlo limit should be 10/min"
        )


class TestDilutionPreviewAPI:
    """Tests for the dilution preview endpoint."""

    def test_basic_dilution_preview(self):
        """Test basic dilution preview with stakeholders."""
        request_data = {
            "stakeholders": [
                {"name": "Founder A", "type": "founder", "ownership_pct": 60.0},
                {"name": "Founder B", "type": "founder", "ownership_pct": 30.0},
            ],
            "option_pool_pct": 10.0,
            "pre_money_valuation": 10000000,
            "amount_raised": 2500000,
            "investor_name": "Series A Investor",
        }

        response = client.post("/api/dilution/preview", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "dilution_results" in data
        assert "post_money_valuation" in data
        assert "dilution_factor" in data

        # Verify calculations
        assert data["post_money_valuation"] == 12500000
        assert data["dilution_factor"] == pytest.approx(0.8)

        # Should have 4 results: 2 founders + option pool + new investor
        assert len(data["dilution_results"]) == 4

        # Verify new investor entry
        new_investor = next(d for d in data["dilution_results"] if d["is_new"])
        assert new_investor["name"] == "Series A Investor"
        assert new_investor["after_pct"] == pytest.approx(20.0)

    def test_dilution_preview_no_stakeholders(self):
        """Test dilution preview with no existing stakeholders."""
        request_data = {
            "stakeholders": [],
            "option_pool_pct": 10.0,
            "pre_money_valuation": 5000000,
            "amount_raised": 1000000,
            "investor_name": "Seed Investor",
        }

        response = client.post("/api/dilution/preview", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Should have option pool + new investor only
        assert len(data["dilution_results"]) == 2

    def test_dilution_preview_default_investor_name(self):
        """Test that default investor name is used."""
        request_data = {
            "stakeholders": [{"name": "Founder", "type": "founder", "ownership_pct": 90.0}],
            "option_pool_pct": 10.0,
            "pre_money_valuation": 1000000,
            "amount_raised": 250000,
        }

        response = client.post("/api/dilution/preview", json=request_data)
        assert response.status_code == 200
        data = response.json()

        new_investor = next(d for d in data["dilution_results"] if d["is_new"])
        assert new_investor["name"] == "New Investor"

    def test_dilution_preview_validation_error(self):
        """Test that invalid inputs are rejected."""
        # Negative pre_money_valuation
        request_data = {
            "stakeholders": [],
            "option_pool_pct": 10.0,
            "pre_money_valuation": -1000000,
            "amount_raised": 250000,
        }

        response = client.post("/api/dilution/preview", json=request_data)
        assert response.status_code == 422  # Validation error

    def test_dilution_preview_various_stakeholder_types(self):
        """Test dilution with different stakeholder types."""
        request_data = {
            "stakeholders": [
                {"name": "CEO", "type": "founder", "ownership_pct": 40.0},
                {"name": "Engineer", "type": "employee", "ownership_pct": 5.0},
                {"name": "VC", "type": "investor", "ownership_pct": 15.0},
                {"name": "Advisor", "type": "advisor", "ownership_pct": 2.0},
            ],
            "option_pool_pct": 0.0,
            "pre_money_valuation": 20000000,
            "amount_raised": 5000000,
            "investor_name": "Series A",
        }

        response = client.post("/api/dilution/preview", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # All stakeholder types should be preserved
        types = {d["type"] for d in data["dilution_results"]}
        assert "founder" in types
        assert "employee" in types
        assert "investor" in types
        assert "advisor" in types
        assert "new_investor" in types


class TestScenarioComparisonAPI:
    """Tests for the scenario comparison endpoint."""

    def test_basic_comparison(self):
        """Test basic scenario comparison."""
        request_data = {
            "scenarios": [
                {
                    "name": "Current Job",
                    "results": {
                        "netOutcome": 500000,
                        "finalPayoutValue": 0,
                        "finalOpportunityCost": 0,
                        "breakeven": None,
                    },
                    "equity": {"monthlySalary": 15000},
                },
                {
                    "name": "Startup Offer",
                    "results": {
                        "netOutcome": 750000,
                        "finalPayoutValue": 900000,
                        "finalOpportunityCost": 150000,
                        "breakeven": "Year 3",
                    },
                    "equity": {"monthlySalary": 10000},
                },
            ]
        }

        response = client.post("/api/scenarios/compare", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "winner" in data
        assert "metric_diffs" in data
        assert "insights" in data

        # Verify winner
        assert data["winner"]["winner_name"] == "Startup Offer"
        assert data["winner"]["winner_index"] == 1
        assert data["winner"]["net_outcome_advantage"] == 250000
        assert data["winner"]["is_tie"] is False

    def test_comparison_with_tie(self):
        """Test scenario comparison with tied outcomes."""
        request_data = {
            "scenarios": [
                {
                    "name": "Option A",
                    "results": {
                        "netOutcome": 500000,
                        "finalPayoutValue": 500000,
                        "finalOpportunityCost": 0,
                    },
                    "equity": {"monthlySalary": 10000},
                },
                {
                    "name": "Option B",
                    "results": {
                        "netOutcome": 500000,
                        "finalPayoutValue": 500000,
                        "finalOpportunityCost": 0,
                    },
                    "equity": {"monthlySalary": 10000},
                },
            ]
        }

        response = client.post("/api/scenarios/compare", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert data["winner"]["is_tie"] is True

    def test_comparison_returns_metric_diffs(self):
        """Test that metric differences are calculated."""
        request_data = {
            "scenarios": [
                {
                    "name": "A",
                    "results": {
                        "netOutcome": 100000,
                        "finalPayoutValue": 200000,
                        "finalOpportunityCost": 100000,
                    },
                    "equity": {"monthlySalary": 10000},
                },
                {
                    "name": "B",
                    "results": {
                        "netOutcome": 200000,
                        "finalPayoutValue": 300000,
                        "finalOpportunityCost": 100000,
                    },
                    "equity": {"monthlySalary": 10000},
                },
            ]
        }

        response = client.post("/api/scenarios/compare", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Should have diffs for net_outcome, final_payout_value, final_opportunity_cost
        assert len(data["metric_diffs"]) == 3

        net_diff = next(d for d in data["metric_diffs"] if d["metric"] == "net_outcome")
        assert net_diff["absolute_diff"] == 100000
        assert net_diff["better_scenario"] == "B"

    def test_comparison_generates_insights(self):
        """Test that insights are generated."""
        request_data = {
            "scenarios": [
                {
                    "name": "High Salary",
                    "results": {
                        "netOutcome": 400000,
                        "finalPayoutValue": 0,
                        "finalOpportunityCost": 0,
                    },
                    "equity": {"monthlySalary": 20000},
                },
                {
                    "name": "Startup",
                    "results": {
                        "netOutcome": 600000,
                        "finalPayoutValue": 800000,
                        "finalOpportunityCost": 200000,
                        "breakeven": "Year 4",
                    },
                    "equity": {"monthlySalary": 10000},
                },
            ]
        }

        response = client.post("/api/scenarios/compare", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Should have at least one insight
        assert len(data["insights"]) >= 1

        # Should have winner insight
        winner_insights = [i for i in data["insights"] if i["type"] == "winner"]
        assert len(winner_insights) == 1

    def test_comparison_single_scenario_returns_empty_diffs(self):
        """Test that single scenario returns empty metric diffs."""
        request_data = {
            "scenarios": [
                {
                    "name": "Only Option",
                    "results": {
                        "netOutcome": 500000,
                        "finalPayoutValue": 500000,
                        "finalOpportunityCost": 0,
                    },
                    "equity": {"monthlySalary": 10000},
                }
            ]
        }

        response = client.post("/api/scenarios/compare", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Single scenario: no diffs, no insights
        assert data["metric_diffs"] == []
        assert data["insights"] == []

    def test_comparison_validation_error(self):
        """Test that empty scenarios list is rejected."""
        request_data = {"scenarios": []}

        response = client.post("/api/scenarios/compare", json=request_data)
        assert response.status_code == 422  # Validation error
