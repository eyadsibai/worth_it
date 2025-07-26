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
    """
    monthly_roi = annual_to_monthly_roi(annual_roi)
    if monthly_roi is None or pd.isna(monthly_roi):
        return np.nan

    cash_flows = -monthly_surpluses.copy()
    cash_flows.iloc[-1] += final_equity_value

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


# --- UI Helper Functions ---
def format_currency_compact(num: float) -> str:
    """Formats a currency value into a compact SAR string with K/M abbreviations."""
    if pd.isna(num):
        return "N/A"

    sign = ""
    if num < 0:
        sign = "-"
        num = abs(num)

    if num < 1_000:
        return f"{sign}{num:,.0f} SAR"
    elif num < 1_000_000:
        return f"{sign}{num / 1_000:.1f}K SAR"
    else:
        return f"{sign}{num / 1_000_000:.2f}M SAR"


# --- Sidebar Inputs ---
st.sidebar.title("⚖️ Configuration")

st.sidebar.header("Current Job")
current_salary = st.sidebar.number_input(
    "Monthly Salary (SAR)", min_value=0, value=30000, step=1000, key="current_salary"
)
current_job_salary_growth_rate = (
    st.sidebar.slider(
        "Annual Salary Growth Rate (%)",
        0.0,
        10.0,
        4.0,
        0.1,
        help="Assumed annual percentage increase in your current job's salary.",
    )
    / 100
)

st.sidebar.markdown("##### Surplus Investment Assumptions")
annual_roi = (
    st.sidebar.slider(
        "Assumed Annual ROI (%)",
        0.0,
        20.0,
        8.0,
        0.5,
        help="The return you'd get by investing the salary surplus. This is also the discount rate for NPV.",
    )
    / 100
)
investment_frequency = st.sidebar.radio(
    "Investment Frequency",
    ["Monthly", "Annually"],
    help="How often you would invest the salary surplus.",
)


st.sidebar.header("Startup Opportunity")
startup_salary = st.sidebar.number_input(
    "Monthly Salary (SAR)", min_value=0, value=15000, step=1000, key="startup_salary"
)
equity_pct = st.sidebar.slider("Total Equity Grant (%)", 0.5, 25.0, 1.0, 0.1) / 100
total_vesting_years = st.sidebar.slider("Total Vesting Period (Years)", 1, 10, 4, 1)
cliff_years = st.sidebar.slider("Vesting Cliff Period (Years)", 0, 5, 1, 1)


# --- Main Page Display ---
st.title("Startup Offer vs. Current Job: Financial Comparison")

# Check if startup salary is always higher, making calculations unnecessary
is_startup_salary_higher = (
    startup_salary
    - (current_salary * (1 + current_job_salary_growth_rate) ** total_vesting_years)
) > 1e-9

if is_startup_salary_higher:
    st.balloons()
    st.success(
        "Congratulations! 🎉 The startup salary is higher than your projected current salary."
    )
    st.info(
        "Since you aren't sacrificing any salary, there's no financial opportunity cost to analyze. The decision is a clear financial win."
    )

else:
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

        # --- UPDATED: Apply compact formatting to the table ---
        for col in ["Principal Forgone", "Opportunity Cost (Invested Surplus)"]:
            display_df[col] = display_df[col].apply(format_currency_compact)

        display_df["Vested Equity (%)"] = display_df["Vested Equity (%)"].map(
            "{:.1f}%".format
        )

        display_df["Breakeven Valuation (SAR)"] = display_df[
            "Breakeven Valuation (SAR)"
        ].apply(
            lambda x: (
                format_currency_compact(x) if x != float("inf") else "N/A (in cliff)"
            )
        )

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

        valuation_in_millions = st.slider(
            "Hypothetical Future Company Valuation (Millions SAR)",
            min_value=1,
            max_value=1000,
            value=25,
            step=1,
            format="%dM SAR",
        )
        target_valuation = valuation_in_millions * 1_000_000

        # --- Calculations for Metrics ---
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

        col1, col2, col3, col4, col5 = st.columns(5)
        col1.metric("Your Equity Value", format_currency_compact(final_equity_value))
        col2.metric("Opportunity Cost", format_currency_compact(final_opportunity_cost))
        col3.metric(
            "Net Outcome (Future)",
            format_currency_compact(net_outcome),
            delta=f"{net_outcome:,.0f} SAR",
        )
        col4.metric(
            "Net Present Value (NPV)",
            format_currency_compact(npv_value),
            help="The net gain/loss in today's money. Positive is good.",
        )
        col5.metric(
            "Annualized IRR", f"{irr_value:.2f}%" if pd.notna(irr_value) else "N/A"
        )

        # --- Final Chart ---
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
st.markdown("Made with ❤️ by Eyad Sibai (https://linkedin.com/in/eyadsibai)")
