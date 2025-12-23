# Waterfall Analysis Design

**Issue**: #111 - Feature: Waterfall Analysis for Exit Proceeds Distribution
**Date**: 2025-12-11
**Status**: Approved

## Summary

Implement a waterfall analysis feature showing how exit proceeds are distributed respecting liquidation preferences. The feature will live in Founder Mode alongside the cap table simulator.

## Requirements

From issue #111:

- Liquidation preferences are paid before common
- Participating preferred gets preference + pro-rata share
- Non-participating preferred converts if pro-rata is higher
- Distribution table shows exact amounts per stakeholder
- Supports multiple preference stacks

## User Experience

### Output Format

- **Distribution table**: Shows $ amounts and % at multiple valuations
- **Stacked bar chart**: Visual showing how proceeds split across valuations
- **Step-by-step breakdown**: Educational view of who gets paid when
- **Interactive slider**: Explore specific valuations dynamically

### Input Flow

1. User opens Founder Mode → "Waterfall Analysis" tab
2. Clicks "Generate from Rounds" → auto-populates from existing PricedRounds
3. (Optional) Edits tiers - reorder seniority, adjust terms
4. Views chart + table at preset valuations ($10M, $50M, $100M, $500M)
5. Uses slider to explore specific valuations

## Data Models

### PreferenceTier

```python
class PreferenceTier(BaseModel):
    """A single tier in the liquidation preference stack."""
    id: str
    name: str  # e.g., "Series B", "Series A"
    seniority: int  # 1 = most senior (paid first), same number = pari passu
    investment_amount: float  # Total invested at this tier
    liquidation_multiplier: float = 1.0  # 1x, 2x, etc.
    participating: bool = False
    participation_cap: float | None = None  # e.g., 3.0 for 3x cap
    stakeholder_ids: list[str]  # Links to Stakeholder records
```

### WaterfallRequest

```python
class WaterfallRequest(BaseModel):
    """Request to calculate waterfall distribution."""
    cap_table: CapTable
    preference_tiers: list[PreferenceTier]
    exit_valuations: list[float]  # e.g., [10M, 50M, 100M, 500M]
```

### WaterfallResponse

```python
class StakeholderPayout(BaseModel):
    """Payout for a single stakeholder."""
    stakeholder_id: str
    name: str
    payout_amount: float
    payout_pct: float  # Percentage of total exit
    roi: float | None  # Return on investment (for investors)

class WaterfallStep(BaseModel):
    """A single step in the waterfall breakdown."""
    step_number: int
    description: str  # e.g., "Series B liquidation preference (1x)"
    amount: float
    recipients: list[str]  # Stakeholder names
    remaining_proceeds: float

class WaterfallDistribution(BaseModel):
    """Distribution result for a single exit valuation."""
    exit_valuation: float
    waterfall_steps: list[WaterfallStep]
    stakeholder_payouts: list[StakeholderPayout]
    summary: dict  # {"common_pct": 0, "preferred_pct": 100}

class WaterfallResponse(BaseModel):
    """Full waterfall analysis response."""
    distributions_by_valuation: list[WaterfallDistribution]
    breakeven_points: dict[str, float]  # {"founders": 25M, "series_a": 5M}
```

## Core Algorithm

```python
def calculate_waterfall(
    cap_table: dict,
    preference_tiers: list[dict],
    exit_valuation: float,
) -> dict:
    """
    Distribute exit proceeds respecting liquidation preferences.

    Algorithm:
    1. Sort tiers by seniority (1 = most senior, paid first)
    2. For each tier in order:
       - Pay liquidation preference (investment × multiplier)
       - Track remaining proceeds
    3. For participating preferred:
       - Calculate pro-rata share of remaining proceeds
       - Apply participation cap if set
    4. For non-participating preferred:
       - Compare preference vs. conversion value
       - Take whichever is higher
    5. Distribute remaining to common shareholders pro-rata
    """
```

### Edge Cases

- **Insufficient proceeds**: Senior tiers paid first, junior may get partial/nothing
- **Conversion decision**: Non-participating preferred auto-converts when pro-rata > preference
- **Participation caps**: Stop participating when cap is reached
- **Pari passu tiers**: Same seniority = split proportionally if proceeds insufficient

## API Endpoint

```python
@app.post("/waterfall", response_model=WaterfallResponse)
def calculate_waterfall_distribution(request: WaterfallRequest):
    """Calculate exit proceeds distribution across multiple valuations."""
```

### Example Request

```json
{
  "cap_table": { "stakeholders": [...], "total_shares": 10000000 },
  "preference_tiers": [
    {
      "id": "tier-1",
      "name": "Series B",
      "seniority": 1,
      "investment_amount": 20000000,
      "liquidation_multiplier": 1.0,
      "participating": true,
      "participation_cap": 3.0,
      "stakeholder_ids": ["sb-investor-1"]
    },
    {
      "id": "tier-2",
      "name": "Series A",
      "seniority": 2,
      "investment_amount": 5000000,
      "liquidation_multiplier": 1.0,
      "participating": false,
      "participation_cap": null,
      "stakeholder_ids": ["sa-investor-1"]
    }
  ],
  "exit_valuations": [10000000, 50000000, 100000000, 500000000]
}
```

## Frontend Components

```
components/
├── waterfall/
│   ├── WaterfallAnalysis.tsx      # Main container
│   ├── PreferenceStackEditor.tsx  # Edit/reorder preference tiers
│   ├── WaterfallChart.tsx         # Stacked bar chart (Recharts)
│   ├── WaterfallTable.tsx         # Distribution table by valuation
│   ├── WaterfallSteps.tsx         # Step-by-step breakdown panel
│   └── ValuationSlider.tsx        # Interactive slider for exploration
```

### Chart Design

- X-axis: Exit valuation ($10M → $500M)
- Y-axis: Percentage of proceeds (0-100%)
- Stacked bars: Different colors per stakeholder/tier
- Hover: Shows exact $ amounts

## Implementation Order

1. **Backend models** - Add to `models.py`
2. **Core calculation** - Implement in `calculations.py` with TDD
3. **API endpoint** - Add `/waterfall` to `api.py`
4. **Frontend schemas** - Add Zod schemas to `schemas.ts`
5. **API client** - Add `useWaterfall` hook
6. **UI components** - Build chart, table, slider, editor
7. **Integration** - Wire into Founder Mode

## Test Plan

### Backend Tests (test_calculations.py)

```python
- test_waterfall_single_tier_non_participating
- test_waterfall_participating_uncapped
- test_waterfall_participating_with_cap
- test_waterfall_multiple_tiers_seniority
- test_waterfall_pari_passu_tiers
- test_waterfall_insufficient_proceeds
- test_waterfall_conversion_decision
- test_waterfall_common_only_scenario
```

### Frontend Tests

- Schema validation tests
- Component rendering tests
- Chart data transformation tests

## Acceptance Criteria Mapping

| Requirement | Implementation |
|------------|----------------|
| Liquidation preferences paid before common | Seniority-ordered algorithm |
| Participating preferred gets preference + pro-rata | `participating: true` flag |
| Non-participating converts if pro-rata higher | Conversion decision logic |
| Distribution table shows exact amounts | WaterfallTable component |
| Supports multiple preference stacks | PreferenceTier with seniority |
