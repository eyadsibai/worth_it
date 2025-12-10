"""
Core calculation functions for financial analysis.

This module provides functions to calculate opportunity costs, startup equity
scenarios (RSUs and Stock Options), dilution, IRR, NPV, and run Monte Carlo simulations.
It is designed to be independent of the Streamlit UI.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

import numpy as np
import numpy_financial as npf
import pandas as pd


class EquityType(str, Enum):
    """Enum for different types of equity."""

    RSU = "Equity (RSUs)"
    STOCK_OPTIONS = "Stock Options"


def annual_to_monthly_roi(annual_roi: float | np.ndarray) -> float | np.ndarray:
    """Converts an annual Return on Investment (ROI) to its monthly equivalent."""
    result = (1 + annual_roi) ** (1 / 12) - 1
    if isinstance(annual_roi, float):
        return float(result)
    return result


def create_monthly_data_grid(
    exit_year: int,
    current_job_monthly_salary: float,
    startup_monthly_salary: float,
    current_job_salary_growth_rate: float,
    dilution_rounds: list | None = None,
) -> pd.DataFrame:
    """
    Creates a DataFrame with one row per month, calculating salaries, surplus,
    and any cash injections from secondary sales.
    """
    if exit_year is None:
        exit_year = 0

    total_months = exit_year * 12
    df = pd.DataFrame(index=pd.RangeIndex(total_months, name="MonthIndex"))
    df["Year"] = df.index // 12 + 1

    # --- Calculate Current Job Salary (Vectorized) ---
    year_index = df.index // 12
    df["CurrentJobSalary"] = current_job_monthly_salary * (
        (1 + current_job_salary_growth_rate) ** year_index
    )

    # --- Calculate Startup Salary with Mid-stream Changes ---
    df["StartupSalary"] = startup_monthly_salary
    if dilution_rounds:
        sorted_rounds = sorted(dilution_rounds, key=lambda r: r["year"])
        for r in sorted_rounds:
            if "new_salary" in r and r["new_salary"] > 0:
                # Handle year 0 (inception): max ensures year 0 maps to month 0
                start_month = max(0, (r["year"] - 1) * 12)
                df.loc[start_month:, "StartupSalary"] = r["new_salary"]

    df["MonthlySurplus"] = df["CurrentJobSalary"] - df["StartupSalary"]
    df["InvestableSurplus"] = df["MonthlySurplus"].clip(lower=0)
    df["ExerciseCost"] = 0
    df["CashFromSale"] = 0

    return df


def calculate_annual_opportunity_cost(
    monthly_df: pd.DataFrame,
    annual_roi: float,
    investment_frequency: str,
    options_params: dict[str, Any] | None = None,
    startup_params: dict[str, Any] | None = None,
) -> pd.DataFrame:
    """
    Calculates the future value (opportunity cost) of the forgone surplus for each year.
    Handles stock option exercise costs and tracks cash from secondary sales separately.

    Cash from equity sales is NOT included in the opportunity cost calculation because
    it represents startup-side wealth, not foregone BigCorp earnings. Instead, it's
    tracked in a separate "Cash From Sale (FV)" column that gets added to the final
    payout value in calculate_startup_scenario().
    """
    if monthly_df.empty:
        return pd.DataFrame()

    monthly_df_copy = monthly_df.copy()

    # --- Handle Cash from Equity Sales ---
    equity_type = startup_params.get("equity_type") if startup_params else None
    if equity_type and equity_type.value == "Equity (RSUs)" and startup_params is not None:
        # Type guard for type checker - startup_params is guaranteed non-None here
        rsu_params = startup_params["rsu_params"]
        dilution_rounds = rsu_params.get("dilution_rounds", [])
        initial_equity_pct = rsu_params.get("equity_pct", 0)
        total_vesting_years = startup_params["total_vesting_years"]
        cliff_years = startup_params["cliff_years"]

        for r in dilution_rounds:
            if "percent_to_sell" in r and r["percent_to_sell"] > 0:
                sale_year = r["year"]
                # Calculate vested percentage at the time of sale
                vested_pct_at_sale = np.where(
                    sale_year >= cliff_years,
                    np.clip((sale_year / total_vesting_years), 0, 1),
                    0,
                )

                # Find cumulative dilution factor and cumulative sold equity factor up to the year *before* the sale
                cumulative_dilution_factor = 1.0
                cumulative_sold_factor = 1.0
                for prev_r in dilution_rounds:
                    if prev_r["year"] < sale_year:
                        cumulative_dilution_factor *= 1 - prev_r.get("dilution", 0)
                        if "percent_to_sell" in prev_r and prev_r["percent_to_sell"] > 0:
                            cumulative_sold_factor *= 1 - prev_r["percent_to_sell"]

                # percent_to_sell is a percentage of remaining equity at the time of sale
                # (after accounting for both dilution and previous equity sales)
                # Note: If you attempt to sell more than the vested portion, you only receive cash for the vested portion,
                # and the unvested portion of the attempted sale is forfeited. The remaining equity is reduced by the full
                # percent_to_sell amount, not just the vested portion that generated cash.
                equity_at_sale = (
                    initial_equity_pct * cumulative_dilution_factor * cumulative_sold_factor
                )
                # Ensure we only get cash for vested equity (percent_to_sell is limited by UI but we validate here too)
                effective_sell_pct = min(float(vested_pct_at_sale), r["percent_to_sell"])
                cash_from_sale = equity_at_sale * r.get("valuation_at_sale", 0) * effective_sell_pct

                # Handle year 0: sales at year 0 happen at month 0 (inception)
                # Other years: sale at end of year (last month of that year)
                sale_month_index = 0 if sale_year == 0 else (sale_year * 12) - 1
                if 0 <= sale_month_index < len(monthly_df_copy):
                    monthly_df_copy.loc[sale_month_index, "CashFromSale"] += cash_from_sale

    # --- Handle Stock Option Exercise Costs ---
    if options_params and options_params.get("exercise_strategy") == "Exercise After Vesting":
        exercise_year = options_params.get("exercise_year", 0)
        exercise_month_index = (exercise_year * 12) - 1
        num_options = options_params.get("num_options", 0)
        strike_price = options_params.get("strike_price", 0)
        total_exercise_cost = num_options * strike_price

        if 0 <= exercise_month_index < len(monthly_df_copy):
            monthly_df_copy.loc[exercise_month_index, "ExerciseCost"] = total_exercise_cost

    # --- Calculate Future Value of Cash Flows ---
    results_df = pd.DataFrame(
        index=pd.RangeIndex(1, monthly_df_copy["Year"].max() + 1, name="Year")
    )

    # Add yearly salary aggregates for display in the frontend table
    annual_startup_salary = monthly_df_copy.groupby("Year")["StartupSalary"].sum()
    annual_current_job_salary = monthly_df_copy.groupby("Year")["CurrentJobSalary"].sum()
    annual_surplus = monthly_df_copy.groupby("Year")["MonthlySurplus"].sum()

    results_df["StartupSalary"] = annual_startup_salary
    results_df["CurrentJobSalary"] = annual_current_job_salary
    results_df["MonthlySurplus"] = (
        annual_surplus  # Yearly surplus (misleading name kept for compat)
    )

    principal_col_label = "Principal Forgone" if annual_surplus.sum() >= 0 else "Salary Gain"

    results_df[principal_col_label] = annual_surplus.cumsum()

    opportunity_costs = []
    cash_from_sale_future_values = []
    monthly_roi = annual_to_monthly_roi(annual_roi)
    annual_investable_surplus = monthly_df_copy.groupby("Year")["InvestableSurplus"].sum()
    annual_exercise_cost = monthly_df_copy.groupby("Year")["ExerciseCost"].sum()
    annual_cash_from_sale = monthly_df_copy.groupby("Year")["CashFromSale"].sum()

    for year_end in results_df.index:
        current_df = monthly_df_copy[monthly_df_copy["Year"] <= year_end]

        # Calculate opportunity cost from foregone salary (without exercise costs)
        # Exercise costs are treated as additional outflow and added separately
        if investment_frequency == "Monthly":
            months_to_grow = (year_end * 12) - current_df.index - 1

            # Future value of foregone salary that could be invested
            fv_investable_surplus = (
                current_df["InvestableSurplus"] * (1 + monthly_roi) ** months_to_grow
            ).sum()

            # Future value of exercise costs (additional cash outflow)
            fv_exercise_cost = (
                current_df["ExerciseCost"] * (1 + monthly_roi) ** months_to_grow
            ).sum()

            # Total opportunity cost includes both foregone salary and exercise costs
            fv_opportunity = fv_investable_surplus + fv_exercise_cost

            # Calculate future value of cash from sale separately
            cash_flow = current_df["CashFromSale"]
            fv_cash_from_sale = (cash_flow * (1 + monthly_roi) ** months_to_grow).sum()
        else:  # Annually
            annual_investable = annual_investable_surplus.reindex(
                range(1, year_end + 1), fill_value=0
            )
            annual_exercise = annual_exercise_cost.reindex(range(1, year_end + 1), fill_value=0)
            years_to_grow = year_end - annual_investable.index

            # Future value of foregone salary that could be invested
            fv_investable_surplus = (annual_investable * (1 + annual_roi) ** years_to_grow).sum()

            # Future value of exercise costs (additional cash outflow)
            fv_exercise_cost = (annual_exercise * (1 + annual_roi) ** years_to_grow).sum()

            # Total opportunity cost includes both foregone salary and exercise costs
            fv_opportunity = fv_investable_surplus + fv_exercise_cost

            # Calculate future value of cash from sale separately
            annual_cash = annual_cash_from_sale.reindex(range(1, year_end + 1), fill_value=0)
            fv_cash_from_sale = (annual_cash * (1 + annual_roi) ** years_to_grow).sum()

        opportunity_costs.append(fv_opportunity)
        cash_from_sale_future_values.append(fv_cash_from_sale)

    results_df["Opportunity Cost (Invested Surplus)"] = opportunity_costs
    results_df["Cash From Sale (FV)"] = cash_from_sale_future_values
    results_df["Investment Returns"] = results_df["Opportunity Cost (Invested Surplus)"] - (
        results_df[principal_col_label].clip(lower=0)
        - annual_exercise_cost.reindex(results_df.index, fill_value=0).cumsum()
    )

    results_df["Year"] = results_df.index
    return results_df


def calculate_dilution_from_valuation(pre_money_valuation: float, amount_raised: float) -> float:
    """
    Calculate dilution percentage from a funding round.

    Args:
        pre_money_valuation: Company valuation before investment (must be > 0)
        amount_raised: Investment amount (must be >= 0)

    Returns:
        Dilution as a decimal (e.g., 0.20 for 20%)

    Raises:
        ValueError: If pre_money_valuation <= 0 or amount_raised < 0
    """
    if pre_money_valuation <= 0:
        raise ValueError(f"pre_money_valuation must be positive, got {pre_money_valuation}")
    if amount_raised < 0:
        raise ValueError(f"amount_raised cannot be negative, got {amount_raised}")

    post_money_valuation = pre_money_valuation + amount_raised
    return amount_raised / post_money_valuation


def calculate_startup_scenario(
    opportunity_cost_df: pd.DataFrame, startup_params: dict[str, Any]
) -> dict[str, Any]:
    """
    Calculates the financial outcomes for a given startup equity package.
    This function handles both RSU and Stock Option scenarios.

    Args:
        opportunity_cost_df: DataFrame from calculate_annual_opportunity_cost.
        startup_params: A dictionary containing all startup-related inputs.

    Returns:
        A dictionary containing the results DataFrame and key financial metrics.
    """
    equity_type = startup_params["equity_type"]
    total_vesting_years = startup_params["total_vesting_years"]
    cliff_years = startup_params["cliff_years"]
    exit_year = startup_params.get("exit_year", 0)

    if opportunity_cost_df.empty:
        return {
            "results_df": pd.DataFrame(),
            "final_payout_value": 0,
            "final_opportunity_cost": 0,
            "payout_label": "Your Equity Value",
            "breakeven_label": "Breakeven Value",
        }

    results_df = opportunity_cost_df.copy()

    # Calculate vested percentage over time, respecting the cliff and capping at 100%
    years = results_df.index
    vested_equity_pct = np.where(
        years >= cliff_years,
        np.clip((years / total_vesting_years) * 100, 0, 100),
        0,
    )
    results_df["Vested Equity (%)"] = vested_equity_pct

    output = {}

    if equity_type.value == "Equity (RSUs)":
        rsu_params = startup_params["rsu_params"]
        initial_equity_pct = rsu_params.get("equity_pct", 0.0)
        diluted_equity_pct = initial_equity_pct
        total_dilution = 0.0

        if startup_params.get("simulated_dilution") is not None:
            total_dilution = startup_params["simulated_dilution"]
            diluted_equity_pct = initial_equity_pct * (1 - total_dilution)
            results_df["CumulativeDilution"] = 1 - total_dilution
            sorted_rounds = []
        elif rsu_params.get("simulate_dilution") and rsu_params.get("dilution_rounds"):
            sorted_rounds = sorted(rsu_params["dilution_rounds"], key=lambda r: r["year"])

            # Handle SAFE note conversion timing
            # SAFE notes don't dilute immediately - they convert at the next priced round

            # First, determine conversion timing for SAFE notes
            safe_conversion_year = {}  # Map SAFE rounds to their conversion year
            for r in sorted_rounds:
                if r.get("is_safe_note", False):
                    # Find the next priced round after this SAFE
                    conversion_year = None
                    for future_round in sorted_rounds:
                        if (
                            not future_round.get("is_safe_note", False)
                            and future_round["year"] >= r["year"]
                        ):
                            conversion_year = future_round["year"]
                            break
                    safe_conversion_year[id(r)] = conversion_year

            # Now calculate yearly dilution factors
            yearly_dilution_factors = []
            for year in results_df.index:
                cumulative_dilution_factor = 1.0

                # Apply dilution from all rounds that should affect this year
                for r in sorted_rounds:
                    is_safe = r.get("is_safe_note", False)
                    dilution = r.get("dilution", 0)

                    if is_safe:
                        # SAFE: only dilutes at conversion year
                        conversion_year = safe_conversion_year.get(id(r))
                        if conversion_year is not None and year >= conversion_year:
                            cumulative_dilution_factor *= 1 - dilution
                    else:
                        # Priced round: dilutes at its own year
                        if r["year"] <= year:
                            cumulative_dilution_factor *= 1 - dilution

                yearly_dilution_factors.append(cumulative_dilution_factor)

            results_df["CumulativeDilution"] = yearly_dilution_factors
            total_dilution = 1 - results_df["CumulativeDilution"].iloc[-1]
            diluted_equity_pct = initial_equity_pct * results_df["CumulativeDilution"].iloc[-1]
        else:
            results_df["CumulativeDilution"] = 1.0
            total_dilution = 0.0
            diluted_equity_pct = initial_equity_pct
            sorted_rounds = []

        # --- Account for Sold Equity ---
        # Only consider equity sales that happen before or at the exit year
        remaining_equity_factor = 1.0
        for r in sorted_rounds:
            if "percent_to_sell" in r and r["percent_to_sell"] > 0:
                if r["year"] <= exit_year:
                    remaining_equity_factor *= 1 - r["percent_to_sell"]

        final_vested_equity_pct = (
            results_df["Vested Equity (%)"].iloc[-1] / 100
        ) * initial_equity_pct
        final_payout_value = (
            rsu_params.get("target_exit_valuation", 0)
            * final_vested_equity_pct
            * (1 - total_dilution)
            * remaining_equity_factor
        )

        # Add the future value of cash from equity sales to the payout
        # This cash is startup-side wealth, not opportunity cost
        if "Cash From Sale (FV)" in results_df.columns:
            final_payout_value += results_df["Cash From Sale (FV)"].iloc[-1]

        yearly_diluted_equity_pct = initial_equity_pct * results_df["CumulativeDilution"]
        breakeven_vesting_pct = (results_df["Vested Equity (%)"] / 100) * yearly_diluted_equity_pct

        # Calculate breakeven value: opportunity_cost / vesting_pct
        # When vesting_pct is 0, breakeven is infinite (not achievable)
        opportunity_cost = results_df["Opportunity Cost (Invested Surplus)"]
        results_df["Breakeven Value"] = np.where(
            breakeven_vesting_pct > 0,
            opportunity_cost / breakeven_vesting_pct,
            np.inf,  # Breakeven not achievable when no equity is vested
        )

        results_df["Vested Equity (%)"] = (
            (results_df["Vested Equity (%)"] / 100) * yearly_diluted_equity_pct * 100
        )

        output.update(
            {
                "payout_label": "Your Equity Value (Post-Dilution)",
                "breakeven_label": "Breakeven Valuation (SAR)",
                "total_dilution": total_dilution,
                "diluted_equity_pct": diluted_equity_pct,
            }
        )

    else:  # Stock Options
        options_params = startup_params["options_params"]
        num_options = options_params.get("num_options", 0)
        strike_price = options_params.get("strike_price", 0)

        vested_options_series = (results_df["Vested Equity (%)"] / 100) * num_options

        final_payout_value = (
            max(0, options_params.get("target_exit_price_per_share", 0) - strike_price)
            * vested_options_series.iloc[-1]
        )

        # Calculate breakeven price per share: (opportunity_cost / vested_options) + strike_price
        # When vested_options is 0, breakeven is infinite (not achievable)
        opportunity_cost = results_df["Opportunity Cost (Invested Surplus)"]
        np.where(
            vested_options_series > 0,
            opportunity_cost / vested_options_series,
            np.inf,  # Breakeven not achievable when no options are vested
        )
        results_df["Breakeven Value"] = np.where(
            vested_options_series > 0,
            (opportunity_cost / vested_options_series) + strike_price,
            np.inf,
        )

        output.update(
            {
                "payout_label": "Your Options Value",
                "breakeven_label": "Breakeven Price/Share (SAR)",
            }
        )
    output.update(
        {
            "results_df": results_df,
            "final_payout_value": final_payout_value,
            "final_opportunity_cost": results_df["Opportunity Cost (Invested Surplus)"].iloc[-1],
        }
    )

    return output


def calculate_irr(monthly_surpluses: pd.Series, final_payout_value: float) -> float:
    """
    Calculates the annualized Internal Rate of Return (IRR) based on monthly cash flows.
    """
    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return float(np.nan)

    cash_flows.iloc[-1] += final_payout_value

    if not (any(cash_flows > 0) and any(cash_flows < 0)):
        return float(np.nan)

    try:
        monthly_irr = npf.irr(cash_flows)
        if pd.isna(monthly_irr):
            return float(np.nan)
        return float(((1 + monthly_irr) ** 12 - 1) * 100)
    except (ValueError, TypeError):
        return float(np.nan)


def calculate_npv(
    monthly_surpluses: pd.Series, annual_roi: float, final_payout_value: float
) -> float:
    """
    Calculates the Net Present Value of the investment.
    """
    monthly_roi = annual_to_monthly_roi(annual_roi)
    if pd.isna(monthly_roi) or monthly_roi <= -1:
        return float(np.nan)

    cash_flows = -monthly_surpluses.copy()
    if len(cash_flows) == 0:
        return float(np.nan)

    cash_flows.iloc[-1] += final_payout_value

    try:
        return float(npf.npv(monthly_roi, cash_flows))
    except (ValueError, TypeError):
        return float(np.nan)


# --- Cap Table Conversion Functions ---


def calculate_interest(
    principal: float,
    annual_rate: float,
    months_elapsed: float,
    interest_type: str = "simple",
) -> float:
    """
    Calculate accrued interest for a convertible note.

    Args:
        principal: The principal amount of the note
        annual_rate: Annual interest rate as percentage (e.g., 5 for 5%)
        months_elapsed: Number of months between note date and conversion date
        interest_type: "simple" or "compound"

    Returns:
        Accrued interest amount

    Example:
        >>> calculate_interest(50000, 5, 6, "simple")
        1250.0  # $50K * 5% * (6/12) = $1,250
    """
    if months_elapsed <= 0:
        return 0.0

    rate = annual_rate / 100
    years = months_elapsed / 12

    if interest_type == "compound":
        # Compound interest: P * ((1 + r)^t - 1)
        return principal * ((1 + rate) ** years - 1)
    else:
        # Simple interest: P * r * t
        return principal * rate * years


def calculate_conversion_price(
    valuation_cap: float | None,
    discount_pct: float | None,
    round_price_per_share: float,
    pre_conversion_shares: int,
) -> tuple[float, str]:
    """
    Calculate the conversion price for a SAFE or Convertible Note.

    Uses the "best of both" rule: convert at whichever price is lower
    (giving the investor more shares).

    Args:
        valuation_cap: Maximum valuation for conversion (or None)
        discount_pct: Discount percentage (e.g., 20 for 20%) (or None)
        round_price_per_share: Price per share in the priced round
        pre_conversion_shares: Total shares before conversion

    Returns:
        Tuple of (conversion_price, price_source) where price_source is "cap" or "discount"

    Raises:
        ValueError: If neither cap nor discount is provided

    Example:
        >>> calculate_conversion_price(5_000_000, 20, 1.0, 10_000_000)
        (0.5, "cap")  # Cap price ($0.50) beats discount price ($0.80)
    """
    if valuation_cap is None and discount_pct is None:
        raise ValueError("Must have at least valuation_cap or discount_pct")

    cap_price = None
    discount_price = None

    if valuation_cap is not None and pre_conversion_shares > 0:
        cap_price = valuation_cap / pre_conversion_shares

    if discount_pct is not None:
        discount_price = round_price_per_share * (1 - discount_pct / 100)

    # Determine which price to use (lower = better for investor)
    if cap_price is not None and discount_price is not None:
        if cap_price <= discount_price:
            return (cap_price, "cap")
        else:
            return (discount_price, "discount")
    elif cap_price is not None:
        return (cap_price, "cap")
    else:
        # discount_price must be not None here due to initial validation
        return (discount_price, "discount")  # type: ignore[return-value]


def calculate_months_between_dates(start_date: str, end_date: str) -> float:
    """
    Calculate months between two ISO date strings.

    Args:
        start_date: Start date in ISO format (YYYY-MM-DD)
        end_date: End date in ISO format (YYYY-MM-DD)

    Returns:
        Number of months (can be fractional)
    """
    from datetime import datetime

    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)

    # Calculate difference in months
    months = (end.year - start.year) * 12 + (end.month - start.month)

    # Add fractional month based on day difference
    day_fraction = (end.day - start.day) / 30.0
    months += day_fraction

    return max(0, months)


def convert_instruments(
    cap_table: dict[str, Any],
    instruments: list[dict[str, Any]],
    priced_round: dict[str, Any],
) -> dict[str, Any]:
    """
    Convert all outstanding SAFEs and Convertible Notes to equity.

    This is the main conversion function that:
    1. Filters to only outstanding instruments
    2. Calculates conversion price for each (using "best of both" rule)
    3. For notes, includes accrued interest in conversion amount
    4. Creates new stakeholder entries for converted investors
    5. Updates total shares and recalculates ownership percentages

    Args:
        cap_table: Current cap table with stakeholders and total_shares
        instruments: List of SAFE and ConvertibleNote dictionaries
        priced_round: The priced round triggering conversion

    Returns:
        Dictionary with:
        - updated_cap_table: Cap table with new stakeholders
        - converted_instruments: Details of each conversion
        - summary: Aggregate conversion stats
    """
    import uuid

    # Extract data from inputs
    stakeholders = list(cap_table.get("stakeholders", []))
    total_shares = cap_table.get("total_shares", 10_000_000)
    option_pool_pct = cap_table.get("option_pool_pct", 10)

    round_price = priced_round["price_per_share"]
    round_date = priced_round.get("date")

    # Track conversion results
    converted_details = []
    total_new_shares = 0

    # Process each instrument
    for instrument in instruments:
        # Only convert outstanding instruments
        if instrument.get("status") != "outstanding":
            continue

        instrument_type = instrument.get("type")
        investor_name = instrument["investor_name"]
        instrument_id = instrument["id"]

        # Determine conversion amount (principal for SAFE, principal + interest for Note)
        if instrument_type == "CONVERTIBLE_NOTE":
            principal = instrument["principal_amount"]
            interest_rate = instrument.get("interest_rate", 0)
            interest_type = instrument.get("interest_type", "simple")
            note_date = instrument.get("date")

            # Calculate accrued interest
            if note_date and round_date:
                months_elapsed = calculate_months_between_dates(note_date, round_date)
            else:
                # Default to maturity_months if dates not provided
                months_elapsed = instrument.get("maturity_months", 12)

            accrued_interest = calculate_interest(
                principal, interest_rate, months_elapsed, interest_type
            )
            conversion_amount = principal + accrued_interest
        else:
            # SAFE - no interest
            conversion_amount = instrument["investment_amount"]
            accrued_interest = None

        # Calculate conversion price
        valuation_cap = instrument.get("valuation_cap")
        discount_pct = instrument.get("discount_pct")

        conversion_price, price_source = calculate_conversion_price(
            valuation_cap=valuation_cap,
            discount_pct=discount_pct,
            round_price_per_share=round_price,
            pre_conversion_shares=total_shares,
        )

        # Calculate shares issued
        shares_issued = int(conversion_amount / conversion_price)
        total_new_shares += shares_issued

        # Create new stakeholder for converted investor
        new_stakeholder = {
            "id": str(uuid.uuid4()),
            "name": investor_name,
            "type": "investor",
            "shares": shares_issued,
            "ownership_pct": 0,  # Will be recalculated after all conversions
            "share_class": "preferred",
            "vesting": None,
        }
        stakeholders.append(new_stakeholder)

        # Record conversion details
        converted_details.append(
            {
                "instrument_id": instrument_id,
                "instrument_type": instrument_type,
                "investor_name": investor_name,
                "investment_amount": conversion_amount,
                "conversion_price": conversion_price,
                "price_source": price_source,
                "shares_issued": shares_issued,
                "ownership_pct": 0,  # Will be recalculated
                "accrued_interest": accrued_interest,
            }
        )

    # Update total shares
    new_total_shares = total_shares + total_new_shares

    # Recalculate ownership percentages for all stakeholders
    for stakeholder in stakeholders:
        stakeholder["ownership_pct"] = (stakeholder["shares"] / new_total_shares) * 100

    # Update ownership_pct in converted_details
    for detail in converted_details:
        detail["ownership_pct"] = (detail["shares_issued"] / new_total_shares) * 100

    # Calculate dilution
    total_dilution_pct = (total_new_shares / new_total_shares) * 100

    return {
        "updated_cap_table": {
            "stakeholders": stakeholders,
            "total_shares": new_total_shares,
            "option_pool_pct": option_pool_pct,
        },
        "converted_instruments": converted_details,
        "summary": {
            "instruments_converted": len(converted_details),
            "total_shares_issued": total_new_shares,
            "total_dilution_pct": total_dilution_pct,
        },
    }


# Re-export Monte Carlo functions for backward compatibility.
# These functions have been moved to monte_carlo.py for better organization.
# NOTE: This creates a circular import (monte_carlo imports from calculations,
# calculations imports from monte_carlo), but it's safe because:
# 1. monte_carlo's imports from calculations are at the top (executed first)
# 2. This import is at the END of calculations.py (all functions already defined)
# 3. Python handles this pattern correctly when calculations is imported first
from worth_it.monte_carlo import (  # noqa: E402, F401
    get_random_variates_pert,
    run_monte_carlo_simulation,
    run_monte_carlo_simulation_iterative,
    run_monte_carlo_simulation_vectorized,
    run_sensitivity_analysis,
)
