"""
Streamlit app for comparing a startup job offer against your current job.

This module handles the user interface and input gathering.
All financial calculations are delegated to the 'calculations' module.
"""

from enum import Enum

import pandas as pd
import plotly.express as px
import streamlit as st

import calculations

# --- Page Configuration ---
st.set_page_config(
    layout="wide", page_title="Job Offer Financial Comparison", page_icon="⚖️"
)


class CompensationType(str, Enum):
    """Enum for different types of compensation."""

    RSU = "Equity (RSUs)"
    STOCK_OPTIONS = "Stock Options"


def format_currency_compact(num: float, add_sar=True) -> str:
    """Formats a currency value into a compact string with K/M abbreviations."""
    if pd.isna(num) or num == float("inf"):
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

# --- Current Job Inputs ---
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

# --- Investment Inputs ---
st.sidebar.markdown("##### Surplus Investment Assumptions")
annual_roi = (
    st.sidebar.slider(
        label="Assumed Annual ROI (%)",
        min_value=0.0,
        max_value=20.0,
        value=5.4,
        step=0.1,
        help="The return you'd get by investing the salary surplus. This is also the discount rate for NPV.",
    )
    / 100
)
investment_frequency = st.sidebar.radio(
    label="Investment Frequency",
    options=["Monthly", "Annually"],
    help="How often you would invest the salary surplus.",
)

st.sidebar.divider()

# --- Startup Job Inputs ---
st.sidebar.header("Startup Opportunity")
startup_salary = st.sidebar.number_input(
    label="Monthly Salary (SAR)",
    min_value=0,
    value=20_000,
    step=1000,
    key="startup_salary",
)

comp_type_str = st.sidebar.radio(
    label="Compensation Type",
    options=[e.value for e in CompensationType],
    help="RSUs are grants of shares. Stock Options are the right to buy shares at a fixed price.",
)
comp_type = CompensationType(comp_type_str)


total_vesting_years = st.sidebar.slider(
    label="Total Vesting Period (Years)", min_value=1, max_value=10, value=5, step=1
)
cliff_years = st.sidebar.slider(
    label="Vesting Cliff Period (Years)",
    min_value=0,
    max_value=5,
    value=1,
    step=1,
    help="The initial period before any compensation vests. For a standard 1-year cliff, set this to 1. At the 1-year mark, the first year's worth of compensation becomes vested. Set to 0 for no cliff.",
)

# New feature: Simulation End Year
simulation_end_year = st.sidebar.slider(
    label="Simulation End Year",
    min_value=total_vesting_years,
    max_value=20,
    value=total_vesting_years,
    step=1,
    help="Simulate your financial journey up to this year.",
)


# --- Compensation-Specific Inputs ---
rsu_params = {}
options_params = {}
dilution_rounds = []

if comp_type == CompensationType.RSU:
    rsu_params["equity_pct"] = (
        st.sidebar.slider("Total Equity Grant (%)", 0.5, 25.0, 5.0, 0.1) / 100
    )
    st.sidebar.markdown("##### Exit Scenario")
    valuation_in_millions = st.sidebar.slider(
        label="Hypothetical Future Valuation (Millions SAR)",
        min_value=1,
        max_value=1000,
        value=25,
        step=1,
        format="%dM SAR",
        help="Your best guess for the startup's total valuation at the end of your vesting period.",
    )
    rsu_params["target_exit_valuation"] = valuation_in_millions * 1_000_000

    # --- Dilution Inputs ---
    st.sidebar.markdown("---")
    st.sidebar.header("Future Fundraising & Dilution")
    rsu_params["simulate_dilution"] = st.sidebar.checkbox(
        "Simulate Future Dilution", value=True
    )
    if rsu_params["simulate_dilution"]:
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
                if st.checkbox(
                    f"Enable {series_name} Round",
                    value=i == 0,
                    key=f"enable_{series_name}",
                ):
                    round_year = st.number_input(
                        f"Year of {series_name}",
                        min_value=1,
                        max_value=20,
                        value=i + 2,
                        step=1,
                        key=f"year_{series_name}",
                    )
                    if dilution_method == "By Percentage":
                        round_dilution = (
                            st.slider(
                                f"{series_name} Dilution (%)",
                                0.0,
                                50.0,
                                20.0,
                                0.5,
                                key=f"dilution_{series_name}",
                            )
                            / 100
                        )
                    else:  # By Valuation
                        pre_money_M = st.number_input(
                            "Pre-Money Valuation (M SAR)",
                            0.0,
                            float(10 * (i + 1)),
                            1.0,
                            key=f"premoney_{series_name}",
                        )
                        raised_M = st.number_input(
                            "Amount Raised (M SAR)",
                            0.0,
                            float(5 * (i + 1)),
                            1.0,
                            key=f"raised_{series_name}",
                        )
                        round_dilution = calculations.calculate_dilution_from_valuation(
                            pre_money_M * 1e6, raised_M * 1e6
                        )
                        st.metric(
                            f"{series_name} Implied Dilution", f"{round_dilution:.2%}"
                        )
                    dilution_rounds.append(
                        {"year": round_year, "dilution": round_dilution}
                    )
        rsu_params["dilution_rounds"] = dilution_rounds

else:  # Stock Options
    options_params["num_options"] = st.sidebar.number_input(
        "Number of Stock Options", 0, 20000, 1000
    )
    options_params["strike_price"] = st.sidebar.number_input(
        "Strike Price (SAR per share)", 0.00, 1.50, 0.25, "%.2f"
    )
    st.sidebar.markdown("##### Exit Scenario")
    options_params["target_exit_price_per_share"] = st.sidebar.number_input(
        "Hypothetical Price per Share at Exit (SAR)", 0.00, 10.00, 0.50, "%.2f"
    )

# --- Main App UI ---
st.title("Startup Offer vs. Current Job: Financial Comparison")

# --- Introduction Expander ---
with st.expander("👋 New to this tool? Click here for a guide!"):
    st.markdown(
        """
    This tool helps you compare a startup job offer against your current job by quantifying the financial trade-offs.
    - **Step 1: Configure Scenarios**: Use the sidebar to input details for your current job and the startup offer.
    - **Step 2: Analyze Outcomes**: Review the key metrics like Net Outcome, NPV, and IRR.
    - **Step 3: Explore Details**: Check the yearly breakdown and charts for a deeper understanding.
    """
    )

# --- Core Logic Execution ---
monthly_df = calculations.create_monthly_data_grid(
    simulation_end_year=simulation_end_year,
    current_job_monthly_salary=current_salary,
    startup_monthly_salary=startup_salary,
    current_job_salary_growth_rate=current_job_salary_growth_rate,
)

opportunity_cost_df = calculations.calculate_annual_opportunity_cost(
    monthly_df=monthly_df,
    annual_roi=annual_roi,
    investment_frequency=investment_frequency,
)

# Combine startup parameters into a single dictionary
startup_params = {
    "comp_type": comp_type,
    "total_vesting_years": total_vesting_years,
    "cliff_years": cliff_years,
    "rsu_params": rsu_params,
    "options_params": options_params,
    "simulation_end_year": simulation_end_year,
}

# Calculate the startup scenario outcomes
results = calculations.calculate_startup_scenario(opportunity_cost_df, startup_params)
results_df = results["results_df"]
final_payout_value = results["final_payout_value"]
final_opportunity_cost = results["final_opportunity_cost"]
payout_label = results["payout_label"]
breakeven_label = results["breakeven_label"]
total_dilution = results.get("total_dilution")  # Use .get for optional values
diluted_equity_pct = results.get("diluted_equity_pct")

# Calculate financial metrics
net_outcome = final_payout_value - final_opportunity_cost
irr_value = calculations.calculate_irr(monthly_df["MonthlySurplus"], final_payout_value)
npv_value = calculations.calculate_npv(
    monthly_df["MonthlySurplus"], annual_roi, final_payout_value
)

# --- Display Results ---
st.divider()

# Define exit scenario text for the subheader
if comp_type == CompensationType.RSU:
    exit_scenario_text = (
        f"{format_currency_compact(rsu_params['target_exit_valuation'])} Valuation"
    )
else:
    exit_scenario_text = f"{format_currency_compact(options_params['target_exit_price_per_share'])}/Share"

st.subheader(f"Outcome at End of Year {simulation_end_year} (at {exit_scenario_text})")


# Display dilution summary if applicable
if comp_type == CompensationType.RSU and rsu_params.get("simulate_dilution"):
    col1, col2, col3 = st.columns(3)
    col1.metric("Initial Equity Grant", f"{rsu_params['equity_pct']:.2%}")
    col2.metric("Total Dilution", f"{total_dilution:.2%}")
    col3.metric(
        "Final Diluted Equity",
        f"{diluted_equity_pct:.2%}",
        delta=f"{-total_dilution:.2%}",
    )

# Display key metric cards
col1, col2, col3, col4, col5 = st.columns(5)
col1.metric(payout_label, format_currency_compact(final_payout_value))
col2.metric("Opportunity Cost", format_currency_compact(final_opportunity_cost))
col3.metric(
    "Net Outcome (Future)",
    format_currency_compact(net_outcome),
    delta=f"{net_outcome:,.0f} SAR",
)
col4.metric("Net Present Value (NPV)", format_currency_compact(npv_value))
col5.metric("Annualized IRR", f"{irr_value:.2f}%" if pd.notna(irr_value) else "N/A")


# --- Detailed Breakdown and Charts ---
with st.expander("Show Detailed Yearly Breakdown & Charts"):
    display_df = results_df.copy()
    principal_col_label = (
        "Principal Forgone"
        if monthly_df["MonthlySurplus"].sum() >= 0
        else "Salary Gain"
    )

    # Format columns for display
    display_df[principal_col_label] = display_df[principal_col_label].map(
        format_currency_compact
    )
    display_df["Opportunity Cost (Invested Surplus)"] = display_df[
        "Opportunity Cost (Invested Surplus)"
    ].map(format_currency_compact)

    # *** CHANGE: Reverted to show Vested Percentage ***
    vested_comp_label = (
        "Vested Equity (Post-Dilution)"
        if comp_type == CompensationType.RSU
        else "Vested Options (%)"
    )
    # The column from calculations is "Vested Comp (%)"
    display_df[vested_comp_label] = results_df["Vested Comp (%)"].map(
        lambda x: f"{x:.2f}%"
    )

    display_df[breakeven_label] = display_df["Breakeven Value"].map(
        lambda x: format_currency_compact(
            x, add_sar=(comp_type == CompensationType.RSU)
        )
    )

    # Ensure the original 'Vested Comp (%)' column is dropped if it's not the one being displayed
    columns_to_display = [
        principal_col_label,
        "Opportunity Cost (Invested Surplus)",
        vested_comp_label,
        breakeven_label,
    ]

    st.dataframe(
        display_df[columns_to_display].rename(
            columns={vested_comp_label: "Vested Comp"}
        ),
        use_container_width=True,
    )

    # Plot charts
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
        breakeven_data = results_df[
            results_df["Breakeven Value"] != float("inf")
        ].copy()
        if not breakeven_data.empty:
            if comp_type == CompensationType.RSU:
                y_axis_label = "Valuation (Millions SAR)"
                breakeven_data["y_values"] = breakeven_data["Breakeven Value"] / 1e6
            else:
                y_axis_label = "Price per Share (SAR)"
                breakeven_data["y_values"] = breakeven_data["Breakeven Value"]

            fig2 = px.line(
                breakeven_data,
                x="Year",
                y="y_values",
                title=f"<b>Required {breakeven_label.split('(')[0]} to Break Even</b>",
                labels={"y_values": y_axis_label},
                markers=True,
            )
            st.plotly_chart(fig2, use_container_width=True)

# --- Footer ---
st.divider()
st.caption(
    "Disclaimer: This tool is for informational purposes only and does not constitute financial advice."
)

st.markdown("---")
st.caption("Made with ❤️ by Eyad Sibai (https://linkedin.com/in/eyadsibai)")
