# SAFE/Convertible Note Conversion Design

**Issue:** #109 - Feature: SAFE/Convertible Note Conversion Calculations
**Date:** 2025-12-10
**Status:** Approved

## Overview

Implement automatic conversion of SAFEs and Convertible Notes to equity when a priced round occurs.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where does logic live? | Backend API | Stable API contract, frontend can change independently |
| When does conversion happen? | Automatic on priced round | Matches real-world mechanics |
| API structure | Stateless endpoint | Frontend sends full state, backend calculates, returns new state |
| SAFE conversion rule | Best of both (lower price) | YC SAFE standard |
| Note interest | Configurable (simple/compound) | Different notes have different terms |
| Uncapped SAFEs | Not supported | Must have cap or discount |
| Response detail | Detailed breakdown | Shows how each instrument converted |

## API Endpoint

### `POST /api/cap-table/convert`

**Request:**

```json
{
  "cap_table": {
    "stakeholders": [],
    "total_shares": 10000000,
    "option_pool_pct": 10
  },
  "instruments": [],
  "priced_round": {
    "round_name": "Seed",
    "pre_money_valuation": 10000000,
    "amount_raised": 2000000,
    "price_per_share": 1.0,
    "date": "2024-07-01"
  }
}
```

**Response:**

```json
{
  "updated_cap_table": {
    "stakeholders": [],
    "total_shares": 10500000,
    "option_pool_pct": 10
  },
  "converted_instruments": [
    {
      "instrument_id": "safe_1",
      "instrument_type": "SAFE",
      "investor_name": "Angel Investor",
      "investment_amount": 100000,
      "conversion_price": 0.50,
      "price_source": "cap",
      "shares_issued": 200000,
      "ownership_pct": 1.9,
      "accrued_interest": null
    }
  ],
  "summary": {
    "instruments_converted": 3,
    "total_shares_issued": 500000,
    "total_dilution_pct": 4.76
  }
}
```

## SAFE Conversion Logic

**Rule:** Convert at the lower of cap price or discount price (best of both).

```
cap_price = valuation_cap / pre_conversion_shares
discount_price = round_price_per_share × (1 - discount_pct / 100)
conversion_price = min(cap_price, discount_price)
shares_issued = investment_amount / conversion_price
```

**Validation:**

- SAFE must have at least `valuation_cap` OR `discount_pct`
- If only cap → use cap price
- If only discount → use discount price
- If both → use lower price

**Example:**

```
SAFE: $100K, $5M cap, 20% discount
Round: $10M pre-money, 10M shares → $1.00/share

cap_price = $5M / 10M = $0.50
discount_price = $1.00 × 0.80 = $0.80
conversion_price = $0.50 (cap wins)
shares_issued = $100K / $0.50 = 200,000 shares
```

## Convertible Note Conversion Logic

**Key Difference:** Notes accrue interest added to principal before conversion.

**Interest Calculation:**

```python
if interest_type == "simple":
    interest = principal × (rate / 100) × (months_elapsed / 12)
else:  # compound
    years = months_elapsed / 12
    interest = principal × ((1 + rate / 100) ^ years - 1)

conversion_amount = principal + interest
```

**Time Calculation:**

- `months_elapsed` = difference between note `date` and priced round `date`
- Both dates are required

**Example:**

```
Note: $50K principal, 5% rate, simple interest
      $4M cap, 15% discount, issued Jan 1, 2024
Round: $8M pre-money, 10M shares, July 1, 2024

months_elapsed = 6
interest = $50K × 0.05 × (6/12) = $1,250
conversion_amount = $51,250

cap_price = $4M / 10M = $0.40
discount_price = $0.80 × 0.85 = $0.68
conversion_price = $0.40 (cap wins)
shares_issued = $51,250 / $0.40 = 128,125 shares
```

## New Stakeholder Creation

Converted instruments become stakeholders:

```json
{
  "id": "generated_uuid",
  "name": "{investor_name}",
  "type": "investor",
  "shares": 200000,
  "ownership_pct": 1.9,
  "share_class": "preferred"
}
```

## Implementation Plan

### Backend

| File | Action | Purpose |
|------|--------|---------|
| `models.py` | Add | Pydantic models for cap table entities |
| `calculations.py` | Add | `convert_safe()`, `convert_note()`, `calculate_interest()` |
| `api.py` | Add | `POST /api/cap-table/convert` endpoint |
| `tests/test_calculations.py` | Add | Unit tests for conversion logic |
| `tests/test_api.py` | Add | API endpoint tests |

### Frontend

| File | Action | Purpose |
|------|--------|---------|
| `schemas.ts` | Update | Add `interest_type`, response types |
| `api-client.ts` | Add | `useConvertInstruments()` hook |
| `convertible-note-form.tsx` | Update | Interest type selector |
| `cap-table-manager.tsx` | Update | Call conversion on priced round |

### Execution Order

1. Backend models
2. Backend calculation functions + tests
3. Backend API endpoint + tests
4. Frontend schema updates
5. Frontend API client hook
6. Frontend form updates
7. Integration testing

## Schema Changes

### ConvertibleNote (add field)

```typescript
interface ConvertibleNote {
  // ... existing fields
  interest_type: "simple" | "compound";
}
```

## Acceptance Criteria

- [x] SAFEs convert at the lower of cap or discount price
- [x] Convertible Notes include accrued interest in conversion amount
- [x] New stakeholders are automatically added to cap table
- [x] Converted instruments show conversion details
- [ ] Implementation complete
- [ ] Tests passing
