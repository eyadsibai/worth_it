import type { CapTable, Stakeholder, FundingInstrument, PreferenceTier } from "@/lib/schemas";

export interface FounderTemplate {
  id: string;
  name: string;
  description: string;
  capTable: CapTable;
  instruments?: FundingInstrument[];
  preferenceTiers?: PreferenceTier[];
}

/**
 * Ids for the preferred shareholders a preference tier points at.
 *
 * A tier with no `stakeholder_ids` claims a liquidation preference for nobody,
 * so the waterfall silently drops it. Hoisting the id lets the stakeholder and
 * its tier be declared from the same source.
 *
 * Every id in this file is a literal. Templates are static data, and a module
 * evaluated once per server render, once per browser tab and again on every Fast
 * Refresh would otherwise describe a different cap table in each of them.
 */
const POST_SEED_PREFERRED_ID = "tpl-post-seed-safe-investors";
const SERIES_A_SEED_INVESTORS_ID = "tpl-series-a-seed-investors";

/**
 * Pre-configured cap table templates for Founder mode.
 * Each template represents a common startup scenario with realistic values.
 */
export const FOUNDER_TEMPLATES: FounderTemplate[] = [
  {
    id: "two-founders",
    name: "2-Person Founding Team",
    description: "50/50 split with 15% option pool reserved",
    capTable: {
      stakeholders: [
        {
          id: "tpl-two-founders-ceo",
          name: "Founder 1 (CEO)",
          type: "founder",
          shares: 4250000,
          ownership_pct: 42.5,
          share_class: "common",
          vesting: {
            total_shares: 4250000,
            vesting_months: 48,
            cliff_months: 12,
            vested_shares: 0,
          },
        },
        {
          id: "tpl-two-founders-cto",
          name: "Founder 2 (CTO)",
          type: "founder",
          shares: 4250000,
          ownership_pct: 42.5,
          share_class: "common",
          vesting: {
            total_shares: 4250000,
            vesting_months: 48,
            cliff_months: 12,
            vested_shares: 0,
          },
        },
      ] as Stakeholder[],
      total_shares: 10000000,
      option_pool_pct: 15,
    },
    instruments: [],
    preferenceTiers: [],
  },
  {
    id: "solo-founder",
    name: "Solo Founder + Early Hire",
    description: "80% founder, 5% early employee, 15% pool",
    capTable: {
      stakeholders: [
        {
          id: "tpl-solo-founder-ceo",
          name: "Founder (CEO)",
          type: "founder",
          shares: 8000000,
          ownership_pct: 80,
          share_class: "common",
          vesting: {
            total_shares: 8000000,
            vesting_months: 48,
            cliff_months: 0, // Founder - no cliff
            vested_shares: 2000000, // 25% vested
          },
        },
        {
          id: "tpl-solo-founder-employee-1",
          name: "Employee #1 (Engineering)",
          type: "employee",
          shares: 500000,
          ownership_pct: 5,
          share_class: "common",
          vesting: {
            total_shares: 500000,
            vesting_months: 48,
            cliff_months: 12,
            vested_shares: 0,
          },
        },
      ] as Stakeholder[],
      total_shares: 10000000,
      option_pool_pct: 15,
    },
    instruments: [],
    preferenceTiers: [],
  },
  {
    id: "post-seed",
    name: "Post-Seed Cap Table",
    description: "Founders + Angels + SAFE investors",
    capTable: {
      stakeholders: [
        {
          id: "tpl-post-seed-founder-1",
          name: "Founder 1",
          type: "founder",
          shares: 3500000,
          ownership_pct: 35,
          share_class: "common",
        },
        {
          id: "tpl-post-seed-founder-2",
          name: "Founder 2",
          type: "founder",
          shares: 3000000,
          ownership_pct: 30,
          share_class: "common",
        },
        {
          id: "tpl-post-seed-angel-syndicate",
          name: "Angel Syndicate",
          type: "investor",
          shares: 1000000,
          ownership_pct: 10,
          share_class: "common",
        },
        {
          id: POST_SEED_PREFERRED_ID,
          name: "SAFE Investors (converted)",
          type: "investor",
          shares: 1500000,
          ownership_pct: 15,
          share_class: "preferred",
        },
      ] as Stakeholder[],
      total_shares: 10000000,
      option_pool_pct: 10,
    },
    instruments: [
      {
        id: "tpl-post-seed-safe-seed-fund-i",
        type: "SAFE",
        investor_name: "Seed Fund I",
        investment_amount: 500000,
        valuation_cap: 8000000,
        discount_pct: 20,
        pro_rata_rights: true,
        mfn_clause: false,
        status: "converted",
        converted_shares: 750000,
      },
      {
        id: "tpl-post-seed-safe-angel-group",
        type: "SAFE",
        investor_name: "Angel Group",
        investment_amount: 250000,
        valuation_cap: 6000000,
        discount_pct: 0,
        pro_rata_rights: false,
        mfn_clause: true,
        status: "converted",
        converted_shares: 500000,
      },
    ] as FundingInstrument[],
    preferenceTiers: [
      {
        id: "tpl-post-seed-tier-seed-preferred",
        name: "Seed Preferred",
        seniority: 1,
        investment_amount: 750000,
        liquidation_multiplier: 1,
        participating: false,
        stakeholder_ids: [POST_SEED_PREFERRED_ID],
      },
    ] as PreferenceTier[],
  },
  {
    id: "series-a-ready",
    name: "Series A Ready",
    description: "Full cap table with option pool refresh",
    capTable: {
      stakeholders: [
        {
          id: "tpl-series-a-ceo",
          name: "CEO / Co-founder",
          type: "founder",
          shares: 2800000,
          ownership_pct: 28,
          share_class: "common",
        },
        {
          id: "tpl-series-a-cto",
          name: "CTO / Co-founder",
          type: "founder",
          shares: 2400000,
          ownership_pct: 24,
          share_class: "common",
        },
        {
          id: SERIES_A_SEED_INVESTORS_ID,
          name: "Seed Investors",
          type: "investor",
          shares: 1500000,
          ownership_pct: 15,
          share_class: "preferred",
        },
        {
          id: "tpl-series-a-employee-pool",
          name: "Employee Pool (allocated)",
          type: "employee",
          shares: 800000,
          ownership_pct: 8,
          share_class: "common",
        },
        {
          id: "tpl-series-a-advisors",
          name: "Advisors",
          type: "advisor",
          shares: 500000,
          ownership_pct: 5,
          share_class: "common",
        },
      ] as Stakeholder[],
      total_shares: 10000000,
      option_pool_pct: 20, // Refreshed for Series A
    },
    instruments: [
      {
        id: "tpl-series-a-priced-seed-round",
        type: "PRICED_ROUND",
        round_name: "Seed",
        lead_investor: "Seed Ventures",
        amount_raised: 2000000,
        pre_money_valuation: 8000000,
        price_per_share: 0.8,
        liquidation_multiplier: 1,
        participating: false,
        new_shares_issued: 2500000,
        post_money_valuation: 10000000,
      },
    ] as FundingInstrument[],
    preferenceTiers: [
      {
        id: "tpl-series-a-tier-seed-preferred",
        name: "Seed Preferred",
        seniority: 1,
        investment_amount: 2000000,
        liquidation_multiplier: 1,
        participating: false,
        stakeholder_ids: [SERIES_A_SEED_INVESTORS_ID],
      },
    ] as PreferenceTier[],
  },
];

/**
 * Get a founder template by its ID
 */
export function getFounderTemplateById(id: string): FounderTemplate | undefined {
  return FOUNDER_TEMPLATES.find((template) => template.id === id);
}
