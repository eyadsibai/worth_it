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
cliff_years = st.sidebar.slider(
    "Vesting Cliff Period (Years)",
    0,
    5,
    1,
    1,
    help="The initial period before any compensation vests. For a standard 1-year cliff, set this to 1. At the 1-year mark, the first year's worth of compensation becomes vested. Set to 0 for no cliff.",
)


# --- Main Page Display ---
st.title("Startup Offer vs. Current Job: Financial Comparison")

with st.expander("👋 New to this tool? Click here for a guide!"):
    st.markdown(
        """
        This tool helps you compare a startup job offer against your current job by quantifying the financial trade-offs. Here’s how to use it:

        #### **Step 1: Configure Your Scenarios**
        Use the **sidebar on the left** to input all the details of your situation.
        - **Current Job**: Enter your current monthly salary and its expected annual growth rate.
        - **Startup Opportunity**: Enter the new salary and details about your compensation. Choose between:
            - **Equity (RSUs)**: You are granted a percentage of the company.
            - **Stock Options**: You get the right to buy a number of shares at a fixed "strike price".
        - **Exit Scenario**: This is your best guess about the startup's success. For RSUs, estimate the company's future **Valuation**. For Options, estimate the future **Price per Share**.

        #### **Step 2: Analyze the Key Outcomes**
        The tool calculates five key metrics to help your decision:
        1.  **Your Payout Value**: The estimated cash value of your RSUs or Options at the hypothetical exit.
        2.  **Opportunity Cost**: The money you *could have earned* by staying at your current job and investing the salary difference. This is the benchmark your startup payout needs to beat.
        3.  **Net Outcome**: The simple difference between your Payout and the Opportunity Cost. Positive is good!
        4.  **Net Present Value (NPV)**: A core financial metric that calculates the total value of the startup offer in **today's money**. A positive NPV means the offer is financially favorable compared to your assumed investment ROI.
        5.  **Annualized IRR**: The effective annual rate of return on your "investment" (the salary you gave up). A higher IRR is better.

        #### **Step 3: Explore the Details**
        Below the key outcomes, you can see a yearly breakdown of the numbers and charts that visualize the comparison over time.
    """
    )

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
    st.divider()

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

    total_surplus = monthly_df["MonthlySurplus"].sum()
    principal_col_label = "Principal Forgone" if total_surplus >= 0 else "Salary Gain"
    results_df.rename(columns={"Principal Change": principal_col_label}, inplace=True)

    # --- CLIFF CALCULATION BUG FIX: Changed > to >= ---
    if comp_type == "Equity (RSUs)":
        results_df["Vested Comp (%)"] = np.where(
            results_df.index >= cliff_years,
            (equity_pct * (results_df.index / total_vesting_years) * 100),
            0,
        )
        final_vested_comp_pct = results_df["Vested Comp (%)"].iloc[-1] / 100
        final_payout_value = target_exit_value * final_vested_comp_pct
        results_df["Breakeven Value"] = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(results_df["Vested Comp (%)"] / 100)
            .fillna(np.inf)
        )
        breakeven_label = "Breakeven Valuation (SAR)"
        payout_label = "Your Equity Value"
    else:  # Stock Options
        results_df["Vested Comp (%)"] = np.where(
            results_df.index >= cliff_years,
            ((results_df.index / total_vesting_years) * 100),
            0,
        )
        vested_options_series = (results_df["Vested Comp (%)"] / 100) * num_options
        final_vested_options = vested_options_series.iloc[-1]
        final_payout_value = (
            max(0, target_exit_value - strike_price) * final_vested_options
        )
        results_df["Breakeven Value"] = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(vested_options_series)
            .fillna(np.inf)
        ) + strike_price
        breakeven_label = "Breakeven Price/Share (SAR)"
        payout_label = "Your Options Value"

    final_opportunity_cost = results_df["Opportunity Cost (Invested Surplus)"].iloc[-1]
    net_outcome = final_payout_value - final_opportunity_cost
    irr_value = calculate_irr(monthly_df["MonthlySurplus"], final_payout_value)
    npv_value = calculate_npv(
        monthly_df["MonthlySurplus"], annual_roi, final_payout_value
    )

    exit_scenario_text = (
        f"{format_currency_compact(target_exit_value)} Valuation"
        if comp_type == "Equity (RSUs)"
        else f"{format_currency_compact(target_exit_value)}/Share"
    )
    st.subheader(
        f"Outcome at End of Year {total_vesting_years} (at {exit_scenario_text})"
    )

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric(
        payout_label,
        format_currency_compact(final_payout_value),
        help=f"The estimated cash value of your vested {comp_type} at the hypothetical exit scenario.",
    )
    col2.metric(
        "Opportunity Cost",
        format_currency_compact(final_opportunity_cost),
        help="The estimated future value of the salary surplus you gave up, assuming it was invested. This is the financial benchmark the startup offer needs to beat.",
    )
    col3.metric(
        "Net Outcome (Future)",
        format_currency_compact(net_outcome),
        delta=f"{net_outcome:,.0f} SAR",
        help="The simple difference between your final payout and the opportunity cost (in future money).",
    )
    col4.metric(
        "Net Present Value (NPV)",
        format_currency_compact(npv_value),
        help="The total value of the offer in today's money, discounted by your assumed ROI. A positive NPV means the offer is financially favorable.",
    )
    col5.metric(
        "Annualized IRR",
        f"{irr_value:.2f}%" if pd.notna(irr_value) else "N/A",
        help="The effective annual rate of return on your sacrificed salary. Compare this to your assumed ROI.",
    )

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
st.caption("Made with ❤️ by Eyad Sibai (https://linkedin.com/in/eyadsibai)")
