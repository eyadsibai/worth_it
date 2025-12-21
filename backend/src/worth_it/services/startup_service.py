"""
Startup scenario service for business logic orchestration.

This service encapsulates the business logic for startup equity analysis,
including opportunity cost calculations, scenario analysis, and financial metrics.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, cast

import pandas as pd

from worth_it.calculations import (
    calculate_annual_opportunity_cost,
    calculate_irr,
    calculate_npv,
    calculate_startup_scenario,
    create_monthly_data_grid,
)
from worth_it.services.serializers import (
    ResponseMapper,
    convert_equity_type_in_startup_params,
)


@dataclass
class StartupScenarioResult:
    """Result of a startup scenario calculation."""

    results_df: list[dict[str, Any]]
    final_payout_value: float
    final_payout_value_npv: float | None
    final_opportunity_cost: float
    final_opportunity_cost_npv: float | None
    payout_label: str
    breakeven_label: str
    total_dilution: float | None = None
    diluted_equity_pct: float | None = None


class StartupService:
    """
    Service for startup equity scenario calculations.

    This service orchestrates the calculation pipeline for analyzing
    startup job offers, including:
    - Monthly data grid creation
    - Opportunity cost calculation
    - Startup scenario analysis
    - Financial metrics (IRR, NPV)

    Example:
        service = StartupService()
        result = service.calculate_scenario(
            opportunity_cost_data=[...],
            startup_params={...}
        )
    """

    def create_monthly_grid(
        self,
        exit_year: int,
        current_job_monthly_salary: float,
        startup_monthly_salary: float,
        current_job_salary_growth_rate: float,
        dilution_rounds: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Create a monthly data grid for financial projections.

        Args:
            exit_year: Expected exit year
            current_job_monthly_salary: Monthly salary at current job
            startup_monthly_salary: Monthly salary at startup
            current_job_salary_growth_rate: Annual growth rate for current job salary
            dilution_rounds: Optional funding rounds with salary changes

        Returns:
            List of dicts representing monthly projections
        """
        df = create_monthly_data_grid(
            exit_year=exit_year,
            current_job_monthly_salary=current_job_monthly_salary,
            startup_monthly_salary=startup_monthly_salary,
            current_job_salary_growth_rate=current_job_salary_growth_rate,
            dilution_rounds=dilution_rounds,
        )
        return cast(list[dict[str, Any]], df.to_dict(orient="records"))

    def calculate_opportunity_cost(
        self,
        monthly_data: list[dict[str, Any]],
        annual_roi: float,
        investment_frequency: str,
        options_params: dict[str, Any] | None = None,
        startup_params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Calculate the opportunity cost of foregone salary.

        Args:
            monthly_data: Monthly data from create_monthly_grid
            annual_roi: Expected annual return on investments
            investment_frequency: "Monthly" or "Annually"
            options_params: Optional stock options parameters
            startup_params: Optional startup parameters

        Returns:
            List of dicts with annual opportunity cost data
        """
        monthly_df = pd.DataFrame(monthly_data)

        # Convert equity_type if present
        converted_params = convert_equity_type_in_startup_params(startup_params)

        df = calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=annual_roi,
            investment_frequency=investment_frequency,
            options_params=options_params,
            startup_params=converted_params,
        )
        return cast(list[dict[str, Any]], df.to_dict(orient="records"))

    def calculate_scenario(
        self,
        opportunity_cost_data: list[dict[str, Any]],
        startup_params: dict[str, Any],
    ) -> StartupScenarioResult:
        """
        Calculate financial outcomes for a startup equity package.

        This is the main calculation method that evaluates RSU or Stock Option
        scenarios, including dilution effects and breakeven analysis.

        Args:
            opportunity_cost_data: Data from calculate_opportunity_cost
            startup_params: Dictionary with equity type and related parameters

        Returns:
            StartupScenarioResult with calculated outcomes and formatted data
        """
        opportunity_cost_df = pd.DataFrame(opportunity_cost_data)

        # Convert equity_type string to enum
        converted_params = convert_equity_type_in_startup_params(startup_params)
        if converted_params is None:
            raise ValueError("startup_params cannot be None")

        results = calculate_startup_scenario(
            opportunity_cost_df,
            converted_params,
        )

        # Transform results DataFrame to frontend format
        results_df_mapped = ResponseMapper.map_startup_scenario_df(results["results_df"])

        return StartupScenarioResult(
            results_df=results_df_mapped,
            final_payout_value=results["final_payout_value"],
            final_payout_value_npv=results.get("final_payout_value_npv"),
            final_opportunity_cost=results["final_opportunity_cost"],
            final_opportunity_cost_npv=results.get("final_opportunity_cost_npv"),
            payout_label=results["payout_label"],
            breakeven_label=results["breakeven_label"],
            total_dilution=results.get("total_dilution"),
            diluted_equity_pct=results.get("diluted_equity_pct"),
        )

    def calculate_irr(
        self,
        monthly_surpluses: list[float],
        final_payout_value: float,
    ) -> float | None:
        """
        Calculate the Internal Rate of Return (IRR).

        Args:
            monthly_surpluses: List of monthly salary surpluses
            final_payout_value: Expected payout at exit

        Returns:
            Annualized IRR percentage, or None if not calculable
        """
        surpluses = pd.Series(monthly_surpluses)
        irr = calculate_irr(surpluses, final_payout_value)
        return irr if pd.notna(irr) else None

    def calculate_npv(
        self,
        monthly_surpluses: list[float],
        annual_roi: float,
        final_payout_value: float,
    ) -> float | None:
        """
        Calculate the Net Present Value (NPV).

        Args:
            monthly_surpluses: List of monthly salary surpluses
            annual_roi: Expected annual return rate
            final_payout_value: Expected payout at exit

        Returns:
            Net Present Value, or None if not calculable
        """
        surpluses = pd.Series(monthly_surpluses)
        npv = calculate_npv(surpluses, annual_roi, final_payout_value)
        return npv if pd.notna(npv) else None
