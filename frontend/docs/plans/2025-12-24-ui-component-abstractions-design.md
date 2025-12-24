# UI Component Abstractions Design

**Date:** 2024-12-24
**Status:** Approved
**Goal:** Reduce repetition across frontend UI by creating composable primitives and consolidating duplicates

## Problem Statement

The frontend has significant repetition:

- 54 uses of `terminal-card` class across 25 files
- 134 uses of `tabular-nums` across 36 files
- Duplicate `LabelWithTooltip` implementations in 2 files
- 5 nearly-identical metric card structures in `scenario-results.tsx` (902 lines)

## Design Decision

**Approach:** Composable Primitives (Option 1)

Create small, single-purpose components that compose together rather than monolithic components with many props.

## Components

### New Primitives (3 files)

#### 1. `DataLabel` - `ui/data-label.tsx`

Uppercase muted label for data displays.

```tsx
interface DataLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function DataLabel({ children, className }: DataLabelProps) {
  return (
    <span className={cn("text-muted-foreground text-xs tracking-wide uppercase", className)}>
      {children}
    </span>
  );
}
```

#### 2. `ResponsiveText` - `ui/responsive-text.tsx`

Show different text at breakpoints.

```tsx
interface ResponsiveTextProps {
  full: React.ReactNode; // Shown on sm+ screens
  short: React.ReactNode; // Shown on mobile
  className?: string;
}

export function ResponsiveText({ full, short, className }: ResponsiveTextProps) {
  return (
    <span className={className}>
      <span className="hidden sm:inline">{full}</span>
      <span className="sm:hidden">{short}</span>
    </span>
  );
}
```

#### 3. `MetricCard` - `ui/metric-card.tsx`

Card shell wrapper for metrics display.

```tsx
export function MetricCard({ children, className }: MetricCardProps) {
  return <Card className={cn("terminal-card h-full overflow-hidden", className)}>{children}</Card>;
}

export function MetricCardHeader({ children, className }: MetricCardHeaderProps) {
  return (
    <CardHeader className={cn("px-4 pt-4 pb-2", className)}>
      <CardDescription className="data-label text-xs">{children}</CardDescription>
    </CardHeader>
  );
}

export function MetricCardContent({ children, subtitle, className }: MetricCardContentProps) {
  return (
    <CardContent className={cn("px-4 pb-4", className)}>
      <CardTitle className="text-lg font-semibold tracking-tight lg:text-xl">{children}</CardTitle>
      {subtitle && <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">{subtitle}</p>}
    </CardContent>
  );
}
```

### Consolidations (2 files modified)

#### 1. Enhance `ui/info-tooltip.tsx`

Update `LabelWithTooltip` to support both form and non-form contexts:

```tsx
export function LabelWithTooltip({
  children,
  tooltip,
  className,
  htmlFor,
  as: Component = "label", // NEW: allow "label" | "span" | "div"
}: LabelWithTooltipProps) {
  // ...
}
```

#### 2. Enhance `ui/currency-display.tsx`

Add variant prop for positive/negative coloring:

```tsx
interface CurrencyDisplayProps {
  value: number;
  className?: string;
  showDecimals?: boolean;
  responsive?: boolean;
  variant?: "default" | "positive" | "negative"; // NEW
}
```

#### 3. Update `forms/form-fields.tsx`

- Delete local `LabelWithTooltip` (lines 45-69)
- Import from `@/components/ui/info-tooltip`

## Usage Example

### Before (15 lines)

```tsx
<Card className="terminal-card h-full overflow-hidden">
  <CardHeader className="px-4 pt-4 pb-2">
    <CardDescription className="data-label flex w-fit items-center gap-1 text-xs">
      <span className="hidden sm:inline">Final Payout (NPV)</span>
      <span className="sm:hidden">Payout (NPV)</span>
      <InfoTooltip content={RESULT_EXPLANATIONS.finalPayout} iconSize={12} />
    </CardDescription>
  </CardHeader>
  <CardContent className="px-4 pb-4">
    <CardTitle className="text-foreground text-lg font-semibold tracking-tight lg:text-xl">
      <AnimatedCurrencyDisplay value={displayPayoutValue} responsive />
    </CardTitle>
    <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">{results.payout_label}</p>
  </CardContent>
</Card>
```

### After (7 lines)

```tsx
<MetricCard>
  <MetricCardHeader>
    <LabelWithTooltip tooltip={RESULT_EXPLANATIONS.finalPayout} as="span">
      <ResponsiveText full="Final Payout (NPV)" short="Payout (NPV)" />
    </LabelWithTooltip>
  </MetricCardHeader>
  <MetricCardContent subtitle={results.payout_label}>
    <AnimatedCurrencyDisplay value={displayPayoutValue} responsive />
  </MetricCardContent>
</MetricCard>
```

## File Organization

```
frontend/components/ui/
├── data-label.tsx        # NEW
├── responsive-text.tsx   # NEW
├── metric-card.tsx       # NEW
├── currency-display.tsx  # MODIFIED (add variant)
└── info-tooltip.tsx      # MODIFIED (enhance LabelWithTooltip)

frontend/components/forms/
└── form-fields.tsx       # MODIFIED (remove duplicate LabelWithTooltip)
```

## Migration Strategy

### Phase 1: Foundation (No Breaking Changes)

1. Create `ui/data-label.tsx` + tests
2. Create `ui/responsive-text.tsx` + tests
3. Create `ui/metric-card.tsx` + tests

### Phase 2: Consolidation (Internal Refactor)

1. Enhance `ui/info-tooltip.tsx` - add `as` prop to `LabelWithTooltip`
2. Enhance `ui/currency-display.tsx` - add `variant` prop
3. Update `forms/form-fields.tsx` - delete duplicate, use shared version

### Phase 3: Adopt in High-Impact Files

1. Refactor `results/scenario-results.tsx` (902 lines, 5 metric cards)
2. Refactor `dashboard/summary-card.tsx`
3. Refactor `scenarios/scenario-comparison.tsx`

### Phase 4: Gradual Adoption

Update remaining files organically as they're touched.

## Rollout Safety

- Each phase independently deployable
- Backward compatible - new components don't break existing code
- Tests first - each new component gets unit tests before use
- One file at a time - complete one migration before starting next

## Success Metrics

- `scenario-results.tsx` reduced from 902 to ~700 lines
- Zero duplicate component implementations
- All new primitives have >90% test coverage
- No regressions in existing functionality
