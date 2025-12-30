"""Report builder service for creating report data from valuation results."""

from __future__ import annotations

from datetime import date
from typing import Any

from .models import ReportMetric, ReportSection, ValuationReportData

DEFAULT_DISCLAIMERS = [
    "This valuation is provided for informational purposes only "
    "and does not constitute financial advice.",
    "Past performance does not guarantee future results.",
    "Consult with qualified professionals before making investment decisions.",
]


def format_currency(value: float) -> str:
    """Format value as currency.

    Args:
        value: Numeric value to format

    Returns:
        Formatted string (e.g., "$7.5M", "$500K", "$500")
    """
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    elif abs(value) >= 1_000:
        return f"${value / 1_000:.1f}K"
    else:
        return f"${value:,.0f}"


def format_percentage(value: float) -> str:
    """Format value as percentage.

    Args:
        value: Decimal value (e.g., 0.25 for 25%)

    Returns:
        Formatted string (e.g., "25%")
    """
    return f"{value * 100:.0f}%"


def build_first_chicago_report(
    company_name: str,
    result: dict[str, Any],
    params: dict[str, Any],
    industry: str | None = None,
    monte_carlo_result: dict[str, Any] | None = None,
) -> ValuationReportData:
    """Build a report for First Chicago Method valuation.

    Args:
        company_name: Name of the company
        result: FirstChicagoResult as dict
        params: Original parameters used
        industry: Optional industry name
        monte_carlo_result: Optional MC simulation results

    Returns:
        ValuationReportData ready for export
    """
    sections: list[ReportSection] = []

    # Executive Summary
    sections.append(
        ReportSection(
            title="Executive Summary",
            content=(
                f"Using the First Chicago Method, {company_name} is valued at "
                f"{format_currency(result['present_value'])} (present value). "
                f"This valuation considers {len(result['scenario_values'])} scenarios "
                f"with probability-weighted outcomes."
            ),
            metrics=[
                ReportMetric(
                    name="Present Value",
                    value=result["present_value"],
                    formatted_value=format_currency(result["present_value"]),
                    description="Discounted probability-weighted value",
                ),
                ReportMetric(
                    name="Weighted Exit Value",
                    value=result["weighted_value"],
                    formatted_value=format_currency(result["weighted_value"]),
                    description="Expected exit value before discounting",
                ),
            ],
        )
    )

    # Scenario Analysis
    scenario_metrics = [
        ReportMetric(
            name=f"{name} Scenario",
            value=value,
            formatted_value=format_currency(value),
            description=f"PV: {format_currency(result['scenario_present_values'][name])}",
        )
        for name, value in result["scenario_values"].items()
    ]

    sections.append(
        ReportSection(
            title="Scenario Analysis",
            content="Each scenario represents a possible outcome weighted by its probability.",
            metrics=scenario_metrics,
        )
    )

    # Monte Carlo section if available
    if monte_carlo_result:
        percentiles = monte_carlo_result.get("percentiles", {})
        mc_metrics = [
            ReportMetric(
                name="Expected Value (Mean)",
                value=monte_carlo_result.get("mean", 0),
                formatted_value=format_currency(monte_carlo_result.get("mean", 0)),
            ),
            ReportMetric(
                name="Median Value (P50)",
                value=percentiles.get("p50", 0),
                formatted_value=format_currency(percentiles.get("p50", 0)),
            ),
            ReportMetric(
                name="90% Confidence Range",
                value=0,
                formatted_value=(
                    f"{format_currency(percentiles.get('p5', 0))} - "
                    f"{format_currency(percentiles.get('p95', 0))}"
                ),
            ),
        ]
        sections.append(
            ReportSection(
                title="Monte Carlo Simulation Results",
                content=(
                    f"Based on {monte_carlo_result.get('num_simulations', 10000):,} simulations "
                    "with parameter uncertainty modeling."
                ),
                metrics=mc_metrics,
            )
        )

    # Methodology
    sections.append(
        ReportSection(
            title="Methodology",
            content="""The First Chicago Method values a company by:
1. Defining multiple scenarios (typically Best, Base, Worst cases)
2. Assigning probability weights to each scenario
3. Calculating the present value for each scenario
4. Computing the probability-weighted present value

This method is particularly useful for early-stage companies
with high uncertainty about future outcomes.""",
            metrics=[],
        )
    )

    # Build assumptions
    discount_rate = params.get("discount_rate", 0.25)
    assumptions = [
        f"Discount Rate: {format_percentage(discount_rate)}",
        f"Number of Scenarios: {len(result['scenario_values'])}",
    ]

    return ValuationReportData(
        title=f"Valuation Report: {company_name}",
        company_name=company_name,
        report_date=date.today().strftime("%B %d, %Y"),
        prepared_by="Worth It Valuation Calculator",
        valuation_method="First Chicago Method",
        sections=sections,
        assumptions=assumptions,
        disclaimers=list(DEFAULT_DISCLAIMERS),
        industry=industry,
        monte_carlo_enabled=monte_carlo_result is not None,
    )


def build_pre_revenue_report(
    company_name: str,
    method_name: str,
    result: dict[str, Any],
    params: dict[str, Any],
    industry: str | None = None,
) -> ValuationReportData:
    """Build a report for pre-revenue valuation methods.

    Args:
        company_name: Name of the company
        method_name: Method name (Berkus, Scorecard, Risk Factor)
        result: Valuation result as dict
        params: Original parameters used
        industry: Optional industry name

    Returns:
        ValuationReportData ready for export
    """
    sections: list[ReportSection] = []

    valuation = result.get("valuation", 0)

    # Executive Summary
    sections.append(
        ReportSection(
            title="Executive Summary",
            content=(
                f"Using the {method_name}, {company_name} is valued at "
                f"{format_currency(valuation)}."
            ),
            metrics=[
                ReportMetric(
                    name="Valuation",
                    value=valuation,
                    formatted_value=format_currency(valuation),
                    description=f"{method_name} valuation",
                ),
            ],
        )
    )

    # Factor breakdown if available
    if "factors" in result:
        factor_metrics = [
            ReportMetric(
                name=f["name"],
                value=f["value"],
                formatted_value=format_currency(f["value"]),
            )
            for f in result["factors"]
        ]
        sections.append(
            ReportSection(
                title="Factor Breakdown",
                content="Contribution from each evaluation factor.",
                metrics=factor_metrics,
            )
        )

    return ValuationReportData(
        title=f"Valuation Report: {company_name}",
        company_name=company_name,
        report_date=date.today().strftime("%B %d, %Y"),
        prepared_by="Worth It Valuation Calculator",
        valuation_method=method_name,
        sections=sections,
        assumptions=[],
        disclaimers=list(DEFAULT_DISCLAIMERS),
        industry=industry,
    )
