import type { Tour } from "../types";

export const waterfallTour: Tour = {
  id: "waterfall",
  name: "Waterfall Analysis",
  description: "Understand how exit proceeds are distributed",
  prerequisites: ["cap-table"],
  steps: [
    {
      target: '[data-tour="waterfall-section"]',
      title: "Waterfall Analysis",
      description:
        "See how proceeds flow at different exit valuations. Liquidation preferences mean investors get paid first.",
      position: "top",
    },
    {
      target: '[data-tour="preference-tiers"]',
      title: "Preference Tiers",
      description:
        "Configure liquidation preferences. 1x non-participating means investors get their money back OR convert to common shares.",
      position: "right",
    },
    {
      target: '[data-tour="exit-scenarios"]',
      title: "Exit Scenarios",
      description:
        "Enter different exit valuations to see how proceeds would be distributed at each level.",
      position: "bottom",
    },
    {
      target: '[data-tour="waterfall-chart"]',
      title: "Distribution Chart",
      description:
        "The stacked bar chart shows how each stakeholder's payout changes across exit scenarios. Watch for the 'kink' where preferences stop mattering.",
      position: "top",
    },
    {
      target: '[data-tour="waterfall-summary"]',
      title: "Plain English Summary",
      description:
        "A human-readable explanation of what the waterfall means for each stakeholder group at different exit sizes.",
      position: "left",
    },
  ],
};
