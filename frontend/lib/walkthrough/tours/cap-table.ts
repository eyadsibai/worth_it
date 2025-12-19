import type { Tour } from "../types";

export const capTableTour: Tour = {
  id: "cap-table",
  name: "Cap Table Management",
  description: "Learn how to model company ownership and dilution",
  steps: [
    {
      target: '[data-tour="cap-table-nav"]',
      title: "Cap Table Mode",
      description:
        "Switch to Cap Table mode for founders and investors to model ownership, dilution, and liquidation preferences.",
      position: "bottom",
    },
    {
      target: '[data-tour="stakeholders-table"]',
      title: "Stakeholders",
      description:
        "Add shareholders and their ownership. Each stakeholder has a share count and ownership percentage that updates automatically.",
      position: "right",
    },
    {
      target: '[data-tour="add-stakeholder"]',
      title: "Add Stakeholder",
      description:
        "Add founders, investors, or employee pools. You can set share counts and the table calculates ownership percentages.",
      position: "bottom",
    },
    {
      target: '[data-tour="instruments-section"]',
      title: "Convertible Instruments",
      description:
        "Model SAFEs, convertible notes, and other instruments that convert to equity on a priced round.",
      position: "top",
    },
    {
      target: '[data-tour="dilution-preview"]',
      title: "Dilution Preview",
      description:
        "See how a new funding round affects everyone's ownership. Enter the investment amount and pre-money valuation.",
      position: "left",
    },
    {
      target: '[data-tour="export-cap-table"]',
      title: "Export Your Cap Table",
      description:
        "Export your cap table to CSV for further analysis or to share with advisors.",
      position: "bottom",
    },
  ],
};
