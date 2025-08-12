"""
Unit tests for the financial calculation functions.
This module uses pytest to test the functions in the 'calculations' module.
"""

import numpy as np
import pandas as pd
import pytest

# Assuming your calculations module is in the same directory or accessible via PYTHONPATH
import calculations
from app import EquityType


# --- Test Fixtures ---
@pytest.fixture
def sample_monthly_df():
    """Provides a sample monthly DataFrame for testing."""
    return calculations.create_monthly_data_grid(
        exit_year=5,
        current_job_monthly_salary=10000,
        startup_monthly_salary=8000,
        current_job_salary_growth_rate=0.0,
    )


@pytest.fixture
def sample_opportunity_cost_df(sample_monthly_df):
    """Provides a sample opportunity cost DataFrame."""
    four_year_df = sample_monthly_df[sample_monthly_df["Year"] <= 4]
    return calculations.calculate_annual_opportunity_cost(
        monthly_df=four_year_df, annual_roi=0.05, investment_frequency="Annually"
    )

# --- Base parameters for Monte Carlo tests ---
@pytest.fixture
def monte_carlo_base_params():
    """Provides a base set of parameters for Monte Carlo simulations."""
    return {
        "exit_year": 5,
        "current_job_monthly_salary": 10000,
        "startup_monthly_salary": 8000,
        "current_job_salary_growth_rate": 0.03,
        "annual_roi": 0.05,
        "investment_frequency": "Annually",
        "startup_params": {
            "equity_type": EquityType.RSU,
            "total_vesting_years": 4,
            "cliff_years": 1,
            "rsu_params": {
                "equity_pct": 0.05,
                "target_exit_valuation": 20_000_000,
                "simulate_dilution": False,
            },
            "options_params": {},
        },
    }

# --- Test Core Functions ---


def test_create_monthly_data_grid():
    """Tests the creation of the monthly data grid."""
    df = calculations.create_monthly_data_grid(
        exit_year=2,
        current_job_monthly_salary=10000,
        startup_monthly_salary=8000,
        current_job_salary_growth_rate=0.10,
    )
    assert len(df) == 24
    assert df["Year"].max() == 2
    assert df["MonthlySurplus"].iloc[0] == 2000
    assert df["MonthlySurplus"].iloc[12] == 3000
    assert "InvestableSurplus" in df.columns


def test_calculate_annual_opportunity_cost(sample_monthly_df):
    """Tests the annual opportunity cost calculation."""
    df = calculations.calculate_annual_opportunity_cost(
        monthly_df=sample_monthly_df, annual_roi=0.05, investment_frequency="Annually"
    )
    assert len(df) == 5
    assert "Opportunity Cost (Invested Surplus)" in df.columns
    assert df["Opportunity Cost (Invested Surplus)"].iloc[-1] > df["Opportunity Cost (Invested Surplus)"].iloc[0]
    assert "Principal Forgone" in df.columns


# --- Test RSU Scenarios ---


def test_calculate_startup_scenario_rsu_no_dilution(sample_opportunity_cost_df):
    """Tests the RSU calculation without dilution."""
    startup_params = {
        "equity_type": EquityType.RSU,
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
    results = calculations.calculate_startup_scenario(sample_opportunity_cost_df, startup_params)
    results_df = results["results_df"]
    assert results["payout_label"] == "Your Equity Value (Post-Dilution)"
    assert "Vested Equity (%)" in results_df.columns
    assert results_df["Vested Equity (%)"].iloc[0] == pytest.approx(1.25)
    assert results_df["Vested Equity (%)"].iloc[-1] == pytest.approx(5.0)


# --- Test Stock Option Scenarios ---


def test_calculate_startup_scenario_options(sample_opportunity_cost_df):
    """Tests the stock option calculation."""
    startup_params = {
        "equity_type": EquityType.STOCK_OPTIONS,
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
    results = calculations.calculate_startup_scenario(sample_opportunity_cost_df, startup_params)
    results_df = results["results_df"]
    assert results["payout_label"] == "Your Options Value"
    final_vested_options = 10000
    expected_payout = (10.0 - 1.0) * final_vested_options
    assert results["final_payout_value"] == pytest.approx(expected_payout)


# --- Test Financial Metrics ---


def test_calculate_irr():
    """Tests the IRR calculation."""
    monthly_surpluses = pd.Series([100] * 12)
    final_payout = 1500
    irr = calculations.calculate_irr(monthly_surpluses, final_payout)
    assert isinstance(irr, float)
    assert 59 < irr < 60


def test_calculate_npv():
    """Tests the NPV calculation."""
    monthly_surpluses = pd.Series([100] * 12)
    final_payout = 1500
    annual_roi = 0.10
    npv = calculations.calculate_npv(monthly_surpluses, annual_roi, final_payout)
    assert isinstance(npv, float)
    assert npv > 0


# --- Test Monte Carlo Simulation ---


def test_run_monte_carlo_simulation(monte_carlo_base_params):
    """Tests the flexible Monte Carlo simulation function with sliders."""
    num_simulations = 100
    sim_param_configs = {
        "valuation": {"min_val": 10_000_000, "max_val": 30_000_000, "mode": 20_000_000},
        "roi": {"min_val": 0.03, "max_val": 0.08, "mode": 0.05},
        "dilution": {"min_val": 0.1, "max_val": 0.5, "mode": 0.2}
    }

    results = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=monte_carlo_base_params,
        sim_param_configs=sim_param_configs,
    )
    assert isinstance(results, dict)
    assert "net_outcomes" in results
    assert len(results["net_outcomes"]) == num_simulations
    assert "simulated_valuations" in results
    assert len(results["simulated_valuations"]) == num_simulations
    assert not np.isnan(results["net_outcomes"]).any()


def test_run_monte_carlo_simulation_no_dilution_sim(monte_carlo_base_params):
    """
    Tests the Monte Carlo simulation runs without error when 'Total Dilution'
    is not a simulated variable, which was the source of the original bug.
    """
    num_simulations = 100
    # Note: "dilution" is NOT included in the simulated parameters
    sim_param_configs = {
        "valuation": {"min_val": 10_000_000, "max_val": 30_000_000, "mode": 20_000_000},
        "roi": {"min_val": 0.03, "max_val": 0.08, "mode": 0.05},
    }

    # This call should now run without raising a TypeError
    results = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=monte_carlo_base_params,
        sim_param_configs=sim_param_configs,
    )
    assert len(results["net_outcomes"]) == num_simulations
    assert not np.isnan(results["net_outcomes"]).any()


def test_run_monte_carlo_iterative_for_exit_year(monte_carlo_base_params):
    """Tests that the iterative method is called when exit_year is simulated."""
    num_simulations = 50
    sim_param_configs = {
        "exit_year": {"min_val": 3, "max_val": 7, "mode": 5}
    }

    results = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=monte_carlo_base_params,
        sim_param_configs=sim_param_configs,
    )
    assert len(results["net_outcomes"]) == num_simulations
    assert not np.isnan(results["net_outcomes"]).any()