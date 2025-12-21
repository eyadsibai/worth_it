"""Pytest configuration for backend tests.

This file is loaded before test modules, allowing us to configure
the test environment before any application code is imported.

Also provides shared fixtures for the new typed request format (Issue #248).
"""

import os

import pytest

# Disable rate limiting during tests to prevent test interference
os.environ["RATE_LIMIT_ENABLED"] = "false"


# --- RSU Params Fixtures ---


@pytest.fixture
def rsu_params_basic():
    """Basic RSU params in the new flat typed format."""
    return {
        "equity_type": "RSU",
        "monthly_salary": 8000.0,
        "total_equity_grant_pct": 5.0,  # 5% as percentage
        "vesting_period": 4,
        "cliff_period": 1,
        "exit_valuation": 10_000_000.0,
        "simulate_dilution": False,
        "dilution_rounds": None,
    }


@pytest.fixture
def rsu_params_high_value():
    """RSU params with higher valuation for Monte Carlo tests."""
    return {
        "equity_type": "RSU",
        "monthly_salary": 12000.0,
        "total_equity_grant_pct": 2.0,
        "vesting_period": 4,
        "cliff_period": 1,
        "exit_valuation": 50_000_000.0,
        "simulate_dilution": False,
        "dilution_rounds": None,
    }


# --- Stock Options Params Fixtures ---


@pytest.fixture
def options_params_basic():
    """Basic stock options params in the new flat typed format."""
    return {
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


@pytest.fixture
def options_params_high_value():
    """Stock options params with higher values for Monte Carlo tests."""
    return {
        "equity_type": "STOCK_OPTIONS",
        "monthly_salary": 12000.0,
        "num_options": 50000,
        "strike_price": 2.0,
        "vesting_period": 4,
        "cliff_period": 1,
        "exit_price_per_share": 20.0,
        "exercise_strategy": "AT_EXIT",
        "exercise_year": None,
    }


# --- Base Params Fixtures (for Monte Carlo / Sensitivity) ---


@pytest.fixture
def base_params_rsu(rsu_params_high_value):
    """TypedBaseParams with RSU startup_params."""
    return {
        "exit_year": 5,
        "current_job_monthly_salary": 15000.0,
        "startup_monthly_salary": 12000.0,
        "current_job_salary_growth_rate": 0.03,
        "annual_roi": 0.06,
        "investment_frequency": "Monthly",
        "failure_probability": 0.3,
        "startup_params": rsu_params_high_value,
    }


@pytest.fixture
def base_params_options(options_params_high_value):
    """TypedBaseParams with stock options startup_params."""
    return {
        "exit_year": 5,
        "current_job_monthly_salary": 15000.0,
        "startup_monthly_salary": 12000.0,
        "current_job_salary_growth_rate": 0.03,
        "annual_roi": 0.06,
        "investment_frequency": "Monthly",
        "failure_probability": 0.3,
        "startup_params": options_params_high_value,
    }


# --- Sim Param Configs Fixtures ---


@pytest.fixture
def sim_param_configs_valuation():
    """sim_param_configs with just valuation variation."""
    return {
        "exit_valuation": {"min": 20_000_000.0, "max": 100_000_000.0},
    }


@pytest.fixture
def sim_param_configs_roi():
    """sim_param_configs with just ROI variation."""
    return {
        "annual_roi": {"min": 0.03, "max": 0.10},
    }


@pytest.fixture
def sim_param_configs_multiple():
    """sim_param_configs with multiple parameters."""
    return {
        "exit_valuation": {"min": 20_000_000.0, "max": 100_000_000.0},
        "annual_roi": {"min": 0.03, "max": 0.10},
        "failure_probability": {"min": 0.1, "max": 0.5},
    }


# --- Full Request Fixtures ---


@pytest.fixture
def monte_carlo_request_rsu(base_params_rsu, sim_param_configs_valuation):
    """Complete Monte Carlo request with RSU params."""
    return {
        "num_simulations": 100,
        "base_params": base_params_rsu,
        "sim_param_configs": sim_param_configs_valuation,
    }


@pytest.fixture
def monte_carlo_request_options(base_params_options, sim_param_configs_valuation):
    """Complete Monte Carlo request with stock options params."""
    return {
        "num_simulations": 100,
        "base_params": base_params_options,
        "sim_param_configs": sim_param_configs_valuation,
    }


@pytest.fixture
def sensitivity_request_rsu(base_params_rsu, sim_param_configs_multiple):
    """Complete sensitivity analysis request with RSU params."""
    return {
        "base_params": base_params_rsu,
        "sim_param_configs": sim_param_configs_multiple,
    }


@pytest.fixture
def sensitivity_request_options(base_params_options, sim_param_configs_multiple):
    """Complete sensitivity analysis request with stock options params."""
    return {
        "base_params": base_params_options,
        "sim_param_configs": sim_param_configs_multiple,
    }
