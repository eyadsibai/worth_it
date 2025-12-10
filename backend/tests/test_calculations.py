"""
Unit tests for the financial calculation functions.
This module uses pytest to test the functions in the 'calculations' module.
"""

import numpy as np
import pandas as pd
import pytest

from worth_it import calculations
from worth_it.calculations import EquityType


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
    is correctly tracked in the 'Cash From Sale (FV)' column, separate from
    opportunity cost, and that this value is properly added to the final payout.
    This cash is startup-side wealth, not foregone BigCorp earnings.
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
                    "percent_to_sell": 0.25,  # Sell 25% of total equity (half of vested)
                    "valuation_at_sale": 10_000_000,
                }
            ],
        },
        "options_params": {},
    }

    # At year 2, 50% of the equity is vested (2 out of 4 years)
    # Initial equity is 10%, so vested equity is 5%
    # No dilution has occurred before the sale in year 2
    # With new logic: selling 25% of total equity (which is less than 50% vested)
    # Cash = 10% * 10,000,000 (valuation) * 25% (percent to sell) = 250,000
    expected_cash_from_sale = 0.10 * 10_000_000 * 0.25
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

    # Check that the cash from sale is tracked separately in its own column
    # FV of 250k over 2 years at 5% = 250000 * (1.05)^2 = 275,625
    assert "Cash From Sale (FV)" in opportunity_df.columns
    assert opportunity_df["Cash From Sale (FV)"].iloc[-1] == pytest.approx(275625, rel=0.01)


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
                {"year": 2, "percent_to_sell": 0.50, "valuation_at_sale": 5_000_000}  # Sell 50%
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
                {
                    "year": 3,
                    "percent_to_sell": 0.50,
                    "valuation_at_sale": 7_000_000,
                },  # Sell 50% of remaining
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
                {
                    "year": 4,
                    "percent_to_sell": 0.50,
                    "valuation_at_sale": 7_000_000,
                },  # After exit - should be ignored
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


def test_monte_carlo_with_equity_sales(monte_carlo_base_params):
    """
    Tests that Monte Carlo simulation correctly handles equity sales in dilution rounds.
    The vectorized method should account for both the reduction in final payout and
    the cash received from sales.
    """
    # Add equity sales to the base params
    monte_carlo_base_params["startup_params"]["rsu_params"]["simulate_dilution"] = True
    monte_carlo_base_params["startup_params"]["rsu_params"]["dilution_rounds"] = [
        {
            "year": 2,
            "dilution": 0.20,
            "percent_to_sell": 0.50,  # Sell 50% of vested equity
            "valuation_at_sale": 10_000_000,
        }
    ]

    num_simulations = 50
    sim_param_configs = {
        "valuation": {"min_val": 10_000_000, "max_val": 30_000_000, "mode": 20_000_000},
        "roi": {"mean": 0.05, "std_dev": 0.02},
    }

    results = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=monte_carlo_base_params,
        sim_param_configs=sim_param_configs,
    )

    # Verify results are valid
    assert len(results["net_outcomes"]) == num_simulations
    assert not np.isnan(results["net_outcomes"]).any()

    # The net outcomes should be finite numbers (not inf or -inf)
    assert np.all(np.isfinite(results["net_outcomes"]))


def test_monte_carlo_with_stock_options_and_exercise_costs():
    """
    Tests that Monte Carlo simulation correctly handles stock option exercise costs.
    """
    base_params = {
        "exit_year": 5,
        "current_job_monthly_salary": 10000,
        "startup_monthly_salary": 8000,
        "current_job_salary_growth_rate": 0.03,
        "annual_roi": 0.05,
        "investment_frequency": "Annually",
        "startup_params": {
            "equity_type": EquityType.STOCK_OPTIONS,
            "total_vesting_years": 4,
            "cliff_years": 1,
            "rsu_params": {},
            "options_params": {
                "num_options": 10000,
                "strike_price": 1.0,
                "target_exit_price_per_share": 50.0,
                "exercise_strategy": "Exercise After Vesting",
                "exercise_year": 4,
            },
        },
        "failure_probability": 0.25,
    }

    num_simulations = 50
    sim_param_configs = {
        "valuation": {"min_val": 10.0, "max_val": 100.0, "mode": 50.0},
        "roi": {"mean": 0.05, "std_dev": 0.02},
    }

    results = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=base_params,
        sim_param_configs=sim_param_configs,
    )

    # Verify results are valid
    assert len(results["net_outcomes"]) == num_simulations
    assert not np.isnan(results["net_outcomes"]).any()
    assert np.all(np.isfinite(results["net_outcomes"]))


def test_monte_carlo_iterative_with_equity_sales():
    """
    Tests that the iterative Monte Carlo (when exit year is simulated) correctly
    handles equity sales.
    """
    base_params = {
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
                "simulate_dilution": True,
                "dilution_rounds": [
                    {
                        "year": 2,
                        "dilution": 0.20,
                        "percent_to_sell": 0.50,
                        "valuation_at_sale": 10_000_000,
                    }
                ],
            },
            "options_params": {},
        },
        "failure_probability": 0.25,
    }

    num_simulations = 30
    sim_param_configs = {
        "exit_year": {"min_val": 3, "max_val": 7, "mode": 5},
        "valuation": {"min_val": 10_000_000, "max_val": 30_000_000, "mode": 20_000_000},
    }

    results = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=base_params,
        sim_param_configs=sim_param_configs,
    )

    # Verify results are valid
    assert len(results["net_outcomes"]) == num_simulations
    assert not np.isnan(results["net_outcomes"]).any()
    assert np.all(np.isfinite(results["net_outcomes"]))


def test_year_0_handling():
    """
    Tests that year 0 (inception/pre-seed) is handled correctly for:
    1. Salary changes at year 0
    2. Dilution rounds at year 0
    3. Equity sales at year 0 (with cliff=0 edge case)
    """
    # Test 1: Salary change at year 0
    dilution_rounds = [{"year": 0, "new_salary": 15000, "dilution": 0.15}]
    df = calculations.create_monthly_data_grid(
        exit_year=3,
        current_job_monthly_salary=20000,
        startup_monthly_salary=10000,
        current_job_salary_growth_rate=0.0,
        dilution_rounds=dilution_rounds,
    )

    # Salary should be changed from month 0 (year 0 maps to month 0)
    assert df["StartupSalary"].iloc[0] == 15000
    assert df["StartupSalary"].iloc[35] == 15000

    # Test 2: Equity sale at year 0 with no cliff (edge case)
    startup_params = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 0,  # No cliff (unusual but possible)
        "exit_year": 3,
        "rsu_params": {
            "equity_pct": 0.10,
            "target_exit_valuation": 10_000_000,
            "simulate_dilution": True,
            "dilution_rounds": [
                {
                    "year": 0,
                    "dilution": 0.15,
                    "percent_to_sell": 0.10,  # Sell 10% at inception
                    "valuation_at_sale": 5_000_000,
                }
            ],
        },
        "options_params": {},
    }

    monthly_df = calculations.create_monthly_data_grid(
        exit_year=3,
        current_job_monthly_salary=20000,
        startup_monthly_salary=15000,
        current_job_salary_growth_rate=0.0,
        dilution_rounds=startup_params["rsu_params"]["dilution_rounds"],
    )

    opportunity_df = calculations.calculate_annual_opportunity_cost(
        monthly_df=monthly_df,
        annual_roi=0.05,
        investment_frequency="Annually",
        startup_params=startup_params,
    )

    # Should not crash and should produce valid results
    assert "Cash From Sale (FV)" in opportunity_df.columns
    # At year 0, 0% is vested (0/4 years), so no cash from sale
    assert opportunity_df["Cash From Sale (FV)"].iloc[-1] == 0.0

    # Test 3: Dilution at year 0
    results = calculations.calculate_startup_scenario(opportunity_df, startup_params)

    # Should complete without errors
    assert results["final_payout_value"] >= 0
    assert not np.isnan(results["final_payout_value"])
    assert not np.isinf(results["final_payout_value"])


def test_exercise_costs_reduce_net_outcomes():
    """
    Critical test to verify that exercise costs REDUCE net outcomes, not increase them.
    This test was added to verify the fix for the bug where subtracting exercise costs
    from investable surplus caused them to increase outcomes instead of decreasing them.
    """
    # Base parameters for both scenarios
    base_params_template = {
        "exit_year": 5,
        "current_job_monthly_salary": 10000,
        "startup_monthly_salary": 8000,
        "current_job_salary_growth_rate": 0.03,
        "annual_roi": 0.08,  # Higher ROI to make exercise cost impact more visible
        "investment_frequency": "Monthly",
        "startup_params": {
            "equity_type": EquityType.STOCK_OPTIONS,
            "total_vesting_years": 4,
            "cliff_years": 1,
            "rsu_params": {},
            "options_params": {
                "num_options": 10000,
                "strike_price": 2.0,  # $20k exercise cost
                "target_exit_price_per_share": 50.0,
                "exercise_strategy": "Exercise After Vesting",
                "exercise_year": 4,
            },
        },
        "failure_probability": 0.0,  # Disable failure to isolate exercise cost impact
    }

    # Scenario 1: WITH exercise costs
    params_with_exercise = base_params_template.copy()
    params_with_exercise["startup_params"] = base_params_template["startup_params"].copy()
    params_with_exercise["startup_params"]["options_params"] = base_params_template[
        "startup_params"
    ]["options_params"].copy()

    # Scenario 2: WITHOUT exercise costs (exercise at exit)
    params_without_exercise = base_params_template.copy()
    params_without_exercise["startup_params"] = base_params_template["startup_params"].copy()
    params_without_exercise["startup_params"]["options_params"] = base_params_template[
        "startup_params"
    ]["options_params"].copy()
    params_without_exercise["startup_params"]["options_params"]["exercise_strategy"] = (
        "Exercise at Exit"
    )

    # Use fixed seed for reproducible results
    np.random.seed(42)

    # Run simulations
    num_simulations = 100
    sim_param_configs = {
        "valuation": {"min_val": 40.0, "max_val": 60.0, "mode": 50.0},
        "roi": {"mean": 0.08, "std_dev": 0.01},
    }

    results_with_exercise = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=params_with_exercise,
        sim_param_configs=sim_param_configs,
    )

    # Reset seed for comparable simulations
    np.random.seed(42)

    results_without_exercise = calculations.run_monte_carlo_simulation(
        num_simulations=num_simulations,
        base_params=params_without_exercise,
        sim_param_configs=sim_param_configs,
    )

    # CRITICAL ASSERTION: Exercise costs should REDUCE outcomes
    # With exercise costs: you pay 20k at year 4, which compounds for 1 year
    # Expected reduction: approximately 20k * (1.08)^(1 year) = ~21.6k
    mean_with = np.mean(results_with_exercise["net_outcomes"])
    mean_without = np.mean(results_without_exercise["net_outcomes"])

    # Exercise costs should make outcomes LOWER
    assert mean_with < mean_without, (
        f"CRITICAL BUG: Exercise costs INCREASED outcomes instead of decreasing them! "
        f"Mean with exercise: {mean_with:.2f}, Mean without: {mean_without:.2f}"
    )

    # The difference should be approximately the exercise cost compounded
    # Strike price = 2.0, num_options = 10000 → total cost = 20,000
    # Compounded monthly for 1 year at 8% annual ROI: ~21,600
    expected_reduction = 20000 * (1.08 ** (1))  # Approximately 21,600
    actual_reduction = mean_without - mean_with

    # Allow for some variance due to Monte Carlo randomness (within 50%)
    assert actual_reduction > expected_reduction * 0.5, (
        f"Exercise cost reduction too small. Expected ~{expected_reduction:.2f}, "
        f"got {actual_reduction:.2f}"
    )

    # Exercise costs correctly reduce outcomes by {actual_reduction:.2f} (expected ~{expected_reduction:.2f})


def test_equity_sale_slider_limited_to_vested():
    """
    Tests that the equity sale logic correctly limits sales to vested equity only.
    This test verifies the fix for the issue where the slider allowed selling up to 100%
    even when less equity was vested.
    """
    # Test scenario: 50% vested, try to sell more than vested
    # The calculation should limit the sale to the vested portion
    startup_params = {
        "equity_type": EquityType.RSU,
        "total_vesting_years": 4,
        "cliff_years": 1,
        "exit_year": 4,
        "rsu_params": {
            "equity_pct": 0.10,  # 10% total equity
            "target_exit_valuation": 10_000_000,
            "simulate_dilution": True,
            "dilution_rounds": [
                {
                    "year": 2,  # At year 2, 50% is vested (2/4 years)
                    "dilution": 0.0,
                    "percent_to_sell": 0.80,  # Try to sell 80% (more than 50% vested!)
                    "valuation_at_sale": 5_000_000,
                }
            ],
        },
        "options_params": {},
    }

    monthly_df = calculations.create_monthly_data_grid(
        exit_year=4,
        current_job_monthly_salary=20000,
        startup_monthly_salary=15000,
        current_job_salary_growth_rate=0.0,
        dilution_rounds=startup_params["rsu_params"]["dilution_rounds"],
    )

    opportunity_df = calculations.calculate_annual_opportunity_cost(
        monthly_df=monthly_df,
        annual_roi=0.05,
        investment_frequency="Annually",
        startup_params=startup_params,
    )

    # At year 2, vested = 50%, trying to sell 80%
    # Calculation should limit to 50% (the effective sell percentage: min(vested, percent_to_sell))
    # Expected cash = 10% equity * 50% effective sell percentage (min(vested, percent_to_sell)) * 5M valuation = $250k
    expected_cash_immediate = 0.10 * 0.50 * 5_000_000
    assert expected_cash_immediate == 250_000

    # FV over 2 years at 5%: 250k * 1.05^2 = 275,625
    expected_cash_fv = expected_cash_immediate * (1.05**2)
    assert opportunity_df["Cash From Sale (FV)"].iloc[-1] == pytest.approx(
        expected_cash_fv, rel=0.01
    )

    # Verify the final payout calculation
    results = calculations.calculate_startup_scenario(opportunity_df, startup_params)

    # The remaining equity factor should reflect only the amount of vested equity actually sold.
    # In this case, only 50% is vested at year 2, so only 50% can be sold, even if the attempt was to sell 80%.
    # Unvested equity is not forfeited; the remaining equity is 1 - 0.5 = 0.5 after the sale.
    # Let's verify the final payout is sensible
    assert results["final_payout_value"] >= 0
    assert not np.isnan(results["final_payout_value"])


# --- Tests for calculate_dilution_from_valuation ---
class TestCalculateDilutionFromValuation:
    """Tests for the dilution calculation function."""

    def test_normal_dilution_calculation(self):
        """Test standard dilution calculation."""
        # $10M pre-money + $2M raised = $12M post-money
        # Dilution = $2M / $12M = 16.67%
        dilution = calculations.calculate_dilution_from_valuation(10_000_000, 2_000_000)
        assert dilution == pytest.approx(0.1667, rel=0.01)

    def test_zero_amount_raised_returns_zero(self):
        """Test that zero investment means zero dilution."""
        dilution = calculations.calculate_dilution_from_valuation(10_000_000, 0)
        assert dilution == 0.0

    def test_large_raise_high_dilution(self):
        """Test high dilution scenario (equal pre-money and raise)."""
        # $5M pre-money + $5M raised = $10M post-money
        # Dilution = $5M / $10M = 50%
        dilution = calculations.calculate_dilution_from_valuation(5_000_000, 5_000_000)
        assert dilution == pytest.approx(0.5, rel=0.01)

    def test_zero_pre_money_raises_error(self):
        """Test that zero pre-money valuation raises ValueError."""
        with pytest.raises(ValueError, match="pre_money_valuation must be positive"):
            calculations.calculate_dilution_from_valuation(0, 1_000_000)

    def test_negative_pre_money_raises_error(self):
        """Test that negative pre-money valuation raises ValueError."""
        with pytest.raises(ValueError, match="pre_money_valuation must be positive"):
            calculations.calculate_dilution_from_valuation(-100_000, 1_000_000)

    def test_negative_amount_raised_raises_error(self):
        """Test that negative amount raised raises ValueError."""
        with pytest.raises(ValueError, match="amount_raised cannot be negative"):
            calculations.calculate_dilution_from_valuation(10_000_000, -100_000)


# --- Tests for Cap Table Conversion Functions ---


class TestCalculateInterest:
    """Tests for the calculate_interest function."""

    def test_simple_interest_calculation(self):
        """Test simple interest calculation."""
        # $50K * 5% * (6/12) = $1,250
        interest = calculations.calculate_interest(50_000, 5, 6, "simple")
        assert interest == pytest.approx(1250.0)

    def test_compound_interest_calculation(self):
        """Test compound interest calculation."""
        # $50K * ((1 + 0.05)^0.5 - 1) = $1,233.18
        interest = calculations.calculate_interest(50_000, 5, 6, "compound")
        expected = 50_000 * ((1 + 0.05) ** 0.5 - 1)
        assert interest == pytest.approx(expected)

    def test_zero_months_returns_zero(self):
        """Test that zero months elapsed returns zero interest."""
        interest = calculations.calculate_interest(50_000, 5, 0, "simple")
        assert interest == 0.0

    def test_negative_months_returns_zero(self):
        """Test that negative months elapsed returns zero interest."""
        interest = calculations.calculate_interest(50_000, 5, -3, "simple")
        assert interest == 0.0

    def test_full_year_simple_interest(self):
        """Test full year simple interest."""
        # $100K * 8% * 1 year = $8,000
        interest = calculations.calculate_interest(100_000, 8, 12, "simple")
        assert interest == pytest.approx(8000.0)

    def test_full_year_compound_interest(self):
        """Test full year compound interest."""
        # $100K * ((1 + 0.08)^1 - 1) = $8,000
        interest = calculations.calculate_interest(100_000, 8, 12, "compound")
        assert interest == pytest.approx(8000.0)

    def test_two_year_compound_vs_simple(self):
        """Test that compound interest exceeds simple over 2 years."""
        simple = calculations.calculate_interest(100_000, 10, 24, "simple")
        compound = calculations.calculate_interest(100_000, 10, 24, "compound")
        # Simple: $100K * 10% * 2 = $20,000
        # Compound: $100K * (1.10^2 - 1) = $21,000
        assert simple == pytest.approx(20_000.0)
        assert compound == pytest.approx(21_000.0)
        assert compound > simple


class TestCalculateConversionPrice:
    """Tests for the calculate_conversion_price function."""

    def test_cap_wins_over_discount(self):
        """Test that lower cap price beats discount price."""
        # Cap price: $5M / 10M shares = $0.50
        # Discount price: $1.00 * 0.80 = $0.80
        # Cap wins because $0.50 < $0.80
        price, source = calculations.calculate_conversion_price(
            valuation_cap=5_000_000,
            discount_pct=20,
            round_price_per_share=1.0,
            pre_conversion_shares=10_000_000,
        )
        assert price == pytest.approx(0.5)
        assert source == "cap"

    def test_discount_wins_over_cap(self):
        """Test that lower discount price beats cap price."""
        # Cap price: $20M / 10M shares = $2.00
        # Discount price: $1.00 * 0.80 = $0.80
        # Discount wins because $0.80 < $2.00
        price, source = calculations.calculate_conversion_price(
            valuation_cap=20_000_000,
            discount_pct=20,
            round_price_per_share=1.0,
            pre_conversion_shares=10_000_000,
        )
        assert price == pytest.approx(0.8)
        assert source == "discount"

    def test_cap_only(self):
        """Test conversion with only valuation cap."""
        price, source = calculations.calculate_conversion_price(
            valuation_cap=5_000_000,
            discount_pct=None,
            round_price_per_share=1.0,
            pre_conversion_shares=10_000_000,
        )
        assert price == pytest.approx(0.5)
        assert source == "cap"

    def test_discount_only(self):
        """Test conversion with only discount."""
        price, source = calculations.calculate_conversion_price(
            valuation_cap=None,
            discount_pct=25,
            round_price_per_share=2.0,
            pre_conversion_shares=10_000_000,
        )
        assert price == pytest.approx(1.5)  # 2.0 * 0.75
        assert source == "discount"

    def test_no_cap_or_discount_raises_error(self):
        """Test that missing both cap and discount raises ValueError."""
        with pytest.raises(ValueError, match="Must have at least"):
            calculations.calculate_conversion_price(
                valuation_cap=None,
                discount_pct=None,
                round_price_per_share=1.0,
                pre_conversion_shares=10_000_000,
            )

    def test_equal_prices_uses_cap(self):
        """Test that when prices are equal, cap is used."""
        # Cap price: $8M / 10M shares = $0.80
        # Discount price: $1.00 * 0.80 = $0.80
        price, source = calculations.calculate_conversion_price(
            valuation_cap=8_000_000,
            discount_pct=20,
            round_price_per_share=1.0,
            pre_conversion_shares=10_000_000,
        )
        assert price == pytest.approx(0.8)
        assert source == "cap"  # Cap takes precedence when equal


class TestCalculateMonthsBetweenDates:
    """Tests for the calculate_months_between_dates function."""

    def test_six_months_difference(self):
        """Test calculating 6 months between dates."""
        months = calculations.calculate_months_between_dates("2024-01-01", "2024-07-01")
        assert months == pytest.approx(6.0, abs=0.1)

    def test_one_year_difference(self):
        """Test calculating 12 months between dates."""
        months = calculations.calculate_months_between_dates("2024-01-15", "2025-01-15")
        assert months == pytest.approx(12.0, abs=0.1)

    def test_same_date_returns_zero(self):
        """Test that same date returns zero months."""
        months = calculations.calculate_months_between_dates("2024-06-15", "2024-06-15")
        assert months == pytest.approx(0.0)

    def test_end_before_start_returns_zero(self):
        """Test that end date before start date returns zero."""
        months = calculations.calculate_months_between_dates("2024-07-01", "2024-01-01")
        assert months == 0.0


class TestConvertInstruments:
    """Tests for the convert_instruments function."""

    @pytest.fixture
    def base_cap_table(self):
        """Provides a base cap table for testing."""
        return {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 8_000_000,
                    "ownership_pct": 80.0,
                    "share_class": "common",
                    "vesting": None,
                }
            ],
            "total_shares": 10_000_000,
            "option_pool_pct": 10,
        }

    @pytest.fixture
    def seed_round(self):
        """Provides a seed priced round for testing."""
        return {
            "id": "round-1",
            "type": "PRICED_ROUND",
            "round_name": "Seed",
            "pre_money_valuation": 10_000_000,
            "amount_raised": 2_000_000,
            "price_per_share": 1.0,  # $10M / 10M shares
            "date": "2024-07-01",
            "new_shares_issued": 2_000_000,
        }

    def test_safe_conversion_with_cap(self, base_cap_table, seed_round):
        """Test SAFE conversion using valuation cap."""
        instruments = [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Angel Investor",
                "investment_amount": 100_000,
                "valuation_cap": 5_000_000,
                "discount_pct": None,
                "status": "outstanding",
            }
        ]

        result = calculations.convert_instruments(base_cap_table, instruments, seed_round)

        # Cap price: $5M / 10M shares = $0.50/share
        # Shares: $100K / $0.50 = 200,000 shares
        assert len(result["converted_instruments"]) == 1
        converted = result["converted_instruments"][0]
        assert converted["shares_issued"] == 200_000
        assert converted["conversion_price"] == pytest.approx(0.5)
        assert converted["price_source"] == "cap"

    def test_safe_conversion_with_discount(self, base_cap_table, seed_round):
        """Test SAFE conversion using discount."""
        instruments = [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Angel Investor",
                "investment_amount": 100_000,
                "valuation_cap": 20_000_000,  # High cap, discount will win
                "discount_pct": 20,
                "status": "outstanding",
            }
        ]

        result = calculations.convert_instruments(base_cap_table, instruments, seed_round)

        # Discount price: $1.00 * 0.80 = $0.80/share
        # Shares: $100K / $0.80 = 125,000 shares
        converted = result["converted_instruments"][0]
        assert converted["shares_issued"] == 125_000
        assert converted["conversion_price"] == pytest.approx(0.8)
        assert converted["price_source"] == "discount"

    def test_convertible_note_with_interest(self, base_cap_table, seed_round):
        """Test convertible note conversion with accrued interest."""
        instruments = [
            {
                "id": "note-1",
                "type": "CONVERTIBLE_NOTE",
                "investor_name": "Note Investor",
                "principal_amount": 50_000,
                "interest_rate": 5,
                "interest_type": "simple",
                "valuation_cap": 5_000_000,
                "discount_pct": None,
                "maturity_months": 24,
                "date": "2024-01-01",
                "status": "outstanding",
            }
        ]

        result = calculations.convert_instruments(base_cap_table, instruments, seed_round)

        # ~6 months of simple interest (actual days: Jan 1 to Jul 1 = 182 days)
        # Interest ≈ $50K * 5% * (182/365.25) ≈ $1,246
        # Cap price: $5M / 10M = $0.50
        converted = result["converted_instruments"][0]
        assert converted["accrued_interest"] == pytest.approx(1250.0, rel=0.01)
        assert converted["investment_amount"] == pytest.approx(51_250.0, rel=0.01)
        assert converted["shares_issued"] == pytest.approx(102_500, rel=0.01)

    def test_multiple_instruments_conversion(self, base_cap_table, seed_round):
        """Test conversion of multiple instruments."""
        instruments = [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Investor A",
                "investment_amount": 100_000,
                "valuation_cap": 5_000_000,
                "status": "outstanding",
            },
            {
                "id": "safe-2",
                "type": "SAFE",
                "investor_name": "Investor B",
                "investment_amount": 50_000,
                "valuation_cap": 5_000_000,
                "status": "outstanding",
            },
        ]

        result = calculations.convert_instruments(base_cap_table, instruments, seed_round)

        assert result["summary"]["instruments_converted"] == 2
        # Total: 200,000 + 100,000 = 300,000 new shares
        assert result["summary"]["total_shares_issued"] == 300_000

    def test_skips_non_outstanding_instruments(self, base_cap_table, seed_round):
        """Test that already converted instruments are skipped."""
        instruments = [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Investor A",
                "investment_amount": 100_000,
                "valuation_cap": 5_000_000,
                "status": "outstanding",
            },
            {
                "id": "safe-2",
                "type": "SAFE",
                "investor_name": "Investor B",
                "investment_amount": 50_000,
                "valuation_cap": 5_000_000,
                "status": "converted",  # Already converted
            },
        ]

        result = calculations.convert_instruments(base_cap_table, instruments, seed_round)

        assert result["summary"]["instruments_converted"] == 1
        assert result["converted_instruments"][0]["investor_name"] == "Investor A"

    def test_ownership_recalculation(self, base_cap_table, seed_round):
        """Test that ownership percentages are recalculated after conversion."""
        instruments = [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Investor A",
                "investment_amount": 100_000,
                "valuation_cap": 5_000_000,
                "status": "outstanding",
            }
        ]

        result = calculations.convert_instruments(base_cap_table, instruments, seed_round)

        # Original: 10M shares, Founder has 8M (80%)
        # New: 200K shares issued → 10.2M total shares
        # Founder: 8M / 10.2M = 78.43%
        # New investor: 200K / 10.2M = 1.96%
        updated_cap_table = result["updated_cap_table"]
        assert updated_cap_table["total_shares"] == 10_200_000

        founder = next(s for s in updated_cap_table["stakeholders"] if s["name"] == "Founder")
        assert founder["ownership_pct"] == pytest.approx(78.43, rel=0.01)

        investor = next(
            s for s in updated_cap_table["stakeholders"] if s["name"] == "Investor A"
        )
        assert investor["ownership_pct"] == pytest.approx(1.96, rel=0.01)

    def test_new_stakeholders_are_preferred(self, base_cap_table, seed_round):
        """Test that converted investors get preferred shares."""
        instruments = [
            {
                "id": "safe-1",
                "type": "SAFE",
                "investor_name": "Investor A",
                "investment_amount": 100_000,
                "valuation_cap": 5_000_000,
                "status": "outstanding",
            }
        ]

        result = calculations.convert_instruments(base_cap_table, instruments, seed_round)

        investor = next(
            s
            for s in result["updated_cap_table"]["stakeholders"]
            if s["name"] == "Investor A"
        )
        assert investor["share_class"] == "preferred"
        assert investor["type"] == "investor"

    def test_compound_interest_note(self, base_cap_table, seed_round):
        """Test convertible note with compound interest."""
        instruments = [
            {
                "id": "note-1",
                "type": "CONVERTIBLE_NOTE",
                "investor_name": "Note Investor",
                "principal_amount": 100_000,
                "interest_rate": 10,
                "interest_type": "compound",
                "valuation_cap": 5_000_000,
                "maturity_months": 24,
                "date": "2022-07-01",  # 2 years before round
                "status": "outstanding",
            }
        ]

        result = calculations.convert_instruments(base_cap_table, instruments, seed_round)

        # ~2 years compound interest (actual days: Jul 1, 2022 to Jul 1, 2024 = 731 days)
        # Interest ≈ $100K * (1.10^(731/365.25) - 1) ≈ $21,016
        # Total ≈ $121,016
        converted = result["converted_instruments"][0]
        assert converted["accrued_interest"] == pytest.approx(21_000.0, rel=0.01)
        assert converted["investment_amount"] == pytest.approx(121_000.0, rel=0.01)
