# Dilution Preview for New Funding Rounds

**Date**: 2025-12-10
**Issue**: #110
**Status**: Design Complete, Ready for Implementation

## Overview

Add a dilution preview panel that shows how new priced rounds will dilute existing stakeholders before confirming the round. The preview appears below the priced round form and updates in real-time as the user enters valuation and amount.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| When to show | Live during form entry | Exploratory UX - founders experiment with valuations |
| What to show | Table + side-by-side pie charts | Visual impact helps understanding |
| Where to show | Below the form | Visible while editing, no extra clicks |
| Calculation | Client-side | Simple math, no API latency needed |

## Data Flow

```
User inputs (pre-money + amount raised)
    ↓
Calculate post-money: pre_money + amount_raised
    ↓
Calculate new investor %: amount_raised / post_money
    ↓
Calculate dilution factor: pre_money / post_money
    ↓
Apply to each stakeholder: after_pct = before_pct × dilution_factor
    ↓
Render preview table + charts
```

## Component Structure

```
frontend/components/cap-table/
├── dilution-preview.tsx          # Main preview container
├── dilution-table.tsx            # Before/after/dilution table
└── dilution-comparison-charts.tsx # Side-by-side pie charts
```

### Component Hierarchy

```
PricedRoundForm
  └── DilutionPreview (visible when pre-money & amount > 0)
        ├── DilutionTable
        │     └── Rows: stakeholder, before %, after %, dilution %
        └── DilutionComparisonCharts
              ├── PieChart (Before)
              └── PieChart (After)
```

### Props Interface

```typescript
interface DilutionPreviewProps {
  stakeholders: Stakeholder[];
  optionPoolPct: number;
  preMoneyValuation: number;
  amountRaised: number;
  investorName?: string;
}

interface DilutionData {
  name: string;
  type: 'founder' | 'employee' | 'investor' | 'advisor' | 'option_pool' | 'new_investor';
  beforePct: number;
  afterPct: number;
  dilutionPct: number;  // Negative value, e.g., -16.7
  isNew: boolean;
}
```

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Dilution Preview                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Stakeholder     │ Before  │ After   │ Dilution          │   │
│  ├─────────────────┼─────────┼─────────┼───────────────────┤   │
│  │ Founder 1       │ 40.0%   │ 33.3%   │ -16.7%  ▼         │   │
│  │ Founder 2       │ 40.0%   │ 33.3%   │ -16.7%  ▼         │   │
│  │ Option Pool     │ 20.0%   │ 16.7%   │ -16.7%  ▼         │   │
│  │ New Investor    │  —      │ 16.7%   │ (new)   ★         │   │
│  └─────────────────┴─────────┴─────────┴───────────────────┘   │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │     BEFORE           │    │     AFTER            │          │
│  │    ┌─────────┐       │    │    ┌─────────┐       │          │
│  │    │  Pie    │       │    │    │  Pie    │       │          │
│  │    │  Chart  │       │    │    │  Chart  │       │          │
│  │    └─────────┘       │    │    └─────────┘       │          │
│  └──────────────────────┘    └──────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Visual Design

- **Down arrow (▼)** in red for diluted stakeholders
- **Star (★)** for new investor entry
- **Consistent colors** between table and pie chart (reuse chart-1 through chart-5)
- **Fade animation** when values change
- **Responsive**: Charts side-by-side on desktop, stacked on mobile

## Files to Modify

| File | Change |
|------|--------|
| `cap-table-manager.tsx` | Pass stakeholder data to FundingRoundsManager |
| `funding-rounds-manager.tsx` | Pass stakeholders and optionPoolPct to PricedRoundForm |
| `priced-round-form.tsx` | Add DilutionPreview component below form inputs |

## New Files

| File | Purpose |
|------|---------|
| `dilution-preview.tsx` | Container with calculation logic and debouncing |
| `dilution-table.tsx` | Table showing before/after/dilution percentages |
| `dilution-comparison-charts.tsx` | Side-by-side pie charts using Recharts |

## Calculation Logic

```typescript
function calculateDilution(
  stakeholders: Stakeholder[],
  optionPoolPct: number,
  preMoneyValuation: number,
  amountRaised: number,
  investorName: string = "New Investor"
): DilutionData[] {
  const postMoney = preMoneyValuation + amountRaised;
  const dilutionFactor = preMoneyValuation / postMoney;
  const newInvestorPct = (amountRaised / postMoney) * 100;

  const results: DilutionData[] = [];

  // Existing stakeholders
  for (const s of stakeholders) {
    const afterPct = s.ownership_pct * dilutionFactor;
    const dilutionPct = ((afterPct - s.ownership_pct) / s.ownership_pct) * 100;
    results.push({
      name: s.name,
      type: s.type,
      beforePct: s.ownership_pct,
      afterPct,
      dilutionPct,
      isNew: false,
    });
  }

  // Option pool
  if (optionPoolPct > 0) {
    const afterPct = optionPoolPct * dilutionFactor;
    const dilutionPct = ((afterPct - optionPoolPct) / optionPoolPct) * 100;
    results.push({
      name: "Option Pool",
      type: "option_pool",
      beforePct: optionPoolPct,
      afterPct,
      dilutionPct,
      isNew: false,
    });
  }

  // New investor
  results.push({
    name: investorName,
    type: "new_investor",
    beforePct: 0,
    afterPct: newInvestorPct,
    dilutionPct: 0,
    isNew: true,
  });

  return results;
}
```

## Acceptance Criteria

- [x] Design: Preview shows all stakeholders with before/after ownership
- [x] Design: Dilution percentage is calculated correctly
- [x] Design: Preview updates in real-time as round parameters change
- [x] Design: Clear visual indication of who gets diluted and by how much

## Implementation Checklist

- [ ] Create `dilution-preview.tsx` with calculation logic
- [ ] Create `dilution-table.tsx` component
- [ ] Create `dilution-comparison-charts.tsx` with side-by-side pie charts
- [ ] Update `priced-round-form.tsx` to include DilutionPreview
- [ ] Update `funding-rounds-manager.tsx` to pass stakeholder data
- [ ] Update `cap-table-manager.tsx` to pass stakeholder data through
- [ ] Add unit tests for dilution calculation
- [ ] Test responsive layout (desktop/mobile)
- [ ] Run type-check and lint
