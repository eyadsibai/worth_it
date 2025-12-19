import type { Tour } from "../types";

export const jobAnalysisTour: Tour = {
  id: "job-analysis",
  name: "Job Offer Analysis",
  description: "Learn how to compare your current job with a new startup offer",
  steps: [
    {
      target: '[data-tour="current-job-card"]',
      title: "Your Current Compensation",
      description:
        "Start by entering your current job details. Include your monthly salary, any bonuses, and benefits you receive.",
      position: "right",
    },
    {
      target: '[data-tour="startup-offer-card"]',
      title: "The Startup Offer",
      description:
        "Enter the details of the startup offer. Include salary, equity type (RSUs or Stock Options), and the vesting schedule.",
      position: "left",
    },
    {
      target: '[data-tour="equity-type-selector"]',
      title: "Equity Type",
      description:
        "Choose between RSUs (Restricted Stock Units) or Stock Options. RSUs are shares given to you, while options let you buy shares at a set price.",
      position: "bottom",
    },
    {
      target: '[data-tour="exit-valuation-input"]',
      title: "Exit Valuation",
      description:
        "Estimate what the company might be worth when you can sell your equity. This is a key assumption in your analysis.",
      position: "bottom",
    },
    {
      target: '[data-tour="analyze-button"]',
      title: "Run the Analysis",
      description:
        "Click here to calculate whether the startup offer is worth it compared to staying at your current job.",
      position: "top",
    },
    {
      target: '[data-tour="results-section"]',
      title: "Your Results",
      description:
        "See a breakdown of your potential outcomes, including net benefit and monthly equivalents over the vesting period.",
      position: "top",
    },
  ],
};
