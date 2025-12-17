"""Tests for scenario comparison calculations.

TDD: Writing tests first before implementation.
"""

from __future__ import annotations

import pytest

from worth_it.calculations.comparison import (
    identify_winner,
    calculate_metric_diffs,
    generate_comparison_insights,
    get_comparison_metrics,
)


# Test data fixtures
def make_scenario(
    name: str,
    net_outcome: float,
    final_payout_value: float = 0,
    final_opportunity_cost: float = 0,
    monthly_salary: float = 10000,
    breakeven: str | None = None,
) -> dict:
    """Create a test scenario dict."""
    return {
        "name": name,
        "results": {
            "net_outcome": net_outcome,
            "final_payout_value": final_payout_value,
            "final_opportunity_cost": final_opportunity_cost,
            "breakeven": breakeven,
        },
        "equity": {
            "monthly_salary": monthly_salary,
        },
    }


class TestIdentifyWinner:
    """Test cases for identify_winner function."""

    def test_clear_winner(self) -> None:
        """Test identifying a clear winner with highest net outcome."""
        scenarios = [
            make_scenario("Current Job", net_outcome=500_000),
            make_scenario("Startup Offer", net_outcome=650_000),
        ]

        result = identify_winner(scenarios)

        assert result["winner_name"] == "Startup Offer"
        assert result["winner_index"] == 1
        assert result["net_outcome_advantage"] == 150_000
        assert result["is_tie"] is False

    def test_first_scenario_wins(self) -> None:
        """Test when the first scenario is the winner."""
        scenarios = [
            make_scenario("Job A", net_outcome=800_000),
            make_scenario("Job B", net_outcome=600_000),
        ]

        result = identify_winner(scenarios)

        assert result["winner_name"] == "Job A"
        assert result["winner_index"] == 0
        assert result["net_outcome_advantage"] == 200_000

    def test_tie_detection(self) -> None:
        """Test detection of tied scenarios."""
        scenarios = [
            make_scenario("Option A", net_outcome=500_000),
            make_scenario("Option B", net_outcome=500_000),
        ]

        result = identify_winner(scenarios)

        assert result["is_tie"] is True
        # Winner should still be one of the tied scenarios
        assert result["winner_name"] in ["Option A", "Option B"]
        assert result["net_outcome_advantage"] == 0

    def test_three_way_tie(self) -> None:
        """Test detection of three-way tie."""
        scenarios = [
            make_scenario("A", net_outcome=300_000),
            make_scenario("B", net_outcome=300_000),
            make_scenario("C", net_outcome=300_000),
        ]

        result = identify_winner(scenarios)

        assert result["is_tie"] is True

    def test_empty_scenarios(self) -> None:
        """Test handling of empty scenario list."""
        result = identify_winner([])

        assert result["winner_name"] == ""
        assert result["winner_index"] == -1
        assert result["net_outcome_advantage"] == 0
        assert result["is_tie"] is False

    def test_single_scenario(self) -> None:
        """Test with only one scenario."""
        scenarios = [make_scenario("Only Option", net_outcome=400_000)]

        result = identify_winner(scenarios)

        assert result["winner_name"] == "Only Option"
        assert result["winner_index"] == 0
        assert result["net_outcome_advantage"] == 0  # No comparison possible
        assert result["is_tie"] is False

    def test_multiple_scenarios_middle_wins(self) -> None:
        """Test with multiple scenarios where middle one wins."""
        scenarios = [
            make_scenario("A", net_outcome=100_000),
            make_scenario("B", net_outcome=500_000),  # Winner
            make_scenario("C", net_outcome=300_000),
            make_scenario("D", net_outcome=200_000),
        ]

        result = identify_winner(scenarios)

        assert result["winner_name"] == "B"
        assert result["winner_index"] == 1
        assert result["net_outcome_advantage"] == 200_000  # 500k - 300k

    def test_negative_outcomes(self) -> None:
        """Test with negative net outcomes."""
        scenarios = [
            make_scenario("Worse", net_outcome=-100_000),
            make_scenario("Bad", net_outcome=-50_000),  # "Winner" (less negative)
        ]

        result = identify_winner(scenarios)

        assert result["winner_name"] == "Bad"
        assert result["net_outcome_advantage"] == 50_000


class TestCalculateMetricDiffs:
    """Test cases for calculate_metric_diffs function."""

    def test_basic_metric_diffs(self) -> None:
        """Test basic calculation of metric differences."""
        scenarios = [
            make_scenario(
                "Job A",
                net_outcome=500_000,
                final_payout_value=600_000,
                final_opportunity_cost=100_000,
            ),
            make_scenario(
                "Job B",
                net_outcome=650_000,
                final_payout_value=800_000,
                final_opportunity_cost=150_000,
            ),
        ]

        diffs = calculate_metric_diffs(scenarios)

        assert len(diffs) == 3  # net_outcome, final_payout_value, final_opportunity_cost

        # Check net outcome diff
        net_diff = next(d for d in diffs if d["metric"] == "net_outcome")
        assert net_diff["absolute_diff"] == 150_000
        assert net_diff["better_scenario"] == "Job B"
        assert net_diff["higher_is_better"] is True

        # Check opportunity cost diff (lower is better)
        opp_diff = next(d for d in diffs if d["metric"] == "final_opportunity_cost")
        assert opp_diff["absolute_diff"] == 50_000
        assert opp_diff["better_scenario"] == "Job A"  # Lower is better
        assert opp_diff["higher_is_better"] is False

    def test_percentage_diff_calculation(self) -> None:
        """Test percentage difference calculation."""
        scenarios = [
            make_scenario("A", net_outcome=100_000, final_payout_value=100_000),
            make_scenario("B", net_outcome=200_000, final_payout_value=200_000),
        ]

        diffs = calculate_metric_diffs(scenarios)

        net_diff = next(d for d in diffs if d["metric"] == "net_outcome")
        # Diff = 100k, baseline = 100k, percentage = 100%
        assert net_diff["percentage_diff"] == pytest.approx(100.0)

    def test_single_scenario_returns_empty(self) -> None:
        """Test that single scenario returns empty diffs."""
        scenarios = [make_scenario("Only", net_outcome=500_000)]

        diffs = calculate_metric_diffs(scenarios)

        assert diffs == []

    def test_empty_scenarios_returns_empty(self) -> None:
        """Test that empty scenarios returns empty diffs."""
        diffs = calculate_metric_diffs([])

        assert diffs == []

    def test_scenario_names_preserved(self) -> None:
        """Test that scenario names are preserved in results."""
        scenarios = [
            make_scenario("First Job", net_outcome=100_000),
            make_scenario("Second Job", net_outcome=200_000),
        ]

        diffs = calculate_metric_diffs(scenarios)

        for diff in diffs:
            assert diff["scenario_names"] == ["First Job", "Second Job"]

    def test_values_array_matches_scenarios(self) -> None:
        """Test that values array matches scenario order."""
        scenarios = [
            make_scenario("A", net_outcome=111_111, final_payout_value=222_222),
            make_scenario("B", net_outcome=333_333, final_payout_value=444_444),
        ]

        diffs = calculate_metric_diffs(scenarios)

        net_diff = next(d for d in diffs if d["metric"] == "net_outcome")
        assert net_diff["values"] == [111_111, 333_333]

    def test_zero_baseline_handling(self) -> None:
        """Test handling of zero baseline for percentage calculation."""
        scenarios = [
            make_scenario("A", net_outcome=0, final_opportunity_cost=0),
            make_scenario("B", net_outcome=100_000, final_opportunity_cost=50_000),
        ]

        diffs = calculate_metric_diffs(scenarios)

        net_diff = next(d for d in diffs if d["metric"] == "net_outcome")
        # When baseline is 0 but other value exists, use 100%
        assert net_diff["percentage_diff"] == 100.0


class TestGenerateComparisonInsights:
    """Test cases for generate_comparison_insights function."""

    def test_winner_insight_generated(self) -> None:
        """Test that winner insight is generated."""
        scenarios = [
            make_scenario("Current Job", net_outcome=500_000),
            make_scenario("Startup Offer", net_outcome=750_000),
        ]

        insights = generate_comparison_insights(scenarios)

        winner_insights = [i for i in insights if i["type"] == "winner"]
        assert len(winner_insights) == 1
        assert "Startup Offer" in winner_insights[0]["title"]
        assert winner_insights[0]["icon"] == "trophy"

    def test_tie_observation_generated(self) -> None:
        """Test that tie generates observation insight."""
        scenarios = [
            make_scenario("A", net_outcome=500_000),
            make_scenario("B", net_outcome=500_000),
        ]

        insights = generate_comparison_insights(scenarios)

        observation_insights = [i for i in insights if i["type"] == "observation"]
        # Should have tie observation
        tie_insight = next(
            (i for i in observation_insights if "equally" in i["title"].lower()), None
        )
        assert tie_insight is not None

    def test_salary_tradeoff_insight(self) -> None:
        """Test salary vs equity tradeoff insight generation."""
        scenarios = [
            make_scenario(
                "High Salary Job",
                net_outcome=400_000,
                monthly_salary=15_000,  # Higher salary
            ),
            make_scenario(
                "Startup",
                net_outcome=600_000,  # Better outcome
                monthly_salary=10_000,  # Lower salary
            ),
        ]

        insights = generate_comparison_insights(scenarios)

        tradeoff_insights = [i for i in insights if i["type"] == "tradeoff"]
        # Should detect salary vs equity tradeoff
        assert len(tradeoff_insights) >= 1
        assert tradeoff_insights[0]["icon"] == "scale"

    def test_no_tradeoff_when_salaries_similar(self) -> None:
        """Test no tradeoff insight when salaries are similar."""
        scenarios = [
            make_scenario("A", net_outcome=500_000, monthly_salary=10_000),
            make_scenario("B", net_outcome=600_000, monthly_salary=10_500),  # Only 5% diff
        ]

        insights = generate_comparison_insights(scenarios)

        tradeoff_insights = [i for i in insights if i["type"] == "tradeoff"]
        # Should not have salary tradeoff (< 10% difference)
        assert len(tradeoff_insights) == 0

    def test_breakeven_insight(self) -> None:
        """Test breakeven observation insight."""
        scenarios = [
            make_scenario("A", net_outcome=500_000, breakeven="Year 3"),
            make_scenario("B", net_outcome=600_000, breakeven="Year 5"),
        ]

        insights = generate_comparison_insights(scenarios)

        observation_insights = [i for i in insights if i["type"] == "observation"]
        breakeven_insight = next(
            (i for i in observation_insights if "breakeven" in i["title"].lower()), None
        )
        assert breakeven_insight is not None
        assert "Year 3" in breakeven_insight["description"]  # Earliest

    def test_single_scenario_returns_empty(self) -> None:
        """Test that single scenario returns empty insights."""
        scenarios = [make_scenario("Only", net_outcome=500_000)]

        insights = generate_comparison_insights(scenarios)

        assert insights == []

    def test_empty_scenarios_returns_empty(self) -> None:
        """Test that empty scenarios returns empty insights."""
        insights = generate_comparison_insights([])

        assert insights == []

    def test_max_five_insights(self) -> None:
        """Test that insights are limited to 5."""
        # Create scenarios that would generate many insights
        scenarios = [
            make_scenario(
                "High Pay Job",
                net_outcome=400_000,
                monthly_salary=20_000,
                breakeven="Year 2",
            ),
            make_scenario(
                "Startup",
                net_outcome=800_000,
                monthly_salary=8_000,
                breakeven="Year 5",
            ),
        ]

        insights = generate_comparison_insights(scenarios)

        assert len(insights) <= 5


class TestGetComparisonMetrics:
    """Test cases for get_comparison_metrics aggregator function."""

    def test_aggregates_all_results(self) -> None:
        """Test that all comparison components are returned."""
        scenarios = [
            make_scenario("A", net_outcome=500_000, final_payout_value=600_000),
            make_scenario("B", net_outcome=700_000, final_payout_value=800_000),
        ]

        result = get_comparison_metrics(scenarios)

        # Check all components exist
        assert "winner" in result
        assert "metric_diffs" in result
        assert "insights" in result

        # Verify types
        assert isinstance(result["winner"], dict)
        assert isinstance(result["metric_diffs"], list)
        assert isinstance(result["insights"], list)

    def test_consistent_winner_info(self) -> None:
        """Test that winner info matches identify_winner."""
        scenarios = [
            make_scenario("Loser", net_outcome=100_000),
            make_scenario("Winner", net_outcome=900_000),
        ]

        result = get_comparison_metrics(scenarios)

        assert result["winner"]["winner_name"] == "Winner"
        assert result["winner"]["winner_index"] == 1
