"""
Unit tests for the financial calculation functions.
This module uses pytest to test the functions in the 'calculations' module.
"""

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
    # Using a 4-year simulation to match test cases
    four_year_df = sample_monthly_df[sample_monthly_df["Year"] <= 4]
    return calculations.calculate_annual_opportunity_cost(
        monthly_df=four_year_df, annual_roi=0.05, investment_frequency="Annually"
    )


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
    assert df["MonthlySurplus"].iloc[0] == 2000  # 10000 - 8000
    # Year 2 salary: 10000 * 1.10 = 11000
    assert df["MonthlySurplus"].iloc[12] == 3000  # 11000 - 8000
    assert "InvestableSurplus" in df.columns


def test_calculate_annual_opportunity_cost(sample_monthly_df):
    """Tests the annual opportunity cost calculation."""
    df = calculations.calculate_annual_opportunity_cost(
        monthly_df=sample_monthly_df, annual_roi=0.05, investment_frequency="Annually"
    )
    assert len(df) == 5
    assert "Opportunity Cost (Invested Surplus)" in df.columns
    # Basic check for increasing value
    assert (
        df["Opportunity Cost (Invested Surplus)"].iloc[-1]
        > df["Opportunity Cost (Invested Surplus)"].iloc[0]
    )
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
            "equity_pct": 0.05,  # 5%
            "target_exit_valuation": 10_000_000,
            "simulate_dilution": False,
        },
        "options_params": {},
    }

    results = calculations.calculate_startup_scenario(
        sample_opportunity_cost_df, startup_params
    )
    results_df = results["results_df"]

    assert results["payout_label"] == "Your Equity Value (Post-Dilution)"
    assert "Vested Equity (%)" in results_df.columns
    # End of Year 1 (cliff passed): 1/4 of 5% = 1.25%
    assert results_df["Vested Equity (%)"].iloc[0] == pytest.approx(1.25)
    # End of Year 2: 2/4 of 5% = 2.5%
    assert results_df["Vested Equity (%)"].iloc[1] == pytest.approx(2.5)
    # End of Year 4: 4/4 of 5% = 5%
    assert results_df["Vested Equity (%)"].iloc[-1] == pytest.approx(5.0)


def test_calculate_startup_scenario_rsu_with_time_dependent_dilution():
    """Tests RSU calculation with time-dependent dilution."""
    monthly_df = calculations.create_monthly_data_grid(
        exit_year=5,
        current_job_monthly_salary=10000,
        startup_monthly_salary=8000,
        current_job_salary_growth_rate=0.0,
    )
    opportunity_cost_df = calculations.calculate_annual_opportunity_cost(
        monthly_df, 0.05, "Annually"
    )
    startup_params = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 5,
        "rsu_params": {
            "equity_pct": 0.10,  # 10%
            "target_exit_valuation": 20_000_000,
            "simulate_dilution": True,
            "dilution_rounds": [
                {"year": 3, "dilution": 0.20}
            ],  # 20% dilution in year 3
        },
        "options_params": {},
    }

    results = calculations.calculate_startup_scenario(
        opportunity_cost_df, startup_params
    )
    results_df = results["results_df"]

    # Year 1 & 2: No dilution applied yet
    assert results_df["CumulativeDilution"].iloc[0] == 1.0  # Year 1
    assert results_df["CumulativeDilution"].iloc[1] == 1.0  # Year 2

    # Year 3 onwards: Dilution is applied
    assert results_df["CumulativeDilution"].iloc[2] == pytest.approx(0.80)  # Year 3
    assert results_df["CumulativeDilution"].iloc[3] == pytest.approx(0.80)  # Year 4
    assert results_df["CumulativeDilution"].iloc[4] == pytest.approx(0.80)  # Year 5

    # Check vested equity calculation
    # Year 2: 2/4 vesting, 10% grant, no dilution = 5%
    assert results_df["Vested Equity (%)"].iloc[1] == pytest.approx(5.0)
    # Year 3: 3/4 vesting, 10% grant, WITH dilution = 6%
    assert results_df["Vested Equity (%)"].iloc[2] == pytest.approx(
        (3 / 4) * 0.10 * 0.80 * 100
    )
    # Year 4: Fully vested (4/4), 10% grant, WITH dilution = 8%
    assert results_df["Vested Equity (%)"].iloc[3] == pytest.approx(
        (4 / 4) * 0.10 * 0.80 * 100
    )


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

    results = calculations.calculate_startup_scenario(
        sample_opportunity_cost_df, startup_params
    )
    results_df = results["results_df"]

    assert results["payout_label"] == "Your Options Value"
    assert "Vested Equity (%)" in results_df.columns
    # Vesting schedule for options is just a percentage
    assert results_df["Vested Equity (%)"].iloc[0] == pytest.approx(
        25.0
    )  # End of Year 1
    assert results_df["Vested Equity (%)"].iloc[3] == pytest.approx(
        100.0
    )  # End of Year 4

    # Test final payout calculation
    final_vested_options = 10000  # 100% vested
    expected_payout = (10.0 - 1.0) * final_vested_options
    assert results["final_payout_value"] == pytest.approx(expected_payout)


# --- Test Financial Metrics ---


def test_calculate_irr():
    """Tests the IRR calculation for a profitable scenario."""
    # Scenario: Invest 100/month for 12 months, get 1500 back
    monthly_surpluses = pd.Series([100] * 12)  # Positive surplus = negative cash flow
    final_payout = 1500
    irr = calculations.calculate_irr(monthly_surpluses, final_payout)
    # A simple check to ensure it returns a number and is within a plausible range
    assert isinstance(irr, float)
    # Corrected assertion range for the calculated IRR
    assert 59 < irr < 60


def test_calculate_npv():
    """Tests the NPV calculation."""
    monthly_surpluses = pd.Series([100] * 12)  # Positive surplus
    final_payout = 1500
    annual_roi = 0.10
    # cash_flows will be [-100] * 11 and [-100 + 1500] = 1400
    npv = calculations.calculate_npv(monthly_surpluses, annual_roi, final_payout)
    assert isinstance(npv, float)
    # Since payout > investment, NPV at a reasonable discount rate should be positive
    assert npv > 0


def test_simulation_beyond_vesting_period():
    """Tests that vesting caps at 100% when simulation ends after the vesting period."""
    monthly_df = calculations.create_monthly_data_grid(
        exit_year=7,  # Simulate for 7 years
        current_job_monthly_salary=10000,
        startup_monthly_salary=8000,
        current_job_salary_growth_rate=0.0,
    )
    opportunity_cost_df = calculations.calculate_annual_opportunity_cost(
        monthly_df, 0.05, "Annually"
    )
    startup_params = {
        "equity_type": EquityType.STOCK_OPTIONS,
        "total_vesting_years": 4,  # Vesting over 4 years
        "cliff_years": 1,
        "exit_year": 7,
        "rsu_params": {},
        "options_params": {
            "num_options": 10000,
            "strike_price": 1.0,
            "target_exit_price_per_share": 10.0,
        },
    }
    results = calculations.calculate_startup_scenario(
        opportunity_cost_df, startup_params
    )
    results_df = results["results_df"]

    # Check that vesting stops increasing after year 4
    assert results_df["Vested Equity (%)"].iloc[2] == pytest.approx(75.0)  # Year 3
    assert results_df["Vested Equity (%)"].iloc[3] == pytest.approx(100.0)  # Year 4
    assert results_df["Vested Equity (%)"].iloc[4] == pytest.approx(100.0)  # Year 5
    assert results_df["Vested Equity (%)"].iloc[5] == pytest.approx(100.0)  # Year 6
    assert results_df["Vested Equity (%)"].iloc[6] == pytest.approx(100.0)  # Year 7


# --- Test Monte Carlo Simulation ---


def test_run_monte_carlo_simulation():
    """Tests the flexible Monte Carlo simulation function."""
    num_simulations = 100
    base_params = {
        "exit_year": 5,
        "current_job_monthly_salary": 10000,
        "startup_monthly_salary": 8000,
        "current_job_salary_growth_rate": 0.0,
        "annual_roi": 0.05,
        "investment_frequency": "Annually",
        "startup_params": {
            "equity_type": EquityType.RSU,
            "total_vesting_years": 4,
            "cliff_years": 1,
            "rsu_params": {
                "equity_pct": 0.05,
                "target_exit_valuation": 10_000_000,
                "simulate_dilution": False,
            },
            "options_params": {},
        },
    }
    sim_ranges = {
        "valuation": (5_000_000, 20_000_000),
        "roi": (0.03, 0.08),
    }

    results = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=base_params,
        sim_ranges=sim_ranges,
    )
    assert isinstance(results, dict)
    assert "net_outcomes" in results
    assert len(results["net_outcomes"]) == num_simulations