"""Scenario comparison calculations.

This module provides functions to compare multiple scenarios and generate
insights about which option is better and why.
"""

from __future__ import annotations

from typing import Literal, TypedDict


# Type definitions
class ScenarioResults(TypedDict):
    """Results information for a scenario."""

    net_outcome: float
    final_payout_value: float
    final_opportunity_cost: float
    breakeven: str | None


class ScenarioEquity(TypedDict):
    """Equity information for a scenario."""

    monthly_salary: float


class Scenario(TypedDict):
    """A scenario for comparison."""

    name: str
    results: ScenarioResults
    equity: ScenarioEquity


class WinnerResult(TypedDict):
    """Result of identifying the winning scenario."""

    winner_name: str
    winner_index: int
    net_outcome_advantage: float
    is_tie: bool


class MetricDiff(TypedDict):
    """Difference between scenarios for a specific metric."""

    metric: str
    label: str
    values: list[float]
    scenario_names: list[str]
    absolute_diff: float
    percentage_diff: float
    better_scenario: str
    higher_is_better: bool


class ComparisonInsight(TypedDict):
    """Insight generated from comparing scenarios."""

    type: Literal["winner", "tradeoff", "observation"]
    title: str
    description: str
    scenario_name: str | None
    icon: Literal["trophy", "scale", "info"] | None


class ComparisonMetrics(TypedDict):
    """Complete comparison metrics."""

    winner: WinnerResult
    metric_diffs: list[MetricDiff]
    insights: list[ComparisonInsight]


def _format_currency(value: float) -> str:
    """Format a value as currency."""
    if value >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    elif value >= 1_000:
        return f"${value / 1_000:.0f}K"
    else:
        return f"${value:.0f}"


def identify_winner(scenarios: list[dict]) -> WinnerResult:
    """
    Identify the scenario with the best net outcome.

    Args:
        scenarios: List of scenarios to compare

    Returns:
        WinnerResult containing winner info and tie detection
    """
    if not scenarios:
        return WinnerResult(
            winner_name="",
            winner_index=-1,
            net_outcome_advantage=0.0,
            is_tie=False,
        )

    # Find max net outcome
    max_outcome = scenarios[0]["results"]["net_outcome"]
    winner_index = 0

    for i, scenario in enumerate(scenarios[1:], start=1):
        if scenario["results"]["net_outcome"] > max_outcome:
            max_outcome = scenario["results"]["net_outcome"]
            winner_index = i

    # Check for ties
    tie_count = sum(
        1 for s in scenarios if s["results"]["net_outcome"] == max_outcome
    )
    is_tie = tie_count > 1

    # Calculate advantage over second place
    sorted_outcomes = sorted(
        [s["results"]["net_outcome"] for s in scenarios],
        reverse=True,
    )
    net_outcome_advantage = (
        sorted_outcomes[0] - sorted_outcomes[1] if len(sorted_outcomes) > 1 else 0.0
    )

    return WinnerResult(
        winner_name=scenarios[winner_index]["name"],
        winner_index=winner_index,
        net_outcome_advantage=net_outcome_advantage,
        is_tie=is_tie,
    )


def calculate_metric_diffs(scenarios: list[dict]) -> list[MetricDiff]:
    """
    Calculate percentage and absolute differences for key metrics.

    Args:
        scenarios: List of scenarios to compare (minimum 2 required)

    Returns:
        List of MetricDiff for each metric
    """
    if len(scenarios) < 2:
        return []

    metrics_config = [
        {"key": "net_outcome", "label": "Net Outcome", "higher_is_better": True},
        {"key": "final_payout_value", "label": "Final Payout", "higher_is_better": True},
        {
            "key": "final_opportunity_cost",
            "label": "Opportunity Cost",
            "higher_is_better": False,
        },
    ]

    result = []

    for metric in metrics_config:
        key = metric["key"]
        values = [s["results"][key] for s in scenarios]
        scenario_names = [s["name"] for s in scenarios]

        # Find best and worst values
        if metric["higher_is_better"]:
            best_value = max(values)
            worst_value = min(values)
        else:
            best_value = min(values)
            worst_value = max(values)

        best_index = values.index(best_value)
        better_scenario = scenario_names[best_index]

        # Calculate absolute difference
        absolute_diff = abs(max(values) - min(values))

        # Calculate percentage difference
        if worst_value != 0:
            percentage_diff = (absolute_diff / abs(worst_value)) * 100
        elif best_value != 0:
            # If baseline is 0 but other value exists, use 100%
            percentage_diff = 100.0
        else:
            percentage_diff = 0.0

        result.append(
            MetricDiff(
                metric=key,
                label=metric["label"],
                values=values,
                scenario_names=scenario_names,
                absolute_diff=absolute_diff,
                percentage_diff=percentage_diff,
                better_scenario=better_scenario,
                higher_is_better=metric["higher_is_better"],
            )
        )

    return result


def generate_comparison_insights(scenarios: list[dict]) -> list[ComparisonInsight]:
    """
    Generate human-readable insights from scenario comparison.

    Args:
        scenarios: List of scenarios to compare (minimum 2 required)

    Returns:
        List of ComparisonInsight, limited to 5 most relevant
    """
    if len(scenarios) < 2:
        return []

    insights: list[ComparisonInsight] = []

    # 1. Winner insight
    winner = identify_winner(scenarios)
    if not winner["is_tie"] and winner["net_outcome_advantage"] > 0:
        insights.append(
            ComparisonInsight(
                type="winner",
                title=f"{winner['winner_name']} offers higher total value",
                description=f"Net outcome is {_format_currency(winner['net_outcome_advantage'])} more than the next best option.",
                scenario_name=winner["winner_name"],
                icon="trophy",
            )
        )
    elif winner["is_tie"]:
        insights.append(
            ComparisonInsight(
                type="observation",
                title="Scenarios are equally valuable",
                description="All scenarios have the same net outcome. Consider other factors like risk and timeline.",
                scenario_name=None,
                icon="info",
            )
        )

    # 2. Trade-off insight (salary vs equity)
    salaries = [s["equity"]["monthly_salary"] for s in scenarios]
    max_salary = max(salaries)
    min_salary = min(salaries)
    salary_diff_pct = ((max_salary - min_salary) / min_salary * 100) if min_salary > 0 else 0

    if salary_diff_pct > 10:  # Significant salary difference
        high_salary_scenario = next(
            s for s in scenarios if s["equity"]["monthly_salary"] == max_salary
        )
        low_salary_scenario = next(
            s for s in scenarios if s["equity"]["monthly_salary"] == min_salary
        )

        # Check if there's a trade-off (higher salary but lower outcome)
        high_salary_wins = (
            high_salary_scenario["results"]["net_outcome"]
            > low_salary_scenario["results"]["net_outcome"]
        )

        if not high_salary_wins:
            salary_diff = max_salary - min_salary
            insights.append(
                ComparisonInsight(
                    type="tradeoff",
                    title="Salary vs. Equity Trade-off",
                    description=f"{high_salary_scenario['name']} pays {_format_currency(salary_diff)}/mo more, but {low_salary_scenario['name']} has better equity upside.",
                    scenario_name=None,
                    icon="scale",
                )
            )

    # 3. Breakeven insight
    breakeven_scenarios = [s for s in scenarios if s["results"].get("breakeven")]
    if breakeven_scenarios:
        # Find earliest breakeven
        def parse_year(breakeven_str: str) -> int:
            """Extract year number from breakeven string."""
            import re
            match = re.search(r"\d+", breakeven_str)
            return int(match.group()) if match else 99

        earliest = min(breakeven_scenarios, key=lambda s: parse_year(s["results"]["breakeven"] or "Year 99"))

        if earliest["results"]["breakeven"]:
            insights.append(
                ComparisonInsight(
                    type="observation",
                    title="Earliest Breakeven",
                    description=f"{earliest['name']} reaches breakeven at {earliest['results']['breakeven']}.",
                    scenario_name=earliest["name"],
                    icon="info",
                )
            )

    # Limit to top 5 most relevant insights
    return insights[:5]


def get_comparison_metrics(scenarios: list[dict]) -> ComparisonMetrics:
    """
    Get all comparison metrics for a set of scenarios.

    Args:
        scenarios: List of scenarios to compare

    Returns:
        ComparisonMetrics with winner, diffs, and insights
    """
    return ComparisonMetrics(
        winner=identify_winner(scenarios),
        metric_diffs=calculate_metric_diffs(scenarios),
        insights=generate_comparison_insights(scenarios),
    )
