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
        "failure_probability": 0.25,
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
        "roi": {"mean": 0.05, "std_dev": 0.02},
        "dilution": {"min_val": 0.1, "max_val": 0.5, "mode": 0.2},
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
        "roi": {"mean": 0.05, "std_dev": 0.02},
    }

    # This call should now run without raising a TypeError
    results = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=monte_carlo_base_params,
        sim_param_configs=sim_param_configs,
    )
    assert len(results["net_outcomes"]) == num_simulations
    assert not np.isnan(results["net_outcomes"]).any()


# --- Test New Features from User Request ---

def test_salary_increase_after_funding_round():
    """
    Tests that the startup salary correctly increases after a funding round
    that includes a new, higher salary.
    """
    dilution_rounds = [{"year": 3, "new_salary": 12000}]
    df = calculations.create_monthly_data_grid(
        exit_year=4,
        current_job_monthly_salary=15000,
        startup_monthly_salary=10000,
        current_job_salary_growth_rate=0.0,
        dilution_rounds=dilution_rounds,
    )
    # Salary before the round (Year 1 and 2)
    assert df["StartupSalary"].iloc[0] == 10000
    assert df["StartupSalary"].iloc[23] == 10000
    # Salary after the round (Year 3 onwards)
    assert df["StartupSalary"].iloc[24] == 12000
    assert df["StartupSalary"].iloc[47] == 12000
    # Check that surplus calculation reflects the change
    assert df["MonthlySurplus"].iloc[23] == 5000  # 15000 - 10000
    assert df["MonthlySurplus"].iloc[24] == 3000  # 15000 - 12000


def test_cash_from_equity_sale_added_to_surplus():
    """
    Tests that the cash generated from selling a portion of vested equity
    is correctly added to the 'CashFromSale' column in the monthly data grid,
    which then gets compounded in the opportunity cost calculation.
    """
    startup_params = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 4,
        "rsu_params": {
            "equity_pct": 0.10,  # 10%
            "target_exit_valuation": 20_000_000,
            "simulate_dilution": True,
            "dilution_rounds": [
                {
                    "year": 2,
                    "dilution": 0.20,
                    "percent_to_sell": 0.50,  # Sell 50% of vested equity
                    "valuation_at_sale": 10_000_000,
                }
            ],
        },
        "options_params": {},
    }

    # At year 2, 50% of the equity is vested (2 out of 4 years)
    # Initial equity is 10%, so vested equity is 5%
    # No dilution has occurred before the sale in year 2
    # Cash = 5% * 10,000,000 (valuation) * 50% (percent to sell) = 250,000
    expected_cash_from_sale = 0.05 * 10_000_000 * 0.50
    assert expected_cash_from_sale == 250_000

    monthly_df = calculations.create_monthly_data_grid(
        exit_year=4,
        current_job_monthly_salary=20000,
        startup_monthly_salary=15000,
        current_job_salary_growth_rate=0.0,
        dilution_rounds=startup_params["rsu_params"]["dilution_rounds"],
    )

    # This function should now handle the cash from sale
    opportunity_df = calculations.calculate_annual_opportunity_cost(
        monthly_df=monthly_df,
        annual_roi=0.05,
        investment_frequency="Annually",
        startup_params=startup_params,
    )

    # Check that the opportunity cost in the final year is significantly higher
    # due to the large cash injection.
    # FV of 250k over 2 years at 5% = 250000 * (1.05)^2 = 275,625
    # This should be on top of the normal surplus investment.
    assert opportunity_df["Opportunity Cost (Invested Surplus)"].iloc[-1] > 275000


def test_final_payout_reduced_after_equity_sale(sample_opportunity_cost_df):
    """
    Tests that the final equity payout is correctly reduced after a portion
    of the equity has been sold in a secondary transaction.
    """
    startup_params_no_sale = {
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
    results_no_sale = calculations.calculate_startup_scenario(
        sample_opportunity_cost_df, startup_params_no_sale
    )

    startup_params_with_sale = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 4,
        "rsu_params": {
            "equity_pct": 0.05,
            "target_exit_valuation": 10_000_000,
            "simulate_dilution": True,
            "dilution_rounds": [
                {"year": 2, "percent_to_sell": 0.50, "valuation_at_sale": 5_000_000} # Sell 50%
            ],
        },
        "options_params": {},
    }
    results_with_sale = calculations.calculate_startup_scenario(
        sample_opportunity_cost_df, startup_params_with_sale
    )

    payout_no_sale = results_no_sale["final_payout_value"]
    payout_with_sale = results_with_sale["final_payout_value"]

    assert payout_with_sale < payout_no_sale
    # The final payout should be roughly half, as 50% of the equity was sold.
    assert payout_with_sale == pytest.approx(payout_no_sale * 0.5)


def test_multiple_equity_sales(sample_opportunity_cost_df):
    """
    Tests that multiple sequential equity sales are correctly calculated,
    with each sale being a percentage of the remaining equity.
    """
    startup_params_no_sale = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 4,
        "rsu_params": {
            "equity_pct": 0.10,
            "target_exit_valuation": 10_000_000,
            "simulate_dilution": False,
        },
        "options_params": {},
    }
    results_no_sale = calculations.calculate_startup_scenario(
        sample_opportunity_cost_df, startup_params_no_sale
    )

    # Sell 50% in year 2, then 50% of remaining in year 3
    # This should leave 25% of original equity (0.5 * 0.5)
    startup_params_multiple_sales = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 4,
        "rsu_params": {
            "equity_pct": 0.10,
            "target_exit_valuation": 10_000_000,
            "simulate_dilution": True,
            "dilution_rounds": [
                {"year": 2, "percent_to_sell": 0.50, "valuation_at_sale": 5_000_000},  # Sell 50%
                {"year": 3, "percent_to_sell": 0.50, "valuation_at_sale": 7_000_000},  # Sell 50% of remaining
            ],
        },
        "options_params": {},
    }
    results_multiple_sales = calculations.calculate_startup_scenario(
        sample_opportunity_cost_df, startup_params_multiple_sales
    )

    payout_no_sale = results_no_sale["final_payout_value"]
    payout_multiple_sales = results_multiple_sales["final_payout_value"]

    # After selling 50% twice, 25% should remain (0.5 * 0.5 = 0.25)
    assert payout_multiple_sales == pytest.approx(payout_no_sale * 0.25)


def test_equity_sales_after_exit_ignored(sample_opportunity_cost_df):
    """
    Tests that equity sales scheduled after the exit year are ignored
    in the final payout calculation.
    """
    startup_params_sale_before_exit = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 3,  # Exit in year 3
        "rsu_params": {
            "equity_pct": 0.10,
            "target_exit_valuation": 10_000_000,
            "simulate_dilution": True,
            "dilution_rounds": [
                {"year": 2, "percent_to_sell": 0.50, "valuation_at_sale": 5_000_000},  # Before exit
            ],
        },
        "options_params": {},
    }

    startup_params_sale_after_exit = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 3,  # Exit in year 3
        "rsu_params": {
            "equity_pct": 0.10,
            "target_exit_valuation": 10_000_000,
            "simulate_dilution": True,
            "dilution_rounds": [
                {"year": 2, "percent_to_sell": 0.50, "valuation_at_sale": 5_000_000},  # Before exit
                {"year": 4, "percent_to_sell": 0.50, "valuation_at_sale": 7_000_000},  # After exit - should be ignored
            ],
        },
        "options_params": {},
    }

    results_before = calculations.calculate_startup_scenario(
        sample_opportunity_cost_df, startup_params_sale_before_exit
    )
    results_after = calculations.calculate_startup_scenario(
        sample_opportunity_cost_df, startup_params_sale_after_exit
    )

    # Final payout should be the same since the sale in year 4 happens after exit in year 3
    assert results_before["final_payout_value"] == pytest.approx(
        results_after["final_payout_value"]
    )


def test_run_monte_carlo_iterative_for_exit_year(monte_carlo_base_params):
    """Tests that the iterative method is called when exit_year is simulated."""
    num_simulations = 50
    sim_param_configs = {
        "exit_year": {"min_val": 3, "max_val": 7, "mode": 5},
        "valuation": {"min_val": 10_000_000, "max_val": 30_000_000, "mode": 20_000_000},
    }

    results = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=monte_carlo_base_params,
        sim_param_configs=sim_param_configs,
    )
    assert len(results["net_outcomes"]) == num_simulations
    assert not np.isnan(results["net_outcomes"]).any()