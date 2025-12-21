"""Tests for Investment Frequency Strategy Pattern (Issue #279).

These tests verify the Strategy Pattern implementation for calculating
future values with different investment frequencies.
"""


import pandas as pd
import pytest

from worth_it.calculations import (
    AnnualInvestmentStrategy,
    FutureValueResult,
    InvestmentFrequencyStrategy,
    MonthlyInvestmentStrategy,
    get_investment_strategy,
)

# --- Test Fixtures ---


@pytest.fixture
def sample_monthly_df() -> pd.DataFrame:
    """Create sample monthly data for 3 years."""
    total_months = 36  # 3 years
    df = pd.DataFrame(index=pd.RangeIndex(total_months, name="MonthIndex"))
    df["Year"] = df.index // 12 + 1
    df["InvestableSurplus"] = 1000.0  # $1000/month
    df["ExerciseCost"] = 0.0
    df["CashFromSale"] = 0.0
    return df


@pytest.fixture
def sample_annual_series() -> tuple[pd.Series, pd.Series, pd.Series]:
    """Create sample annual aggregated data for 3 years."""
    index = pd.RangeIndex(1, 4, name="Year")
    investable = pd.Series([12000.0, 12000.0, 12000.0], index=index)
    exercise = pd.Series([0.0, 0.0, 0.0], index=index)
    cash_from_sale = pd.Series([0.0, 0.0, 0.0], index=index)
    return investable, exercise, cash_from_sale


# --- FutureValueResult Tests ---


class TestFutureValueResult:
    """Tests for the FutureValueResult dataclass."""

    def test_fv_opportunity_combines_surplus_and_exercise(self):
        """Verify fv_opportunity is the sum of surplus and exercise costs."""
        result = FutureValueResult(
            fv_investable_surplus=1000.0,
            fv_exercise_cost=200.0,
            fv_cash_from_sale=50.0,
        )
        assert result.fv_opportunity == 1200.0

    def test_result_is_immutable(self):
        """Verify the result is frozen (immutable)."""
        result = FutureValueResult(
            fv_investable_surplus=1000.0,
            fv_exercise_cost=200.0,
            fv_cash_from_sale=50.0,
        )
        with pytest.raises(AttributeError):
            result.fv_investable_surplus = 2000.0  # type: ignore[misc]


# --- Strategy Registry Tests ---


class TestStrategyRegistry:
    """Tests for the strategy factory function."""

    def test_get_monthly_strategy(self):
        """Verify Monthly returns MonthlyInvestmentStrategy."""
        strategy = get_investment_strategy("Monthly")
        assert isinstance(strategy, MonthlyInvestmentStrategy)

    def test_get_annual_strategy(self):
        """Verify Annually returns AnnualInvestmentStrategy."""
        strategy = get_investment_strategy("Annually")
        assert isinstance(strategy, AnnualInvestmentStrategy)

    def test_invalid_frequency_raises_error(self):
        """Verify unknown frequency raises ValueError."""
        with pytest.raises(ValueError, match="Unknown investment frequency"):
            get_investment_strategy("Weekly")

    def test_strategies_are_subclasses_of_abc(self):
        """Verify all strategies inherit from the ABC."""
        assert issubclass(MonthlyInvestmentStrategy, InvestmentFrequencyStrategy)
        assert issubclass(AnnualInvestmentStrategy, InvestmentFrequencyStrategy)


# --- Monthly Strategy Tests ---


class TestMonthlyInvestmentStrategy:
    """Tests for MonthlyInvestmentStrategy."""

    def test_calculates_fv_with_monthly_compounding(
        self,
        sample_monthly_df: pd.DataFrame,
        sample_annual_series: tuple[pd.Series, pd.Series, pd.Series],
    ):
        """Verify monthly strategy uses monthly compounding."""
        investable, exercise, cash = sample_annual_series
        strategy = MonthlyInvestmentStrategy()

        result = strategy.calculate_future_value(
            monthly_df=sample_monthly_df,
            year_end=3,
            annual_roi=0.10,
            annual_investable_surplus=investable,
            annual_exercise_cost=exercise,
            annual_cash_from_sale=cash,
        )

        # With 10% annual ROI, 36 months of $1000 each should compound to more than principal
        principal = 36 * 1000
        assert result.fv_investable_surplus > principal
        assert result.fv_exercise_cost == 0.0
        assert result.fv_cash_from_sale == 0.0

    def test_handles_exercise_costs(self, sample_monthly_df: pd.DataFrame):
        """Verify exercise costs are included in FV calculation."""
        df = sample_monthly_df.copy()
        # Add exercise cost in month 12 (end of year 1)
        df.loc[11, "ExerciseCost"] = 5000.0

        investable = df.groupby("Year")["InvestableSurplus"].sum()
        exercise = df.groupby("Year")["ExerciseCost"].sum()
        cash = df.groupby("Year")["CashFromSale"].sum()

        strategy = MonthlyInvestmentStrategy()
        result = strategy.calculate_future_value(
            monthly_df=df,
            year_end=3,
            annual_roi=0.10,
            annual_investable_surplus=investable,
            annual_exercise_cost=exercise,
            annual_cash_from_sale=cash,
        )

        assert result.fv_exercise_cost > 5000.0  # Should be compounded
        assert result.fv_opportunity > result.fv_investable_surplus

    def test_handles_cash_from_sale(self, sample_monthly_df: pd.DataFrame):
        """Verify cash from sale is calculated separately."""
        df = sample_monthly_df.copy()
        # Add sale in month 24 (end of year 2)
        df.loc[23, "CashFromSale"] = 10000.0

        investable = df.groupby("Year")["InvestableSurplus"].sum()
        exercise = df.groupby("Year")["ExerciseCost"].sum()
        cash = df.groupby("Year")["CashFromSale"].sum()

        strategy = MonthlyInvestmentStrategy()
        result = strategy.calculate_future_value(
            monthly_df=df,
            year_end=3,
            annual_roi=0.10,
            annual_investable_surplus=investable,
            annual_exercise_cost=exercise,
            annual_cash_from_sale=cash,
        )

        assert result.fv_cash_from_sale > 10000.0  # Should be compounded


# --- Annual Strategy Tests ---


class TestAnnualInvestmentStrategy:
    """Tests for AnnualInvestmentStrategy."""

    def test_calculates_fv_with_annual_compounding(
        self,
        sample_monthly_df: pd.DataFrame,
        sample_annual_series: tuple[pd.Series, pd.Series, pd.Series],
    ):
        """Verify annual strategy uses annual compounding."""
        investable, exercise, cash = sample_annual_series
        strategy = AnnualInvestmentStrategy()

        result = strategy.calculate_future_value(
            monthly_df=sample_monthly_df,
            year_end=3,
            annual_roi=0.10,
            annual_investable_surplus=investable,
            annual_exercise_cost=exercise,
            annual_cash_from_sale=cash,
        )

        # With 10% annual ROI:
        # Year 1: $12,000 * 1.10^2 = $14,520
        # Year 2: $12,000 * 1.10^1 = $13,200
        # Year 3: $12,000 * 1.10^0 = $12,000
        # Total: $39,720
        expected = 12000 * (1.1**2) + 12000 * (1.1**1) + 12000 * (1.1**0)
        assert abs(result.fv_investable_surplus - expected) < 0.01

    def test_handles_exercise_costs(
        self,
        sample_monthly_df: pd.DataFrame,
    ):
        """Verify exercise costs are compounded annually."""
        index = pd.RangeIndex(1, 4, name="Year")
        investable = pd.Series([12000.0, 12000.0, 12000.0], index=index)
        exercise = pd.Series([5000.0, 0.0, 0.0], index=index)  # Exercise in year 1
        cash = pd.Series([0.0, 0.0, 0.0], index=index)

        strategy = AnnualInvestmentStrategy()
        result = strategy.calculate_future_value(
            monthly_df=sample_monthly_df,
            year_end=3,
            annual_roi=0.10,
            annual_investable_surplus=investable,
            annual_exercise_cost=exercise,
            annual_cash_from_sale=cash,
        )

        # Year 1 exercise: $5,000 * 1.10^2 = $6,050
        expected_exercise = 5000 * (1.1**2)
        assert abs(result.fv_exercise_cost - expected_exercise) < 0.01

    def test_handles_partial_years(
        self,
        sample_monthly_df: pd.DataFrame,
    ):
        """Verify strategy handles year_end less than available data."""
        index = pd.RangeIndex(1, 4, name="Year")
        investable = pd.Series([12000.0, 12000.0, 12000.0], index=index)
        exercise = pd.Series([0.0, 0.0, 0.0], index=index)
        cash = pd.Series([0.0, 0.0, 0.0], index=index)

        strategy = AnnualInvestmentStrategy()
        result = strategy.calculate_future_value(
            monthly_df=sample_monthly_df,
            year_end=2,  # Only calculate for 2 years
            annual_roi=0.10,
            annual_investable_surplus=investable,
            annual_exercise_cost=exercise,
            annual_cash_from_sale=cash,
        )

        # Year 1: $12,000 * 1.10^1 = $13,200
        # Year 2: $12,000 * 1.10^0 = $12,000
        # Total: $25,200
        expected = 12000 * (1.1**1) + 12000 * (1.1**0)
        assert abs(result.fv_investable_surplus - expected) < 0.01


# --- Integration Tests ---


class TestStrategyIntegration:
    """Integration tests comparing strategy results."""

    def test_monthly_vs_annual_different_results(
        self,
        sample_monthly_df: pd.DataFrame,
        sample_annual_series: tuple[pd.Series, pd.Series, pd.Series],
    ):
        """Verify Monthly and Annual produce different results."""
        investable, exercise, cash = sample_annual_series

        monthly = MonthlyInvestmentStrategy()
        annual = AnnualInvestmentStrategy()

        monthly_result = monthly.calculate_future_value(
            monthly_df=sample_monthly_df,
            year_end=3,
            annual_roi=0.10,
            annual_investable_surplus=investable,
            annual_exercise_cost=exercise,
            annual_cash_from_sale=cash,
        )

        annual_result = annual.calculate_future_value(
            monthly_df=sample_monthly_df,
            year_end=3,
            annual_roi=0.10,
            annual_investable_surplus=investable,
            annual_exercise_cost=exercise,
            annual_cash_from_sale=cash,
        )

        # Monthly compounding should yield slightly higher FV due to more frequent compounding
        assert monthly_result.fv_investable_surplus > annual_result.fv_investable_surplus

    def test_zero_roi_yields_principal_only(
        self,
        sample_monthly_df: pd.DataFrame,
        sample_annual_series: tuple[pd.Series, pd.Series, pd.Series],
    ):
        """Verify zero ROI means no compounding (FV = principal)."""
        investable, exercise, cash = sample_annual_series

        for StrategyClass in [MonthlyInvestmentStrategy, AnnualInvestmentStrategy]:
            strategy = StrategyClass()
            result = strategy.calculate_future_value(
                monthly_df=sample_monthly_df,
                year_end=3,
                annual_roi=0.0,  # No growth
                annual_investable_surplus=investable,
                annual_exercise_cost=exercise,
                annual_cash_from_sale=cash,
            )

            principal = 36 * 1000  # $36,000 total invested
            assert abs(result.fv_investable_surplus - principal) < 0.01
