"""Scenario calculation endpoints.

This router handles all startup scenario-related calculations:
- Monthly data grid generation
- Opportunity cost calculations
- Startup scenario analysis (RSU/Stock Options)
- IRR and NPV calculations
- Scenario comparison
"""

import pandas as pd
from fastapi import APIRouter, Request

from worth_it import calculations
from worth_it.config import settings
from worth_it.exceptions import CalculationError
from worth_it.models import (
    ComparisonInsight,
    IRRRequest,
    IRRResponse,
    MetricDiff,
    MonthlyDataGridRequest,
    MonthlyDataGridResponse,
    NPVRequest,
    NPVResponse,
    OpportunityCostRequest,
    OpportunityCostResponse,
    ScenarioComparisonRequest,
    ScenarioComparisonResponse,
    StartupScenarioRequest,
    StartupScenarioResponse,
    WinnerResult,
)
from worth_it.services import convert_typed_startup_params_to_internal
from worth_it.services.serializers import convert_equity_type_in_startup_params

from ..dependencies import limiter, startup_service

router = APIRouter(
    prefix="/api",
    tags=["scenarios"],
)


@router.post("/monthly-data-grid", response_model=MonthlyDataGridResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def create_monthly_data_grid(request: Request, body: MonthlyDataGridRequest):
    """Create a DataFrame with monthly financial projections.

    This endpoint creates a monthly data grid showing salary differences,
    surplus calculations, and cash flows over the analysis period.
    """
    try:
        df = calculations.create_monthly_data_grid(
            exit_year=body.exit_year,
            current_job_monthly_salary=body.current_job_monthly_salary,
            startup_monthly_salary=body.startup_monthly_salary,
            current_job_salary_growth_rate=body.current_job_salary_growth_rate,
            dilution_rounds=body.dilution_rounds,
        )
        return MonthlyDataGridResponse(data=df.to_dict(orient="records"))  # type: ignore[arg-type]
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for monthly data grid") from e


@router.post("/opportunity-cost", response_model=OpportunityCostResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_opportunity_cost(request: Request, body: OpportunityCostRequest):
    """Calculate the opportunity cost of foregone salary.

    This endpoint calculates the future value of the salary difference
    between current job and startup job, accounting for investment returns.
    """
    try:
        monthly_df = pd.DataFrame(body.monthly_data)

        # Convert equity_type string to EquityType enum if needed
        startup_params = convert_equity_type_in_startup_params(
            body.startup_params.copy() if body.startup_params else None
        )

        df = calculations.calculate_annual_opportunity_cost(
            monthly_df=monthly_df,
            annual_roi=body.annual_roi,
            investment_frequency=body.investment_frequency,
            options_params=body.options_params,
            startup_params=startup_params,
        )
        return OpportunityCostResponse(data=df.to_dict(orient="records"))  # type: ignore[arg-type]
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for opportunity cost") from e


@router.post("/startup-scenario", response_model=StartupScenarioResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_startup_scenario(request: Request, body: StartupScenarioRequest):
    """Calculate financial outcomes for a startup equity package.

    This endpoint evaluates both RSU and Stock Option scenarios,
    including dilution effects and breakeven analysis.
    """
    try:
        # Convert typed startup_params to internal format for calculations
        internal_startup_params = convert_typed_startup_params_to_internal(body.startup_params)

        # Use service layer for business logic and column mapping
        result = startup_service.calculate_scenario(
            opportunity_cost_data=body.opportunity_cost_data,
            startup_params=internal_startup_params,
        )

        return StartupScenarioResponse(
            results_df=result.results_df,
            final_payout_value=result.final_payout_value,
            final_payout_value_npv=result.final_payout_value_npv,
            final_opportunity_cost=result.final_opportunity_cost,
            final_opportunity_cost_npv=result.final_opportunity_cost_npv,
            payout_label=result.payout_label,
            breakeven_label=result.breakeven_label,
            total_dilution=result.total_dilution,
            diluted_equity_pct=result.diluted_equity_pct,
        )
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for startup scenario") from e


@router.post("/irr", response_model=IRRResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_irr(request: Request, body: IRRRequest):
    """Calculate the Internal Rate of Return (IRR).

    This endpoint computes the annualized IRR based on monthly cash flows
    and the final equity payout.
    """
    try:
        irr = startup_service.calculate_irr(body.monthly_surpluses, body.final_payout_value)
        return IRRResponse(irr=irr)
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for IRR calculation") from e


@router.post("/npv", response_model=NPVResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def calculate_npv(request: Request, body: NPVRequest):
    """Calculate the Net Present Value (NPV).

    This endpoint computes the NPV of the investment decision,
    accounting for the time value of money.
    """
    try:
        npv = startup_service.calculate_npv(
            body.monthly_surpluses,
            body.annual_roi,
            body.final_payout_value,
        )
        return NPVResponse(npv=npv)
    except (ValueError, TypeError) as e:
        raise CalculationError("Invalid parameters for NPV calculation") from e


@router.post("/scenarios/compare", response_model=ScenarioComparisonResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def compare_scenarios(request: Request, body: ScenarioComparisonRequest):
    """Compare multiple scenarios to identify the best option.

    This endpoint analyzes multiple scenarios and provides:
    - Winner identification (highest net outcome)
    - Metric differences (absolute and percentage)
    - Human-readable insights about trade-offs

    Key features:
    - Identifies winning scenario by net outcome
    - Detects ties when scenarios have equal outcomes
    - Compares key metrics (net outcome, payout, opportunity cost)
    - Generates insights about salary vs equity trade-offs
    - Finds earliest breakeven scenario
    """
    try:
        # Convert Pydantic models to dicts for calculation
        scenarios = [
            {
                "name": s.name,
                "results": {
                    "net_outcome": s.results.net_outcome,
                    "final_payout_value": s.results.final_payout_value,
                    "final_opportunity_cost": s.results.final_opportunity_cost,
                    "breakeven": s.results.breakeven,
                },
                "equity": {
                    "monthly_salary": s.equity.monthly_salary,
                },
            }
            for s in body.scenarios
        ]

        result = calculations.get_comparison_metrics(scenarios)

        return ScenarioComparisonResponse(
            winner=WinnerResult(
                winner_name=result["winner"]["winner_name"],
                winner_index=result["winner"]["winner_index"],
                net_outcome_advantage=result["winner"]["net_outcome_advantage"],
                is_tie=result["winner"]["is_tie"],
            ),
            metric_diffs=[
                MetricDiff(
                    metric=d["metric"],
                    label=d["label"],
                    values=d["values"],
                    scenario_names=d["scenario_names"],
                    absolute_diff=d["absolute_diff"],
                    percentage_diff=d["percentage_diff"],
                    better_scenario=d["better_scenario"],
                    higher_is_better=d["higher_is_better"],
                )
                for d in result["metric_diffs"]
            ],
            insights=[
                ComparisonInsight(
                    type=i["type"],
                    title=i["title"],
                    description=i["description"],
                    scenario_name=i.get("scenario_name"),
                    icon=i.get("icon"),
                )
                for i in result["insights"]
            ],
        )
    except (ValueError, TypeError, KeyError) as e:
        raise CalculationError("Invalid parameters for scenario comparison") from e
