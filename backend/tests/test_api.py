"""
Tests for the FastAPI backend.

This module tests all API endpoints to ensure they properly handle
requests and return correct responses.
"""

import pytest
from fastapi.testclient import TestClient

from worth_it.api import app
from worth_it.config import settings

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

    # Old nested format for opportunity cost endpoint (unchanged)
    old_startup_params = {
        "equity_type": "RSU",
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
        "startup_params": old_startup_params,
    }
    opp_response = client.post("/api/opportunity-cost", json=opp_request)
    opp_data = opp_response.json()["data"]

    # New typed format for startup scenario endpoint (Issue #248)
    typed_startup_params = {
        "equity_type": "RSU",
        "monthly_salary": 8000.0,
        "total_equity_grant_pct": 5.0,  # 5% as percentage
        "vesting_period": 4,
        "cliff_period": 1,
        "exit_valuation": 10_000_000.0,
        "simulate_dilution": False,
        "dilution_rounds": None,
    }

    # Calculate scenario
    scenario_request = {
        "opportunity_cost_data": opp_data,
        "startup_params": typed_startup_params,
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

    # Old nested format for opportunity cost endpoint (unchanged)
    old_startup_params = {
        "equity_type": "RSU",
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
        "startup_params": old_startup_params,
    }
    opp_response = client.post("/api/opportunity-cost", json=opp_request)
    opp_data = opp_response.json()["data"]

    # New typed format for startup scenario endpoint (Issue #248)
    typed_startup_params = {
        "equity_type": "RSU",
        "monthly_salary": 10000.0,
        "total_equity_grant_pct": 5.0,  # 5% as percentage
        "vesting_period": 4,
        "cliff_period": 1,
        "exit_valuation": 10_000_000.0,
        "simulate_dilution": False,
        "dilution_rounds": None,
    }

    # Calculate scenario
    scenario_request = {
        "opportunity_cost_data": opp_data,
        "startup_params": typed_startup_params,
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

    # Old nested format for opportunity cost endpoint (unchanged)
    old_startup_params = {
        "equity_type": "STOCK_OPTIONS",
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
        "options_params": old_startup_params["options_params"],
        "startup_params": old_startup_params,
    }
    opp_response = client.post("/api/opportunity-cost", json=opp_request)
    opp_data = opp_response.json()["data"]

    # New typed format for startup scenario endpoint (Issue #248)
    typed_startup_params = {
        "equity_type": "STOCK_OPTIONS",
        "monthly_salary": 8000.0,
        "num_options": 10000,
        "strike_price": 1.0,
        "vesting_period": 4,
        "cliff_period": 1,
        "exit_price_per_share": 10.0,
        "exercise_strategy": "AT_EXIT",
        "exercise_year": None,
    }

    # Calculate scenario
    scenario_request = {
        "opportunity_cost_data": opp_data,
        "startup_params": typed_startup_params,
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
    # New typed format for Monte Carlo (Issue #248)
    request_data = {
        "num_simulations": 50,
        "base_params": {
            "exit_year": 5,
            "current_job_monthly_salary": 10000.0,
            "startup_monthly_salary": 8000.0,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.05,
            "investment_frequency": "Annually",
            "failure_probability": 0.25,
            # Flat typed RSUParams
            "startup_params": {
                "equity_type": "RSU",
                "monthly_salary": 8000.0,
                "total_equity_grant_pct": 5.0,  # 5% as percentage
                "vesting_period": 4,
                "cliff_period": 1,
                "exit_valuation": 20_000_000.0,
                "simulate_dilution": False,
                "dilution_rounds": None,
            },
        },
        # New sim_param_configs format: enum keys + min/max ranges
        "sim_param_configs": {
            "exit_valuation": {"min": 10_000_000.0, "max": 30_000_000.0},
            "annual_roi": {"min": 0.03, "max": 0.07},
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
    # New typed format for sensitivity analysis (Issue #248)
    request_data = {
        "base_params": {
            "exit_year": 5,
            "current_job_monthly_salary": 10000.0,
            "startup_monthly_salary": 8000.0,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.05,
            "investment_frequency": "Annually",
            "failure_probability": 0.0,
            # Flat typed RSUParams
            "startup_params": {
                "equity_type": "RSU",
                "monthly_salary": 8000.0,
                "total_equity_grant_pct": 5.0,  # 5% as percentage
                "vesting_period": 4,
                "cliff_period": 1,
                "exit_valuation": 20_000_000.0,
                "simulate_dilution": False,
                "dilution_rounds": None,
            },
        },
        # New sim_param_configs format: enum keys + min/max ranges
        "sim_param_configs": {
            "exit_valuation": {"min": 10_000_000.0, "max": 30_000_000.0},
            "annual_roi": {"min": 0.03, "max": 0.07},
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
    assert response.status_code == 400  # Validation error (structured format)


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
        # Check new nested error format
        assert data["error"]["code"] == "CALCULATION_ERROR"
        assert "Calculation failed" in data["error"]["message"]
        # Verify no Python internals are exposed
        assert "NoneType" not in data["error"]["message"]
        assert "ValueError" not in data["error"]["message"]
        assert "Internal error" not in data["error"]["message"]


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
        # Check new nested error format
        assert data["error"]["code"] == "CALCULATION_ERROR"
        # Verify the message is sanitized
        assert "Calculation failed" in data["error"]["message"]
        # No Python exception details
        assert "NoneType" not in data["error"]["message"]
        assert "TypeError" not in data["error"]["message"]
        assert "iterable" not in data["error"]["message"]


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

        # Verify new nested error format with sanitized message
        assert data["error"]["code"] == "CALCULATION_ERROR"
        assert "Calculation failed" in data["error"]["message"]

        # Verify no implementation details leaked
        assert "ValueError" not in data["error"]["message"]
        assert "key" not in data["error"]["message"].lower()
        assert "dict" not in data["error"]["message"].lower()

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

        # Verify new nested error format with sanitized message
        assert data["error"]["code"] == "CALCULATION_ERROR"
        assert "Calculation failed" in data["error"]["message"]

        # Verify no implementation details leaked
        assert "ZeroDivisionError" not in data["error"]["message"]
        assert "division" not in data["error"]["message"].lower()
        assert "zero" not in data["error"]["message"].lower()


# --- WebSocket Tests ---
class TestWebSocketMonteCarlo:
    """Tests for the /ws/monte-carlo WebSocket endpoint."""

    @staticmethod
    def _get_valid_request():
        """Get a valid Monte Carlo request payload (Issue #248 typed format)."""
        return {
            "num_simulations": 20,
            "base_params": {
                "exit_year": 3,
                "current_job_monthly_salary": 10000.0,
                "startup_monthly_salary": 8000.0,
                "current_job_salary_growth_rate": 0.03,
                "annual_roi": 0.05,
                "investment_frequency": "Annually",
                "failure_probability": 0.0,
                # Flat typed RSUParams
                "startup_params": {
                    "equity_type": "RSU",
                    "monthly_salary": 8000.0,
                    "total_equity_grant_pct": 5.0,  # 5% as percentage
                    "vesting_period": 4,
                    "cliff_period": 1,
                    "exit_valuation": 20_000_000.0,
                    "simulate_dilution": False,
                    "dilution_rounds": None,
                },
            },
            # New sim_param_configs format: enum keys + min/max ranges
            "sim_param_configs": {
                "exit_valuation": {"min": 10_000_000.0, "max": 30_000_000.0},
                "annual_roi": {"min": 0.03, "max": 0.07},
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
            # Check structured error format
            assert "error" in msg
            assert msg["error"]["code"] == "VALIDATION_ERROR"
            assert "message" in msg["error"]

    def test_websocket_validation_error(self):
        """Test that invalid request parameters trigger error response."""
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            invalid_request = {"num_simulations": -1}  # Invalid
            websocket.send_json(invalid_request)
            msg = websocket.receive_json()
            assert msg["type"] == "error"
            # Check structured error format
            assert "error" in msg
            assert msg["error"]["code"] == "VALIDATION_ERROR"
            assert "message" in msg["error"]

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

    def test_websocket_exceeds_max_simulations(self):
        """Test that requesting more than MAX_SIMULATIONS is rejected."""
        with client.websocket_connect("/ws/monte-carlo") as websocket:
            # Request more simulations than the configured limit
            request = self._get_valid_request()
            request["num_simulations"] = (
                settings.MAX_SIMULATIONS + 1
            )  # Exceeds configured MAX_SIMULATIONS
            websocket.send_json(request)

            msg = websocket.receive_json()
            assert msg["type"] == "error"
            # Check structured error format
            assert "error" in msg
            assert msg["error"]["code"] == "VALIDATION_ERROR"
            # The specific error about exceeding maximum is in details
            details = msg["error"].get("details", [])
            error_messages = " ".join(d.get("message", "") for d in details).lower()
            assert "maximum" in error_messages or "exceed" in error_messages


class TestWebSocketSecurity:
    """Tests for WebSocket security features (Issue #245)."""

    def test_config_has_websocket_security_settings(self):
        """Test that WebSocket security settings are configurable."""
        from worth_it.config import settings

        # Verify security settings exist
        assert hasattr(settings, "WS_MAX_CONCURRENT_PER_IP")
        assert hasattr(settings, "WS_SIMULATION_TIMEOUT_SECONDS")

        # Verify default values
        assert settings.WS_MAX_CONCURRENT_PER_IP == 5
        assert settings.WS_SIMULATION_TIMEOUT_SECONDS == 60

    def test_config_validation_catches_invalid_ws_concurrent(self):
        """Test that invalid WS_MAX_CONCURRENT_PER_IP values are caught by validation."""
        from worth_it.config import Settings

        # Test validation logic directly with invalid values
        # The Settings class validates ranges in its validate() method

        # Create a Settings subclass to test with invalid values
        class InvalidConcurrentSettings(Settings):
            WS_MAX_CONCURRENT_PER_IP = 0  # Invalid: must be >= 1

        test_settings = InvalidConcurrentSettings()
        try:
            test_settings.validate()
            raise AssertionError(
                "Should have raised validation error for WS_MAX_CONCURRENT_PER_IP=0"
            )
        except ValueError as e:
            assert "WS_MAX_CONCURRENT_PER_IP" in str(e)

    def test_config_validation_catches_invalid_ws_timeout(self):
        """Test that invalid WS_SIMULATION_TIMEOUT_SECONDS values are caught by validation."""
        from worth_it.config import Settings

        # Create a Settings subclass to test with invalid timeout
        class InvalidTimeoutSettings(Settings):
            WS_SIMULATION_TIMEOUT_SECONDS = 3  # Invalid: must be >= 5

        test_settings = InvalidTimeoutSettings()
        try:
            test_settings.validate()
            raise AssertionError(
                "Should have raised validation error for WS_SIMULATION_TIMEOUT_SECONDS=3"
            )
        except ValueError as e:
            assert "WS_SIMULATION_TIMEOUT_SECONDS" in str(e)

    def test_monte_carlo_request_validates_against_config(self):
        """Test that MonteCarloRequest validates num_simulations against config."""
        from pydantic import ValidationError as PydanticValidationError

        from worth_it.config import settings
        from worth_it.models import MonteCarloRequest

        # Valid base_params with all required fields (Issue #248 typed format)
        valid_base_params = {
            "exit_year": 5,
            "current_job_monthly_salary": 10000.0,
            "startup_monthly_salary": 8000.0,
            "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.05,
            "investment_frequency": "Monthly",
            "failure_probability": 0.25,
            # Flat typed RSUParams
            "startup_params": {
                "equity_type": "RSU",
                "monthly_salary": 8000.0,
                "total_equity_grant_pct": 5.0,
                "vesting_period": 4,
                "cliff_period": 1,
                "exit_valuation": 20_000_000.0,
                "simulate_dilution": False,
                "dilution_rounds": None,
            },
        }

        # Valid request
        valid_request = MonteCarloRequest(
            num_simulations=100,
            base_params=valid_base_params,
            sim_param_configs={},
        )
        assert valid_request.num_simulations == 100

        # Request exceeding MAX_SIMULATIONS should fail
        try:
            MonteCarloRequest(
                num_simulations=settings.MAX_SIMULATIONS + 1,
                base_params=valid_base_params,
                sim_param_configs={},
            )
            raise AssertionError("Should have raised validation error")
        except (ValueError, PydanticValidationError) as e:
            error_msg = str(e)
            assert "exceeds" in error_msg.lower() or "maximum" in error_msg.lower()


class TestWebSocketConnectionTracker:
    """Unit tests for the WebSocket connection tracker."""

    @pytest.mark.asyncio
    async def test_connection_tracker_allows_within_limit(self):
        """Test that connections within the limit are allowed."""
        from worth_it.api import WebSocketConnectionTracker

        tracker = WebSocketConnectionTracker()
        client_ip = "192.168.1.100"

        # First connection should succeed
        assert await tracker.register_connection(client_ip) is True
        assert tracker.get_active_connections(client_ip) == 1

        # Unregister
        await tracker.unregister_connection(client_ip)
        assert tracker.get_active_connections(client_ip) == 0

    @pytest.mark.asyncio
    async def test_connection_tracker_blocks_over_limit(self):
        """Test that connections over the limit are blocked."""
        from worth_it.api import WebSocketConnectionTracker
        from worth_it.config import settings

        tracker = WebSocketConnectionTracker()
        client_ip = "192.168.1.101"

        # Register max connections
        for _ in range(settings.WS_MAX_CONCURRENT_PER_IP):
            assert await tracker.register_connection(client_ip) is True

        # Next should fail
        assert await tracker.register_connection(client_ip) is False

        # Clean up
        for _ in range(settings.WS_MAX_CONCURRENT_PER_IP):
            await tracker.unregister_connection(client_ip)

    @pytest.mark.asyncio
    async def test_connection_tracker_independent_per_ip(self):
        """Test that different IPs have independent connection limits."""
        from worth_it.api import WebSocketConnectionTracker
        from worth_it.config import settings

        tracker = WebSocketConnectionTracker()
        ip1 = "192.168.1.1"
        ip2 = "192.168.1.2"

        # Fill ip1's limit
        for _ in range(settings.WS_MAX_CONCURRENT_PER_IP):
            await tracker.register_connection(ip1)

        # ip2 should still be able to connect
        assert await tracker.register_connection(ip2) is True

        # Clean up
        for _ in range(settings.WS_MAX_CONCURRENT_PER_IP):
            await tracker.unregister_connection(ip1)
        await tracker.unregister_connection(ip2)


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
        assert response.status_code == 400  # Validation error (structured format)


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
        founder_payout = next(p for p in low_exit["stakeholder_payouts"] if p["name"] == "Founder")
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
        assert response.status_code == 400  # Validation error (structured format)


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


class TestSecurityConfiguration:
    """Tests for security-related configuration settings."""

    def test_api_host_defaults_to_localhost(self):
        """Test that API_HOST defaults to 127.0.0.1 for security."""
        import os

        # Save and clear any existing env var
        original = os.environ.pop("API_HOST", None)
        try:
            # Import Settings after clearing the env var so defaults are applied
            from worth_it.config import Settings

            assert Settings.API_HOST == "127.0.0.1", (
                "API_HOST should default to 127.0.0.1 for security"
            )
        finally:
            # Restore original if it existed
            if original is not None:
                os.environ["API_HOST"] = original

    def test_cors_origin_validation_rejects_invalid_format(self):
        """Test that invalid CORS origin format is rejected."""
        from worth_it.config import Settings

        # Create a test settings class that we can manipulate
        class TestSettings(Settings):
            ENVIRONMENT = "development"

            @staticmethod
            def get_cors_origins() -> list[str]:
                return ["invalid-origin-without-protocol"]

        with pytest.raises(ValueError) as exc_info:
            TestSettings.validate()
        assert "Invalid CORS origin" in str(exc_info.value)

    def test_cors_empty_strings_filtered_from_malformed_input(self):
        """Test that empty strings from malformed CORS input are filtered out."""
        import os

        # Simulate malformed input with extra commas
        original = os.environ.get("CORS_ORIGINS")
        try:
            os.environ["CORS_ORIGINS"] = "https://app.com,,https://api.com,,"
            from worth_it.config import Settings

            origins = Settings.get_cors_origins()
            # Empty strings should be filtered out
            assert "" not in origins
            assert origins == ["https://app.com", "https://api.com"]
        finally:
            if original is not None:
                os.environ["CORS_ORIGINS"] = original
            else:
                os.environ.pop("CORS_ORIGINS", None)

    def test_cors_wildcard_rejected_in_production(self):
        """Test that wildcard CORS is rejected in production."""
        from worth_it.config import Settings

        class TestSettings(Settings):
            ENVIRONMENT = "production"
            API_PORT = 8000
            STREAMLIT_PORT = 8501
            MAX_SIMULATIONS = 10000
            LOG_LEVEL = "INFO"

            @staticmethod
            def get_cors_origins() -> list[str]:
                return ["*"]

            @classmethod
            def is_production(cls) -> bool:
                return True

        with pytest.raises(ValueError) as exc_info:
            TestSettings.validate()
        assert "Wildcard '*' CORS origin is not allowed in production" in str(exc_info.value)

    def test_cors_wildcard_allowed_in_development(self):
        """Test that wildcard CORS is allowed in development."""
        from worth_it.config import Settings

        class TestSettings(Settings):
            ENVIRONMENT = "development"
            API_PORT = 8000
            STREAMLIT_PORT = 8501
            MAX_SIMULATIONS = 10000
            LOG_LEVEL = "INFO"

            @staticmethod
            def get_cors_origins() -> list[str]:
                return ["*"]

            @classmethod
            def is_production(cls) -> bool:
                return False

        # Should not raise
        TestSettings.validate()

    def test_valid_cors_origins_accepted(self):
        """Test that valid CORS origins are accepted."""
        from worth_it.config import Settings

        class TestSettings(Settings):
            ENVIRONMENT = "production"
            API_PORT = 8000
            STREAMLIT_PORT = 8501
            MAX_SIMULATIONS = 10000
            LOG_LEVEL = "INFO"

            @staticmethod
            def get_cors_origins() -> list[str]:
                return ["https://app.example.com", "https://preview.vercel.app"]

            @classmethod
            def is_production(cls) -> bool:
                return True

        # Should not raise
        TestSettings.validate()

    def test_validate_security_logs_warnings_in_production(self, caplog):
        """Test that security warnings are logged in production."""
        import logging

        from worth_it.config import Settings

        class TestSettings(Settings):
            ENVIRONMENT = "production"
            API_HOST = "0.0.0.0"  # nosec B104 - test value

            @staticmethod
            def get_cors_origins() -> list[str]:
                return ["http://insecure.example.com"]

            @classmethod
            def is_production(cls) -> bool:
                return True

        with caplog.at_level(logging.WARNING):
            TestSettings.validate_security()

        # Should warn about 0.0.0.0 binding
        assert any("0.0.0.0" in record.message for record in caplog.records)
        # Should warn about non-HTTPS origin
        assert any("Non-HTTPS origin" in record.message for record in caplog.records)


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
        assert response.status_code == 400  # Validation error (structured format)

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
        assert response.status_code == 400  # Validation error (structured format)


class TestBaseParamsValidation:
    """Tests for base_params validation in Monte Carlo and Sensitivity Analysis.

    Updated for Issue #248 typed format.
    """

    def test_monte_carlo_missing_exit_year(self):
        """Test Monte Carlo rejects request missing exit_year."""
        request_data = {
            "num_simulations": 50,
            "base_params": {
                # exit_year is missing
                "current_job_monthly_salary": 10000.0,
                "startup_monthly_salary": 8000.0,
                "current_job_salary_growth_rate": 0.03,
                "annual_roi": 0.05,
                "investment_frequency": "Annually",
                "failure_probability": 0.25,
                "startup_params": {
                    "equity_type": "RSU",
                    "monthly_salary": 8000.0,
                    "total_equity_grant_pct": 5.0,
                    "vesting_period": 4,
                    "cliff_period": 1,
                    "exit_valuation": 20_000_000.0,
                    "simulate_dilution": False,
                    "dilution_rounds": None,
                },
            },
            "sim_param_configs": {},
        }
        response = client.post("/api/monte-carlo", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # Field names are in the 'field' attribute of each detail
        details = data["error"].get("details", [])
        assert any("exit_year" in d.get("field", "") for d in details)

    def test_monte_carlo_invalid_exit_year_too_low(self):
        """Test Monte Carlo rejects exit_year below 1."""
        request_data = {
            "num_simulations": 50,
            "base_params": {
                "exit_year": 0,  # Invalid - too low
                "current_job_monthly_salary": 10000.0,
                "startup_monthly_salary": 8000.0,
                "current_job_salary_growth_rate": 0.03,
                "annual_roi": 0.05,
                "investment_frequency": "Annually",
                "failure_probability": 0.25,
                "startup_params": {
                    "equity_type": "RSU",
                    "monthly_salary": 8000.0,
                    "total_equity_grant_pct": 5.0,
                    "vesting_period": 4,
                    "cliff_period": 1,
                    "exit_valuation": 20_000_000.0,
                    "simulate_dilution": False,
                    "dilution_rounds": None,
                },
            },
            "sim_param_configs": {},
        }
        response = client.post("/api/monte-carlo", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # Field names are in the 'field' attribute of each detail
        details = data["error"].get("details", [])
        assert any("exit_year" in d.get("field", "") for d in details)

    def test_monte_carlo_invalid_exit_year_too_high(self):
        """Test Monte Carlo rejects exit_year above 20."""
        request_data = {
            "num_simulations": 50,
            "base_params": {
                "exit_year": 25,  # Invalid - too high
                "current_job_monthly_salary": 10000.0,
                "startup_monthly_salary": 8000.0,
                "current_job_salary_growth_rate": 0.03,
                "annual_roi": 0.05,
                "investment_frequency": "Annually",
                "failure_probability": 0.25,
                "startup_params": {
                    "equity_type": "RSU",
                    "monthly_salary": 8000.0,
                    "total_equity_grant_pct": 5.0,
                    "vesting_period": 4,
                    "cliff_period": 1,
                    "exit_valuation": 20_000_000.0,
                    "simulate_dilution": False,
                    "dilution_rounds": None,
                },
            },
            "sim_param_configs": {},
        }
        response = client.post("/api/monte-carlo", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # Field names are in the 'field' attribute of each detail
        details = data["error"].get("details", [])
        assert any("exit_year" in d.get("field", "") for d in details)

    def test_sensitivity_missing_exit_year(self):
        """Test Sensitivity Analysis rejects request missing exit_year."""
        request_data = {
            "base_params": {
                # exit_year is missing
                "current_job_monthly_salary": 10000.0,
                "startup_monthly_salary": 8000.0,
                "current_job_salary_growth_rate": 0.03,
                "annual_roi": 0.05,
                "investment_frequency": "Annually",
                "failure_probability": 0.25,
                "startup_params": {
                    "equity_type": "RSU",
                    "monthly_salary": 8000.0,
                    "total_equity_grant_pct": 5.0,
                    "vesting_period": 4,
                    "cliff_period": 1,
                    "exit_valuation": 20_000_000.0,
                    "simulate_dilution": False,
                    "dilution_rounds": None,
                },
            },
            "sim_param_configs": {},
        }
        response = client.post("/api/sensitivity-analysis", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # Field names are in the 'field' attribute of each detail
        details = data["error"].get("details", [])
        assert any("exit_year" in d.get("field", "") for d in details)

    def test_sensitivity_invalid_exit_year(self):
        """Test Sensitivity Analysis rejects invalid exit_year."""
        request_data = {
            "base_params": {
                "exit_year": -1,  # Invalid
                "current_job_monthly_salary": 10000.0,
                "startup_monthly_salary": 8000.0,
                "current_job_salary_growth_rate": 0.03,
                "annual_roi": 0.05,
                "investment_frequency": "Annually",
                "failure_probability": 0.25,
                "startup_params": {
                    "equity_type": "RSU",
                    "monthly_salary": 8000.0,
                    "total_equity_grant_pct": 5.0,
                    "vesting_period": 4,
                    "cliff_period": 1,
                    "exit_valuation": 20_000_000.0,
                    "simulate_dilution": False,
                    "dilution_rounds": None,
                },
            },
            "sim_param_configs": {},
        }
        response = client.post("/api/sensitivity-analysis", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # Field names are in the 'field' attribute of each detail
        details = data["error"].get("details", [])
        assert any("exit_year" in d.get("field", "") for d in details)

    def test_monte_carlo_boolean_exit_year_rejected(self):
        """Test Monte Carlo rejects boolean exit_year values.

        Python's bool is a subclass of int, so isinstance(True, int) returns True.
        We must explicitly reject booleans to avoid confusing True/False as 1/0.
        """
        request_data = {
            "num_simulations": 50,
            "base_params": {
                "exit_year": True,  # Boolean, not integer - should be rejected
                "current_job_monthly_salary": 10000.0,
                "startup_monthly_salary": 8000.0,
                "current_job_salary_growth_rate": 0.03,
                "annual_roi": 0.05,
                "investment_frequency": "Annually",
                "failure_probability": 0.25,
                "startup_params": {
                    "equity_type": "RSU",
                    "monthly_salary": 8000.0,
                    "total_equity_grant_pct": 5.0,
                    "vesting_period": 4,
                    "cliff_period": 1,
                    "exit_valuation": 20_000_000.0,
                    "simulate_dilution": False,
                    "dilution_rounds": None,
                },
            },
            "sim_param_configs": {},
        }
        response = client.post("/api/monte-carlo", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # For model-level validators, field info is in the error message
        details = data["error"].get("details", [])
        assert any("exit_year" in d.get("message", "") for d in details)

    def test_sensitivity_boolean_exit_year_rejected(self):
        """Test Sensitivity Analysis rejects boolean exit_year values."""
        request_data = {
            "base_params": {
                "exit_year": False,  # Boolean, not integer - should be rejected
                "current_job_monthly_salary": 10000.0,
                "startup_monthly_salary": 8000.0,
                "current_job_salary_growth_rate": 0.03,
                "annual_roi": 0.05,
                "investment_frequency": "Annually",
                "failure_probability": 0.25,
                "startup_params": {
                    "equity_type": "RSU",
                    "monthly_salary": 8000.0,
                    "total_equity_grant_pct": 5.0,
                    "vesting_period": 4,
                    "cliff_period": 1,
                    "exit_valuation": 20_000_000.0,
                    "simulate_dilution": False,
                    "dilution_rounds": None,
                },
            },
            "sim_param_configs": {},
        }
        response = client.post("/api/sensitivity-analysis", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # For model-level validators, field info is in the error message
        details = data["error"].get("details", [])
        assert any("exit_year" in d.get("message", "") for d in details)

    def test_monte_carlo_missing_multiple_required_fields(self):
        """Test Monte Carlo reports all missing required fields."""
        request_data = {
            "num_simulations": 50,
            "base_params": {
                "current_job_monthly_salary": 10000.0,
                # Missing: exit_year, startup_monthly_salary, annual_roi, etc.
            },
            "sim_param_configs": {},
        }
        response = client.post("/api/monte-carlo", json=request_data)
        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # Field names are in the 'field' attribute of each detail
        details = data["error"].get("details", [])
        fields = " ".join(d.get("field", "") for d in details)
        assert "exit_year" in fields
        assert "startup_monthly_salary" in fields


# --- Structured Error Response Tests ---


class TestStructuredErrorResponses:
    """Tests for the standardized error response format.

    All API errors should return the structure:
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "Human readable message",
            "details": [{"field": "...", "message": "..."}]  # optional
        }
    }
    """

    def test_validation_error_structure(self):
        """Test validation errors return structured format with field details."""
        # Send request with invalid exit_year
        request_data = {
            "exit_year": 100,  # Invalid: must be between 1 and 20
            "current_job_monthly_salary": 10000,
            "startup_monthly_salary": 8000,
            "current_job_salary_growth_rate": 0.03,
        }
        response = client.post("/api/monthly-data-grid", json=request_data)
        assert response.status_code == 400

        data = response.json()
        # Verify nested structure
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert isinstance(data["error"]["message"], str)

    def test_validation_error_includes_field_details(self):
        """Test validation errors include field-level details."""
        # Send request with multiple invalid fields
        request_data = {
            "exit_year": -5,  # Invalid: must be positive
            "current_job_monthly_salary": -1000,  # Invalid: must be positive
            "startup_monthly_salary": 8000,
            "current_job_salary_growth_rate": 0.03,
        }
        response = client.post("/api/monthly-data-grid", json=request_data)
        assert response.status_code == 400

        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        # Should have field details
        assert "details" in data["error"]
        assert isinstance(data["error"]["details"], list)
        # Each detail should have field and message
        for detail in data["error"]["details"]:
            assert "field" in detail
            assert "message" in detail

    def test_calculation_error_structure(self):
        """Test calculation errors return structured format."""
        from unittest.mock import patch

        from worth_it.services import cap_table_service

        with patch.object(
            cap_table_service,
            "calculate_dilution_from_valuation",
            side_effect=ValueError("Internal calculation failed"),
        ):
            request_data = {
                "pre_money_valuation": 10000000,
                "amount_raised": 1000000,
            }
            response = client.post("/api/dilution", json=request_data)
            assert response.status_code == 400

            data = response.json()
            # Verify nested structure
            assert "error" in data
            assert data["error"]["code"] == "CALCULATION_ERROR"
            assert isinstance(data["error"]["message"], str)
            # Calculation errors shouldn't expose internal details
            assert "Internal" not in data["error"]["message"]
            # No field details for calculation errors
            assert data["error"].get("details") is None

    def test_internal_error_structure(self):
        """Test unexpected errors return structured format with INTERNAL_ERROR code."""
        from unittest.mock import patch

        from fastapi.testclient import TestClient

        from worth_it import api
        from worth_it.api import app

        # Use a test client that doesn't raise server exceptions
        # This allows us to test 500 error response format
        test_client = TestClient(app, raise_server_exceptions=False)

        # Patch the startup_service instance's calculate_irr method
        with patch.object(
            api.startup_service,
            "calculate_irr",
            side_effect=RuntimeError("Unexpected system failure"),
        ):
            request_data = {
                "monthly_surpluses": [100] * 12,
                "final_payout_value": 1000,
            }
            response = test_client.post("/api/irr", json=request_data)
            assert response.status_code == 500

            data = response.json()
            # Verify nested structure
            assert "error" in data
            assert data["error"]["code"] == "INTERNAL_ERROR"
            assert isinstance(data["error"]["message"], str)
            # Should NOT expose internal error details
            assert "Unexpected system failure" not in data["error"]["message"]
            assert "RuntimeError" not in data["error"]["message"]

    def test_error_response_is_json_serializable(self):
        """Test that error responses are valid JSON."""
        request_data = {
            "exit_year": "not_a_number",  # Type error
            "current_job_monthly_salary": 10000,
            "startup_monthly_salary": 8000,
            "current_job_salary_growth_rate": 0.03,
        }
        response = client.post("/api/monthly-data-grid", json=request_data)

        # Should be valid JSON
        data = response.json()
        assert "error" in data

        # Verify we can re-serialize
        import json

        json_str = json.dumps(data)
        assert isinstance(json_str, str)


# ============================================================================
# First Chicago Method Pydantic Model Tests
# ============================================================================


class TestFirstChicagoModels:
    """Tests for First Chicago Pydantic models."""

    def test_scenario_request_validation(self) -> None:
        """Test FirstChicagoScenarioRequest validation."""
        from worth_it.models import FirstChicagoScenarioRequest

        scenario = FirstChicagoScenarioRequest(
            name="Best Case",
            probability=0.25,
            exit_value=50_000_000,
            years_to_exit=5,
        )
        assert scenario.name == "Best Case"
        assert scenario.probability == 0.25

    def test_scenario_probability_must_be_valid(self) -> None:
        """Test probability validation (0 to 1)."""
        from worth_it.models import FirstChicagoScenarioRequest

        with pytest.raises(ValueError):
            FirstChicagoScenarioRequest(
                name="Invalid",
                probability=1.5,  # > 1.0
                exit_value=10_000_000,
                years_to_exit=5,
            )

    def test_full_request_validation(self) -> None:
        """Test FirstChicagoRequest with multiple scenarios."""
        from worth_it.models import FirstChicagoRequest, FirstChicagoScenarioRequest

        request = FirstChicagoRequest(
            scenarios=[
                FirstChicagoScenarioRequest(
                    name="Best", probability=0.25, exit_value=50_000_000, years_to_exit=5
                ),
                FirstChicagoScenarioRequest(
                    name="Base", probability=0.50, exit_value=20_000_000, years_to_exit=5
                ),
                FirstChicagoScenarioRequest(
                    name="Worst", probability=0.25, exit_value=5_000_000, years_to_exit=5
                ),
            ],
            discount_rate=0.25,
        )
        assert len(request.scenarios) == 3


class TestFirstChicagoEndpoint:
    """Tests for First Chicago API endpoint."""

    def test_first_chicago_basic_calculation(self) -> None:
        """Test POST /api/valuation/first-chicago with standard 3-scenario input."""
        request_data = {
            "scenarios": [
                {
                    "name": "Best Case",
                    "probability": 0.25,
                    "exit_value": 50_000_000,
                    "years_to_exit": 5,
                },
                {
                    "name": "Base Case",
                    "probability": 0.50,
                    "exit_value": 20_000_000,
                    "years_to_exit": 5,
                },
                {
                    "name": "Worst Case",
                    "probability": 0.25,
                    "exit_value": 5_000_000,
                    "years_to_exit": 5,
                },
            ],
            "discount_rate": 0.25,
        }

        response = client.post("/api/valuation/first-chicago", json=request_data)
        assert response.status_code == 200

        data = response.json()
        assert "weighted_value" in data
        assert "present_value" in data
        assert "scenario_values" in data
        assert "scenario_present_values" in data
        assert data["method"] == "first_chicago"

        # Verify weighted value: 0.25*50M + 0.5*20M + 0.25*5M = 23.75M
        assert data["weighted_value"] == pytest.approx(23_750_000, rel=0.01)

    def test_first_chicago_different_exit_years(self) -> None:
        """Test with scenarios having different years_to_exit values."""
        request_data = {
            "scenarios": [
                {
                    "name": "Early Exit",
                    "probability": 0.30,
                    "exit_value": 30_000_000,
                    "years_to_exit": 3,
                },
                {
                    "name": "Normal Exit",
                    "probability": 0.70,
                    "exit_value": 60_000_000,
                    "years_to_exit": 7,
                },
            ],
            "discount_rate": 0.20,
        }

        response = client.post("/api/valuation/first-chicago", json=request_data)
        assert response.status_code == 200

        data = response.json()
        # Each scenario discounted with its own time horizon
        assert "Early Exit" in data["scenario_present_values"]
        assert "Normal Exit" in data["scenario_present_values"]

    def test_first_chicago_validation_error(self) -> None:
        """Test validation rejects invalid input."""
        # Missing required fields - app uses 400 for validation errors
        response = client.post("/api/valuation/first-chicago", json={})
        assert response.status_code == 400

        # Invalid probability (> 1.0)
        response = client.post(
            "/api/valuation/first-chicago",
            json={
                "scenarios": [
                    {
                        "name": "Invalid",
                        "probability": 1.5,
                        "exit_value": 10_000_000,
                        "years_to_exit": 5,
                    }
                ],
                "discount_rate": 0.25,
            },
        )
        assert response.status_code == 400


class TestPreRevenueValuationAPI:
    """Test pre-revenue valuation API endpoints (Phase 2)."""

    def test_berkus_valuation_endpoint(self):
        """Test Berkus Method valuation calculation."""
        request_data = {
            "sound_idea": 400_000,
            "prototype": 350_000,
            "quality_team": 500_000,
            "strategic_relationships": 250_000,
            "product_rollout": 200_000,
        }
        response = client.post("/api/valuation/berkus", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert data["method"] == "berkus"
        assert data["valuation"] == 1_700_000  # Sum of all criteria
        assert "breakdown" in data
        assert len(data["breakdown"]) == 5

    def test_berkus_with_custom_max_per_criterion(self):
        """Test Berkus Method with custom max value per criterion."""
        request_data = {
            "sound_idea": 300_000,
            "prototype": 300_000,
            "quality_team": 300_000,
            "strategic_relationships": 300_000,
            "product_rollout": 300_000,
            "max_per_criterion": 300_000,
        }
        response = client.post("/api/valuation/berkus", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert data["valuation"] == 1_500_000  # 5 * 300K

    def test_berkus_max_valuation(self):
        """Test that Berkus maximum possible valuation is $2.5M (5 * $500K)."""
        request_data = {
            "sound_idea": 500_000,
            "prototype": 500_000,
            "quality_team": 500_000,
            "strategic_relationships": 500_000,
            "product_rollout": 500_000,
        }
        response = client.post("/api/valuation/berkus", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # All criteria at maximum
        assert data["valuation"] == 2_500_000  # Max possible
        for key in data["breakdown"]:
            assert data["breakdown"][key] == 500_000

    def test_scorecard_valuation_endpoint(self):
        """Test Scorecard Method valuation calculation."""
        request_data = {
            "base_valuation": 2_000_000,
            "factors": [
                {"name": "Team", "weight": 0.30, "score": 1.2},
                {"name": "Market Size", "weight": 0.25, "score": 1.0},
                {"name": "Product", "weight": 0.20, "score": 0.8},
                {"name": "Competition", "weight": 0.15, "score": 1.1},
                {"name": "Sales Channels", "weight": 0.10, "score": 0.9},
            ],
        }
        response = client.post("/api/valuation/scorecard", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert data["method"] == "scorecard"
        assert "valuation" in data
        assert "adjustment_factor" in data
        assert "factor_contributions" in data
        assert len(data["factor_contributions"]) == 5

    def test_scorecard_above_average_team(self):
        """Test Scorecard with above-average team score."""
        request_data = {
            "base_valuation": 1_000_000,
            "factors": [
                {"name": "Team", "weight": 1.0, "score": 1.5},  # 50% above average
            ],
        }
        response = client.post("/api/valuation/scorecard", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert data["valuation"] == pytest.approx(1_500_000)
        assert data["adjustment_factor"] == pytest.approx(1.5)

    def test_scorecard_below_average(self):
        """Test Scorecard with below-average score."""
        request_data = {
            "base_valuation": 1_000_000,
            "factors": [
                {"name": "Team", "weight": 1.0, "score": 0.5},  # 50% below average
            ],
        }
        response = client.post("/api/valuation/scorecard", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert data["valuation"] == pytest.approx(500_000)
        assert data["adjustment_factor"] == pytest.approx(0.5)

    def test_risk_factor_summation_endpoint(self):
        """Test Risk Factor Summation valuation calculation."""
        request_data = {
            "base_valuation": 2_000_000,
            "factors": [
                {"name": "Management", "adjustment": 250_000},
                {"name": "Stage", "adjustment": -125_000},
                {"name": "Competition", "adjustment": -250_000},
                {"name": "Technology", "adjustment": 500_000},
            ],
        }
        response = client.post("/api/valuation/risk-factor-summation", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert data["method"] == "risk_factor_summation"
        assert data["valuation"] == 2_375_000  # 2M + 375K adjustment
        assert data["total_adjustment"] == 375_000
        assert len(data["factor_adjustments"]) == 4

    def test_risk_factor_positive_adjustments(self):
        """Test Risk Factor Summation with all positive adjustments."""
        request_data = {
            "base_valuation": 1_000_000,
            "factors": [
                {"name": "Strong Management", "adjustment": 500_000},
                {"name": "Proven Technology", "adjustment": 500_000},
            ],
        }
        response = client.post("/api/valuation/risk-factor-summation", json=request_data)
        assert response.status_code == 200
        data = response.json()

        assert data["valuation"] == 2_000_000
        assert data["total_adjustment"] == 1_000_000

    def test_risk_factor_negative_adjustments_floor_at_zero(self):
        """Test that valuation doesn't go negative with extreme negative adjustments."""
        request_data = {
            "base_valuation": 500_000,
            "factors": [
                {"name": "High Risk", "adjustment": -400_000},
                {"name": "Very High Risk", "adjustment": -500_000},
            ],
        }
        response = client.post("/api/valuation/risk-factor-summation", json=request_data)
        assert response.status_code == 200
        data = response.json()

        # Valuation should floor at 0, not go negative
        assert data["valuation"] == 0
        assert data["total_adjustment"] == -900_000

    def test_berkus_validation_error(self):
        """Test that invalid Berkus inputs are rejected."""
        request_data = {
            "sound_idea": -100_000,  # Invalid - negative
            "prototype": 350_000,
            "quality_team": 500_000,
            "strategic_relationships": 250_000,
            "product_rollout": 200_000,
        }
        response = client.post("/api/valuation/berkus", json=request_data)
        assert response.status_code == 400

    def test_scorecard_validation_empty_factors(self):
        """Test that Scorecard requires at least one factor."""
        request_data = {
            "base_valuation": 2_000_000,
            "factors": [],  # Invalid - empty
        }
        response = client.post("/api/valuation/scorecard", json=request_data)
        assert response.status_code == 400

    def test_risk_factor_validation_empty_factors(self):
        """Test that Risk Factor requires at least one factor."""
        request_data = {
            "base_valuation": 2_000_000,
            "factors": [],  # Invalid - empty
        }
        response = client.post("/api/valuation/risk-factor-summation", json=request_data)
        assert response.status_code == 400


# --- Benchmark API Tests (Phase 4) ---


class TestBenchmarkAPI:
    """Tests for industry benchmark API endpoints."""

    def test_list_industries(self):
        """Test listing all available industries."""
        response = client.get("/api/valuation/benchmarks/industries")
        assert response.status_code == 200
        industries = response.json()

        # Should have at least 15 industries
        assert len(industries) >= 15

        # Each industry should have code and name
        for industry in industries:
            assert "code" in industry
            assert "name" in industry

        # Verify some expected industries exist
        codes = [i["code"] for i in industries]
        assert "saas" in codes
        assert "fintech" in codes
        assert "ai_ml" in codes

    def test_get_industry_benchmark(self):
        """Test retrieving benchmark data for a specific industry."""
        response = client.get("/api/valuation/benchmarks/saas")
        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert data["code"] == "saas"
        assert data["name"] == "SaaS / Software"
        assert "description" in data
        assert "metrics" in data

        # Check metrics
        assert "revenue_multiple" in data["metrics"]
        rm = data["metrics"]["revenue_multiple"]
        assert rm["name"] == "revenue_multiple"
        assert "min_value" in rm
        assert "typical_low" in rm
        assert "median" in rm
        assert "typical_high" in rm
        assert "max_value" in rm
        assert rm["unit"] == "x"

        # Verify expected metrics exist
        assert "discount_rate" in data["metrics"]
        assert "growth_rate" in data["metrics"]
        assert "gross_margin" in data["metrics"]

    def test_get_unknown_industry_returns_404(self):
        """Test that unknown industry returns 404."""
        response = client.get("/api/valuation/benchmarks/unknown_industry_xyz")
        assert response.status_code == 404

    def test_validate_value_within_typical_range(self):
        """Test validating a value within typical range returns ok."""
        response = client.post(
            "/api/valuation/benchmarks/validate",
            json={
                "industry_code": "saas",
                "metric_name": "revenue_multiple",
                "value": 6.0,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["is_valid"] is True
        assert data["severity"] == "ok"
        assert data["benchmark_median"] == pytest.approx(6.0)
        assert data["suggested_range"] is not None

    def test_validate_value_above_typical_returns_warning(self):
        """Test validating a value above typical range returns warning."""
        response = client.post(
            "/api/valuation/benchmarks/validate",
            json={
                "industry_code": "saas",
                "metric_name": "revenue_multiple",
                "value": 15.0,  # Above typical (4-12) but within max (25)
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["is_valid"] is True
        assert data["severity"] == "warning"
        assert "above typical" in data["message"].lower()

    def test_validate_value_below_typical_returns_warning(self):
        """Test validating a value below typical range returns warning."""
        response = client.post(
            "/api/valuation/benchmarks/validate",
            json={
                "industry_code": "saas",
                "metric_name": "revenue_multiple",
                "value": 2.5,  # Below typical (4-12) but above min (1)
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["is_valid"] is True
        assert data["severity"] == "warning"
        assert "below typical" in data["message"].lower()

    def test_validate_value_above_max_returns_error(self):
        """Test validating a value above maximum returns error."""
        response = client.post(
            "/api/valuation/benchmarks/validate",
            json={
                "industry_code": "saas",
                "metric_name": "revenue_multiple",
                "value": 30.0,  # Above max (25)
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["is_valid"] is False
        assert data["severity"] == "error"

    def test_validate_value_below_min_returns_error(self):
        """Test validating a value below minimum returns error."""
        response = client.post(
            "/api/valuation/benchmarks/validate",
            json={
                "industry_code": "saas",
                "metric_name": "revenue_multiple",
                "value": 0.5,  # Below min (1)
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["is_valid"] is False
        assert data["severity"] == "error"

    def test_validate_unknown_industry_returns_ok(self):
        """Test validating against unknown industry returns ok (no benchmark)."""
        response = client.post(
            "/api/valuation/benchmarks/validate",
            json={
                "industry_code": "unknown_xyz",
                "metric_name": "revenue_multiple",
                "value": 100.0,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["is_valid"] is True
        assert data["severity"] == "ok"

    def test_validate_unknown_metric_returns_ok(self):
        """Test validating unknown metric returns ok (no benchmark)."""
        response = client.post(
            "/api/valuation/benchmarks/validate",
            json={
                "industry_code": "saas",
                "metric_name": "unknown_metric",
                "value": 100.0,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["is_valid"] is True
        assert data["severity"] == "ok"
