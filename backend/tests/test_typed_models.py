"""Tests for typed request payload models (Issue #248)."""

import pytest
from pydantic import ValidationError

from worth_it.models import (
    VariableParam,
    SimParamRange,
    RSUParams,
    StockOptionsParams,
    TypedBaseParams,
    MonteCarloRequest,
    SensitivityAnalysisRequest,
    StartupScenarioRequest,
)


class TestVariableParam:
    """Tests for VariableParam enum."""

    def test_valid_param_values(self):
        """All expected parameter names are valid."""
        assert VariableParam.EXIT_VALUATION == "exit_valuation"
        assert VariableParam.EXIT_YEAR == "exit_year"
        assert VariableParam.FAILURE_PROBABILITY == "failure_probability"
        assert VariableParam.ANNUAL_ROI == "annual_roi"

    def test_param_is_string_enum(self):
        """VariableParam values are strings for JSON serialization."""
        assert isinstance(VariableParam.EXIT_VALUATION.value, str)


class TestSimParamRange:
    """Tests for SimParamRange model."""

    def test_valid_range(self):
        """Valid min <= max range is accepted."""
        r = SimParamRange(min=10.0, max=100.0)
        assert r.min == 10.0
        assert r.max == 100.0

    def test_equal_min_max(self):
        """min == max is valid (single value)."""
        r = SimParamRange(min=50.0, max=50.0)
        assert r.min == r.max == 50.0

    def test_invalid_range_min_greater_than_max(self):
        """min > max raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SimParamRange(min=100.0, max=10.0)
        assert "min" in str(exc_info.value).lower()


class TestRSUParams:
    """Tests for RSUParams model."""

    def test_valid_rsu_params(self):
        """Valid RSU parameters are accepted."""
        params = RSUParams(
            equity_type="RSU",
            monthly_salary=12000.0,
            total_equity_grant_pct=0.5,
            exit_valuation=100_000_000.0,
        )
        assert params.equity_type == "RSU"
        assert params.vesting_period == 4  # default
        assert params.cliff_period == 1  # default

    def test_rsu_rejects_wrong_equity_type(self):
        """RSUParams rejects non-RSU equity_type."""
        with pytest.raises(ValidationError):
            RSUParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                total_equity_grant_pct=0.5,
                exit_valuation=100_000_000.0,
            )

    def test_rsu_validates_equity_pct_range(self):
        """total_equity_grant_pct must be 0-100."""
        with pytest.raises(ValidationError):
            RSUParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                total_equity_grant_pct=101.0,
                exit_valuation=100_000_000.0,
            )


class TestStockOptionsParams:
    """Tests for StockOptionsParams model."""

    def test_valid_options_params(self):
        """Valid stock options parameters are accepted."""
        params = StockOptionsParams(
            equity_type="STOCK_OPTIONS",
            monthly_salary=12000.0,
            num_options=10000,
            strike_price=1.50,
            exit_price_per_share=15.0,
        )
        assert params.equity_type == "STOCK_OPTIONS"
        assert params.exercise_strategy == "AT_EXIT"  # default

    def test_options_rejects_wrong_equity_type(self):
        """StockOptionsParams rejects non-STOCK_OPTIONS equity_type."""
        with pytest.raises(ValidationError):
            StockOptionsParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=1.50,
                exit_price_per_share=15.0,
            )

    def test_options_validates_positive_strike(self):
        """strike_price must be >= 0."""
        with pytest.raises(ValidationError):
            StockOptionsParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=-1.0,
                exit_price_per_share=15.0,
            )


class TestTypedBaseParams:
    """Tests for TypedBaseParams model."""

    def test_valid_base_params_with_rsu(self):
        """Valid base params with RSU startup_params are accepted."""
        params = TypedBaseParams(
            exit_year=5,
            current_job_monthly_salary=15000.0,
            startup_monthly_salary=12000.0,
            current_job_salary_growth_rate=0.05,
            annual_roi=0.08,
            investment_frequency="Monthly",
            failure_probability=0.3,
            startup_params=RSUParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                total_equity_grant_pct=0.5,
                exit_valuation=100_000_000.0,
            ),
        )
        assert params.exit_year == 5
        assert params.startup_params.equity_type == "RSU"

    def test_valid_base_params_with_options(self):
        """Valid base params with stock options startup_params are accepted."""
        params = TypedBaseParams(
            exit_year=5,
            current_job_monthly_salary=15000.0,
            startup_monthly_salary=12000.0,
            current_job_salary_growth_rate=0.05,
            annual_roi=0.08,
            investment_frequency="Annually",
            failure_probability=0.3,
            startup_params=StockOptionsParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=1.50,
                exit_price_per_share=15.0,
            ),
        )
        assert params.startup_params.equity_type == "STOCK_OPTIONS"

    def test_exit_year_range(self):
        """exit_year must be 1-20."""
        with pytest.raises(ValidationError):
            TypedBaseParams(
                exit_year=0,
                current_job_monthly_salary=15000.0,
                startup_monthly_salary=12000.0,
                current_job_salary_growth_rate=0.05,
                annual_roi=0.08,
                investment_frequency="Monthly",
                failure_probability=0.3,
                startup_params=RSUParams(
                    equity_type="RSU",
                    monthly_salary=12000.0,
                    total_equity_grant_pct=0.5,
                    exit_valuation=100_000_000.0,
                ),
            )

    def test_invalid_investment_frequency(self):
        """investment_frequency must be Monthly or Annually."""
        with pytest.raises(ValidationError):
            TypedBaseParams(
                exit_year=5,
                current_job_monthly_salary=15000.0,
                startup_monthly_salary=12000.0,
                current_job_salary_growth_rate=0.05,
                annual_roi=0.08,
                investment_frequency="Weekly",
                failure_probability=0.3,
                startup_params=RSUParams(
                    equity_type="RSU",
                    monthly_salary=12000.0,
                    total_equity_grant_pct=0.5,
                    exit_valuation=100_000_000.0,
                ),
            )


class TestMonteCarloRequestTyped:
    """Tests for typed MonteCarloRequest."""

    def test_valid_monte_carlo_request(self):
        """Valid typed Monte Carlo request is accepted."""
        request = MonteCarloRequest(
            num_simulations=1000,
            base_params=TypedBaseParams(
                exit_year=5,
                current_job_monthly_salary=15000.0,
                startup_monthly_salary=12000.0,
                current_job_salary_growth_rate=0.05,
                annual_roi=0.08,
                investment_frequency="Monthly",
                failure_probability=0.3,
                startup_params=RSUParams(
                    equity_type="RSU",
                    monthly_salary=12000.0,
                    total_equity_grant_pct=0.5,
                    exit_valuation=100_000_000.0,
                ),
            ),
            sim_param_configs={
                VariableParam.EXIT_VALUATION: SimParamRange(min=50_000_000, max=200_000_000),
            },
        )
        assert request.num_simulations == 1000
        assert VariableParam.EXIT_VALUATION in request.sim_param_configs

    def test_rejects_invalid_param_key(self):
        """sim_param_configs rejects non-VariableParam keys."""
        with pytest.raises(ValidationError):
            MonteCarloRequest(
                num_simulations=1000,
                base_params=TypedBaseParams(
                    exit_year=5,
                    current_job_monthly_salary=15000.0,
                    startup_monthly_salary=12000.0,
                    current_job_salary_growth_rate=0.05,
                    annual_roi=0.08,
                    investment_frequency="Monthly",
                    failure_probability=0.3,
                    startup_params=RSUParams(
                        equity_type="RSU",
                        monthly_salary=12000.0,
                        total_equity_grant_pct=0.5,
                        exit_valuation=100_000_000.0,
                    ),
                ),
                sim_param_configs={
                    "invalid_param": SimParamRange(min=1, max=10),  # type: ignore
                },
            )


class TestSensitivityAnalysisRequestTyped:
    """Tests for typed SensitivityAnalysisRequest."""

    def test_valid_sensitivity_request(self):
        """Valid typed Sensitivity request is accepted."""
        request = SensitivityAnalysisRequest(
            base_params=TypedBaseParams(
                exit_year=5,
                current_job_monthly_salary=15000.0,
                startup_monthly_salary=12000.0,
                current_job_salary_growth_rate=0.05,
                annual_roi=0.08,
                investment_frequency="Monthly",
                failure_probability=0.3,
                startup_params=RSUParams(
                    equity_type="RSU",
                    monthly_salary=12000.0,
                    total_equity_grant_pct=0.5,
                    exit_valuation=100_000_000.0,
                ),
            ),
            sim_param_configs={
                VariableParam.FAILURE_PROBABILITY: SimParamRange(min=0.1, max=0.5),
            },
        )
        assert VariableParam.FAILURE_PROBABILITY in request.sim_param_configs


class TestStartupScenarioRequestTyped:
    """Tests for typed StartupScenarioRequest."""

    def test_valid_startup_scenario_with_rsu(self):
        """Valid request with RSU params is accepted."""
        request = StartupScenarioRequest(
            opportunity_cost_data=[{"Year": 1, "MonthlySurplus": 1000}],
            startup_params=RSUParams(
                equity_type="RSU",
                monthly_salary=12000.0,
                total_equity_grant_pct=0.5,
                exit_valuation=100_000_000.0,
            ),
        )
        assert request.startup_params.equity_type == "RSU"

    def test_valid_startup_scenario_with_options(self):
        """Valid request with stock options params is accepted."""
        request = StartupScenarioRequest(
            opportunity_cost_data=[{"Year": 1, "MonthlySurplus": 1000}],
            startup_params=StockOptionsParams(
                equity_type="STOCK_OPTIONS",
                monthly_salary=12000.0,
                num_options=10000,
                strike_price=1.50,
                exit_price_per_share=15.0,
            ),
        )
        assert request.startup_params.equity_type == "STOCK_OPTIONS"
