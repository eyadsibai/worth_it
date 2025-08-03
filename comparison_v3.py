"""
Streamlit app for comparing a startup job offer against your current job.
"""

from enum import Enum

import numpy as np
import pandas as pd
import plotly.express as px  # type: ignore
import streamlit as st

from calculations import (
    calculate_annual_opportunity_cost,
    calculate_irr,
    calculate_npv,
    create_monthly_data_grid,
)

st.set_page_config(
    layout="wide", page_title="Job Offer Financial Comparison", page_icon="⚖️"
)


class CompensationType(str, Enum):
    """Enum for different types of compensation."""

    RSU = "Equity (RSUs)"
    STOCK_OPTIONS = "Stock Options"


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
    "Monthly Salary (SAR)", min_value=0, value=30_000, step=1000, key="current_salary"
)
current_job_salary_growth_rate = (
    st.sidebar.slider(
        label="Annual Salary Growth Rate (%)",
        min_value=0.0,
        max_value=10.0,
        value=3.0,
        step=0.5,
        help="Assumed annual percentage increase in your current job's salary.",
    )
    / 100
)

st.sidebar.markdown("##### Surplus Investment Assumptions")
annual_roi = (
    st.sidebar.slider(
        label="Assumed Annual ROI (%)",
        min_value=0.0,
        max_value=20.0,
        value=5.4,
        step=0.1,
        help="The return you'd get by investing the salary surplus. This is also the"
        " discount rate for NPV.",
    )
    / 100
)
investment_frequency = st.sidebar.radio(
    label="Investment Frequency",
    options=["Monthly", "Annually"],
    help="How often you would invest the salary surplus.",
)

st.sidebar.divider()

st.sidebar.header("Startup Opportunity")
startup_salary = st.sidebar.number_input(
    label="Monthly Salary (SAR)",
    min_value=0,
    value=20_000,
    step=1000,
    key="startup_salary",
)

comp_type = st.sidebar.radio(
    label="Compensation Type",
    options=[e.value for e in CompensationType],
    help="RSUs are grants of shares. Stock Options are the right to buy shares at a"
    " fixed price.",
)

if comp_type == CompensationType.RSU:
    equity_pct = st.sidebar.slider("Total Equity Grant (%)", 0.5, 25.0, 5.0, 0.1) / 100
    st.sidebar.markdown("##### Exit Scenario")
    valuation_in_millions = st.sidebar.slider(
        label="Hypothetical Future Valuation (Millions SAR)",
        min_value=1,
        max_value=1000,
        value=25,
        step=1,
        format="%dM SAR",
        help="Your best guess for the startup's total valuation at the end of your"
        " vesting period.",
    )
    target_exit_value: float = valuation_in_millions * 1_000_000

    # --- Dilution Inputs ---
    st.sidebar.markdown("---")
    st.sidebar.header("Future Fundraising & Dilution")
    simulate_dilution = st.sidebar.checkbox("Simulate Future Dilution", value=True)
    dilution_rounds = []
    if simulate_dilution:
        st.sidebar.info(
            "Model the dilutive effect of future funding rounds on your equity."
        )
        dilution_method = st.sidebar.radio(
            "Dilution Calculation Method",
            ("By Percentage", "By Valuation"),
            help="Choose how to model dilution: either by a direct percentage or based on fundraising valuations.",
        )

        series_names = ["Series A", "Series B", "Series C", "Series D"]
        for i, series_name in enumerate(series_names):
            with st.sidebar.expander(f"{series_name} Round Details"):
                round_enabled = st.checkbox(
                    f"Enable {series_name} Round",
                    value=i == 0,
                    key=f"enable_{series_name}",
                )
                if round_enabled:
                    round_year = st.number_input(
                        f"Year of {series_name}",
                        min_value=1,
                        max_value=10,
                        value=i + 2,
                        step=1,
                        key=f"year_{series_name}",
                    )
                    round_dilution = 0.0

                    if dilution_method == "By Percentage":
                        round_dilution = (
                            st.slider(
                                f"{series_name} Dilution (%)",
                                min_value=0.0,
                                max_value=50.0,
                                value=20.0,
                                step=0.5,
                                key=f"dilution_{series_name}",
                            )
                            / 100
                        )
                    else:  # By Valuation
                        pre_money_M = st.number_input(
                            "Pre-Money Valuation (M SAR)",
                            min_value=0.0,
                            value=float(10 * (i + 1)),
                            step=1.0,
                            key=f"premoney_{series_name}",
                            help="The startup's valuation *before* this investment.",
                        )
                        raised_M = st.number_input(
                            "Amount Raised (M SAR)",
                            min_value=0.0,
                            value=float(5 * (i + 1)),
                            step=1.0,
                            key=f"raised_{series_name}",
                            help="The amount of new capital invested in this round.",
                        )

                        pre_money_val = pre_money_M * 1_000_000
                        amount_raised = raised_M * 1_000_000
                        post_money_val = pre_money_val + amount_raised

                        if post_money_val > 0:
                            round_dilution = amount_raised / post_money_val
                        st.metric(
                            f"{series_name} Implied Dilution", f"{round_dilution:.2%}"
                        )

                    dilution_rounds.append(
                        {"year": round_year, "dilution": round_dilution}
                    )


else:  # Stock Options
    num_options = st.sidebar.number_input(
        label="Number of Stock Options", min_value=0, value=20000, step=1000
    )
    strike_price = st.sidebar.number_input(
        label="Strike Price (SAR per share)",
        min_value=0.00,
        value=1.50,
        step=0.25,
        format="%.2f",
    )
    st.sidebar.markdown("##### Exit Scenario")
    target_exit_value = st.sidebar.number_input(
        label="Hypothetical Price per Share at Exit (SAR)",
        min_value=0.00,
        value=10.00,
        step=0.50,
        format="%.2f",
    )

total_vesting_years = st.sidebar.slider(
    label="Total Vesting Period (Years)", min_value=1, max_value=10, value=5, step=1
)
cliff_years = st.sidebar.slider(
    label="Vesting Cliff Period (Years)",
    min_value=0,
    max_value=5,
    value=1,
    step=1,
    help="The initial period before any compensation vests. For a standard 1-year cliff"
    ", set this to 1. At the 1-year mark, the first year's worth of compensation becomes"
    " vested. Set to 0 for no cliff.",
)

st.title("Startup Offer vs. Current Job: Financial Comparison")

with st.expander("👋 New to this tool? Click here for a guide!"):
    st.markdown(
        """
        This tool helps you compare a startup job offer against your current job by quantifying the financial trade-offs. Here’s how to use it:

        #### **Step 1: Configure Your Scenarios**
        Use the **sidebar on the left** to input all the details of your situation.
        - **Current Job**: Enter your current monthly salary and its expected annual growth rate.
        - **Startup Opportunity**: Enter the new salary and details about your compensation. Choose between:
            - **Equity (RSUs)**: You are granted a percentage of the company. You can also model the impact of future dilution from fundraising.
            - **Stock Options**: You get the right to buy a number of shares at a fixed "strike price".
        - **Future Fundraising & Dilution**: If you have RSUs, you can model the impact of future funding rounds. Choose your calculation method:
            - **By Percentage**: Enter the dilution percentage directly.
            - **By Valuation**: Enter the pre-money valuation and amount raised to have dilution calculated automatically.
        - **Exit Scenario**: This is your best guess about the startup's success. For RSUs, estimate the company's future **Valuation**. For Options, estimate the future **Price per Share**.

        #### **Step 2: Analyze the Key Outcomes**
        The tool calculates five key metrics to help your decision:
        1.  **Your Payout Value**: The estimated cash value of your RSUs or Options at the hypothetical exit. For RSUs, this now accounts for potential dilution.
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

if is_startup_salary_higher and comp_type == CompensationType.RSU:
    st.balloons()
    st.success("Congratulations! 🎉 The startup salary is higher and you get equity.")
    st.info(
        "Since you aren't sacrificing any salary, there's no financial opportunity cost"
        " to analyze. The decision is a clear financial win."
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
    results_df = results_df.rename(columns={"Principal Change": principal_col_label})

    if comp_type == CompensationType.RSU:
        # Dilution Calculation
        total_dilution = 0
        diluted_equity_pct = equity_pct
        if simulate_dilution and dilution_rounds:
            dilution_rounds.sort(key=lambda r: r["year"])
            cumulative_dilution_factor = 1.0
            for r in dilution_rounds:
                if r["year"] <= total_vesting_years:
                    cumulative_dilution_factor *= 1 - r["dilution"]
            diluted_equity_pct = equity_pct * cumulative_dilution_factor
            total_dilution = 1 - cumulative_dilution_factor

        results_df["Vested Comp (%)"] = np.where(
            results_df.index >= cliff_years,
            (diluted_equity_pct * (results_df.index / total_vesting_years) * 100),
            0,
        )
        final_vested_comp_pct = results_df["Vested Comp (%)"].iloc[-1] / 100
        final_payout_value = target_exit_value * final_vested_comp_pct

        breakeven_vesting_pct = np.where(
            results_df.index >= cliff_years,
            (equity_pct * (results_df.index / total_vesting_years)),
            0,
        )

        results_df["Breakeven Value"] = (
            results_df["Opportunity Cost (Invested Surplus)"]
            .divide(breakeven_vesting_pct)
            .fillna(np.inf)
        )
        breakeven_label = "Breakeven Valuation (SAR)"
        payout_label = "Your Equity Value (Post-Dilution)"

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
        if comp_type == CompensationType.RSU
        else f"{format_currency_compact(target_exit_value)}/Share"
    )
    st.subheader(
        f"Outcome at End of Year {total_vesting_years} (at {exit_scenario_text})"
    )

    if comp_type == CompensationType.RSU and simulate_dilution:
        dilution_col1, dilution_col2, dilution_col3 = st.columns(3)
        dilution_col1.metric("Initial Equity Grant", f"{equity_pct:.2%}")
        dilution_col2.metric("Total Dilution", f"{total_dilution:.2%}")
        dilution_col3.metric(
            "Final Diluted Equity",
            f"{diluted_equity_pct:.2%}",
            delta=f"{-total_dilution:.2%}",
        )

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric(
        payout_label,
        format_currency_compact(final_payout_value),
        help=f"The estimated cash value of your vested {comp_type} at the hypothetical"
        f" exit scenario, accounting for any simulated dilution.",
    )
    col2.metric(
        "Opportunity Cost",
        format_currency_compact(final_opportunity_cost),
        help="The estimated future value of the salary surplus you gave up, assuming it"
        " was invested. This is the financial benchmark the startup offer needs to beat.",
    )
    col3.metric(
        "Net Outcome (Future)",
        format_currency_compact(net_outcome),
        delta=f"{net_outcome:,.0f} SAR",
        help="The simple difference between your final payout and the opportunity cost"
        " (in future money).",
    )
    col4.metric(
        "Net Present Value (NPV)",
        format_currency_compact(npv_value),
        help="The total value of the offer in today's money, discounted by your assumed"
        " ROI. A positive NPV means the offer is financially favorable.",
    )
    col5.metric(
        "Annualized IRR",
        f"{irr_value:.2f}%" if pd.notna(irr_value) else "N/A",
        help="The effective annual rate of return on your sacrificed salary."
        " Compare this to your assumed ROI.",
    )

    with st.expander("Show Detailed Yearly Breakdown & Charts"):
        display_df = results_df.copy()
        display_df[principal_col_label] = display_df[principal_col_label].map(
            format_currency_compact
        )
        display_df["Opportunity Cost (Invested Surplus)"] = display_df[
            "Opportunity Cost (Invested Surplus)"
        ].map(format_currency_compact)

        vested_comp_label = (
            "Vested Equity (Post-Dilution)"
            if comp_type == CompensationType.RSU
            else "Vested Options (%)"
        )
        display_df[vested_comp_label] = results_df["Vested Comp (%)"].map(
            lambda x: f"{x:.2f}%"
        )

        display_df[breakeven_label] = display_df["Breakeven Value"].map(
            lambda x: (
                format_currency_compact(x, add_sar=comp_type == CompensationType.RSU)
                if x != float("inf")
                else "N/A (in cliff)"
            )
        )
        st.dataframe(
            display_df[
                [
                    principal_col_label,
                    "Opportunity Cost (Invested Surplus)",
                    vested_comp_label,
                    breakeven_label,
                ]
            ].rename(columns={vested_comp_label: "Vested Comp"}),
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
                if comp_type == CompensationType.RSU:
                    y_axis_label = "Valuation (Millions SAR)"
                    y_values = breakeven_data["Breakeven Value"] / 1e6
                else:
                    y_axis_label = "Price per Share (SAR)"
                    y_values = breakeven_data["Breakeven Value"]

                fig2 = px.line(
                    breakeven_data,
                    x="Year",
                    y=y_values,
                    title=f"<b>Required {breakeven_label.split('(', maxsplit=1)[0]} to Break Even</b>",
                    labels={"y": y_axis_label},
                    markers=True,
                )
                st.plotly_chart(fig2, use_container_width=True)

st.divider()
st.caption(
    "Disclaimer: This tool is for informational purposes only and does not constitute"
    " financial advice. Results are based on the assumptions provided."
)
st.markdown("---")
st.caption("Made with ❤️ by Eyad Sibai (https://linkedin.com/in/eyadsibai)")
