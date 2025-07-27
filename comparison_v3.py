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
# --- CALCULATION ENGINE (REMAINS LARGELY THE SAME) ---
# The core engine for calculating salary surplus and opportunity cost doesn't change.
# Breakeven calculations will be handled in the UI based on compensation type.
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
    # This value can be negative if startup pays more. We'll handle the label in the UI.
    results_df["Principal Change"] = annual_surplus.cumsum()

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
    results_df["Investment Returns"] = results_df[
        "Opportunity Cost (Invested Surplus)"
    ] - results_df["Principal Change"].clip(lower=0)

    return results_df


def calculate_irr(monthly_surpluses: pd.Series, final_payout_value: float) -> float:
    """
    Calculates the annualized Internal Rate of Return (IRR) based on monthly cash flows.
    """
    cash_flows = -monthly_surpluses.copy()
    cash_flows.iloc[-1] += final_payout_value

    if cash_flows.iloc[-1] <= 0 or -cash_flows.iloc[:-1].sum() <= 0:
        return np.nan

    monthly_irr = npf.irr(cash_flows)
    if pd.isna(monthly_irr):
        return np.nan

    return ((1 + monthly_irr) ** 12 - 1) * 100


def calculate_npv(
    monthly_surpluses: pd.Series, annual_roi: float, final_payout_value: float
) -> float:
    """
    Calculates the Net Present Value of the investment.
    """
    monthly_roi = annual_to_monthly_roi(annual_roi)
    if monthly_roi is None or pd.isna(monthly_roi):
        return np.nan

    cash_flows = -monthly_surpluses.copy()
    cash_flows.iloc[-1] += final_payout_value

    return npf.npv(monthly_roi, cash_flows)


# =============================================================================
# --- STREAMLIT UI ---
# =============================================================================


# --- UI Helper Functions ---
def format_currency_compact(num: float, add_sar=True) -> str:
    """Formats a currency value into a compact string with K/M abbreviations."""
    if pd.isna(num):
        return "N/A"
    sign = "-" if num < 0 else ""
    num = abs(num)
    unit = " SAR" if add_sar else ""

    if num < 1_000:
        return f"{sign}{num:,.0f}{unit}"
    if num < 1_000_000:
        return f"{sign}{num / 1_000:.1f}K{unit}"
    return f"{sign}{num / 1_000_000:.2f}M{unit}"


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

st.sidebar.divider()

st.sidebar.header("Startup Opportunity")
startup_salary = st.sidebar.number_input(
    "Monthly Salary (SAR)", min_value=0, value=15000, step=1000, key="startup_salary"
)

comp_type = st.sidebar.radio(
    "Compensation Type",
    ["Equity (RSUs)", "Stock Options"],
    help="RSUs are grants of shares. Stock Options are the right to buy shares at a fixed price.",
)

# --- Dynamic Inputs Based on Compensation Type ---
if comp_type == "Equity (RSUs)":
    equity_pct = st.sidebar.slider("Total Equity Grant (%)", 0.5, 25.0, 1.0, 0.1) / 100
    st.sidebar.markdown("##### Exit Scenario")
    valuation_in_millions = st.sidebar.slider(
        "Hypothetical Future Valuation (Millions SAR)",
        min_value=1,
        max_value=1000,
        value=25,
        step=1,
        format="%dM SAR",
        help="Your best guess for the startup's total valuation at the end of your vesting period.",
    )
    target_exit_value = valuation_in_millions * 1_000_000
else:  # Stock Options
    num_options = st.sidebar.number_input(
        "Number of Stock Options", min_value=0, value=20000, step=1000
    )
    strike_price = st.sidebar.number_input(
        "Strike Price (SAR per share)",
        min_value=0.00,
        value=1.50,
        step=0.25,
        format="%.2f",
    )
    st.sidebar.markdown("##### Exit Scenario")
    target_exit_value = st.sidebar.number_input(
        "Hypothetical Price per Share at Exit (SAR)",
        min_value=0.00,
        value=10.00,
        step=0.50,
        format="%.2f",
    )

total_vesting_years = st.sidebar.slider("Total Vesting Period (Years)", 1, 10, 4, 1)
cliff_years = st.sidebar.slider("Vesting Cliff Period (Years)", 0, 5, 1, 1)


# --- Main Page Display ---
st.title("Startup Offer vs. Current Job: Financial Comparison")

is_startup_salary_higher = (
    startup_salary
    - (current_salary * (1 + current_job_salary_growth_rate) ** total_vesting_years)
) > 1e-9

if is_startup_salary_higher and comp_type == "Equity (RSUs)":
    st.balloons()
    st.success("Congratulations! 🎉 The startup salary is higher and you get equity.")
    st.info(
        "Since you aren't sacrificing any salary, there's no financial opportunity cost to analyze. The decision is a clear financial win."
    )
else:
    st.markdown(
        """
    This tool helps analyze the financial trade-offs between staying at a stable job and accepting a startup offer.
    All inputs can be configured in the sidebar. The results below will update automatically.
    """
    )
    st.divider()

    # --- Run Core Analysis ---
    monthly_df = create_monthly_data_grid(
        total_vesting_years,
        current_salary,
        startup_salary,
        current_job_salary_growth_rate,
    )
    results_df = calculate_annual_opportunity_cost(
        monthly_df, annual_roi, investment_frequency
    )
    results_df["Year"] = results_df.index

    # --- BUG FIX & DYNAMIC LABELS ---
    total_surplus = monthly_df["MonthlySurplus"].sum()
    principal_col_label = "Principal Forgone" if total_surplus >= 0 else "Salary Gain"
    results_df.rename(columns={"Principal Change": principal_col_label}, inplace=True)

    # --- Handle Compensation-Specific Logic ---
    if comp_type == "Equity (RSUs)":
        results_df["Vested Comp (%)"] = np.where(
            results_df.index > cliff_years,
            (equity_pct * (results_df.index / total_vesting_years) * 100),
            0,
        )
        final_vested_comp_pct = results_df["Vested Comp (%)"].iloc[-1] / 100
        final_payout_value = target_exit_value * final_vested_comp_pct

        # Breakeven Valuation
        results_df["Breakeven Value"] = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(results_df["Vested Comp (%)"] / 100)
            .fillna(np.inf)
        )
        breakeven_label = "Breakeven Valuation (SAR)"
        payout_label = "Your Equity Value"
    else:  # Stock Options
        results_df["Vested Comp (%)"] = np.where(
            results_df.index > cliff_years,
            ((results_df.index / total_vesting_years) * 100),
            0,
        )
        vested_options_series = (results_df["Vested Comp (%)"] / 100) * num_options
        final_vested_options = vested_options_series.iloc[-1]
        final_payout_value = (
            max(0, target_exit_value - strike_price) * final_vested_options
        )

        # Breakeven Price per Share
        results_df["Breakeven Value"] = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(vested_options_series)
            .fillna(np.inf)
        ) + strike_price
        breakeven_label = "Breakeven Price/Share (SAR)"
        payout_label = "Your Options Value"

    # --- Calculate Final Metrics ---
    final_opportunity_cost = results_df["Opportunity Cost (Invested Surplus)"].iloc[-1]
    net_outcome = final_payout_value - final_opportunity_cost
    irr_value = calculate_irr(monthly_df["MonthlySurplus"], final_payout_value)
    npv_value = calculate_npv(
        monthly_df["MonthlySurplus"], annual_roi, final_payout_value
    )

    # --- Display Key Metrics ---
    exit_scenario_text = (
        f"{format_currency_compact(target_exit_value)} Valuation"
        if comp_type == "Equity (RSUs)"
        else f"{format_currency_compact(target_exit_value)}/Share"
    )
    st.subheader(
        f"Outcome at End of Year {total_vesting_years} (at {exit_scenario_text})"
    )
    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric(payout_label, format_currency_compact(final_payout_value))
    col2.metric("Opportunity Cost", format_currency_compact(final_opportunity_cost))
    col3.metric(
        "Net Outcome (Future)",
        format_currency_compact(net_outcome),
        delta=f"{net_outcome:,.0f} SAR",
    )
    col4.metric(
        "Net Present Value (NPV)",
        format_currency_compact(npv_value),
        help="The total value of the offer in today's money. Positive is favorable.",
    )
    col5.metric(
        "Annualized IRR",
        f"{irr_value:.2f}%" if pd.notna(irr_value) else "N/A",
        help="The effective annual return rate on your sacrificed salary.",
    )

    # --- Expander for Detailed Analysis ---
    with st.expander("Show Detailed Yearly Breakdown & Charts"):
        display_df = results_df.copy()
        display_df[principal_col_label] = display_df[principal_col_label].apply(
            format_currency_compact
        )
        display_df["Opportunity Cost (Invested Surplus)"] = display_df[
            "Opportunity Cost (Invested Surplus)"
        ].apply(format_currency_compact)
        display_df["Vested Comp (%)"] = display_df["Vested Comp (%)"].map(
            "{:.1f}%".format
        )
        display_df[breakeven_label] = display_df["Breakeven Value"].apply(
            lambda x: (
                format_currency_compact(x, add_sar=(comp_type == "Equity (RSUs)"))
                if x != float("inf")
                else "N/A (in cliff)"
            )
        )
        st.dataframe(
            display_df[
                [
                    principal_col_label,
                    "Opportunity Cost (Invested Surplus)",
                    "Vested Comp (%)",
                    breakeven_label,
                ]
            ].rename(columns={"Vested Comp (%)": "Vested (%)"}),
            use_container_width=True,
        )

        # Visualizations
        c1, c2 = st.columns(2)
        with c1:
            fig1 = px.bar(
                results_df,
                x="Year",
                y=[principal_col_label, "Investment Returns"],
                title="<b>Salary Change & Investment Returns</b>",
                barmode="stack",
            )
            st.plotly_chart(fig1, use_container_width=True)
        with c2:
            breakeven_data = results_df[results_df["Breakeven Value"] != float("inf")]
            if not breakeven_data.empty:
                y_axis_label = (
                    "Valuation (Millions SAR)"
                    if comp_type == "Equity (RSUs)"
                    else "Price per Share (SAR)"
                )
                y_values = (
                    breakeven_data["Breakeven Value"] / 1e6
                    if comp_type == "Equity (RSUs)"
                    else breakeven_data["Breakeven Value"]
                )
                fig2 = px.line(
                    breakeven_data,
                    x="Year",
                    y=y_values,
                    title=f"<b>Required {breakeven_label.split('(')[0]}</b>",
                    labels={"y": y_axis_label},
                    markers=True,
                )
                st.plotly_chart(fig2, use_container_width=True)

st.divider()
st.caption(
    "Disclaimer: This tool is for informational purposes only and does not constitute financial advice. Results are based on the assumptions provided."
)
st.markdown("---")
st.markdown("Made with ❤️ by Eyad Sibai (https://linkedin.com/in/eyadsibai)")
