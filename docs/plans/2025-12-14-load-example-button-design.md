# Load Example Button Design

**Issue:** #145 - UX: Add "Load Example" button for quick exploration
**Date:** 2025-12-14
**Status:** Approved

## Overview

Add a dropdown button that loads pre-configured example scenarios so new users can immediately see the app in action without guessing values.

## Example Scenarios

Three stage-based presets reflecting the startup lifecycle:

| Preset | Exit Year | Current Salary | Startup Salary | Equity | Exit Valuation |
|--------|-----------|----------------|----------------|--------|----------------|
| Early-stage (Seed) | 5 years | $12,000/mo | $8,000/mo | 0.5% RSU | $100M |
| Growth-stage (Series B) | 4 years | $15,000/mo | $12,000/mo | 0.1% RSU | $500M |
| Late-stage (Pre-IPO) | 2 years | $18,000/mo | $16,000/mo | 0.05% RSU | $2B |

## UI Component

Dropdown button positioned in sidebar, above the forms:

```
┌─────────────────────────────────────────┐
│ Form Status: 0 of 3 forms complete      │
├─────────────────────────────────────────┤
│ [📋 Load Example ▼]                     │
│                                         │
│ [Global Settings Form]                  │
│ [Current Job Form]                      │
│ [Startup Offer Form]                    │
└─────────────────────────────────────────┘
```

Dropdown shows:
- Example name (e.g., "Early-stage Startup (Seed)")
- Brief description (e.g., "$8K salary, 0.5% equity")

## Data Flow

1. User clicks example option
2. `loadExample(exampleId)` action called on store
3. Store atomically updates: globalSettings, currentJob, equityDetails
4. Forms detect defaultValues change and update
5. Existing debounced API effect triggers calculations
6. Results display within ~300ms

## Files

**New:**
- `lib/constants/examples.ts` - Example scenario data
- `components/forms/example-loader.tsx` - Dropdown component
- `__tests__/components/example-loader.test.tsx`
- `__tests__/lib/constants/examples.test.ts`

**Modified:**
- `lib/store.ts` - Add `loadExample` action
- `app/page.tsx` - Add ExampleLoader to sidebar

## Testing

- Examples validate against Zod schemas
- Dropdown renders all options with correct labels
- Click calls loadExample with correct ID
- Store updates all form states atomically
