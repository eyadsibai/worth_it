# Frontend Development Guide (Next.js + TypeScript)

## MANDATORY: View Design References Before ANY UI Work

**YOU MUST USE THE READ TOOL TO VIEW THESE IMAGES BEFORE WRITING ANY UI CODE:**

```
frontend/docs/design-references/fundcy-dashboard-1.webp
frontend/docs/design-references/fundcy-dashboard-2.webp
frontend/docs/design-references/fundcy-components.webp
frontend/docs/design-references/fundcy-detail.webp
```

**DO NOT SKIP THIS STEP.** Read the images. Study them. Clone the design exactly.

These images show the Fundcy financial dashboard - the EXACT aesthetic we are cloning:

- `fundcy-dashboard-1.webp` - Full dashboard layout with cards, bar chart
- `fundcy-dashboard-2.webp` - Dashboard with transaction history table, status badges
- `fundcy-components.webp` - Card component breakdown, spacing, shadows
- `fundcy-detail.webp` - Close-up of typography, currency formatting, chart tooltips

**Every UI decision should match these references. When in doubt, READ THE IMAGES AGAIN.**

---

## Fundcy Design Specifications

### Visual Reference Summary

From the reference images, Fundcy uses:

- **Layout**: Fixed header (56px) + fluid main content on very light gray background
- **Cards**: Pure white, borderless, subtle shadow, 16px radius
- **Colors**: Multi-tone green palette (forest → lime → teal)
- **Typography**: Large currency with muted decimals, small uppercase labels
- **Charts**: Grouped bars with green tones, dark tooltips
- **Data Tables**: Clean rows with status badges

### Color Palette (EXACT VALUES)

```css
/* Background & Surface */
--background: oklch(97.5% 0.003 250); /* #F7F8FA - very light cool gray */
--card: oklch(100% 0 0); /* #FFFFFF - pure white */
--card-foreground: oklch(25% 0.02 250); /* #1F2937 - dark gray text */

/* Primary Green Palette */
--primary: oklch(32% 0.08 155); /* #1A3D2E - dark forest green */
--primary-foreground: oklch(98% 0 0); /* white text on primary */
--accent: oklch(42% 0.1 155); /* #2D5A3D - medium green */
--terminal: oklch(72% 0.18 115); /* #9BC53D - lime/yellow-green */
--mint: oklch(70% 0.14 175); /* #3DD9C1 - teal/mint */

/* Semantic Colors */
--destructive: oklch(55% 0.22 25); /* red for negative values */
--success: oklch(72% 0.18 115); /* same as terminal - lime green */
--warning: oklch(75% 0.15 85); /* amber/orange for pending */
--muted: oklch(96% 0.005 250); /* #F3F4F6 - light gray */
--muted-foreground: oklch(55% 0.02 250); /* #6B7280 - medium gray */

/* Chart Palette (5 greens) */
--chart-1: oklch(32% 0.08 155); /* dark forest */
--chart-2: oklch(42% 0.1 155); /* medium green */
--chart-3: oklch(72% 0.18 115); /* lime */
--chart-4: oklch(70% 0.14 175); /* teal/mint */
--chart-5: oklch(85% 0.08 155); /* light mint */
```

### Card Styling (CRITICAL)

Cards are the foundation of the Fundcy look. Get these RIGHT:

```css
.fundcy-card {
  background: white;
  border: none; /* NO BORDERS */
  border-radius: 16px; /* large radius */
  padding: 24px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 2px 8px rgba(0, 0, 0, 0.04); /* very subtle shadow */
}

.fundcy-card:hover {
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.04),
    0 4px 12px rgba(0, 0, 0, 0.06); /* slightly elevated on hover */
}
```

**Tailwind equivalent**:

```tsx
<div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.06)] transition-shadow">
```

### Typography (EXACT PATTERNS)

**Currency Display** (most distinctive Fundcy element):

```tsx
// Large balance: "$74,503.00" with muted decimals
<span className="text-4xl font-semibold tabular-nums">
  $74,503<span className="text-muted-foreground">.00</span>
</span>

// Medium values: "$101,333.00"
<span className="text-2xl font-semibold tabular-nums">
  $101,333<span className="text-muted-foreground">.00</span>
</span>

// Small values in tables: "$850.00"
<span className="text-sm tabular-nums">
  $850<span className="text-muted-foreground">.00</span>
</span>
```

**Data Labels** (small uppercase above values):

```tsx
<span className="text-muted-foreground text-xs tracking-wide uppercase">Total balance</span>
```

**Percentage Display**:

```tsx
// Large percentage
<span className="text-5xl font-light">69<span className="text-2xl">%</span></span>

// Small percentage with color
<span className="text-sm text-terminal">+2.4%</span>  // positive = lime green
<span className="text-sm text-destructive">-2.4%</span>  // negative = red
```

### Metric Cards (from reference images)

**Balance Card Pattern**:

```tsx
<Card className="fundcy-card">
  <div className="mb-4 flex items-start justify-between">
    <span className="text-muted-foreground text-sm">My Balance</span>
    <Select defaultValue="all-time">
      <SelectTrigger className="h-8 w-24 text-xs">
        <SelectValue />
      </SelectTrigger>
    </Select>
  </div>

  <div className="mb-6 space-y-1">
    <p className="text-muted-foreground text-xs tracking-wide uppercase">Total balance</p>
    <p className="text-4xl font-semibold tabular-nums">
      $74,503<span className="text-muted-foreground">.00</span>
    </p>
  </div>

  <div className="space-y-2 text-sm">
    <div className="flex items-center gap-2">
      <CalendarIcon className="text-muted-foreground h-4 w-4" />
      <span className="text-muted-foreground">Total earned last time</span>
      <span className="text-terminal font-medium">+$14,503.00</span>
    </div>
    <div className="flex items-center gap-2">
      <ZapIcon className="text-muted-foreground h-4 w-4" />
      <span className="text-muted-foreground">Total bonus</span>
      <span className="text-terminal font-medium">+$700.00</span>
    </div>
  </div>
</Card>
```

**Income Card with Mini Chart**:

```tsx
<Card className="fundcy-card">
  <div className="flex items-start justify-between">
    <span className="text-muted-foreground text-sm">My Income</span>
    <span className="text-muted-foreground text-xs">July 2024</span>
  </div>

  <div className="mt-4 flex items-end justify-between">
    <div>
      <p className="text-muted-foreground text-xs">Total income</p>
      <p className="text-2xl font-semibold tabular-nums">
        $101,333<span className="text-muted-foreground">.00</span>
      </p>
    </div>
    {/* Mini stacked bar chart - see chart section */}
  </div>

  <div className="mt-4 flex gap-4 text-sm">
    <div className="flex items-center gap-1">
      <CalendarIcon className="h-4 w-4" />
      <span>Min</span>
      <span className="text-destructive">-2.4% APR</span>
    </div>
    <div className="flex items-center gap-1">
      <ZapIcon className="h-4 w-4" />
      <span>Earned</span>
      <span className="text-terminal">+$458.00</span>
    </div>
  </div>

  {/* Income breakdown */}
  <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4">
    <div>
      <p className="text-muted-foreground text-xs">Salary</p>
      <p className="font-semibold">$28.3K</p>
    </div>
    <div>
      <p className="text-muted-foreground text-xs">Business</p>
      <p className="font-semibold">$38.5K</p>
    </div>
    <div>
      <p className="text-muted-foreground text-xs">Investment</p>
      <p className="font-semibold">$34.4K</p>
    </div>
  </div>
</Card>
```

### Charts (Recharts Configuration)

**Bar Chart (Money Flow style)**:

```tsx
const CHART_COLORS = {
  income: "#1A3D2E", // dark forest (chart-1)
  expense: "#9BC53D", // lime (chart-3)
  space: "#E5E7EB", // light gray
};

<BarChart data={data}>
  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
  <XAxis
    dataKey="month"
    axisLine={false}
    tickLine={false}
    tick={{ fontSize: 12, fill: "#6B7280" }}
  />
  <YAxis hide />
  <Tooltip content={<FundcyTooltip />} />
  <Bar dataKey="income" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} />
  <Bar dataKey="expense" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} />
</BarChart>;
```

**Fundcy Tooltip (Dark style)**:

```tsx
const FundcyTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;

  return (
    <div className="rounded-xl bg-[hsl(220,15%,15%)] px-3 py-2 text-white shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <div className="bg-terminal h-2 w-2 rounded-full" />
        <span>Income</span>
      </div>
      <p className="text-lg font-semibold tabular-nums">
        ${payload[0]?.value?.toLocaleString()}
        <span className="text-gray-400">.00</span>
      </p>
    </div>
  );
};
```

**Progress Bar (Remaining Monthly)**:

```tsx
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Needs</span>
    <span>89%</span>
  </div>
  <div className="bg-muted h-2 overflow-hidden rounded-full">
    <div className="bg-primary h-full rounded-full" style={{ width: "89%" }} />
  </div>
</div>
```

### Status Badges

```tsx
// Completed - green background
<span className="px-3 py-1 rounded-full text-xs font-medium bg-terminal/20 text-terminal">
  Completed
</span>

// Pending - amber/orange
<span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-600">
  Pending
</span>
```

### Data Table (Transaction History)

```tsx
<Table>
  <TableHeader>
    <TableRow className="border-0 hover:bg-transparent">
      <TableHead className="text-muted-foreground text-xs font-normal tracking-wide uppercase">
        Name <ChevronUpDown className="ml-1 inline h-3 w-3" />
      </TableHead>
      <TableHead>Date</TableHead>
      <TableHead>Transaction</TableHead>
      <TableHead>Amount</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Action</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-0">
      <TableCell className="flex items-center gap-3">
        <img src="/youtube.svg" className="h-8 w-8" />
        <span className="font-medium">Youtube</span>
      </TableCell>
      <TableCell className="text-muted-foreground">Aug 02, 2024 - 11:00 AM</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <BankIcon className="bg-primary/10 h-4 w-4 rounded p-1" />
          <span>Bank Transfer</span>
        </div>
      </TableCell>
      <TableCell className="font-medium tabular-nums">$850.00</TableCell>
      <TableCell>
        <span className="bg-terminal/20 text-terminal rounded-full px-3 py-1 text-xs">
          Completed
        </span>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon">
          <InfoIcon className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Spacing & Layout Guidelines

- **Page padding**: 32px (p-8)
- **Card padding**: 24px (p-6)
- **Card gap**: 24px (gap-6)
- **Section gap**: 32px (gap-8)
- **Inner element gap**: 16px (gap-4)
- **Text to value gap**: 4px (gap-1)

### Icon Style

- Use **Lucide icons** (already in shadcn)
- Size: 16px (h-4 w-4) for inline, 20px (h-5 w-5) for nav
- Color: `text-muted-foreground` for decorative, `text-primary` for active

---

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Visit <http://localhost:3000> once running.

## Testing & Quality

```bash
# TypeScript type checking (REQUIRED before committing)
npm run type-check

# ESLint (REQUIRED before committing)
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Run unit tests
npm run test:unit

# Run unit tests with coverage
npm run test:unit:coverage
```

**Total: 663 frontend unit tests** (run `npm run test:unit` to verify)

### Pre-Commit Checklist

- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run test:unit`

### Unit Testing

Uses **Vitest** with **React Testing Library** and **@vitest/coverage-v8**.

**Coverage thresholds** (enforced in CI):

- Lines: 70%
- Functions: 65%
- Branches: 70%
- Statements: 70%

## Project Structure

```
frontend/
├── docs/
│   └── design-references/       # Fundcy reference images (STUDY THESE!)
│       ├── fundcy-dashboard-1.webp
│       ├── fundcy-dashboard-2.webp
│       ├── fundcy-components.webp
│       └── fundcy-detail.webp
├── __tests__/                   # Unit tests
├── app/                         # Next.js App Router pages
├── components/
│   ├── cap-table/               # Cap table management components
│   ├── charts/                  # Recharts visualizations
│   ├── forms/                   # React Hook Form components
│   ├── layout/                  # Layout components (AppShell, Header)
│   ├── results/                 # Results dashboard
│   ├── scenarios/               # Scenario management components
│   └── ui/                      # shadcn/ui base components
├── lib/
│   ├── api-client.ts           # Type-safe API client
│   ├── constants/              # App-wide constants
│   ├── dilution-utils.ts       # Dilution calculation helpers
│   ├── employee-scenario-utils.ts # Employee equity scenario helpers
│   ├── export-utils.ts         # CSV/PDF export utilities
│   ├── format-utils.ts         # Number/currency formatting
│   ├── hooks/                  # Custom React hooks
│   ├── motion.tsx              # Framer Motion components
│   ├── providers.tsx           # React context providers
│   ├── scenario-utils.ts       # Scenario management helpers
│   ├── schemas.ts              # Zod validation schemas
│   ├── store.ts                # Zustand store
│   ├── utils.ts                # General utilities (cn helper)
│   └── validation.ts           # Form validation helpers
└── vitest.config.ts
```

## State Management

### Zustand Store

**Store location**: `lib/store.ts`

```typescript
const { appMode, setAppMode, globalSettings, setGlobalSettings } = useAppStore();

// Or use selector hooks
const appMode = useAppMode();
const capTable = useCapTable();
```

## Component Patterns

### Form Field Helpers

**Location**: `components/forms/form-fields.tsx`

```typescript
import { NumberInputField, SliderField, SelectField, TextInputField, CheckboxField } from "@/components/forms/form-fields";

<TextInputField form={form} name="investor_name" label="Investor Name" />
<NumberInputField form={form} name="amount" label="Amount" prefix="$" />
<SelectField form={form} name="status" label="Status" options={statusOptions} />
```

### Export Utilities

**Location**: `lib/export-utils.ts`

- `calculateTotalRaised(instruments)` - Sum funding from all instrument types
- `PDF_CONFIG` - Constants for PDF generation
- `escapeCSV(value)` - RFC 4180 compliant CSV escaping

## Configuration

Environment variables (`.env.local`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Troubleshooting

**Frontend not starting?**

- Check Node version: `node --version` (need 18+)
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## Important Files

- `lib/api-client.ts` - API client with React Query hooks
- `lib/schemas.ts` - Zod schemas (must match backend Pydantic)
- `lib/store.ts` - Zustand store
- `components/forms/form-fields.tsx` - Reusable form field helpers
- `app/page.tsx` - Main application page

## Resources

- **shadcn/ui**: <https://ui.shadcn.com/>
- **TanStack Query**: <https://tanstack.com/query/latest>
- **Recharts**: <https://recharts.org/>
- **Zustand**: <https://docs.pmnd.rs/zustand/>

**Note**: Use shadcn MCP tool when working with UI components.
