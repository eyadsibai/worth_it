"""TDD tests for bug fixes identified in code audit.

These tests are written FIRST (RED phase) to verify bugs exist,
then the corresponding fixes make them pass (GREEN phase).
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from worth_it.calculations.waterfall_engine import calculate_waterfall
from worth_it.models import (
    DilutionFromValuationRequest,
    MonteCarloRequest,
    RSUParams,
    SensitivityAnalysisRequest,
    StockOptionsParams,
)

# =============================================================================
# Bug #1: exercise_strategy="AFTER_VESTING" must require exercise_year
# =============================================================================


class TestBug1ExerciseStrategyValidation:
    """StockOptionsParams should reject AFTER_VESTING without exercise_year."""

    def test_after_vesting_without_exercise_year_raises(self):
        """AFTER_VESTING strategy requires exercise_year to be set."""
        with pytest.raises(ValidationError, match="exercise_year"):
            StockOptionsParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=1.50,
                exit_price_per_share=15.0,
                exercise_strategy="AFTER_VESTING",
                # exercise_year intentionally omitted
            )

    def test_after_vesting_with_exercise_year_accepted(self):
        """AFTER_VESTING with exercise_year should be accepted."""
        params = StockOptionsParams(
            equity_type="STOCK_OPTIONS",
            monthly_salary=12000.0,
            num_options=10000,
            strike_price=1.50,
            exit_price_per_share=15.0,
            exercise_strategy="AFTER_VESTING",
            exercise_year=2,
        )
        assert params.exercise_year == 2
        assert params.exercise_strategy == "AFTER_VESTING"

    def test_at_exit_without_exercise_year_accepted(self):
        """AT_EXIT strategy should work fine without exercise_year."""
        params = StockOptionsParams(
            equity_type="STOCK_OPTIONS",
            monthly_salary=12000.0,
            num_options=10000,
            strike_price=1.50,
            exit_price_per_share=15.0,
            exercise_strategy="AT_EXIT",
        )
        assert params.exercise_year is None

    def test_after_vesting_with_exercise_year_zero_raises(self):
        """AFTER_VESTING with exercise_year=0 should be rejected (must be >= 1)."""
        with pytest.raises(ValidationError):
            StockOptionsParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=1.50,
                exit_price_per_share=15.0,
                exercise_strategy="AFTER_VESTING",
                exercise_year=0,
            )


# =============================================================================
# Bug #2: Waterfall stakeholders not in any tier should trigger warning/validation
# =============================================================================


class TestBug2WaterfallStakeholderTierCoverage:
    """Waterfall should warn when preferred stakeholders aren't in any tier."""

    def test_tier_referencing_nonexistent_stakeholder_raises(self):
        """Tiers referencing stakeholder IDs not in cap table should raise ValueError."""
        cap_table = {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 7_000_000,
                    "ownership_pct": 70.0,
                    "share_class": "common",
                },
                {
                    "id": "investor-1",
                    "name": "Orphaned Investor",
                    "type": "investor",
                    "shares": 3_000_000,
                    "ownership_pct": 30.0,
                    "share_class": "preferred",
                },
            ],
            "total_shares": 10_000_000,
        }

        # Tier references a stakeholder_id not in the cap table
        preference_tiers = [
            {
                "id": "tier-1",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 5_000_000,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "stakeholder_ids": ["nonexistent-investor"],
            }
        ]

        with pytest.raises(ValueError, match="not found in cap table"):
            calculate_waterfall(
                cap_table=cap_table,
                preference_tiers=preference_tiers,
                exit_valuation=10_000_000,
            )

    def test_valid_tiers_with_matching_stakeholders_accepted(self):
        """Tiers with valid stakeholder IDs should work normally."""
        cap_table = {
            "stakeholders": [
                {
                    "id": "founder-1",
                    "name": "Founder",
                    "type": "founder",
                    "shares": 7_000_000,
                    "ownership_pct": 70.0,
                    "share_class": "common",
                },
                {
                    "id": "investor-1",
                    "name": "Investor",
                    "type": "investor",
                    "shares": 3_000_000,
                    "ownership_pct": 30.0,
                    "share_class": "preferred",
                },
            ],
            "total_shares": 10_000_000,
        }

        preference_tiers = [
            {
                "id": "tier-1",
                "name": "Series A",
                "seniority": 1,
                "investment_amount": 5_000_000,
                "liquidation_multiplier": 1.0,
                "participating": False,
                "stakeholder_ids": ["investor-1"],
            }
        ]

        result = calculate_waterfall(
            cap_table=cap_table,
            preference_tiers=preference_tiers,
            exit_valuation=10_000_000,
        )
        assert len(result["stakeholder_payouts"]) == 2


# =============================================================================
# Bug #3: DilutionFromValuationRequest should reject amount_raised=0
# =============================================================================


class TestBug3DilutionAmountRaisedZero:
    """DilutionFromValuationRequest should reject amount_raised=0."""

    def test_amount_raised_zero_raises(self):
        """amount_raised=0 is mathematically nonsensical for dilution."""
        with pytest.raises(ValidationError):
            DilutionFromValuationRequest(
                pre_money_valuation=10_000_000,
                amount_raised=0,
            )

    def test_amount_raised_positive_accepted(self):
        """Positive amount_raised should be accepted."""
        request = DilutionFromValuationRequest(
            pre_money_valuation=10_000_000,
            amount_raised=2_000_000,
        )
        assert request.amount_raised == 2_000_000

    def test_amount_raised_negative_raises(self):
        """Negative amount_raised should be rejected."""
        with pytest.raises(ValidationError):
            DilutionFromValuationRequest(
                pre_money_valuation=10_000_000,
                amount_raised=-1,
            )


# =============================================================================
# Bug #4: Monte Carlo iterative simulation needs max_simulations guard
# =============================================================================


class TestBug4MonteCarloTimeout:
    """Iterative Monte Carlo should enforce simulation limits."""

    def test_iterative_mc_respects_max_simulations(self):
        """run_monte_carlo_simulation_iterative should enforce a reasonable limit."""
        from worth_it.calculations.base import EquityType
        from worth_it.monte_carlo import run_monte_carlo_simulation_iterative

        base_params = {
            "exit_year": 5,
            "current_job_monthly_salary": 15000,
            "startup_monthly_salary": 12000,
            "current_job_salary_growth_rate": 0.05,
            "annual_roi": 0.08,
            "investment_frequency": "Monthly",
            "failure_probability": 0.3,
            "startup_params": {
                "equity_type": EquityType.RSU,
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {
                    "equity_pct": 0.005,
                    "target_exit_valuation": 100_000_000,
                },
            },
        }
        sim_configs = {
            "exit_year": {"min_val": 3, "max_val": 7, "mode": 5},
            "valuation": {"min_val": 50e6, "max_val": 200e6, "mode": 100e6},
        }

        # 10 simulations should complete quickly
        result = run_monte_carlo_simulation_iterative(10, base_params, sim_configs)
        assert len(result["net_outcomes"]) == 10


# =============================================================================
# Bug #5: exit_valuation should be gt=0, not ge=0
# =============================================================================


class TestBug5ExitValuationZero:
    """RSUParams should reject exit_valuation=0."""

    def test_exit_valuation_zero_raises(self):
        """exit_valuation=0 is meaningless and should be rejected."""
        with pytest.raises(ValidationError):
            RSUParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                total_equity_grant_pct=0.5,
                exit_valuation=0,
            )

    def test_exit_valuation_positive_accepted(self):
        """Positive exit_valuation should be accepted."""
        params = RSUParams(
            equity_type="RSU",
            monthly_salary=12000.0,
            total_equity_grant_pct=0.5,
            exit_valuation=100_000_000,
        )
        assert params.exit_valuation == 100_000_000

    def test_exit_valuation_negative_raises(self):
        """Negative exit_valuation should be rejected."""
        with pytest.raises(ValidationError):
            RSUParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                total_equity_grant_pct=0.5,
                exit_valuation=-1,
            )


# =============================================================================
# Bug #6: max_simulations should be enforced at calculation level
# =============================================================================


class TestBug6MaxSimulationsEnforcement:
    """Monte Carlo simulation functions should enforce max_simulations."""

    def test_run_mc_simulation_rejects_excessive_simulations(self):
        """run_monte_carlo_simulation should reject num_simulations > MAX_SIMULATIONS."""
        from worth_it.calculations.base import EquityType
        from worth_it.config import Settings
        from worth_it.exceptions import CalculationError
        from worth_it.monte_carlo import run_monte_carlo_simulation

        base_params = {
            "exit_year": 5,
            "current_job_monthly_salary": 15000,
            "startup_monthly_salary": 12000,
            "current_job_salary_growth_rate": 0.05,
            "annual_roi": 0.08,
            "investment_frequency": "Monthly",
            "failure_probability": 0.3,
            "startup_params": {
                "equity_type": EquityType.RSU,
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {
                    "equity_pct": 0.005,
                    "target_exit_valuation": 100_000_000,
                },
            },
        }
        sim_configs = {
            "valuation": {"min_val": 50e6, "max_val": 200e6, "mode": 100e6},
        }

        excessive = Settings.MAX_SIMULATIONS + 1

        with pytest.raises(CalculationError, match="max"):
            run_monte_carlo_simulation(excessive, base_params, sim_configs)


# =============================================================================
# Bug #7: Iterative Monte Carlo should work when only exit_year is simulated
# =============================================================================


class TestBug7IterativeExitYearOnly:
    """Iterative Monte Carlo must default valuation when not explicitly simulated."""

    def test_exit_year_only_simulation_uses_default_valuation(self):
        """Simulating only exit_year should not crash with missing valuation."""
        from worth_it.calculations.base import EquityType
        from worth_it.monte_carlo import run_monte_carlo_simulation

        base_params = {
            "exit_year": 5,
            "current_job_monthly_salary": 15000,
            "startup_monthly_salary": 12000,
            "current_job_salary_growth_rate": 0.05,
            "annual_roi": 0.08,
            "investment_frequency": "Monthly",
            "failure_probability": 0.0,
            "startup_params": {
                "equity_type": EquityType.RSU,
                "total_vesting_years": 4,
                "cliff_years": 1,
                "rsu_params": {
                    "equity_pct": 0.005,
                    "target_exit_valuation": 100_000_000,
                },
                "options_params": {},
            },
        }
        sim_configs = {
            "exit_year": {"min_val": 3, "max_val": 7, "mode": 5},
        }

        result = run_monte_carlo_simulation(25, base_params, sim_configs)

        assert len(result["net_outcomes"]) == 25
        assert len(result["simulated_valuations"]) == 25
        assert (result["simulated_valuations"] == 100_000_000).all()


# =============================================================================
# Bug #8: Simulated exit_year ranges should be validated (1-20, integer years)
# =============================================================================


class TestBug8ExitYearRangeValidation:
    """MonteCarloRequest should reject invalid exit_year simulation ranges."""

    def test_exit_year_sim_range_below_one_is_rejected(self):
        """sim_param_configs.exit_year with min < 1 should fail validation."""
        with pytest.raises(ValidationError, match="sim_param_configs.exit_year"):
            MonteCarloRequest(
                num_simulations=100,
                base_params={
                    "exit_year": 5,
                    "current_job_monthly_salary": 12000,
                    "startup_monthly_salary": 9000,
                    "current_job_salary_growth_rate": 0.05,
                    "annual_roi": 0.07,
                    "investment_frequency": "Monthly",
                    "failure_probability": 0.2,
                    "startup_params": {
                        "equity_type": "RSU",
                        "monthly_salary": 9000,
                        "total_equity_grant_pct": 0.5,
                        "vesting_period": 4,
                        "cliff_period": 1,
                        "exit_valuation": 100_000_000,
                        "simulate_dilution": False,
                        "dilution_rounds": [],
                    },
                },
                sim_param_configs={
                    "exit_year": {"min": 0, "max": 7},
                },
            )

    def test_exit_year_sim_range_with_fractional_bounds_is_rejected(self):
        """sim_param_configs.exit_year must use whole-number year bounds."""
        with pytest.raises(ValidationError, match="whole numbers"):
            MonteCarloRequest(
                num_simulations=100,
                base_params={
                    "exit_year": 5,
                    "current_job_monthly_salary": 12000,
                    "startup_monthly_salary": 9000,
                    "current_job_salary_growth_rate": 0.05,
                    "annual_roi": 0.07,
                    "investment_frequency": "Monthly",
                    "failure_probability": 0.2,
                    "startup_params": {
                        "equity_type": "RSU",
                        "monthly_salary": 9000,
                        "total_equity_grant_pct": 0.5,
                        "vesting_period": 4,
                        "cliff_period": 1,
                        "exit_valuation": 100_000_000,
                        "simulate_dilution": False,
                        "dilution_rounds": [],
                    },
                },
                sim_param_configs={
                    "exit_year": {"min": 3.5, "max": 7},
                },
            )

    def test_sensitivity_exit_year_fractional_bounds_are_rejected(self):
        """Sensitivity request should enforce the same whole-number year bounds."""
        with pytest.raises(ValidationError, match="whole numbers"):
            SensitivityAnalysisRequest(
                base_params={
                    "exit_year": 5,
                    "current_job_monthly_salary": 12000,
                    "startup_monthly_salary": 9000,
                    "current_job_salary_growth_rate": 0.05,
                    "annual_roi": 0.07,
                    "investment_frequency": "Monthly",
                    "failure_probability": 0.2,
                    "startup_params": {
                        "equity_type": "RSU",
                        "monthly_salary": 9000,
                        "total_equity_grant_pct": 0.5,
                        "vesting_period": 4,
                        "cliff_period": 1,
                        "exit_valuation": 100_000_000,
                        "simulate_dilution": False,
                        "dilution_rounds": [],
                    },
                },
                sim_param_configs={
                    "exit_year": {"min": 3, "max": 6.25},
                },
            )
