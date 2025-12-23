"""Monte Carlo simulation classes using Template Method pattern.

This module provides a class-based interface for Monte Carlo simulations,
organizing the algorithm into clear steps while delegating to optimized
implementations for performance.

The Template Method pattern defines the simulation skeleton:
1. generate_samples() - Create random variates for each parameter
2. calculate_outcomes() - Compute net outcomes for each sample
3. aggregate_results() - Combine results into final output

Example:
    simulation = get_monte_carlo_simulation(base_params, sim_configs)
    result = simulation.run(num_simulations=10000)
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import numpy as np
from scipy import stats

if TYPE_CHECKING:
    pass


@dataclass(frozen=True)
class MonteCarloResult:
    """Result of a Monte Carlo simulation.

    Attributes:
        net_outcomes: Array of net outcome values for each simulation
        simulated_valuations: Array of valuation samples used
        num_simulations: Number of simulations run
    """

    net_outcomes: np.ndarray
    simulated_valuations: np.ndarray
    num_simulations: int

    @property
    def mean_outcome(self) -> float:
        """Mean of all net outcomes."""
        return float(self.net_outcomes.mean())

    @property
    def median_outcome(self) -> float:
        """Median of all net outcomes."""
        return float(np.median(self.net_outcomes))

    @property
    def std_outcome(self) -> float:
        """Standard deviation of net outcomes."""
        return float(self.net_outcomes.std())

    @property
    def probability_positive(self) -> float:
        """Probability of positive net outcome."""
        return float((self.net_outcomes > 0).mean())

    def percentile(self, p: float) -> float:
        """Get the p-th percentile of net outcomes."""
        return float(np.percentile(self.net_outcomes, p))


class MonteCarloSimulation(ABC):
    """Abstract base class for Monte Carlo simulations.

    This class defines the template method pattern for running simulations:
    1. generate_samples() - Prepare random parameters
    2. calculate_outcomes() - Compute results for each sample
    3. aggregate_results() - Combine into final output

    Subclasses implement these steps differently based on their approach
    (vectorized for speed, iterative for flexibility).
    """

    def __init__(
        self,
        base_params: dict[str, Any],
        sim_param_configs: dict[str, Any],
    ):
        """Initialize simulation with parameters.

        Args:
            base_params: Base scenario parameters (salaries, equity, etc.)
            sim_param_configs: Configuration for simulated parameters
        """
        self.base_params = base_params
        self.sim_param_configs = sim_param_configs

    def run(self, num_simulations: int) -> MonteCarloResult:
        """Template method: run the full simulation pipeline.

        This method defines the algorithm skeleton. Subclasses customize
        the implementation of each step.

        Args:
            num_simulations: Number of simulation iterations

        Returns:
            MonteCarloResult with outcomes and statistics
        """
        # Step 1: Generate random samples
        samples = self.generate_samples(num_simulations)

        # Step 2: Calculate outcomes for each sample
        raw_results = self.calculate_outcomes(num_simulations, samples)

        # Step 3: Aggregate into final result
        return self.aggregate_results(raw_results, samples, num_simulations)

    @abstractmethod
    def generate_samples(self, num_simulations: int) -> dict[str, np.ndarray]:
        """Generate random samples for simulation parameters.

        Args:
            num_simulations: Number of samples to generate

        Returns:
            Dictionary mapping parameter names to sample arrays
        """
        pass

    @abstractmethod
    def calculate_outcomes(
        self,
        num_simulations: int,
        samples: dict[str, np.ndarray],
    ) -> dict[str, np.ndarray]:
        """Calculate outcomes for each sample.

        Args:
            num_simulations: Number of simulations
            samples: Dictionary of parameter samples

        Returns:
            Dictionary with 'net_outcomes' and other computed arrays
        """
        pass

    def aggregate_results(
        self,
        raw_results: dict[str, np.ndarray],
        samples: dict[str, np.ndarray],
        num_simulations: int,
    ) -> MonteCarloResult:
        """Aggregate raw results into final output.

        This default implementation creates a MonteCarloResult.
        Subclasses can override for custom aggregation.

        Args:
            raw_results: Dictionary with computed outcomes
            samples: Original samples used
            num_simulations: Number of simulations run

        Returns:
            MonteCarloResult with final data
        """
        return MonteCarloResult(
            net_outcomes=raw_results["net_outcomes"],
            simulated_valuations=samples.get("valuation", np.array([])),
            num_simulations=num_simulations,
        )


class VectorizedMonteCarlo(MonteCarloSimulation):
    """Fast vectorized Monte Carlo using NumPy broadcasting.

    This implementation computes all simulations simultaneously using
    vectorized operations. It requires a fixed exit year.

    Performance: ~7ms for 10,000 simulations.
    """

    def generate_samples(self, num_simulations: int) -> dict[str, np.ndarray]:
        """Generate all samples at once using vectorized operations."""
        samples: dict[str, np.ndarray] = {}

        # ROI: Normal distribution
        if "roi" in self.sim_param_configs:
            roi_config = self.sim_param_configs["roi"]
            samples["roi"] = np.asarray(
                stats.norm.rvs(
                    loc=roi_config["mean"],
                    scale=roi_config["std_dev"],
                    size=num_simulations,
                )
            )
        else:
            samples["roi"] = np.full(num_simulations, self.base_params["annual_roi"])

        # Valuation: PERT distribution
        if "valuation" in self.sim_param_configs:
            samples["valuation"] = self._pert_samples(
                num_simulations,
                self.sim_param_configs["valuation"],
            )
        else:
            default_val = self.base_params["startup_params"]["rsu_params"].get(
                "target_exit_valuation"
            ) or self.base_params["startup_params"]["options_params"].get(
                "target_exit_price_per_share"
            )
            samples["valuation"] = np.full(num_simulations, default_val)

        # Salary Growth: PERT distribution
        if "salary_growth" in self.sim_param_configs:
            samples["salary_growth"] = self._pert_samples(
                num_simulations,
                self.sim_param_configs["salary_growth"],
            )
        else:
            samples["salary_growth"] = np.full(
                num_simulations,
                self.base_params["current_job_salary_growth_rate"],
            )

        # Dilution: PERT distribution (optional)
        if "dilution" in self.sim_param_configs:
            samples["dilution"] = self._pert_samples(
                num_simulations,
                self.sim_param_configs["dilution"],
            )
        else:
            samples["dilution"] = np.full(num_simulations, np.nan)

        return samples

    def calculate_outcomes(
        self,
        num_simulations: int,
        samples: dict[str, np.ndarray],
    ) -> dict[str, np.ndarray]:
        """Calculate all outcomes using vectorized numpy operations.

        Delegates to the optimized function for actual computation.
        """
        # Import here to avoid circular imports
        from worth_it.monte_carlo import run_monte_carlo_simulation_vectorized

        return run_monte_carlo_simulation_vectorized(
            num_simulations,
            self.base_params,
            samples,
        )

    def _pert_samples(
        self,
        num_simulations: int,
        config: dict[str, Any],
    ) -> np.ndarray:
        """Generate PERT distribution samples."""
        from worth_it.monte_carlo import get_random_variates_pert

        return get_random_variates_pert(num_simulations, config, 0)


class IterativeMonteCarlo(MonteCarloSimulation):
    """Flexible iterative Monte Carlo for variable exit years.

    This implementation runs each simulation individually, allowing
    for variable exit years and complex per-simulation logic.

    Performance: ~10s for 1,000 simulations (100x slower than vectorized).
    Use only when exit_year is simulated.
    """

    def generate_samples(self, num_simulations: int) -> dict[str, np.ndarray]:
        """Generate samples including variable exit year."""
        samples: dict[str, np.ndarray] = {}

        # Exit year: PERT distribution (key differentiator)
        from worth_it.monte_carlo import get_random_variates_pert

        samples["exit_year"] = get_random_variates_pert(
            num_simulations,
            self.sim_param_configs.get("exit_year"),
            self.base_params["exit_year"],
        ).astype(int)

        # Valuation: May be year-dependent
        if "yearly_valuation" in self.sim_param_configs:
            yearly_val = self.sim_param_configs["yearly_valuation"]
            default_config = list(yearly_val.values())[0]
            valuations = []
            for year in samples["exit_year"]:
                config = yearly_val.get(str(year), default_config)
                valuations.append(get_random_variates_pert(1, config, config["mode"])[0])
            samples["valuation"] = np.array(valuations)
        elif "valuation" in self.sim_param_configs:
            samples["valuation"] = get_random_variates_pert(
                num_simulations,
                self.sim_param_configs["valuation"],
                0,
            )
        else:
            samples["valuation"] = np.full(num_simulations, 0)

        # ROI: Normal distribution
        if "roi" in self.sim_param_configs:
            roi_config = self.sim_param_configs["roi"]
            samples["roi"] = np.asarray(
                stats.norm.rvs(
                    loc=roi_config["mean"],
                    scale=roi_config["std_dev"],
                    size=num_simulations,
                )
            )
        else:
            samples["roi"] = np.full(num_simulations, self.base_params["annual_roi"])

        # Salary growth and dilution
        samples["salary_growth"] = get_random_variates_pert(
            num_simulations,
            self.sim_param_configs.get("salary_growth"),
            self.base_params["current_job_salary_growth_rate"],
        )
        samples["dilution"] = get_random_variates_pert(
            num_simulations,
            self.sim_param_configs.get("dilution"),
            np.nan,
        )

        return samples

    def calculate_outcomes(
        self,
        num_simulations: int,
        samples: dict[str, np.ndarray],
    ) -> dict[str, np.ndarray]:
        """Calculate outcomes iteratively for each simulation.

        This must iterate because each simulation has a different exit year,
        which changes the entire calculation structure.
        """
        from worth_it.calculations.base import EquityType
        from worth_it.calculations.opportunity_cost import (
            calculate_annual_opportunity_cost,
            create_monthly_data_grid,
        )
        from worth_it.calculations.startup_scenario import calculate_startup_scenario

        net_outcomes_list: list[float] = []
        final_opportunity_costs_list: list[float] = []

        for i in range(num_simulations):
            exit_year_sim = int(samples["exit_year"][i])

            # Build per-simulation params
            sim_startup_params = self.base_params["startup_params"].copy()
            sim_startup_params["exit_year"] = exit_year_sim
            dilution_val = samples["dilution"][i]
            sim_startup_params["simulated_dilution"] = (
                dilution_val if not np.isnan(dilution_val) else None
            )

            # Set valuation based on equity type
            if sim_startup_params["equity_type"] == EquityType.RSU:
                sim_startup_params["rsu_params"] = sim_startup_params["rsu_params"].copy()
                sim_startup_params["rsu_params"]["target_exit_valuation"] = samples["valuation"][i]
            else:
                sim_startup_params["options_params"] = sim_startup_params["options_params"].copy()
                sim_startup_params["options_params"]["target_exit_price_per_share"] = samples[
                    "valuation"
                ][i]

            # Run calculation pipeline
            monthly_df = create_monthly_data_grid(
                exit_year_sim,
                self.base_params["current_job_monthly_salary"],
                self.base_params["startup_monthly_salary"],
                samples["salary_growth"][i],
                dilution_rounds=sim_startup_params.get("rsu_params", {}).get("dilution_rounds"),
            )

            opportunity_cost_df = calculate_annual_opportunity_cost(
                monthly_df,
                samples["roi"][i],
                self.base_params["investment_frequency"],
                options_params=sim_startup_params.get("options_params"),
                startup_params=sim_startup_params,
            )
            final_opportunity_costs_list.append(
                opportunity_cost_df["Opportunity Cost (Invested Surplus)"].iloc[-1]
            )

            results = calculate_startup_scenario(opportunity_cost_df, sim_startup_params)
            net_outcome = results["final_payout_value"] - results["final_opportunity_cost"]
            net_outcomes_list.append(net_outcome)

        net_outcomes = np.array(net_outcomes_list)
        final_opportunity_costs = np.array(final_opportunity_costs_list)

        # Apply failure probability
        failure_mask = np.random.rand(num_simulations) < self.base_params["failure_probability"]
        net_outcomes[failure_mask] = -final_opportunity_costs[failure_mask]

        return {
            "net_outcomes": net_outcomes,
            "simulated_valuations": samples.get("valuation", np.array([])),
        }


def get_monte_carlo_simulation(
    base_params: dict[str, Any],
    sim_param_configs: dict[str, Any],
) -> MonteCarloSimulation:
    """Factory function to get the appropriate simulation implementation.

    Selects VectorizedMonteCarlo when exit_year is fixed (fast path),
    or IterativeMonteCarlo when exit_year varies (flexible path).

    Args:
        base_params: Base scenario parameters
        sim_param_configs: Simulation parameter configurations

    Returns:
        Appropriate MonteCarloSimulation subclass instance
    """
    if "exit_year" in sim_param_configs:
        return IterativeMonteCarlo(base_params, sim_param_configs)
    return VectorizedMonteCarlo(base_params, sim_param_configs)
