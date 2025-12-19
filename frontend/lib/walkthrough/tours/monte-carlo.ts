import type { Tour } from "../types";

export const monteCarloTour: Tour = {
  id: "monte-carlo",
  name: "Monte Carlo Simulation",
  description: "Understand probability-based outcome modeling",
  prerequisites: ["job-analysis"],
  steps: [
    {
      target: '[data-tour="monte-carlo-section"]',
      title: "Monte Carlo Simulation",
      description:
        "This section runs thousands of simulations with random variations to show the range of possible outcomes for your equity.",
      position: "top",
    },
    {
      target: '[data-tour="monte-carlo-parameters"]',
      title: "Simulation Parameters",
      description:
        "Adjust volatility (how much values vary), iterations (number of simulations), and the random seed for reproducibility.",
      position: "right",
    },
    {
      target: '[data-tour="monte-carlo-run"]',
      title: "Run Simulation",
      description:
        "Click to start the Monte Carlo simulation. Progress will be shown in real-time via WebSocket updates.",
      position: "bottom",
    },
    {
      target: '[data-tour="monte-carlo-chart"]',
      title: "Distribution Chart",
      description:
        "The histogram shows the distribution of outcomes. The wider the spread, the more uncertainty in your equity value.",
      position: "top",
    },
    {
      target: '[data-tour="monte-carlo-stats"]',
      title: "Statistical Summary",
      description:
        "Key statistics: median outcome (50% above/below), percentiles (P10/P90), and probability of positive return.",
      position: "left",
    },
  ],
};
