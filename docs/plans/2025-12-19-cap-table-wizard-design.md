# Cap Table Quick-Start Wizard Design

**Issue:** #146
**Date:** 2025-12-19
**Status:** Approved

## Overview

A step-by-step wizard that helps first-time founders set up their cap table without being overwhelmed by the full 22-component interface.

## When Wizard Appears

- **Auto-show:** When cap table is empty (no stakeholders)
- **Manual trigger:** "Run Wizard" button in cap table header (always visible)
- **Skip option:** "Skip Wizard" link during wizard → sets localStorage flag

## Visual Style

**Inline replacement** - Wizard completely replaces the cap table UI until completed. The full interface appears as a "reveal" moment on completion.

## Wizard Steps

### Step 1: Founders (Required)

- Add 1-4 founders with name + ownership percentage
- Dynamic rows with [+ Add] button
- Real-time total validation (must = 100% or show warning)
- Tip: "Equal splits are common for co-founders"

### Step 2: Option Pool (Required)

- Radio button choice: 10% / 15% / 20%
- Brief explanation for each option
- Tip: "This comes from founder equity proportionally"

### Step 3: Advisors (Optional)

- Ask first: "Do you have any advisors?"
- If yes → simplified form (name + % + standard 4-year vesting)
- If no → skip to next step

### Step 4: First Funding (Optional)

- Ask first: "Have you raised any money?"
- If yes → funding type selector (SAFE / Note / Priced)
- Simplified form: investor name, amount, valuation cap
- Can add multiple instruments
- If no → skip to completion

### Step 5: Completion

- Summary card showing what was created
- Next steps guidance (add stakeholders, model rounds, analyze exits)
- Primary CTA: "View Your Cap Table"

## Component Architecture

```
components/cap-table/wizard/
├── cap-table-wizard.tsx      # Main container, step state management
├── wizard-progress.tsx       # Progress bar (Step X of 5)
├── steps/
│   ├── step-founders.tsx     # Founder entry form
│   ├── step-option-pool.tsx  # Pool size selection
│   ├── step-advisors.tsx     # Optional advisor entry
│   ├── step-funding.tsx      # Optional funding entry
│   └── step-complete.tsx     # Summary and CTA
└── index.ts                  # Exports
```

## Data Transformation

```typescript
interface WizardData {
  founders: { name: string; ownershipPct: number }[];
  optionPoolPct: number;
  advisors: { name: string; ownershipPct: number }[];
  funding: {
    type: 'SAFE' | 'CONVERTIBLE_NOTE' | 'PRICED_ROUND';
    investorName: string;
    amount: number;
    valuationCap?: number;
  }[];
}
```

On completion:

1. Create `Stakeholder` entries for founders (type: 'founder')
2. Create `Stakeholder` entries for advisors (type: 'advisor', with vesting)
3. Set `option_pool_pct` on cap table
4. Create `FundingInstrument` entries for any funding
5. Call parent callbacks to update state

## Integration

```tsx
// In cap-table-manager.tsx
const [wizardSkipped, setWizardSkipped] = useState(() =>
  localStorage.getItem('cap-table-wizard-skipped') === 'true'
);

if (capTable.stakeholders.length === 0 && !wizardSkipped) {
  return (
    <CapTableWizard
      onComplete={handleWizardComplete}
      onSkip={() => {
        localStorage.setItem('cap-table-wizard-skipped', 'true');
        setWizardSkipped(true);
      }}
    />
  );
}
```

## UI Components to Reuse

- `Card`, `Button`, `Input` from shadcn/ui
- `RadioGroup` for option pool selection
- `Badge` for summary display
- Motion components for step transitions

## Acceptance Criteria

- [ ] Wizard appears for empty cap tables
- [ ] 5 steps with clear progress indicator
- [ ] Optional steps use "ask first" pattern
- [ ] Can skip wizard entirely
- [ ] Results in valid cap table structure
- [ ] "Run Wizard" button available after completion
- [ ] Smooth transitions between steps
- [ ] Mobile responsive

## Estimated Effort

Medium (3-4 hours)

## Testing Requirements

- Unit tests for data transformation logic
- Unit tests for each step component
- E2E test for complete wizard flow
- E2E test for skip behavior
