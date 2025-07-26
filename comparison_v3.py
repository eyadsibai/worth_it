from typing import Tuple

import numpy as np
import numpy_financial as npf
import pandas as pd
import plotly.express as px
import streamlit as st

# --- Page Configuration ---
st.set_page_config(
    layout="wide", page_title="Job Offer Financial Comparison", page_icon="⚖️"
)


# =============================================================================
# --- CALCULATION ENGINE ---
# =============================================================================


def annual_to_monthly_roi(annual_roi: float) -> float:
    """Converts an annual Return on Investment (ROI) to its monthly equivalent."""
    return (1 + annual_roi) ** (1 / 12) - 1


def create_monthly_data_grid(
    total_vesting_years: int,
    current_job_monthly_salary: float,
    startup_monthly_salary: float,
    current_job_salary_growth_rate: float,
) -> pd.DataFrame:
    """
    Creates a DataFrame with one row per month, calculating the monthly salary
    surplus which forms the basis of our cash flows.

    Args:
        total_vesting_years: The total number of years in the vesting period.
        current_job_monthly_salary: The monthly salary from the current job.
        startup_monthly_salary: The proposed monthly salary from the startup.
        current_job_salary_growth_rate: The assumed annual growth rate of the current job's salary.

    Returns:
        A pandas DataFrame indexed by month with calculated salary details.
    """
    total_months = total_vesting_years * 12
    df = pd.DataFrame(index=pd.RangeIndex(total_months, name="MonthIndex"))
    df["Year"] = df.index // 12 + 1

    year_index = df.index // 12
    df["CurrentJobSalary"] = current_job_monthly_salary * (
        (1 + current_job_salary_growth_rate) ** year_index
    )
    df["MonthlySurplus"] = df["CurrentJobSalary"] - startup_monthly_salary
    df["InvestableSurplus"] = df["MonthlySurplus"].clip(lower=0)

    return df


def calculate_annual_opportunity_cost(
    monthly_df: pd.DataFrame, annual_roi: float, investment_frequency: str
) -> pd.DataFrame:
    """
    Calculates the future value (opportunity cost) of the forgone surplus for each year.

    Args:
        monthly_df: The DataFrame of monthly salary data.
        annual_roi: The assumed annual return on investment.
        investment_frequency: How often the surplus is invested ('Monthly' or 'Annually').

    Returns:
        A pandas DataFrame indexed by year with opportunity cost calculations.
    """
    results_df = pd.DataFrame(
        index=pd.RangeIndex(1, monthly_df["Year"].max() + 1, name="Year")
    )
    annual_surplus = monthly_df.groupby("Year")["MonthlySurplus"].sum()
    results_df["Annual Surplus Forgone"] = annual_surplus
    results_df["Principal Forgone"] = annual_surplus.cumsum()

    opportunity_costs = []
    monthly_roi = annual_to_monthly_roi(annual_roi)
    annual_investable_surplus = monthly_df.groupby("Year")["InvestableSurplus"].sum()

    for year_end in results_df.index:
        current_df = monthly_df[monthly_df["Year"] <= year_end]
        if investment_frequency == "Monthly":
            months_to_grow = (year_end * 12) - current_df.index - 1
            fv = (
                current_df["InvestableSurplus"] * (1 + monthly_roi) ** months_to_grow
            ).sum()
        else:  # Annually
            current_annual_investable = annual_investable_surplus.loc[1:year_end]
            years_to_grow = year_end - current_annual_investable.index
            fv = (current_annual_investable * (1 + annual_roi) ** years_to_grow).sum()
        opportunity_costs.append(fv)

    results_df["Opportunity Cost (Invested Surplus)"] = opportunity_costs
    results_df["Investment Returns"] = (
        results_df["Opportunity Cost (Invested Surplus)"]
        - results_df["Principal Forgone"]
    )

    return results_df


def calculate_annual_breakeven(
    results_df: pd.DataFrame,
    equity_pct: float,
    cliff_years: int,
    total_vesting_years: int,
) -> pd.DataFrame:
    """
    Calculates the vested equity percentage and breakeven valuation for each year.

    Args:
        results_df: The DataFrame of annual results.
        equity_pct: The total equity percentage offered.
        cliff_years: The number of years for the vesting cliff.
        total_vesting_years: The total number of years for vesting.

    Returns:
        The results_df DataFrame with added breakeven calculation columns.
    """
    results_df["Vested Equity (%)"] = np.where(
        results_df.index >= cliff_years,
        equity_pct * (results_df.index / total_vesting_years) * 100,
        0,
    )
    vested_equity_decimal = results_df["Vested Equity (%)"] / 100
    results_df["Breakeven Valuation (SAR)"] = (
        results_df["Opportunity Cost (Invested Surplus)"]
        .divide(vested_equity_decimal)
        .fillna(np.inf)
    )
    return results_df


def calculate_irr(monthly_surpluses: pd.Series, final_equity_value: float) -> float:
    """
    Calculates the annualized Internal Rate of Return (IRR) based on monthly cash flows.

    Args:
        monthly_surpluses: A pandas Series of monthly salary surpluses (the 'investment').
        final_equity_value: The final value of the equity at the end of the period.

    Returns:
        The annualized IRR as a percentage, or NaN if not calculable.
    """
    cash_flows = -monthly_surpluses.copy()
    if cash_flows.empty:
        return np.nan
    cash_flows.iloc[-1] += final_equity_value

    if cash_flows.iloc[-1] <= 0 or -cash_flows.iloc[:-1].sum() <= 0:
        return np.nan

    monthly_irr = npf.irr(cash_flows)
    if pd.isna(monthly_irr):
        return np.nan

    return ((1 + monthly_irr) ** 12 - 1) * 100


def calculate_npv(
    monthly_surpluses: pd.Series, annual_roi: float, final_equity_value: float
) -> float:
    """
    Calculates the Net Present Value of the investment.

    Args:
        monthly_surpluses: A pandas Series of monthly salary surpluses.
        annual_roi: The discount rate (assumed annual ROI).
        final_equity_value: The final value of the equity at the end of the period.

    Returns:
        The NPV of the cash flows, or NaN if not calculable.
    """
    monthly_roi = annual_to_monthly_roi(annual_roi)
    if monthly_roi is None or pd.isna(monthly_roi):
        return np.nan

    cash_flows = -monthly_surpluses.copy()
    cash_flows.iloc[-1] += final_equity_value

    # npf.npv assumes the first cash flow is at t=1, which matches our monthly series.
    return npf.npv(monthly_roi, cash_flows)


def analyze_job_offer(
    current_job_monthly_salary: float,
    startup_monthly_salary: float,
    current_job_salary_growth_rate: float,
    annual_roi: float,
    equity_pct: float,
    cliff_years: int,
    total_vesting_years: int,
    investment_frequency: str,
) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Main controller function to orchestrate the financial analysis.

    Returns:
        A tuple containing the final results DataFrame and the series of monthly surpluses.
    """
    monthly_df = create_monthly_data_grid(
        total_vesting_years,
        current_job_monthly_salary,
        startup_monthly_salary,
        current_job_salary_growth_rate,
    )
    results_df = calculate_annual_opportunity_cost(
        monthly_df, annual_roi, investment_frequency
    )
    results_df = calculate_annual_breakeven(
        results_df, equity_pct, cliff_years, total_vesting_years
    )
    final_cols = [
        "Principal Forgone",
        "Investment Returns",
        "Opportunity Cost (Invested Surplus)",
        "Vested Equity (%)",
        "Breakeven Valuation (SAR)",
    ]
    return results_df[final_cols], monthly_df["MonthlySurplus"]


# =============================================================================
# --- STREAMLIT UI ---
# =============================================================================

st.sidebar.title("⚖️ Configuration")
st.sidebar.header("Salary Details (Monthly SAR)")
current_salary = st.sidebar.number_input(
    "Current Job Monthly Salary", min_value=0, value=30000, step=1000
)
startup_salary = st.sidebar.number_input(
    "Startup Opportunity Monthly Salary", min_value=0, value=15000, step=1000
)
current_job_salary_growth_rate = (
    st.sidebar.slider(
        "Current Job Annual Salary Growth Rate (%)",
        0.0,
        10.0,
        4.0,
        0.1,
        help="Assumed annual percentage increase in your current job's salary.",
    )
    / 100
)

st.sidebar.header("Investment & Equity")
investment_frequency = st.sidebar.radio(
    "Surplus Investment Frequency",
    ["Monthly", "Annually"],
    help="Choose whether you would invest the salary surplus every month or as a lump sum at the end of each year.",
)
annual_roi = (
    st.sidebar.slider(
        "Assumed Annual ROI on Investments (%)",
        0.0,
        20.0,
        8.0,
        0.5,
        help="This is also used as the discount rate for the NPV calculation.",
    )
    / 100
)
equity_pct = st.sidebar.slider("Your Total Equity (%)", 0.0, 20.0, 1.0, 0.1) / 100

st.sidebar.header("Vesting Schedule")
cliff_years = st.sidebar.slider("Cliff Period (Years)", 0, 5, 1, 1)
total_vesting_years = st.sidebar.slider("Total Vesting Period (Years)", 1, 10, 4, 1)

st.title("Startup Offer vs. Current Job: Financial Comparison")
st.markdown(
    """
This tool helps analyze the financial trade-offs between staying at a stable job and accepting a startup offer with equity.
- **Opportunity Cost**: The future value of the salary surplus you give up, assuming it was invested elsewhere.
- **Breakeven Valuation**: The startup valuation needed for your vested equity to equal your opportunity cost.
- **Net Present Value (NPV)**: The value of all cash flows (forgone salary vs. equity payout) in today's money. A positive NPV is favorable.
- **Internal Rate of Return (IRR)**: The annualized rate of return on your "investment" (the forgone salary).
"""
)
st.markdown("---")

if (
    current_salary * (1 + current_job_salary_growth_rate) ** total_vesting_years
) <= startup_salary:
    st.warning(
        "Startup salary is consistently higher than the projected salary for your current job. There is no investment opportunity cost to analyze."
    )
else:
    results_df, monthly_surpluses = analyze_job_offer(
        current_salary,
        startup_salary,
        current_job_salary_growth_rate,
        annual_roi,
        equity_pct,
        cliff_years,
        total_vesting_years,
        investment_frequency,
    )

    if not results_df.empty:
        results_df_display = results_df.reset_index()

        st.subheader("Breakeven Analysis by Year")
        display_df = results_df_display.copy()
        for col in [
            "Principal Forgone",
            "Investment Returns",
            "Opportunity Cost (Invested Surplus)",
        ]:
            display_df[col] = display_df[col].map("{:,.0f} SAR".format)
        display_df["Vested Equity (%)"] = display_df["Vested Equity (%)"].map(
            "{:.1f}%".format
        )
        display_df["Breakeven Valuation (SAR)"] = display_df[
            "Breakeven Valuation (SAR)"
        ].apply(lambda x: f"{x:,.0f} SAR" if x != float("inf") else "N/A (in cliff)")
        st.dataframe(
            display_df.drop(columns=["Investment Returns"]), use_container_width=True
        )

        st.subheader("📈 Visualizations")
        col1, col2 = st.columns(2)
        with col1:
            fig1 = px.bar(
                results_df_display,
                x="Year",
                y=["Principal Forgone", "Investment Returns"],
                title="<b>Opportunity Cost Breakdown</b>",
                labels={"value": "Amount (SAR)", "variable": "Component"},
                barmode="stack",
            )
            fig1.update_layout(
                xaxis=dict(tickmode="linear"),
                yaxis_tickformat=",.0f",
                legend_title_text="",
            )
            st.plotly_chart(fig1, use_container_width=True)
        with col2:
            breakeven_data = results_df_display[
                results_df_display["Breakeven Valuation (SAR)"] != float("inf")
            ].copy()
            breakeven_data["Valuation (Millions SAR)"] = (
                breakeven_data["Breakeven Valuation (SAR)"] / 1e6
            )
            fig2 = px.line(
                breakeven_data,
                x="Year",
                y="Valuation (Millions SAR)",
                title="<b>Required Breakeven Company Valuation</b>",
                labels={"Valuation (Millions SAR)": "Valuation (Millions SAR)"},
                markers=True,
            )
            fig2.update_layout(xaxis=dict(tickmode="linear"), yaxis_tickformat=",.1f")
            st.plotly_chart(fig2, use_container_width=True)

        st.markdown("---")
        st.subheader("Scenario & Return Simulation")
        st.markdown(
            "Select a hypothetical future valuation for the startup to simulate your potential financial outcome."
        )

        target_valuation = st.slider(
            "Hypothetical Future Company Valuation (SAR)",
            min_value=1_000_000,
            max_value=1_000_000_000,
            value=25_000_000,
            step=1_000_000,
            format="%d SAR",
        )

        final_vested_equity_pct = results_df["Vested Equity (%)"].iloc[-1] / 100
        final_equity_value = target_valuation * final_vested_equity_pct
        final_opportunity_cost = results_df["Opportunity Cost (Invested Surplus)"].iloc[
            -1
        ]
        net_outcome = final_equity_value - final_opportunity_cost

        irr_value = calculate_irr(monthly_surpluses, final_equity_value)
        npv_value = calculate_npv(monthly_surpluses, annual_roi, final_equity_value)

        st.markdown(
            f"#### Outcome at End of Year {total_vesting_years} (at {target_valuation:,.0f} SAR Valuation)"
        )
        # --- CORRECTED: Using 5 columns to display all metrics ---
        col1, col2, col3, col4, col5 = st.columns(5)
        col1.metric("Your Equity Value", f"{final_equity_value:,.0f} SAR")
        col2.metric("Opportunity Cost", f"{final_opportunity_cost:,.0f} SAR")
        col3.metric(
            "Net Outcome (Future)",
            f"{net_outcome:,.0f} SAR",
            delta=f"{net_outcome:,.0f} SAR",
        )
        col4.metric(
            "Net Present Value (NPV)",
            f"{npv_value:,.0f} SAR",
            help="The net gain/loss in today's money. Positive is good.",
        )
        col5.metric(
            "Annualized IRR", f"{irr_value:.2f}%" if pd.notna(irr_value) else "N/A"
        )

        sim_df = results_df_display.copy()
        sim_df["Equity Value at Target"] = (
            sim_df["Vested Equity (%)"] / 100
        ) * target_valuation
        sim_df_melted = sim_df.melt(
            id_vars=["Year"],
            value_vars=[
                "Opportunity Cost (Invested Surplus)",
                "Equity Value at Target",
            ],
            var_name="Category",
            value_name="Value (SAR)",
        )
        fig3 = px.bar(
            sim_df_melted,
            x="Year",
            y="Value (SAR)",
            color="Category",
            barmode="group",
            title=f"<b>Opportunity Cost vs. Equity Value (at {target_valuation:,.0f} SAR Valuation)</b>",
            color_discrete_map={
                "Opportunity Cost (Invested Surplus)": "#FFC425",
                "Equity Value at Target": "#34A853",
            },
        )
        st.plotly_chart(fig3, use_container_width=True)

    else:
        st.info("Please adjust the sidebar inputs to perform a comparison.")

st.markdown("---")
