"""
Tests for NPV comparison feature (Issue #278).

NPV provides an alternative view of opportunity cost and equity payout
in today's dollars rather than future value at exit year.
"""

from __future__ import annotations

import numpy as np
import pytest

from worth_it.calculations.base import EquityType
from worth_it.calculations.opportunity_cost import (
    calculate_annual_opportunity_cost,
    create_monthly_data_grid,
)
from worth_it.calculations.startup_scenario import calculate_startup_scenario


class TestNPVCalculation:
    """Tests for NPV calculation in opportunity cost."""

    def test_npv_column_added_to_results(self):
        """NPV column should be added to opportunity cost results."""
        monthly_df = create_monthly_data_grid(
            exit_year=5,
            current_job_monthly_salary=15000,
            startup_monthly_salary=10000,
            current_job_salary_growth_rate=0.03,
        )

        results = calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=0.08,
            investment_frequency="Monthly",
            discount_rate=0.08,  # New parameter
        )

        assert "Opportunity Cost (NPV)" in results.columns

    def test_npv_less_than_or_equal_fv(self):
        """NPV should always be <= FV when discount rate > 0."""
        monthly_df = create_monthly_data_grid(
            exit_year=5,
            current_job_monthly_salary=15000,
            startup_monthly_salary=10000,
            current_job_salary_growth_rate=0.03,
        )

        results = calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=0.08,
            investment_frequency="Monthly",
            discount_rate=0.08,
        )

        fv = results["Opportunity Cost (Invested Surplus)"]
        npv = results["Opportunity Cost (NPV)"]

        # NPV should be less than or equal to FV for all years
        assert all(npv <= fv)

    def test_npv_equals_fv_when_discount_zero(self):
        """NPV should equal FV when discount rate is 0."""
        monthly_df = create_monthly_data_grid(
            exit_year=5,
            current_job_monthly_salary=15000,
            startup_monthly_salary=10000,
            current_job_salary_growth_rate=0.03,
        )

        results = calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=0.08,
            investment_frequency="Monthly",
            discount_rate=0.0,  # No discounting
        )

        fv = results["Opportunity Cost (Invested Surplus)"]
        npv = results["Opportunity Cost (NPV)"]

        # NPV should equal FV when no discounting
        np.testing.assert_array_almost_equal(npv.values, fv.values)

    def test_npv_formula_correctness(self):
        """Verify NPV = FV / (1 + discount_rate)^years."""
        monthly_df = create_monthly_data_grid(
            exit_year=5,
            current_job_monthly_salary=15000,
            startup_monthly_salary=10000,
            current_job_salary_growth_rate=0.03,
        )

        discount_rate = 0.10  # 10%
        results = calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=0.08,
            investment_frequency="Monthly",
            discount_rate=discount_rate,
        )

        fv = results["Opportunity Cost (Invested Surplus)"]
        npv = results["Opportunity Cost (NPV)"]
        years = results.index

        # Calculate expected NPV manually
        expected_npv = fv / ((1 + discount_rate) ** years)

        np.testing.assert_array_almost_equal(npv.values, expected_npv.values)

    def test_discount_rate_defaults_to_roi(self):
        """When discount_rate not provided, should default to annual_roi."""
        monthly_df = create_monthly_data_grid(
            exit_year=5,
            current_job_monthly_salary=15000,
            startup_monthly_salary=10000,
            current_job_salary_growth_rate=0.03,
        )

        # Without explicit discount_rate
        results_default = calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=0.08,
            investment_frequency="Monthly",
            # discount_rate not provided - should default to annual_roi
        )

        # With explicit discount_rate = annual_roi
        results_explicit = calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=0.08,
            investment_frequency="Monthly",
            discount_rate=0.08,
        )

        npv_default = results_default["Opportunity Cost (NPV)"]
        npv_explicit = results_explicit["Opportunity Cost (NPV)"]

        np.testing.assert_array_almost_equal(npv_default.values, npv_explicit.values)


class TestStartupScenarioNPV:
    """Tests for NPV in startup scenario results."""

    @pytest.fixture
    def base_opportunity_cost_df(self):
        """Create base opportunity cost dataframe."""
        monthly_df = create_monthly_data_grid(
            exit_year=5,
            current_job_monthly_salary=15000,
            startup_monthly_salary=10000,
            current_job_salary_growth_rate=0.03,
        )
        return calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=0.08,
            investment_frequency="Monthly",
            discount_rate=0.08,
        )

    def test_scenario_returns_npv_values(self, base_opportunity_cost_df):
        """Startup scenario should return NPV values for payout and opportunity cost."""
        startup_params = {
            "equity_type": EquityType.RSU,
            "total_vesting_years": 4,
            "cliff_years": 1,
            "exit_year": 5,
            "discount_rate": 0.08,
            "rsu_params": {
                "equity_pct": 0.5,
                "target_exit_valuation": 100_000_000,
                "simulate_dilution": False,
            },
        }

        result = calculate_startup_scenario(
            opportunity_cost_df=base_opportunity_cost_df,
            startup_params=startup_params,
        )

        assert "final_payout_value_npv" in result
        assert "final_opportunity_cost_npv" in result

    def test_scenario_npv_less_than_fv(self, base_opportunity_cost_df):
        """Scenario NPV values should be less than FV values."""
        startup_params = {
            "equity_type": EquityType.RSU,
            "total_vesting_years": 4,
            "cliff_years": 1,
            "exit_year": 5,
            "discount_rate": 0.08,
            "rsu_params": {
                "equity_pct": 0.5,
                "target_exit_valuation": 100_000_000,
                "simulate_dilution": False,
            },
        }

        result = calculate_startup_scenario(
            opportunity_cost_df=base_opportunity_cost_df,
            startup_params=startup_params,
        )

        assert result["final_payout_value_npv"] <= result["final_payout_value"]
        assert result["final_opportunity_cost_npv"] <= result["final_opportunity_cost"]

    def test_net_outcome_npv_calculation(self, base_opportunity_cost_df):
        """Net outcome NPV should be payout NPV minus opportunity cost NPV."""
        startup_params = {
            "equity_type": EquityType.RSU,
            "total_vesting_years": 4,
            "cliff_years": 1,
            "exit_year": 5,
            "discount_rate": 0.08,
            "rsu_params": {
                "equity_pct": 0.5,
                "target_exit_valuation": 100_000_000,
                "simulate_dilution": False,
            },
        }

        result = calculate_startup_scenario(
            opportunity_cost_df=base_opportunity_cost_df,
            startup_params=startup_params,
        )

        expected_net_npv = result["final_payout_value_npv"] - result["final_opportunity_cost_npv"]

        # If net_outcome_npv is returned, verify it matches
        if "net_outcome_npv" in result:
            assert result["net_outcome_npv"] == pytest.approx(expected_net_npv)
