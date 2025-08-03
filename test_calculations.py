"""
Unit tests for the financial calculation functions.

To run these tests, execute `pytest test_calculations.py` in your terminal.
You will need to install pytest: `pip install pytest`
"""

import unittest

import pandas as pd

from calculations import (
    _calculate_dilution,
    annual_to_monthly_roi,
    calculate_annual_opportunity_cost,
    calculate_irr,
    calculate_npv,
    calculate_startup_scenario,
    create_monthly_data_grid,
)


class TestFinancialCalculations(unittest.TestCase):

    def test_annual_to_monthly_roi(self):
        """Test annual to monthly ROI conversion."""
        self.assertAlmostEqual(annual_to_monthly_roi(0.12), 0.00948879, places=8)
        self.assertAlmostEqual(annual_to_monthly_roi(0.0), 0.0, places=8)

    def test_create_monthly_data_grid(self):
        """Test the creation of the monthly surplus grid."""
        df = create_monthly_data_grid(
            total_vesting_years=2,
            current_job_monthly_salary=10000,
            startup_monthly_salary=8000,
            current_job_salary_growth_rate=0.10,
        )
        self.assertEqual(len(df), 24)
        self.assertEqual(df["MonthlySurplus"].iloc[0], 2000)  # 10000 - 8000
        self.assertEqual(df["MonthlySurplus"].iloc[12], 3000)  # 11000 - 8000
        self.assertEqual(df["InvestableSurplus"].sum(), (2000 * 12) + (3000 * 12))

    def test_calculate_annual_opportunity_cost(self):
        """Test opportunity cost calculation."""
        monthly_df = pd.DataFrame(
            {
                "Year": [1, 1, 2, 2],
                "MonthlySurplus": [100, 100, 200, 200],
                "InvestableSurplus": [100, 100, 200, 200],
            },
            index=pd.RangeIndex(4, name="MonthIndex"),
        )

        # Test annual investment
        results_df = calculate_annual_opportunity_cost(monthly_df, 0.10, "Annually")
        self.assertEqual(len(results_df), 2)
        # Year 1: 200 principal. Year 2: 200 * 1.1 + 400 = 620
        self.assertAlmostEqual(
            results_df["Opportunity Cost (Invested Surplus)"].iloc[-1], 620
        )

    def test_calculate_dilution(self):
        """Test the internal dilution calculation logic."""
        dilution_info = _calculate_dilution(
            initial_equity_pct=0.10,
            dilution_rounds=[
                {"year": 1, "dilution": 0.20},  # 20% dilution
                {"year": 3, "dilution": 0.15},  # 15% dilution
            ],
            total_vesting_years=4,
        )
        # Expected: 0.10 * (1 - 0.20) * (1 - 0.15) = 0.10 * 0.8 * 0.85 = 0.068
        self.assertAlmostEqual(dilution_info["diluted_equity_pct"], 0.068)
        self.assertAlmostEqual(dilution_info["total_dilution"], 1 - (0.8 * 0.85))

    def test_rsu_scenario_no_dilution(self):
        """Test RSU calculations without any dilution."""
        opp_cost_df = pd.DataFrame(
            {
                "Year": [1, 2],
                "Opportunity Cost (Invested Surplus)": [10000, 25000],
                "Principal Forgone": [10000, 20000],
                "Investment Returns": [0, 5000],
            },
            index=pd.RangeIndex(1, 3, name="Year"),
        )

        startup_params = {
            "comp_type": "Equity (RSUs)",
            "total_vesting_years": 2,
            "cliff_years": 1,
            "rsu_params": {
                "equity_pct": 0.05,  # 5%
                "target_exit_valuation": 1_000_000,
                "simulate_dilution": False,
            },
            "options_params": {},
        }

        results = calculate_startup_scenario(opp_cost_df, startup_params)

        # Payout = 1M * 5% = 50,000
        self.assertAlmostEqual(results["final_payout_value"], 50000)
        # Breakeven = OppCost / Vested% = 25000 / 0.05 = 500,000
        self.assertAlmostEqual(
            results["results_df"]["Breakeven Value"].iloc[-1], 500000
        )

    def test_rsu_scenario_with_dilution_bug_fix(self):
        """Test RSU calculations with dilution, specifically testing the bug fix."""
        opp_cost_df = pd.DataFrame(
            {
                "Year": [1, 2],
                "Opportunity Cost (Invested Surplus)": [10000, 25000],
                "Principal Forgone": [10000, 20000],
                "Investment Returns": [0, 5000],
            },
            index=pd.RangeIndex(1, 3, name="Year"),
        )

        startup_params = {
            "comp_type": "Equity (RSUs)",
            "total_vesting_years": 2,
            "cliff_years": 1,
            "rsu_params": {
                "equity_pct": 0.10,  # 10%
                "target_exit_valuation": 1_000_000,
                "simulate_dilution": True,
                "dilution_rounds": [{"year": 1, "dilution": 0.50}],  # 50% dilution
            },
            "options_params": {},
        }

        results = calculate_startup_scenario(opp_cost_df, startup_params)

        # Diluted equity = 10% * (1 - 0.5) = 5%
        self.assertAlmostEqual(results["diluted_equity_pct"], 0.05)
        # Payout = 1M * 5% = 50,000
        self.assertAlmostEqual(results["final_payout_value"], 50000)
        # Breakeven = OppCost / VestedDiluted% = 25000 / 0.05 = 500,000
        # This confirms the bug is fixed, as it uses the diluted percentage.
        self.assertAlmostEqual(
            results["results_df"]["Breakeven Value"].iloc[-1], 500000
        )

    def test_options_scenario(self):
        """Test stock option calculations."""
        opp_cost_df = pd.DataFrame(
            {
                "Year": [1, 2],
                "Opportunity Cost (Invested Surplus)": [12000, 30000],
                "Principal Forgone": [12000, 24000],
                "Investment Returns": [0, 6000],
            },
            index=pd.RangeIndex(1, 3, name="Year"),
        )

        startup_params = {
            "comp_type": "Stock Options",
            "total_vesting_years": 2,
            "cliff_years": 0,
            "rsu_params": {},
            "options_params": {
                "num_options": 10000,
                "strike_price": 1.5,
                "target_exit_price_per_share": 10.0,
            },
        }

        results = calculate_startup_scenario(opp_cost_df, startup_params)

        # Payout = (10.0 - 1.5) * 10000 = 8.5 * 10000 = 85000
        self.assertAlmostEqual(results["final_payout_value"], 85000)
        # Breakeven = (OppCost / NumOptions) + Strike = (30000 / 10000) + 1.5 = 3.0 + 1.5 = 4.5
        self.assertAlmostEqual(results["results_df"]["Breakeven Value"].iloc[-1], 4.5)

    def test_irr_npv(self):
        """Test IRR and NPV calculations with a simple case."""
        monthly_surpluses = pd.Series([-100] * 11 + [-100])  # 12 months of -100
        final_payout = 1500

        # Test IRR
        irr = calculate_irr(monthly_surpluses, final_payout)
        # An online calculator for IRR of (-100... x11, 1400) gives monthly ~3.5%, annual ~51%
        self.assertGreater(irr, 45)
        self.assertLess(irr, 55)

        # Test NPV
        npv = calculate_npv(
            monthly_surpluses, 0.10, final_payout
        )  # 10% annual discount
        # An online calculator gives ~175
        self.assertGreater(npv, 170)
        self.assertLess(npv, 180)


if __name__ == "__main__":
    unittest.main(argv=["first-arg-is-ignored"], exit=False)
