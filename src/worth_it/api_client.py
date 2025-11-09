"""
API client for Streamlit to communicate with the FastAPI backend.

This module provides a clean interface for the Streamlit app to make
HTTP requests to the FastAPI backend instead of calling calculation
functions directly.
"""

from __future__ import annotations

from typing import Any

import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .config import settings


class APIClient:
    """Client for communicating with the Worth It FastAPI backend."""

    def __init__(self, base_url: str | None = None):
        """
        Initialize the API client.

        Args:
            base_url: Base URL of the FastAPI backend.
                     Defaults to settings.API_BASE_URL.
        """
        self.base_url = base_url or settings.API_BASE_URL

        # Create session with retry logic
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _post(self, endpoint: str, data: dict[str, Any]) -> dict[str, Any]:
        """Make a POST request to the API."""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.post(url, json=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"API request failed: {e}")

    def _get(self, endpoint: str) -> dict[str, Any]:
        """Make a GET request to the API."""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"API request failed: {e}")

    def health_check(self) -> dict[str, str]:
        """Check if the API is healthy."""
        return self._get("/health")

    def create_monthly_data_grid(
        self,
        exit_year: int,
        current_job_monthly_salary: float,
        startup_monthly_salary: float,
        current_job_salary_growth_rate: float,
        dilution_rounds: list[dict[str, Any]] | None = None,
    ) -> pd.DataFrame:
        """
        Create a DataFrame with monthly financial projections.

        Args:
            exit_year: Number of years until exit
            current_job_monthly_salary: Monthly salary at current job
            startup_monthly_salary: Monthly salary at startup
            current_job_salary_growth_rate: Annual salary growth rate at current job
            dilution_rounds: List of dilution round configurations

        Returns:
            DataFrame with monthly projections
        """
        data = {
            "exit_year": exit_year,
            "current_job_monthly_salary": current_job_monthly_salary,
            "startup_monthly_salary": startup_monthly_salary,
            "current_job_salary_growth_rate": current_job_salary_growth_rate,
            "dilution_rounds": dilution_rounds,
        }
        result = self._post("/api/monthly-data-grid", data)
        return pd.DataFrame(result["data"])

    def calculate_annual_opportunity_cost(
        self,
        monthly_df: pd.DataFrame,
        annual_roi: float,
        investment_frequency: str,
        options_params: dict[str, Any] | None = None,
        startup_params: dict[str, Any] | None = None,
    ) -> pd.DataFrame:
        """
        Calculate the opportunity cost of foregone salary.

        Args:
            monthly_df: DataFrame from create_monthly_data_grid
            annual_roi: Expected annual return on investment
            investment_frequency: "Monthly" or "Annually"
            options_params: Stock options parameters
            startup_params: Startup equity parameters

        Returns:
            DataFrame with annual opportunity cost calculations
        """
        data = {
            "monthly_data": monthly_df.to_dict(orient="records"),
            "annual_roi": annual_roi,
            "investment_frequency": investment_frequency,
            "options_params": options_params,
            "startup_params": startup_params,
        }
        result = self._post("/api/opportunity-cost", data)
        return pd.DataFrame(result["data"])

    def calculate_startup_scenario(
        self, opportunity_cost_df: pd.DataFrame, startup_params: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Calculate financial outcomes for a startup equity package.

        Args:
            opportunity_cost_df: DataFrame from calculate_annual_opportunity_cost
            startup_params: Dictionary containing startup equity parameters

        Returns:
            Dictionary with results including:
                - results_df: DataFrame with yearly breakdown
                - final_payout_value: Final equity value
                - final_opportunity_cost: Total opportunity cost
                - payout_label: Label for payout metric
                - breakeven_label: Label for breakeven metric
                - total_dilution: Total dilution (for RSUs)
                - diluted_equity_pct: Final equity percentage (for RSUs)
        """
        data = {
            "opportunity_cost_data": opportunity_cost_df.to_dict(orient="records"),
            "startup_params": startup_params,
        }
        result = self._post("/api/startup-scenario", data)
        result["results_df"] = pd.DataFrame(result["results_df"])
        return result

    def calculate_irr(
        self, monthly_surpluses: pd.Series, final_payout_value: float
    ) -> float | None:
        """
        Calculate the Internal Rate of Return (IRR).

        Args:
            monthly_surpluses: Series of monthly salary differences
            final_payout_value: Final equity payout value

        Returns:
            Annualized IRR as a percentage, or None if calculation fails
        """
        data = {
            "monthly_surpluses": monthly_surpluses.tolist(),
            "final_payout_value": final_payout_value,
        }
        result = self._post("/api/irr", data)
        return result["irr"]

    def calculate_npv(
        self, monthly_surpluses: pd.Series, annual_roi: float, final_payout_value: float
    ) -> float | None:
        """
        Calculate the Net Present Value (NPV).

        Args:
            monthly_surpluses: Series of monthly salary differences
            annual_roi: Annual return on investment
            final_payout_value: Final equity payout value

        Returns:
            NPV value, or None if calculation fails
        """
        data = {
            "monthly_surpluses": monthly_surpluses.tolist(),
            "annual_roi": annual_roi,
            "final_payout_value": final_payout_value,
        }
        result = self._post("/api/npv", data)
        return result["npv"]

    def run_monte_carlo_simulation(
        self,
        num_simulations: int,
        base_params: dict[str, Any],
        sim_param_configs: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Run Monte Carlo simulation for probabilistic analysis.

        Args:
            num_simulations: Number of simulations to run
            base_params: Base parameters for the simulation
            sim_param_configs: Configuration for simulated variables

        Returns:
            Dictionary with:
                - net_outcomes: Array of net outcome values
                - simulated_valuations: Array of simulated valuations
        """
        data = {
            "num_simulations": num_simulations,
            "base_params": base_params,
            "sim_param_configs": sim_param_configs,
        }
        result = self._post("/api/monte-carlo", data)
        return {
            "net_outcomes": pd.Series(result["net_outcomes"]),
            "simulated_valuations": pd.Series(result["simulated_valuations"]),
        }

    def run_sensitivity_analysis(
        self, base_params: dict[str, Any], sim_param_configs: dict[str, Any]
    ) -> pd.DataFrame:
        """
        Run sensitivity analysis to identify key variables.

        Args:
            base_params: Base parameters for the analysis
            sim_param_configs: Configuration for variables to analyze

        Returns:
            DataFrame with sensitivity analysis results
        """
        data = {
            "base_params": base_params,
            "sim_param_configs": sim_param_configs,
        }
        result = self._post("/api/sensitivity-analysis", data)
        return pd.DataFrame(result["data"])

    def calculate_dilution_from_valuation(
        self, pre_money_valuation: float, amount_raised: float
    ) -> float:
        """
        Calculate dilution percentage from fundraising round.

        Args:
            pre_money_valuation: Pre-money company valuation
            amount_raised: Amount raised in the funding round

        Returns:
            Dilution percentage (0.0 to 1.0)
        """
        data = {
            "pre_money_valuation": pre_money_valuation,
            "amount_raised": amount_raised,
        }
        result = self._post("/api/dilution", data)
        return result["dilution"]


# Create a singleton instance for use across the app
api_client = APIClient()
