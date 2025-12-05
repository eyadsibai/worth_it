# Cap Table & Founder Equity Simulation Design

**Date**: 2025-12-05
**Status**: Design Complete, Ready for Implementation

## Overview

Transform Worth It from an employee-focused equity calculator to a comprehensive tool serving **both employees evaluating job offers AND founders/co-founders planning equity**.

### Target Users

1. **Employees**: Evaluating startup job offers with equity
2. **Founders**: Planning equity distribution, funding rounds, and exit scenarios

### Key Features

1. **Cap Table Evolution**: Track ownership through funding rounds
2. **Funding Instrument Comparison**: SAFE vs Convertible Note vs Priced Round
3. **Exit Scenario Modeling**: Liquidation preferences and payout distribution
4. **Scenario Comparison**: Side-by-side "what if" analysis

---

## Section 1: Core Data Model

### Cap Table as Source of Truth

```typescript
interface CapTable {
  stakeholders: Stakeholder[];
  instruments: FundingInstrument[];
  rounds: FundingRound[];
}

interface Stakeholder {
  id: string;
  name: string;
  type: 'founder' | 'employee' | 'investor' | 'advisor';
  shares: number;
  shareClass: 'common' | 'preferred';
  vestingSchedule?: VestingSchedule;
}

interface FundingInstrument {
  id: string;
  type: 'SAFE' | 'CONVERTIBLE_NOTE' | 'PRICED_ROUND';
  investorName: string;
  amount: number;
  terms: SAFETerms | ConvertibleNoteTerms | PricedRoundTerms;
  status: 'outstanding' | 'converted' | 'cancelled';
  convertedToShares?: number;
}

interface FundingRound {
  id: string;
  name: string;
  date: Date;
  preMoneyValuation: number;
  amountRaised: number;
  pricePerShare: number;
  conversions: InstrumentConversion[];
}
```

### Key Relationships

```
CapTable
  └── Stakeholders (who owns what)
        └── Shares (common or preferred)
        └── Vesting (when they get it)
  └── Instruments (outstanding SAFEs, notes)
        └── Convert to shares when priced round happens
  └── Rounds (funding history)
        └── Triggers conversions
        └── Creates new stakeholders (investors)
```

---

## Section 2: UI Flow & Navigation

### Unified Flow (Cap Table as Foundation)

```
┌─────────────────────────────────────────────────────────────────┐
│  Worth It - Equity Calculator                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [I'm an Employee ▼]  ←── Toggle ──→  [I'm a Founder ▼]        │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  EMPLOYEE MODE:                   FOUNDER MODE:                 │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │ 1. Current Job      │         │ 1. Cap Table Setup  │       │
│  │ 2. Startup Offer    │         │    - Founders       │       │
│  │ 3. Compare Results  │         │    - Option Pool    │       │
│  └─────────────────────┘         ├─────────────────────┤       │
│                                  │ 2. Funding Rounds   │       │
│                                  │    - Add SAFE       │       │
│                                  │    - Add Note       │       │
│                                  │    - Priced Round   │       │
│                                  ├─────────────────────┤       │
│                                  │ 3. Exit Scenarios   │       │
│                                  │    - Model exits    │       │
│                                  │    - Compare paths  │       │
│                                  └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Employee Flow (Enhanced)

1. Input current job details
2. Input startup offer (with equity type selection)
3. Optional: Add dilution simulation
4. View comparison results

### Founder Flow (New)

1. **Cap Table Setup**
   - Add co-founders with ownership %
   - Reserve option pool (typically 10-20%)
   - Set initial valuation (optional)

2. **Funding Rounds**
   - Add SAFEs/Convertible Notes (pre-priced)
   - Model priced rounds (triggers conversion)
   - See ownership dilution after each round

3. **Exit Scenarios**
   - Model different exit valuations
   - See payout distribution (waterfall)
   - Compare scenarios side-by-side

---

## Section 3: Funding Instrument Mechanics

### SAFE (Simple Agreement for Future Equity)

**Terms**:
- Valuation Cap
- Discount (optional)
- Pro-rata rights (optional)
- MFN clause (optional)

**Conversion** (triggered by priced round):
```
conversion_price = min(
  valuation_cap / fully_diluted_shares,
  priced_round_price × (1 - discount)
)
shares_issued = investment_amount / conversion_price
```

**Example**:
```
SAFE: $500K at $5M cap, 20% discount
Series A: $10M pre-money, $1/share

Cap price: $5M / 5M shares = $1.00
Discount price: $1.00 × 0.80 = $0.80

Conversion price = min($1.00, $0.80) = $0.80
Shares = $500K / $0.80 = 625,000 shares
```

### Convertible Note

**Terms** (same as SAFE plus):
- Interest Rate
- Maturity Date
- Principal + Accrued Interest converts

**Conversion**:
```
accrued_interest = principal × interest_rate × time_elapsed_years
total_converting = principal + accrued_interest
conversion_price = min(cap_price, discount_price)
shares_issued = total_converting / conversion_price
```

### Priced Round

**Terms**:
- Pre-money Valuation
- Amount Raised
- Price Per Share
- Liquidation Preference (typically 1x non-participating)
- Board seats, anti-dilution, etc. (future)

**Mechanics**:
```
pre_money_valuation = $10M
amount_raised = $2M
post_money = $12M
new_investor_ownership = $2M / $12M = 16.67%
existing_dilution = amount_raised / post_money = 16.67%
```

---

## Section 4: Exit Waterfall Calculation

### Simple 1x Non-Participating (Starting Point)

Investors choose between:
- **Option A**: Take preference (get investment back)
- **Option B**: Convert to common (participate pro-rata)

They pick whichever is higher.

**Example - High Exit**:
```
Exit Proceeds: $50M
Investor: $5M invested, 20% ownership, 1x non-participating

Option A (preference): $5M
Option B (convert): $50M × 20% = $10M

Investor picks $10M (convert)
Founders get: $50M × 80% = $40M
```

**Example - Low Exit**:
```
Exit Proceeds: $10M
Investor: $5M invested, 20% ownership

Option A (preference): $5M
Option B (convert): $10M × 20% = $2M

Investor picks $5M (preference)
Remaining for common: $10M - $5M = $5M
Founders get: $5M (less than their 80% ownership would suggest)
```

### Calculation Flow

```
1. Sort investors by seniority (most recent first, typically)
2. For each investor with preference:
   a. Calculate preference amount (investment × multiplier)
   b. Calculate conversion value (exit_value × ownership_pct)
   c. Investor picks max(preference, conversion) for non-participating
3. Remaining proceeds go to common pro-rata
```

### Data Model

```typescript
interface LiquidationPreference {
  multiplier: number;        // 1x, 2x, etc.
  participating: boolean;    // false for simple model
  cap?: number;              // participation cap (if participating)
  seniority: number;         // stack order (1 = most senior)
}
```

**Starting Simple**:
- All investors: 1x non-participating
- Pari passu (equal seniority)
- Founders hold common with no preferences

---

## Section 5: Scenario Comparison UX

### Use Cases

1. **Funding Path Comparison**: "SAFE at $10M cap vs Priced Round at $8M"
2. **Exit Value Comparison**: "What if exit is $50M vs $100M vs $200M?"
3. **Dilution Comparison**: "Take $2M now vs wait and raise $5M later"

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Compare Scenarios                                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Scenario A  │  │ Scenario B  │  │ + Add       │         │
│  │ (Base)      │  │ (Modified)  │  │ Scenario    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  Variable: Exit Valuation                                   │
│  ┌──────────────────────────────────────────────┐          │
│  │  $25M    $50M    $100M    $200M    $500M     │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  Results Comparison:                                        │
│  ┌────────────────────────────────────────────────┐        │
│  │  Stakeholder  │ Scenario A │ Scenario B │ Δ    │        │
│  │  Founder 1    │ $12.5M     │ $15.2M     │ +22% │        │
│  │  Founder 2    │ $12.5M     │ $15.2M     │ +22% │        │
│  │  SAFE Holder  │ $5M        │ $8M        │ +60% │        │
│  │  Series A     │ $10M       │ $11.6M     │ +16% │        │
│  └────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Key Visualizations

1. **Payout vs Exit Value**: Line chart showing each stakeholder's payout
2. **Ownership Pie**: Side-by-side pie charts per scenario
3. **Break-even Analysis**: Exit value where founder beats corporate job

---

## Section 6: Implementation Phases

### Phase 1: Foundation
- [ ] Cap table data model with stakeholders
- [ ] Simple ownership tracking (no instruments yet)
- [ ] Basic exit calculator (no preferences)
- [ ] Pie chart visualization
- [ ] Founder mode toggle in UI

### Phase 2: Funding Instruments
- [ ] SAFE support with conversion mechanics
- [ ] Convertible Note support (interest, maturity)
- [ ] Priced Round triggers conversion
- [ ] Cap table evolution view (before/after each round)

### Phase 3: Exit Modeling
- [ ] 1x non-participating liquidation preference
- [ ] Exit waterfall calculator
- [ ] Payout distribution chart
- [ ] Break-even analysis

### Phase 4: Scenario Comparison
- [ ] Save/duplicate scenarios
- [ ] Side-by-side comparison view
- [ ] Sensitivity charts (payout vs exit value slider)
- [ ] Export comparison results

### Phase 5: Advanced (Future)
- [ ] Participating preferred (double-dip)
- [ ] Multiple liquidation stacks (seniority)
- [ ] Option pool shuffling
- [ ] Anti-dilution provisions
- [ ] Pro-forma cap table modeling

---

## Technical Notes

### Frontend Changes
- New route: `/founder` or mode toggle on main page
- Cap table state management (likely React Context or Zustand)
- New form components for stakeholders, instruments
- New chart components for waterfall, ownership evolution

### Backend Changes
- New endpoints for cap table CRUD
- Conversion calculation endpoints
- Exit waterfall calculation endpoint
- Scenario comparison endpoint

### Schemas
- Extend Zod schemas for new data types
- Match Pydantic models in backend
- Validation for instrument terms
