"""Investment frequency strategies for opportunity cost calculations.

This module implements the Strategy Pattern for calculating future values
of cash flows based on different investment frequencies (Monthly, Annually).

Each strategy encapsulates the compounding logic for its frequency, making
the code easier to test, extend, and maintain.

Example:
    strategy = get_investment_strategy("Monthly")
    fv = strategy.calculate_future_value(monthly_df, year_end, annual_roi)
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING

import pandas as pd

from worth_it.calculations.base import annual_to_monthly_roi

if TYPE_CHECKING:
    pass


@dataclass(frozen=True)
class FutureValueResult:
    """Result of a future value calculation.

    Attributes:
        fv_investable_surplus: Future value of foregone salary that could be invested
        fv_exercise_cost: Future value of stock option exercise costs
        fv_cash_from_sale: Future value of cash received from equity sales
        fv_opportunity: Total opportunity cost (surplus + exercise costs)
    """

    fv_investable_surplus: float
    fv_exercise_cost: float
    fv_cash_from_sale: float

    @property
    def fv_opportunity(self) -> float:
        """Total opportunity cost: investable surplus + exercise costs."""
        return self.fv_investable_surplus + self.fv_exercise_cost


class InvestmentFrequencyStrategy(ABC):
    """Abstract base class for investment frequency strategies.

    Subclasses implement the specific compounding logic for each frequency.
    """

    @abstractmethod
    def calculate_future_value(
        self,
        monthly_df: pd.DataFrame,
        year_end: int,
        annual_roi: float,
        annual_investable_surplus: pd.Series,
        annual_exercise_cost: pd.Series,
        annual_cash_from_sale: pd.Series,
    ) -> FutureValueResult:
        """Calculate future value of cash flows at the given year end.

        Args:
            monthly_df: Monthly data with InvestableSurplus, ExerciseCost, CashFromSale columns
            year_end: The year to calculate FV for (1-indexed)
            annual_roi: Expected annual return on investments
            annual_investable_surplus: Pre-aggregated annual investable surplus series
            annual_exercise_cost: Pre-aggregated annual exercise cost series
            annual_cash_from_sale: Pre-aggregated annual cash from sale series

        Returns:
            FutureValueResult with calculated future values
        """
        pass


class MonthlyInvestmentStrategy(InvestmentFrequencyStrategy):
    """Strategy for monthly investment frequency.

    Calculates future value using monthly compounding, where each month's
    cash flow is invested and compounds until the year end.
    """

    def calculate_future_value(
        self,
        monthly_df: pd.DataFrame,
        year_end: int,
        annual_roi: float,
        annual_investable_surplus: pd.Series,  # noqa: ARG002 - not used in monthly
        annual_exercise_cost: pd.Series,  # noqa: ARG002 - not used in monthly
        annual_cash_from_sale: pd.Series,  # noqa: ARG002 - not used in monthly
    ) -> FutureValueResult:
        """Calculate FV with monthly compounding."""
        monthly_roi = annual_to_monthly_roi(annual_roi)
        current_df = monthly_df[monthly_df["Year"] <= year_end]
        months_to_grow = (year_end * 12) - current_df.index - 1

        # Future value of foregone salary that could be invested
        fv_investable_surplus = (
            current_df["InvestableSurplus"] * (1 + monthly_roi) ** months_to_grow
        ).sum()

        # Future value of exercise costs (additional cash outflow)
        fv_exercise_cost = (
            current_df["ExerciseCost"] * (1 + monthly_roi) ** months_to_grow
        ).sum()

        # Future value of cash from sale
        fv_cash_from_sale = (
            current_df["CashFromSale"] * (1 + monthly_roi) ** months_to_grow
        ).sum()

        return FutureValueResult(
            fv_investable_surplus=float(fv_investable_surplus),
            fv_exercise_cost=float(fv_exercise_cost),
            fv_cash_from_sale=float(fv_cash_from_sale),
        )


class AnnualInvestmentStrategy(InvestmentFrequencyStrategy):
    """Strategy for annual investment frequency.

    Calculates future value using annual compounding, where each year's
    aggregated cash flow is invested at the end of the year.
    """

    def calculate_future_value(
        self,
        monthly_df: pd.DataFrame,  # noqa: ARG002 - not used in annual
        year_end: int,
        annual_roi: float,
        annual_investable_surplus: pd.Series,
        annual_exercise_cost: pd.Series,
        annual_cash_from_sale: pd.Series,
    ) -> FutureValueResult:
        """Calculate FV with annual compounding."""
        # Reindex to ensure all years up to year_end are included
        annual_investable = annual_investable_surplus.reindex(
            range(1, year_end + 1), fill_value=0
        )
        annual_exercise = annual_exercise_cost.reindex(
            range(1, year_end + 1), fill_value=0
        )
        annual_cash = annual_cash_from_sale.reindex(
            range(1, year_end + 1), fill_value=0
        )

        years_to_grow = year_end - annual_investable.index

        # Future value of foregone salary that could be invested
        fv_investable_surplus = (
            annual_investable * (1 + annual_roi) ** years_to_grow
        ).sum()

        # Future value of exercise costs (additional cash outflow)
        fv_exercise_cost = (annual_exercise * (1 + annual_roi) ** years_to_grow).sum()

        # Future value of cash from sale
        fv_cash_from_sale = (annual_cash * (1 + annual_roi) ** years_to_grow).sum()

        return FutureValueResult(
            fv_investable_surplus=float(fv_investable_surplus),
            fv_exercise_cost=float(fv_exercise_cost),
            fv_cash_from_sale=float(fv_cash_from_sale),
        )


# Strategy registry for easy lookup
_STRATEGY_REGISTRY: dict[str, type[InvestmentFrequencyStrategy]] = {
    "Monthly": MonthlyInvestmentStrategy,
    "Annually": AnnualInvestmentStrategy,
}


def get_investment_strategy(frequency: str) -> InvestmentFrequencyStrategy:
    """Get the appropriate strategy for the given investment frequency.

    Args:
        frequency: Investment frequency ("Monthly" or "Annually")

    Returns:
        An instance of the appropriate strategy

    Raises:
        ValueError: If frequency is not recognized
    """
    strategy_class = _STRATEGY_REGISTRY.get(frequency)
    if strategy_class is None:
        valid = ", ".join(_STRATEGY_REGISTRY.keys())
        raise ValueError(f"Unknown investment frequency: {frequency}. Valid: {valid}")
    return strategy_class()
