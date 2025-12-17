# Backend Business Logic Migration

**Date:** 2025-12-17
**Status:** Approved
**Goal:** Move frontend business logic to backend, eliminate duplication, create strong test coverage

## Summary

Migrate dilution calculations and scenario comparison logic from frontend to backend to:
- Establish single source of truth for all financial calculations
- Eliminate code duplication between frontend and backend
- Enable consistent behavior across all clients
- Improve testability and maintainability

## New Backend Endpoints

### 1. Dilution Preview Endpoint

```
POST /api/dilution/preview
```

**Request:**
```json
{
  "stakeholders": [
    {"name": "Founder A", "type": "founder", "ownership_pct": 60.0}
  ],
  "option_pool_pct": 10.0,
  "pre_money_valuation": 10000000,
  "amount_raised": 2500000,
  "investor_name": "Series A Investor"
}
```

**Response:**
```json
{
  "dilution_results": [
    {"name": "Founder A", "type": "founder", "before_pct": 60.0, "after_pct": 48.0, "dilution_pct": -20.0, "is_new": false}
  ],
  "post_money_valuation": 12500000,
  "dilution_factor": 0.8
}
```

### 2. Scenario Comparison Endpoint

```
POST /api/scenarios/compare
```

**Request:**
```json
{
  "scenarios": [
    {"name": "Current Job", "results": {"netOutcome": 500000, ...}, "equity": {...}},
    {"name": "Startup Offer", "results": {"netOutcome": 650000, ...}, "equity": {...}}
  ]
}
```

**Response:**
```json
{
  "winner": {"winner_name": "Startup Offer", "winner_index": 1, "net_outcome_advantage": 150000, "is_tie": false},
  "metric_diffs": [...],
  "insights": [{"type": "winner", "title": "...", "description": "...", "icon": "trophy"}]
}
```

## Backend Architecture

### New Files

```
backend/src/worth_it/
├── calculations/
│   ├── dilution.py          # Dilution preview calculations
│   └── comparison.py        # Scenario comparison logic
├── services/
│   └── comparison_service.py # Comparison orchestration
├── models.py                 # New Pydantic models
└── api.py                    # New endpoints
```

### Test Coverage

| Module | Tests | Focus |
|--------|-------|-------|
| `test_dilution.py` | ~15 | Edge cases, validation, accuracy |
| `test_comparison.py` | ~20 | Winner logic, metrics, insights |
| `test_api.py` | +4 | Endpoint integration |

## Frontend Migration

### Files to Delete
- `lib/dilution-utils.ts`
- `lib/comparison-utils.ts`
- `__tests__/lib/dilution-utils.test.ts`
- `__tests__/lib/comparison-utils.test.ts`

### Files to Update
- `lib/api-client.ts` - Add new API methods
- `components/cap-table/dilution-preview.tsx` - Call API
- `components/cap-table/dilution-table.tsx` - Call API
- `components/forms/dilution-summary-card.tsx` - Call API
- `components/cap-table/dilution-comparison-charts.tsx` - Call API
- `components/scenarios/scenario-comparison.tsx` - Call API
- `lib/export-utils.ts` - Call API for comparison

## Implementation Order

1. Backend: Add Pydantic models
2. Backend: Implement calculation functions (TDD)
3. Backend: Add service layer
4. Backend: Add API endpoints
5. Backend: Integration tests
6. Frontend: Add API client methods
7. Frontend: Update components to use API
8. Frontend: Delete old utility files and tests
9. E2E: Verify full flow works
