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
            0.5,
            25.0,
            5.0,
            0.1,
            help="The total percentage of the company's equity offered to you as a grant.",
        )
        / 100
    )
    st.sidebar.subheader("Hypothetical Exit Scenario")
    valuation_in_millions = st.sidebar.slider(
        label="Future Valuation (Millions SAR)",
        min_value=1,
        max_value=1000,
        value=25,
        step=1,
        format="%dM SAR",
        help="Your best guess for the startup's total valuation at the time you might sell your shares.",
    )
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
                    else:
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
    st.sidebar.subheader("Hypothetical Exit Scenario")
    options_params["target_exit_price_per_share"] = st.sidebar.number_input(
        "Price per Share at Exit (SAR)",
        min_value=0.00,
        value=0.50,
        step=0.25,
        format="%.2f",
        help="Your best guess for the price of a single share when you eventually sell.",
    )

st.sidebar.divider()

# --- Monte Carlo Simulation Inputs ---
st.sidebar.header("🎲 Monte Carlo Simulation")
run_simulation = st.sidebar.checkbox(
    "Run Simulation", help="Enable to run a Monte Carlo simulation."
)
sim_param_configs = {}
if run_simulation:
    st.sidebar.info("Select variables and their distributions to simulate.")
    num_simulations = st.sidebar.slider(
        "Number of Simulations", 100, 10000, 1000, 100
    )
    
    sim_variables = st.sidebar.multiselect(
        "Select variables to simulate",
        options=["Exit Valuation/Price", "Annual ROI", "Salary Growth Rate", "Exit Year"],
        default=["Exit Valuation/Price", "Annual ROI"],
    )

    def get_dist_params(var_name, default_dist="Normal", is_percent=False, is_int=False, value_format=None):
        dist_options = ["Normal", "Uniform", "Triangular"]
        if var_name == "Exit Valuation":
            dist_options.append("Log-Normal")
        
        dist_name = st.sidebar.selectbox(
            f"Distribution for {var_name}",
            dist_options,
            index=dist_options.index(default_dist),
        )
        params = {"dist": dist_name}

        # Dynamically create input widgets based on distribution
        if dist_name in ["Normal", "Log-Normal"]:
            default_mean = 0.05 if is_percent else 10_000_000
            default_std_dev = 0.02 if is_percent else 5_000_000
            params["loc"] = st.sidebar.number_input(f"Mean / Mu for {var_name}", value=default_mean, format=value_format)
            params["scale"] = st.sidebar.number_input(f"Std Dev / Sigma for {var_name}", value=default_std_dev, format=value_format)

        elif dist_name == "Uniform":
            min_val = 0 if is_percent else 1_000_000
            max_val = 0.1 if is_percent else 20_000_000
            if is_int:
                 min_val, max_val = int(min_val), int(max_val)
                 step = 1
            else:
                 step = None

            min_in = st.sidebar.number_input(f"Min for {var_name}", value=min_val, step=step, format=value_format)
            max_in = st.sidebar.number_input(f"Max for {var_name}", value=max_val, step=step, format=value_format)
            params["loc"] = min_in
            params["scale"] = max_in - min_in

        elif dist_name == "Triangular":
            min_val = 0 if is_percent else 1_000_000
            mode_val = 0.05 if is_percent else 15_000_000
            max_val = 0.12 if is_percent else 50_000_000
            if is_int:
                 min_val, mode_val, max_val = int(min_val), int(mode_val), int(max_val)
                 step = 1
            else:
                step = None

            min_in = st.sidebar.number_input(f"Min for {var_name}", value=min_val, step=step, format=value_format)
            mode_in = st.sidebar.number_input(f"Mode for {var_name}", value=mode_val, step=step, format=value_format)
            max_in = st.sidebar.number_input(f"Max for {var_name}", value=max_val, step=step, format=value_format)
            params["loc"] = min_in
            params["scale"] = max_in - min_in
            params["c"] = (mode_in - min_in) / (max_in - min_in) if (max_in - min_in) > 0 else 0

        return params

    if "Exit Year" in sim_variables:
        st.sidebar.warning("Simulating the Exit Year is computationally intensive and will be slower.")
        sim_param_configs["exit_year"] = get_dist_params("Exit Year", default_dist="Triangular", is_int=True)
    if "Exit Valuation/Price" in sim_variables:
        label = "Exit Valuation" if equity_type == EquityType.RSU else "Exit Price"
        default_dist = "Log-Normal" if equity_type == EquityType.RSU else "Triangular"
        sim_param_configs["valuation"] = get_dist_params(label, default_dist=default_dist)
    if "Annual ROI" in sim_variables:
        sim_param_configs["roi"] = get_dist_params("Annual ROI", is_percent=True)
    if "Salary Growth Rate" in sim_variables:
        sim_param_configs["salary_growth"] = get_dist_params("Salary Growth Rate", is_percent=True)


# --- Main App UI ---
st.title("Startup Offer vs. Current Job: Financial Comparison")
with st.expander("👋 New to this tool? Click here for a guide!"):
    st.markdown(
        """
    This tool helps you compare a startup job offer against your current job by quantifying the financial trade-offs.
    - **Step 1: Configure Scenarios**: Use the sidebar to input details for your current job and the startup offer.
    - **Step 2: Analyze Outcomes**: Review the key metrics like Net Outcome, NPV, and IRR.
    - **Step 3: Explore Details**: Check the yearly breakdown and charts for a deeper understanding.
    - **Step 4 (Optional): Run a Monte Carlo Simulation**: Use the sidebar to run a simulation for a range of possible outcomes.
    """
    )

# --- Core Logic Execution ---
monthly_df = calculations.create_monthly_data_grid(
    exit_year=exit_year,
    current_job_monthly_salary=current_salary,
    startup_monthly_salary=startup_salary,
    current_job_salary_growth_rate=current_job_salary_growth_rate,
)
opportunity_cost_df = calculations.calculate_annual_opportunity_cost(
    monthly_df=monthly_df,
    annual_roi=annual_roi,
    investment_frequency=investment_frequency,
)
startup_params = {
    "equity_type": equity_type,
    "total_vesting_years": total_vesting_years,
    "cliff_years": cliff_years,
    "rsu_params": rsu_params,
    "options_params": options_params,
    "exit_year": exit_year,
}
results = calculations.calculate_startup_scenario(opportunity_cost_df, startup_params)
results_df = results["results_df"]
final_payout_value = results["final_payout_value"]
final_opportunity_cost = results["final_opportunity_cost"]
payout_label = results["payout_label"]
breakeven_label = results["breakeven_label"]
total_dilution = results.get("total_dilution")
diluted_equity_pct = results.get("diluted_equity_pct")
net_outcome = final_payout_value - final_opportunity_cost
irr_value = calculations.calculate_irr(monthly_df["MonthlySurplus"], final_payout_value)
npv_value = calculations.calculate_npv(
    monthly_df["MonthlySurplus"], annual_roi, final_payout_value
)

# --- Display Results ---
st.divider()

# --- REVISED: Celebration Feature ---
# If total salary from startup is higher than total projected salary from current job,
# then the monthly surplus will be negative. This is a clear win on salary alone.
total_salary_surplus = monthly_df["MonthlySurplus"].sum()
is_clear_win = total_salary_surplus < 0

if is_clear_win:
    st.balloons()
    st.success(
        "🎉 ### Clear Decision! \n"
        "Factoring in salary growth, the startup offer provides a higher total salary over the simulation period. This makes it a clear win, even before considering equity."
    )

if equity_type == EquityType.RSU:
    exit_scenario_text = (
        f"{format_currency_compact(rsu_params['target_exit_valuation'])} Valuation"
    )
else:
    exit_scenario_text = f"{format_currency_compact(options_params['target_exit_price_per_share'])}/Share"
st.subheader(f"Outcome at End of Year {exit_year} (at {exit_scenario_text})")

if equity_type == EquityType.RSU and rsu_params.get("simulate_dilution"):
    col1, col2, col3 = st.columns(3)
    col1.metric(
        "Initial Equity Grant",
        f"{rsu_params['equity_pct']:.2%}",
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


# --- Monte Carlo Simulation Section ---
if run_simulation:
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
    col2.metric("Average Net Outcome", format_currency_compact(net_outcomes.mean()))
    col3.metric("Median Net Outcome", format_currency_compact(np.median(net_outcomes)))
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
        x_label = "Exit Valuation (SAR)" if equity_type == EquityType.RSU else "Exit Price per Share (SAR)"
        if "valuation" not in sim_param_configs:
             st.warning("Enable 'Exit Valuation/Price' in the simulation variables to see this plot.")
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
                labels={"SimulatedValuation": x_label, "NetOutcome": "Net Outcome (SAR)"},
                trendline="ols",
                opacity=0.3,
            )
            st.plotly_chart(fig_scatter, use_container_width=True)
            
    with tabs[5]:
        st.subheader("Detailed Statistics")
        stats_df = pd.DataFrame(net_outcomes, columns=["Net Outcome"])
        # Custom formatter to handle 'count' separately
        formatters = {
            col: (lambda x: f"{x:,.0f}") if col == "count" else (lambda x: format_currency_compact(x, add_sar=True))
            for col in ["Net Outcome"]
        }
        # Apply formatting to the description
        described_df = stats_df.describe(percentiles=[0.05, 0.25, 0.5, 0.75, 0.95])
        described_df.loc["count", "Net Outcome"] = int(described_df.loc["count", "Net Outcome"])
        st.dataframe(described_df.style.format({"Net Outcome": lambda x: f"{x:,.0f}" if isinstance(x, int) else format_currency_compact(x, add_sar=True)}))


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
else:
    st.info(
        "ℹ️ The detailed breakdown is hidden as the higher total salary makes this a clear choice."
    )


# --- Footer ---
st.divider()
st.caption(
    "Disclaimer: This tool is for informational purposes only and does not constitute financial advice."
)
st.markdown("---")
st.caption("Made with ❤️ by Eyad Sibai (https://linkedin.com/in/eyadsibai)")