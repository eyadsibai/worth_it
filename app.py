"""
Streamlit app for comparing a startup job offer against your current job.

This module handles the user interface and input gathering.
All financial calculations are delegated to the 'calculations' module.
"""

from enum import Enum

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.figure_factory as ff
import streamlit as st

import calculations

# --- Page Configuration ---
st.set_page_config(
    layout="wide", page_title="Job Offer Financial Comparison", page_icon="⚖️"
)


class EquityType(str, Enum):
    """Enum for different types of equity."""

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

# --- Global Settings ---
st.sidebar.header("⚙️ Global Settings")
exit_year = st.sidebar.slider(
    label="Year of Exit",
    min_value=1,
    max_value=20,
    value=5,
    step=1,
    help="Set the total duration for this financial comparison. The analysis will project outcomes up to this year, assuming an exit occurs.",
)

st.sidebar.subheader("Hypothetical Exit Scenario")
st.sidebar.info("📊 Set your expected exit valuation/price. These values will be used based on your equity type below.")

with st.sidebar.expander("💡 Valuation Calculator", expanded=False):
    st.markdown("**Estimate company valuation using common methods:**")

    calc_method = st.radio(
        "Calculation Method",
        ["Revenue Multiple", "Comparable Company", "Stage-Based"],
        help="Choose a method to estimate company valuation"
    )

    if calc_method == "Revenue Multiple":
        st.markdown("**Revenue Multiple Method**")
        st.caption("SaaS companies typically trade at 5-15x ARR")
        annual_revenue = st.number_input(
            "Annual Recurring Revenue (M SAR)",
            min_value=0.0,
            value=2.0,
            step=0.5,
            key="arr_calc"
        )
        revenue_multiple = st.slider(
            "Revenue Multiple",
            min_value=1.0,
            max_value=20.0,
            value=8.0,
            step=0.5,
            help="Typical: Early-stage 3-5x, Growth 8-12x, Late-stage 10-15x",
            key="rev_multiple"
        )
        suggested_valuation = annual_revenue * revenue_multiple
        st.success(f"💡 Suggested Valuation: **{suggested_valuation:.1f}M SAR**")

    elif calc_method == "Comparable Company":
        st.markdown("**Comparable Company Method**")
        comp_valuation = st.number_input(
            "Comparable Company Valuation (M SAR)",
            min_value=0.0,
            value=50.0,
            step=5.0,
            key="comp_val"
        )
        adjustment = st.slider(
            "Adjustment Factor",
            min_value=0.3,
            max_value=2.0,
            value=1.0,
            step=0.1,
            help="Adjust up/down based on growth, market position, etc.",
            key="comp_adj"
        )
        suggested_valuation = comp_valuation * adjustment
        st.success(f"💡 Suggested Valuation: **{suggested_valuation:.1f}M SAR**")

    else:  # Stage-Based
        st.markdown("**Stage-Based Estimation**")
        stage = st.selectbox(
            "Company Stage",
            ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+"],
            index=2,
            key="stage_select"
        )
        stage_ranges = {
            "Pre-Seed": (1, 5, 2),
            "Seed": (3, 15, 8),
            "Series A": (10, 50, 25),
            "Series B": (30, 150, 80),
            "Series C": (100, 500, 250),
            "Series D+": (300, 2000, 800)
        }
        min_val, max_val, typical = stage_ranges[stage]
        st.info(f"**{stage}** typical range: {min_val}-{max_val}M SAR")
        suggested_valuation = typical
        st.success(f"💡 Typical Valuation: **{suggested_valuation:.1f}M SAR**")

# Exit scenario inputs
valuation_in_millions = st.sidebar.slider(
    label="Exit Valuation for RSUs (Millions SAR)",
    min_value=1.0,
    max_value=1000.0,
    value=25.0,
    step=1.0,
    format="%.1fM SAR",
    help="Company valuation at exit. Used for RSU calculations.",
)

exit_price_per_share = st.sidebar.number_input(
    label="Exit Price per Share for Options (SAR)",
    min_value=0.00,
    value=50.0,
    step=0.25,
    format="%.2f",
    help="Share price at exit. Used for Stock Option calculations.",
)

st.sidebar.divider()


# --- Current Job Inputs ---
st.sidebar.header("Scenario 1: Current Job")
current_salary = st.sidebar.number_input(
    "Monthly Salary (SAR)",
    min_value=0,
    value=30_000,
    step=1000,
    key="current_salary",
    help="Your gross monthly salary in your current role, before any deductions.",
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

st.sidebar.subheader("Salary Surplus Investment")
annual_roi = (
    st.sidebar.slider(
        label="Assumed Annual ROI (%)",
        min_value=0.0,
        max_value=20.0,
        value=5.4,
        step=0.1,
        help="The estimated annual return (ROI) you'll get by investing the salary surplus (the difference between your current and startup salary). This also acts as the discount rate for NPV.",
    )
    / 100
)
investment_frequency = st.sidebar.radio(
    label="Investment Frequency",
    options=["Monthly", "Annually"],
    help="How often would you invest this salary surplus?",
)
st.sidebar.divider()

# --- Startup Job Inputs ---
st.sidebar.header("Scenario 2: Startup Offer")
startup_salary = st.sidebar.number_input(
    label="Monthly Salary (SAR)",
    min_value=0,
    value=20_000,
    step=1000,
    key="startup_salary",
    help="The gross monthly salary offered by the startup.",
)

equity_type_str = st.sidebar.radio(
    label="Equity Type",
    options=[e.value for e in EquityType],
    help="RSUs are grants of shares. Stock Options are the right to buy shares at a fixed price.",
)
equity_type = EquityType(equity_type_str)


st.sidebar.subheader("Vesting Terms")
total_vesting_years = st.sidebar.slider(
    label="Total Vesting Period (Years)",
    min_value=1,
    max_value=10,
    value=5,
    step=1,
    help="The total number of years required for all your granted equity to become fully yours.",
)
cliff_years = st.sidebar.slider(
    label="Vesting Cliff Period (Years)",
    min_value=0,
    max_value=total_vesting_years,
    value=1,
    step=1,
    help="The initial period before any equity vests. For a standard 1-year cliff, set this to 1. At the 1-year mark, the first year's worth of equity becomes vested. Set to 0 for no cliff.",
)


# --- Equity-Specific Inputs ---
rsu_params = {}
options_params = {}
dilution_rounds = []

if equity_type == EquityType.RSU:
    st.sidebar.subheader("Grant Details")
    rsu_params["equity_pct"] = (
        st.sidebar.slider(
            "Total Equity Grant (%)",
            0.01,
            100.0,
            5.0,
            0.1,
            help="The total percentage of the company's equity offered to you as a grant.",
        )
        / 100
    )
    # Use global exit valuation
    rsu_params["target_exit_valuation"] = valuation_in_millions * 1_000_000

    st.sidebar.subheader("Future Fundraising & Dilution")
    rsu_params["simulate_dilution"] = st.sidebar.checkbox(
        "Simulate Future Dilution",
        value=True,
        help="Check this to model how future fundraising rounds might reduce your ownership percentage.",
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
        series_names = [
            "Pre-Seed",
            "Seed",
            "Series A",
            "Series B",
            "Series C",
            "Series D",
        ]
        for i, series_name in enumerate(series_names):
            with st.sidebar.expander(f"{series_name} Round Details"):
                if st.checkbox(
                    f"Enable {series_name} Round",
                    value=i < 2,  # Enable Pre-seed and Seed by default
                    key=f"enable_{series_name}",
                ):
                    round_details = {}
                    round_details["year"] = st.number_input(
                        f"Year of {series_name}",
                        min_value=0,  # Allow year 0 for pre-seed
                        max_value=20,
                        value=max(0, i),  # Pre-seed at year 0, others later
                        step=1,
                        key=f"year_{series_name}",
                        help="Year when this funding round occurs. Pre-seed can be at year 0 (before you join or at start).",
                    )

                    # Salary Change Option
                    change_salary = st.checkbox(
                        "💰 Change Salary After This Round?",
                        value=False,
                        key=f"change_salary_{series_name}",
                        help="Check if your salary will increase after this funding round."
                    )

                    if change_salary:
                        round_details["new_salary"] = st.number_input(
                            "New Monthly Salary (SAR)",
                            min_value=0,
                            value=int(startup_salary * 1.2),  # Suggest 20% increase
                            step=1000,
                            key=f"new_salary_{series_name}",
                            help="Your new monthly salary after this funding round.",
                        )
                    else:
                        # Keep current salary (set to 0 to indicate no change)
                        round_details["new_salary"] = 0

                    post_money_valuation = None
                    if dilution_method == "By Percentage":
                        round_details["dilution"] = (
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
                            float(5 * (i + 1)),
                            1.0,
                            key=f"premoney_{series_name}",
                        )
                        raised_M = st.number_input(
                            "Amount Raised (M SAR)",
                            0.0,
                            float(2 * (i + 1)),
                            1.0,
                            key=f"raised_{series_name}",
                        )
                        round_details[
                            "dilution"
                        ] = calculations.calculate_dilution_from_valuation(
                            pre_money_M * 1e6, raised_M * 1e6
                        )
                        post_money_valuation = (pre_money_M + raised_M) * 1e6
                        st.metric(
                            f"{series_name} Implied Dilution",
                            f"{round_details['dilution']:.2%}",
                        )

                    # Equity Sale Section
                    st.markdown("---")

                    # Equity sales only available for Series A and beyond
                    early_stage_rounds = ["Pre-Seed", "Seed"]
                    if series_name in early_stage_rounds:
                        st.info(f"ℹ️ **Secondary equity sales are typically not available in {series_name} rounds.** These only become common in Series A and later when there's sufficient liquidity.")
                    elif st.checkbox(
                        "💵 Sell Equity in this Round?", key=f"sell_equity_{series_name}"
                    ):
                        # Calculate vested percentage at this sale time
                        sale_year = round_details["year"]

                        # Calculate vested percentage based on vesting schedule
                        if sale_year < cliff_years:
                            vested_pct_at_sale = 0.0
                        else:
                            vested_pct_at_sale = min(100.0, (sale_year / total_vesting_years) * 100)

                        # Show vesting info
                        if vested_pct_at_sale == 0.0:
                            st.warning(f"⚠️ No equity is vested at year {sale_year} (cliff is {cliff_years} years). You cannot sell equity yet.")
                            # Set to 0 and skip the slider
                            round_details["percent_to_sell"] = 0.0
                        else:
                            if vested_pct_at_sale < 100.0:
                                st.info(f"📊 At year {sale_year}: **{vested_pct_at_sale:.1f}%** is vested, **{100-vested_pct_at_sale:.1f}%** is unvested")
                                st.caption("⚠️ Note: You can only receive cash for vested equity. Selling unvested equity means forfeiting it (common in secondary sales).")
                            else:
                                st.info(f"📊 At year {sale_year}: **100%** of your equity is fully vested")

                            # Default to selling 10% of vested equity, but cap at available vested percentage
                            default_value = min(10.0, vested_pct_at_sale)
                            round_details["percent_to_sell"] = (
                                st.slider(
                                    "Percentage of Remaining Equity to Sell (up to vested amount)",
                                    0.0,
                                    vested_pct_at_sale,  # Maximum is the vested percentage
                                    default_value,
                                    1.0,
                                    key=f"sell_pct_{series_name}",
                                    format="%.1f%%",
                                    help=f"Percentage of your total remaining equity to sell (limited to the vested portion: {vested_pct_at_sale:.1f}%). You can only sell equity that has vested.",
                                )
                                / 100.0
                            )

                        # Set valuation for the sale
                        if post_money_valuation and dilution_method == "By Valuation":
                            # When using valuation method, default to post-money valuation
                            use_round_valuation = st.checkbox(
                                f"Use Round Valuation ({post_money_valuation / 1e6:.1f}M SAR)",
                                value=True,
                                key=f"use_round_val_{series_name}",
                                help="Use the post-money valuation from this funding round for the equity sale price."
                            )

                            if use_round_valuation:
                                valuation_at_sale_M = post_money_valuation / 1e6
                                st.info(f"📊 Sale Valuation: **{valuation_at_sale_M:.1f}M SAR** (from round valuation)")
                            else:
                                valuation_at_sale_M = st.number_input(
                                    "Custom Valuation at Time of Sale (M SAR)",
                                    min_value=0.1,
                                    value=post_money_valuation / 1e6,
                                    step=0.5,
                                    key=f"sell_val_{series_name}",
                                    help="Custom company valuation used to price your shares for this sale.",
                                )
                        else:
                            # Default to target exit valuation
                            default_valuation_M = rsu_params["target_exit_valuation"] / 1e6
                            valuation_at_sale_M = st.number_input(
                                "Valuation at Time of Sale (M SAR)",
                                min_value=0.1,
                                value=default_valuation_M,
                                step=0.5,
                                key=f"sell_val_{series_name}",
                                help="The company valuation used to price your shares for this sale.",
                            )

                        round_details["valuation_at_sale"] = valuation_at_sale_M * 1e6

                    dilution_rounds.append(round_details)
        rsu_params["dilution_rounds"] = dilution_rounds

else:  # Stock Options
    st.sidebar.subheader("Grant Details")
    options_params["num_options"] = st.sidebar.number_input(
        "Number of Stock Options",
        min_value=0,
        value=1000,
        step=500,
        help="The total number of individual stock options granted in your offer.",
    )
    options_params["strike_price"] = st.sidebar.number_input(
        "Strike Price (SAR per share)",
        min_value=0.00,
        value=0.25,
        step=0.05,
        format="%.2f",
        help="The fixed price per share you will pay to exercise (buy) your vested options.",
    )
    # Use global exit price
    options_params["target_exit_price_per_share"] = exit_price_per_share

    with st.sidebar.expander("Advanced Settings"):
        options_params["exercise_strategy"] = st.radio(
            "Option Exercise Strategy",
            ["Exercise at Exit", "Exercise After Vesting"],
            help="Choose when to model the cash outflow for exercising your options. Exercising early can have tax advantages but requires cash upfront.",
        )
        if options_params["exercise_strategy"] == "Exercise After Vesting":
            options_params["exercise_year"] = st.slider(
                "Year of Exercise",
                min_value=1,
                max_value=exit_year,
                value=max(1, total_vesting_years),
                step=1,
                help="The year you plan to exercise your vested options. The cost will be subtracted from your invested surplus in that year.",
            )


st.sidebar.divider()


# --- Main App UI ---
st.title("Startup Offer vs. Current Job: Financial Comparison")
with st.expander("👋 New to this tool? Click here for a guide!"):
    st.markdown(
        """
    This tool helps you compare a startup job offer against your current job by quantifying the financial trade-offs.
    - **Step 1: Configure Scenarios**: Use the sidebar to input details for your current job and the startup offer.
    - **Step 2: Analyze Outcomes**: Review the key metrics like Net Outcome, NPV, and IRR.
    - **Step 3: Explore Details**: Check the yearly breakdown and charts for a deeper understanding.
    - **Step 4 (Optional): Run a Monte Carlo Simulation**: Use the new 'Monte Carlo Simulation' tab to explore a range of possible outcomes.
    """
    )


tab1, tab2 = st.tabs(["Single Scenario Analysis", "Monte Carlo Simulation"])

with tab1:
    # --- Core Logic Execution ---
    monthly_df = calculations.create_monthly_data_grid(
        exit_year=exit_year,
        current_job_monthly_salary=current_salary,
        startup_monthly_salary=startup_salary,
        current_job_salary_growth_rate=current_job_salary_growth_rate,
        dilution_rounds=dilution_rounds,
    )
    startup_params = {
        "equity_type": equity_type,
        "total_vesting_years": total_vesting_years,
        "cliff_years": cliff_years,
        "rsu_params": rsu_params,
        "options_params": options_params,
        "exit_year": exit_year,
    }
    opportunity_cost_df = calculations.calculate_annual_opportunity_cost(
        monthly_df=monthly_df,
        annual_roi=annual_roi,
        investment_frequency=investment_frequency,
        options_params=options_params,
        startup_params=startup_params,
    )
    results = calculations.calculate_startup_scenario(
        opportunity_cost_df, startup_params
    )
    results_df = results["results_df"]
    final_payout_value = results["final_payout_value"]
    final_opportunity_cost = results["final_opportunity_cost"]
    payout_label = results["payout_label"]
    breakeven_label = results["breakeven_label"]
    total_dilution = results.get("total_dilution")
    diluted_equity_pct = results.get("diluted_equity_pct")
    net_outcome = final_payout_value - final_opportunity_cost
    irr_value = calculations.calculate_irr(
        monthly_df["MonthlySurplus"], final_payout_value
    )
    npv_value = calculations.calculate_npv(
        monthly_df["MonthlySurplus"], annual_roi, final_payout_value
    )

    # --- Display Results ---
    st.divider()

    # --- REVISED: Celebration Feature ---
    total_salary_surplus = monthly_df["MonthlySurplus"].sum()
    is_clear_win = total_salary_surplus < 0

    if is_clear_win:
        st.balloons()
        st.success(
            "🎉 ### Clear Decision! \n"
            "Factoring in salary growth, the startup offer provides a higher total salary over the simulation period. This makes it a clear win, even before considering equity."
        )

    if equity_type == EquityType.RSU:
        exit_scenario_text = f"{format_currency_compact(rsu_params.get('target_exit_valuation', 0))} Valuation"
    else:
        exit_scenario_text = f"{format_currency_compact(options_params.get('target_exit_price_per_share', 0))}/Share"

    st.subheader(f"Outcome at End of Year {exit_year} (at {exit_scenario_text})")

    if equity_type == EquityType.RSU and rsu_params.get("simulate_dilution"):
        col1, col2, col3 = st.columns(3)
        col1.metric(
            "Initial Equity Grant",
            f"{rsu_params.get('equity_pct', 0):.2%}",
            help="The percentage of the company you were initially offered.",
        )
        col2.metric(
            "Total Dilution",
            f"{total_dilution:.2%}",
            help="The total reduction in your ownership stake due to all simulated fundraising rounds.",
        )
        col3.metric(
            "Final Diluted Equity",
            f"{diluted_equity_pct:.2%}",
            delta=f"{-total_dilution:.2%}",
            help="Your final ownership percentage after all dilution has been applied.",
        )

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric(
        payout_label,
        format_currency_compact(final_payout_value),
        help="The estimated cash value of your vested equity (or options) at the hypothetical exit, after accounting for any dilution.",
    )
    col2.metric(
        "Opportunity Cost",
        format_currency_compact(final_opportunity_cost),
        help="The total value you would have had if you'd stayed at your current job and invested the salary surplus. This is what you're 'giving up' to take the startup job.",
    )
    col3.metric(
        "Net Outcome (Future)",
        format_currency_compact(net_outcome),
        delta=f"{net_outcome:,.0f} SAR",
        help="The final difference between your startup equity payout and the opportunity cost. A positive value means the startup offer was financially better in the long run.",
    )
    col4.metric(
        "Net Present Value (NPV)",
        format_currency_compact(npv_value),
        help="The 'Net Outcome' translated into today's money. It accounts for the time value of money, showing the total value created by the decision in present terms. A positive NPV is a strong positive signal.",
    )
    col5.metric(
        "Annualized IRR",
        f"{irr_value:.2f}%" if pd.notna(irr_value) else "N/A",
        help="The effective annual interest rate your 'investment' (the opportunity cost) would yield. A higher IRR indicates a more profitable decision.",
    )

    # --- Detailed Breakdown Section ---
    if not is_clear_win:
        with st.expander("Show Detailed Yearly Breakdown & Charts"):
            display_df = results_df.copy()
            principal_col_label = (
                "Principal Forgone"
                if monthly_df["MonthlySurplus"].sum() >= 0
                else "Salary Gain"
            )
            display_df[principal_col_label] = display_df[principal_col_label].map(
                format_currency_compact
            )
            display_df["Opportunity Cost (Invested Surplus)"] = display_df[
                "Opportunity Cost (Invested Surplus)"
            ].map(format_currency_compact)
            vested_equity_label = (
                "Vested Equity (Post-Dilution)"
                if equity_type == EquityType.RSU
                else "Vested Options (%)"
            )
            display_df[vested_equity_label] = results_df["Vested Equity (%)"].map(
                lambda x: f"{x:.2f}%"
            )
            display_df[breakeven_label] = display_df["Breakeven Value"].map(
                lambda x: format_currency_compact(
                    x, add_sar=(equity_type == EquityType.RSU)
                )
            )
            display_df.sort_index(inplace=True)
            columns_to_display = [
                principal_col_label,
                "Opportunity Cost (Invested Surplus)",
                vested_equity_label,
                breakeven_label,
            ]
            st.dataframe(
                display_df[columns_to_display].rename(
                    columns={vested_equity_label: "Vested Equity"}
                ),
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
                breakeven_data = results_df[
                    results_df["Breakeven Value"] != float("inf")
                ].copy()
                if not breakeven_data.empty:
                    if equity_type == EquityType.RSU:
                        y_axis_label = "Valuation (Millions SAR)"
                        breakeven_data["y_values"] = (
                            breakeven_data["Breakeven Value"] / 1e6
                        )
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
    else:
        st.info(
            "ℹ️ The detailed breakdown is hidden as the higher total salary makes this a clear choice."
        )

with tab2:
    st.header("🎲 Monte Carlo Simulation")
    run_simulation = st.checkbox(
        "Run Simulation",
        help="Enable to run a Monte Carlo simulation to understand the range of potential outcomes.",
    )
    sim_param_configs = {}
    if run_simulation:
        st.info(
            """
            **How the Simulation Works:**
            Instead of a single guess, this simulation explores thousands of possibilities.
            - **Startup Valuations** and similar variables are modeled using a **PERT distribution**, which creates a smooth curve based on your min, max, and most likely estimates.
            - **Investment Returns (ROI)** are modeled using a **Normal distribution**, a standard for financial returns.
            - **Startup Failure** is modeled as a binary event; in a set percentage of simulations, the equity value will be zero.
            """
        )
        num_simulations = st.slider(
            "Number of Simulations", 100, 10000, 1000, 100, key="num_simulations"
        )

        failure_probability = (
            st.slider(
                "Risk of Complete Failure (%)",
                0.0,
                100.0,
                25.0,
                1.0,
                help="The probability that the startup fails, resulting in a total loss of equity. Modeled using a Bernoulli distribution (a random chance).",
            )
            / 100.0
        )

        sim_options = [
            "Exit Valuation/Price",
            "Annual ROI",
            "Salary Growth Rate",
            "Exit Year",
        ]
        if equity_type == EquityType.RSU:
            sim_options.append("Total Dilution")

        sim_variables = st.multiselect(
            "Select variables to simulate",
            options=sim_options,
            default=["Exit Valuation/Price", "Annual ROI"],
        )

        def create_sim_sliders(
            label,
            min_value,
            max_value,
            default_range,
            default_mode,
            step,
            key_prefix,
            format_str,
            multiplier=1.0,
            help_text="",
        ):
            with st.expander(f"Configuration for {label}"):
                range_vals = st.slider(
                    "Range",
                    min_value=min_value,
                    max_value=max_value,
                    value=default_range,
                    step=step,
                    key=f"{key_prefix}_range",
                    format=format_str,
                    help=f"The minimum and maximum possible values for {label}. {help_text}",
                )
                mode_val = st.slider(
                    "Most Likely",
                    min_value=range_vals[0],
                    max_value=range_vals[1],
                    value=default_mode,
                    step=step,
                    key=f"{key_prefix}_mode",
                    format=format_str,
                    help=f"The single most probable value for {label}. {help_text}",
                )
                return {
                    "min_val": range_vals[0] * multiplier,
                    "max_val": range_vals[1] * multiplier,
                    "mode": mode_val * multiplier,
                }

        # Conditional simulation inputs
        if "Exit Year" in sim_variables:
            st.warning(
                "Simulating the Exit Year is computationally intensive and will be slower."
            )
            sim_param_configs["exit_year"] = create_sim_sliders(
                label="Exit Year",
                min_value=1,
                max_value=20,
                default_range=(3, 10),
                default_mode=5,
                step=1,
                key_prefix="exit_year",
                format_str="%d years",
                help_text="Modeled using a PERT distribution and rounded to the nearest year.",
            )

        if "Exit Valuation/Price" in sim_variables:
            use_yearly_valuation = False
            if "Exit Year" in sim_variables:
                use_yearly_valuation = st.checkbox(
                    "Enable Year-Dependent Valuations",
                    help="Set different valuation ranges for different exit years.",
                )

            if use_yearly_valuation:
                st.subheader("Year-Dependent Exit Valuation")
                st.info(
                    "Define valuation ranges for each potential exit year. This provides a more nuanced simulation."
                )
                yearly_valuation_configs = {}
                exit_year_range_values = st.session_state.get(
                    "exit_year_range", (exit_year, exit_year)
                )
                min_exit_year = int(exit_year_range_values[0])
                max_exit_year = int(exit_year_range_values[1])

                for year in range(min_exit_year, max_exit_year + 1):
                    with st.expander(f"Valuation config for Year {year}"):
                        if equity_type == EquityType.RSU:
                            yearly_valuation_configs[str(year)] = {
                                "min_val": (
                                    st.number_input(
                                        "Min Valuation (M SAR)",
                                        value=float(year * 2),
                                        key=f"min_val_{year}",
                                    )
                                    * 1_000_000
                                ),
                                "max_val": (
                                    st.number_input(
                                        "Max Valuation (M SAR)",
                                        value=float(year * 20),
                                        key=f"max_val_{year}",
                                    )
                                    * 1_000_000
                                ),
                                "mode": (
                                    st.number_input(
                                        "Most Likely (M SAR)",
                                        value=float(year * 5),
                                        key=f"mode_val_{year}",
                                    )
                                    * 1_000_000
                                ),
                            }
                        else:
                            yearly_valuation_configs[str(year)] = {
                                "min_val": st.number_input(
                                    "Min Price/Share (SAR)",
                                    value=float(year * 2),
                                    key=f"min_price_{year}",
                                ),
                                "max_val": st.number_input(
                                    "Max Price/Share (SAR)",
                                    value=float(year * 15),
                                    key=f"max_price_{year}",
                                ),
                                "mode": st.number_input(
                                    "Most Likely (SAR)",
                                    value=float(year * 8),
                                    key=f"mode_price_{year}",
                                ),
                            }
                sim_param_configs["yearly_valuation"] = yearly_valuation_configs
            else:
                if equity_type == EquityType.RSU:
                    sim_param_configs["valuation"] = create_sim_sliders(
                        label="Exit Valuation",
                        min_value=1.0,
                        max_value=1000.0,
                        default_range=(10.0, 100.0),
                        default_mode=25.0,
                        step=1.0,
                        key_prefix="valuation",
                        format_str="%.1fM SAR",
                        multiplier=1_000_000.0,
                        help_text="Modeled using a PERT distribution.",
                    )
                else:
                    sim_param_configs["valuation"] = create_sim_sliders(
                        label="Exit Price per Share",
                        min_value=0.0,
                        max_value=200.0,
                        default_range=(10.0, 80.0),
                        default_mode=50.0,
                        step=0.5,
                        key_prefix="price",
                        format_str="%.2f SAR",
                        help_text="Modeled using a PERT distribution.",
                    )

        if "Annual ROI" in sim_variables:
            with st.expander("Configuration for Annual ROI"):
                roi_mean = st.slider(
                    "Average ROI (%)",
                    min_value=0.0,
                    max_value=25.0,
                    value=5.4,
                    step=0.1,
                    key="roi_mean",
                    help="Your best guess for the average annual return. This will be the center of the distribution.",
                )
                roi_std_dev = st.slider(
                    "Volatility (Std. Dev %)",
                    min_value=0.0,
                    max_value=15.0,
                    value=4.0,
                    step=0.1,
                    key="roi_std",
                    help="How much you expect the annual return to vary. Higher values mean more risk and wider outcomes. Modeled using a Normal distribution.",
                )
                sim_param_configs["roi"] = {
                    "mean": roi_mean / 100.0,
                    "std_dev": roi_std_dev / 100.0,
                }

        if "Salary Growth Rate" in sim_variables:
            sim_param_configs["salary_growth"] = create_sim_sliders(
                label="Salary Growth Rate",
                min_value=0.0,
                max_value=15.0,
                default_range=(2.0, 7.0),
                default_mode=3.0,
                step=0.1,
                key_prefix="growth",
                format_str="%.1f%%",
                multiplier=0.01,
                help_text="Modeled using a PERT distribution.",
            )

        if "Total Dilution" in sim_variables and equity_type == EquityType.RSU:
            st.info(
                "This simulation will override the detailed, round-by-round dilution modeling."
            )
            sim_param_configs["dilution"] = create_sim_sliders(
                label="Total Dilution",
                min_value=0.0,
                max_value=90.0,
                default_range=(30.0, 70.0),
                default_mode=50.0,
                step=1.0,
                key_prefix="dilution",
                format_str="%.1f%%",
                multiplier=0.01,
                help_text="Modeled using a PERT distribution.",
            )

        # --- Monte Carlo Simulation Section ---

        st.divider()
        st.header("🎲 Monte Carlo Simulation Results")

        base_params = {
            "exit_year": exit_year,
            "current_job_monthly_salary": current_salary,
            "startup_monthly_salary": startup_salary,
            "current_job_salary_growth_rate": current_job_salary_growth_rate,
            "annual_roi": annual_roi,
            "investment_frequency": investment_frequency,
            "startup_params": startup_params,
            "failure_probability": failure_probability,
        }

        spinner_text = f"Running {num_simulations} simulations..."
        if "Exit Year" in sim_variables:
            spinner_text += " (Simulating exit year may be slower)"

        with st.spinner(spinner_text):
            sim_results = calculations.run_monte_carlo_simulation(
                num_simulations=num_simulations,
                base_params=base_params,
                sim_param_configs=sim_param_configs,
            )

        net_outcomes = sim_results["net_outcomes"]
        prob_positive_outcome = (net_outcomes > 0).sum() / len(net_outcomes)

        st.subheader("Simulation Summary")
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Probability of Positive Outcome", f"{prob_positive_outcome:.2%}")
        col2.metric(
            "Average Net Outcome", format_currency_compact(net_outcomes.mean())
        )
        col3.metric(
            "Median Net Outcome", format_currency_compact(np.median(net_outcomes))
        )
        col4.metric(
            "Std. Deviation",
            format_currency_compact(net_outcomes.std()),
            help="A measure of the outcome's volatility. Higher means more uncertainty.",
        )

        tab_titles = [
            "Histogram",
            "Probability Density",
            "Box Plot",
            "Cumulative Probability",
            "Scatter Plot",
            "Statistics",
        ]
        if len(sim_variables) >= 2:
            tab_titles.append("Sensitivity Analysis")

        tabs = st.tabs(tab_titles)

        with tabs[0]:
            st.subheader("Distribution of Net Outcomes")
            fig_hist = px.histogram(
                net_outcomes,
                nbins=100,
                title="Frequency of Potential Net Outcomes",
                labels={"value": "Net Outcome (SAR)"},
            )
            st.plotly_chart(fig_hist, use_container_width=True)

        with tabs[1]:
            st.subheader("Probability Density of Net Outcomes")
            st.info(
                "This plot shows a smoothed curve of the outcome distribution, making it easier to see where the most likely results are concentrated."
            )
            fig_dist = ff.create_distplot(
                [net_outcomes],
                group_labels=["Net Outcome"],
                show_rug=False,
                bin_size=(net_outcomes.max() - net_outcomes.min()) / 100,
            )
            fig_dist.update_layout(
                title_text="Probability Density Function (PDF) of Net Outcomes",
                xaxis_title="Net Outcome (SAR)",
                yaxis_title="Density",
            )
            st.plotly_chart(fig_dist, use_container_width=True)

        with tabs[2]:
            st.subheader("Box Plot of Net Outcomes")
            fig_box = px.box(
                y=net_outcomes,
                title="Range and Quartiles of Net Outcomes",
                labels={"y": "Net Outcome (SAR)"},
                points="outliers",
            )
            st.plotly_chart(fig_box, use_container_width=True)

        with tabs[3]:
            st.subheader("Cumulative Probability (ECDF)")
            st.info(
                """
            **How to read this chart:** This plot shows the probability that your net outcome will be *less than or equal to* a certain value.
            For example, find a value on the x-axis (e.g., 10M SAR). The corresponding y-axis value (e.g., 0.6) means there is a 60% chance your outcome will be 10M SAR or less.
            """
            )
            fig_ecdf = px.ecdf(
                net_outcomes,
                title="Probability of Achieving a Certain Net Outcome",
                labels={"x": "Net Outcome (SAR)", "y": "Cumulative Probability"},
            )
            st.plotly_chart(fig_ecdf, use_container_width=True)

        with tabs[4]:
            st.subheader("Valuation vs. Net Outcome")
            x_label = (
                "Exit Valuation (SAR)"
                if equity_type == EquityType.RSU
                else "Exit Price per Share (SAR)"
            )
            if (
                "valuation" not in sim_param_configs
                and "yearly_valuation" not in sim_param_configs
            ):
                st.warning(
                    "Enable 'Exit Valuation/Price' in the simulation variables to see this plot."
                )
            else:
                scatter_df = pd.DataFrame(
                    {
                        "SimulatedValuation": sim_results["simulated_valuations"],
                        "NetOutcome": net_outcomes,
                    }
                )
                fig_scatter = px.scatter(
                    scatter_df,
                    x="SimulatedValuation",
                    y="NetOutcome",
                    title=f"Impact of {x_label} on Net Outcome",
                    labels={
                        "SimulatedValuation": x_label,
                        "NetOutcome": "Net Outcome (SAR)",
                    },
                    trendline="ols",
                    opacity=0.3,
                )
                st.plotly_chart(fig_scatter, use_container_width=True)

        with tabs[5]:
            st.subheader("Detailed Statistics")
            stats_df = pd.DataFrame(net_outcomes, columns=["Net Outcome"])
            # Custom formatter to handle 'count' separately
            formatters = {
                col: (lambda x: f"{x:,.0f}")
                if col == "count"
                else (lambda x: format_currency_compact(x, add_sar=True))
                for col in ["Net Outcome"]
            }
            # Apply formatting to the description
            described_df = stats_df.describe(
                percentiles=[0.05, 0.25, 0.5, 0.75, 0.95]
            )
            described_df.loc["count", "Net Outcome"] = int(
                described_df.loc["count", "Net Outcome"]
            )
            st.dataframe(
                described_df.style.format(
                    {
                        "Net Outcome": lambda x: f"{x:,.0f}"
                        if isinstance(x, int)
                        else format_currency_compact(x, add_sar=True)
                    }
                )
            )

        if len(sim_variables) >= 2:
            with tabs[6]:
                st.subheader("Sensitivity Analysis (Tornado Chart)")
                st.info(
                    "This chart shows how much each variable, from its low end (10th percentile) to its high end (90th percentile), impacts the final net outcome. The most influential variables are at the top."
                )
                with st.spinner("Running sensitivity analysis..."):
                    sensitivity_results = calculations.run_sensitivity_analysis(
                        base_params=base_params, sim_param_configs=sim_param_configs
                    )

                    fig_tornado = px.bar(
                        sensitivity_results,
                        x="Impact",
                        y="Variable",
                        orientation="h",
                        title="Impact of Variables on Net Outcome",
                        labels={"Impact": "Range of Net Outcome (SAR)"},
                    )
                    fig_tornado.update_layout(
                        yaxis={"categoryorder": "total ascending"}
                    )
                    st.plotly_chart(fig_tornado, use_container_width=True)


# --- Footer ---
st.divider()
st.caption(
    "Disclaimer: This tool is for informational purposes only and does not constitute financial advice."
)
st.markdown("---")
st.caption("Made with ❤️ by Eyad Sibai (https://linkedin.com/in/eyadsibai)")
