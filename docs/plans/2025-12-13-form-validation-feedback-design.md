# Form Validation Feedback Design

**Issue:** #149 - UX: Add form validation feedback with inline hints
**Date:** 2025-12-13
**Status:** Approved

## Overview

Enhance the form experience with real-time visual feedback including inline validation indicators, smart domain-aware warnings, and a form completion summary.

## Components

### 1. Inline Validation Indicators

Visual indicators inside form fields showing validation state after user interaction.

**States:**

- `✓` Green checkmark - Field is valid
- `✗` Red X - Field has validation error
- `⚠` Amber warning - Field is valid but has domain warning
- No indicator - Field not yet touched

**Behavior:**

- Indicators appear after field is touched (`isTouched && isDirty`)
- Positioned inside input, right-aligned
- Animate on state change for visual feedback

**Files to modify:**

- `components/forms/form-fields.tsx` - Add `ValidationIndicator` to field components
- `components/ui/input.tsx` - Add padding-right for indicator space

### 2. Smart Warnings for Edge Cases

Domain-aware warnings for valid but suspicious values.

**Warning Rules:**

| Field | Condition | Message |
|-------|-----------|---------|
| `monthly_salary` | < 1,000 | "This seems low for monthly salary. Did you mean yearly?" |
| `monthly_salary` | > 100,000 | "This seems high for monthly salary. Did you mean yearly?" |
| `exit_valuation` | < `monthly_salary × 12` | "Exit value is lower than one year's salary" |
| `vesting_years` | > 5 | "This is an unusually long vesting period" |
| `startup_monthly_salary` | = 0 | "Confirm: $0 monthly salary from startup?" |

**Principle:** Warnings are for improbable values, not impossible ones (schema handles those).

**Implementation:**

- `lib/hooks/use-field-warnings.ts` - Hook returning warnings based on field name and value
- `components/ui/form-warning.tsx` - Amber-styled warning message component
- Warnings are advisory only - do not block form submission

### 3. Form Completion Summary

Collapsible status bar showing overall form progress.

**States per form:**

- ✓ Complete (green) - All fields valid
- ⚠ Has Warnings (amber) - Valid but has warnings
- ✗ Incomplete (red) - Has validation errors
- ○ Not Started (gray) - Untouched

**Default view:** "2 of 3 forms complete"
**Expanded view:** Shows each form with status and first error/warning

**Implementation:**

- `components/forms/form-completion-summary.tsx` - Summary component
- `lib/hooks/use-form-status.ts` - Hook to aggregate form states
- Clicking a section scrolls to that form

## Visual Design

### Colors (using existing design tokens)

- Valid: `text-chart-3` (lime green)
- Error: `text-destructive` (red)
- Warning: `text-amber-500` / `text-yellow-600`

### Animation

- Indicator fade-in on state change
- Summary collapse/expand with smooth transition

## File Changes Summary

**New files:**

- `lib/hooks/use-field-warnings.ts`
- `lib/hooks/use-form-status.ts`
- `components/ui/form-warning.tsx`
- `components/forms/form-completion-summary.tsx`
- `components/forms/validation-indicator.tsx`

**Modified files:**

- `components/forms/form-fields.tsx` - Add validation indicators
- `components/ui/input.tsx` - Add right padding variant
- `components/layout/sidebar.tsx` - Add form completion summary
- `app/globals.css` - Add warning colors if needed

## Testing Strategy

- Unit tests for `useFieldWarnings` hook with various edge cases
- Unit tests for `useFormStatus` aggregation logic
- Component tests for `ValidationIndicator` state rendering
- E2E test for full form flow with validation feedback

## Accessibility

- Indicators have `aria-label` describing the state
- Warnings use `role="alert"` with `aria-live="polite"`
- Focus states remain visible with indicators
- Color is not the only indicator (icons + text)
