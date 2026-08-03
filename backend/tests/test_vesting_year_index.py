"""
Regression tests for the year index of the opportunity cost DataFrame.

`calculate_annual_opportunity_cost` emits a one-based "Year" index, but the
service layer round-trips the frame through `to_dict(orient="records")`, which
drops the index. `calculate_startup_scenario` reads the index as the year
number, so a zero-based index shifts every vesting year one year late.
"""

from __future__ import annotations

from typing import Any

import pandas as pd
import pytest

from worth_it.calculations import calculate_annual_opportunity_cost, create_monthly_data_grid
from worth_it.calculations.base import EquityType
from worth_it.calculations.startup_scenario import calculate_startup_scenario
from worth_it.exceptions import CalculationError
from worth_it.services.startup_service import StartupScenarioResult, StartupService

GRANTED_OPTIONS = 1_000_000
STRIKE_PRICE = 1.0
EXIT_PRICE_PER_SHARE = 11.0


def _options_params(
    exit_year: int,
    total_vesting_years: int,
    cliff_years: int,
) -> dict[str, Any]:
    return {
        "equity_type": EquityType.STOCK_OPTIONS,
        "total_vesting_years": total_vesting_years,
        "cliff_years": cliff_years,
        "exit_year": exit_year,
        "options_params": {
            "num_options": GRANTED_OPTIONS,
            "strike_price": STRIKE_PRICE,
            "target_exit_price_per_share": EXIT_PRICE_PER_SHARE,
            "exercise_strategy": "At Exit",
            "exercise_year": exit_year,
        },
        "rsu_params": {},
    }


def _run_through_service(
    exit_year: int,
    total_vesting_years: int,
    cliff_years: int,
) -> StartupScenarioResult:
    """Drive the full service pipeline, including the records round-trip."""
    service = StartupService()
    monthly_data = service.create_monthly_grid(
        exit_year=exit_year,
        current_job_monthly_salary=10_000,
        startup_monthly_salary=8_000,
        current_job_salary_growth_rate=0.0,
    )
    opportunity_cost_data = service.calculate_opportunity_cost(
        monthly_data=monthly_data,
        annual_roi=0.05,
        investment_frequency="Annually",
    )
    return service.calculate_scenario(
        opportunity_cost_data=opportunity_cost_data,
        startup_params=_options_params(exit_year, total_vesting_years, cliff_years),
    )


def test_full_vest_at_exit_reports_100_percent_and_all_shares():
    """A 4-year grant held to a year-4 exit is fully vested."""
    result = _run_through_service(exit_year=4, total_vesting_years=4, cliff_years=1)

    final_row = result.results_df[-1]
    assert final_row["year"] == 4
    assert final_row["vested_equity_pct"] == pytest.approx(100.0)
    assert result.final_payout_value == pytest.approx(
        (EXIT_PRICE_PER_SHARE - STRIKE_PRICE) * GRANTED_OPTIONS
    )


def test_exit_at_cliff_year_vests_one_quarter():
    """Year 1 of a 4-year grant with a 1-year cliff vests 25%, not 0%."""
    result = _run_through_service(exit_year=1, total_vesting_years=4, cliff_years=1)

    final_row = result.results_df[-1]
    assert final_row["year"] == 1
    assert final_row["vested_equity_pct"] == pytest.approx(25.0)
    assert result.final_payout_value == pytest.approx(
        (EXIT_PRICE_PER_SHARE - STRIKE_PRICE) * GRANTED_OPTIONS * 0.25
    )


def test_exit_before_cliff_vests_nothing():
    """A 2-year cliff still forfeits everything when the exit lands in year 1."""
    result = _run_through_service(exit_year=1, total_vesting_years=4, cliff_years=2)

    final_row = result.results_df[-1]
    assert final_row["year"] == 1
    assert final_row["vested_equity_pct"] == pytest.approx(0.0)
    assert result.final_payout_value == pytest.approx(0.0)


def test_yearly_vesting_schedule_is_not_shifted():
    """Every year of the schedule vests its own fraction, not the previous year's."""
    result = _run_through_service(exit_year=4, total_vesting_years=4, cliff_years=1)

    schedule = {row["year"]: row["vested_equity_pct"] for row in result.results_df}
    assert schedule == pytest.approx({1: 25.0, 2: 50.0, 3: 75.0, 4: 100.0})


def test_service_hands_a_one_indexed_frame_to_the_calculation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The frame rebuilt from records must carry the one-based Year index again."""
    seen: list[pd.Index] = []
    original = calculate_startup_scenario

    def _spy(opportunity_cost_df: pd.DataFrame, startup_params: dict[str, Any]) -> dict[str, Any]:
        seen.append(opportunity_cost_df.index)
        return original(opportunity_cost_df, startup_params)

    monkeypatch.setattr("worth_it.services.startup_service.calculate_startup_scenario", _spy)

    _run_through_service(exit_year=4, total_vesting_years=4, cliff_years=1)

    assert len(seen) == 1
    assert list(seen[0]) == [1, 2, 3, 4]


def test_calculation_rejects_a_zero_indexed_frame():
    """A future serialization round-trip must not silently reintroduce the shift."""
    monthly_df = create_monthly_data_grid(
        exit_year=4,
        current_job_monthly_salary=10_000,
        startup_monthly_salary=8_000,
        current_job_salary_growth_rate=0.0,
    )
    opportunity_cost_df = calculate_annual_opportunity_cost(
        monthly_df=monthly_df,
        annual_roi=0.05,
        investment_frequency="Annually",
    )
    zero_indexed = opportunity_cost_df.reset_index(drop=True)

    with pytest.raises(CalculationError, match="one-based"):
        calculate_startup_scenario(zero_indexed, _options_params(4, 4, 1))
