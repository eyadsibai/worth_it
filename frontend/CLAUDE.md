# Frontend Development Guide (Next.js + TypeScript)

## Design Reference

Design reference: `docs/superpowers/specs/2026-08-20-c1-ledger-comparison-design.md` and its comp asset. The Fundcy references are retired.

---

## Quick Start

```bash
cd frontend
pnpm install
pnpm dev
```

Visit <http://localhost:3000> once running.

## Testing & Quality

```bash
# TypeScript type checking (REQUIRED before committing)
pnpm type-check

# ESLint (REQUIRED before committing)
pnpm lint

# Auto-fix linting issues
pnpm lint -- --fix

# Run unit tests
pnpm test:unit

# Run unit tests with coverage
pnpm test:unit:coverage
```

**Total: 1493 frontend unit tests** (run `pnpm test:unit` to verify)

### Pre-Commit Checklist

- [ ] `pnpm type-check`
- [ ] `pnpm lint`
- [ ] `pnpm test:unit`

### Unit Testing

Uses **Vitest** with **React Testing Library** and **@vitest/coverage-v8**.

**Coverage thresholds** (enforced in CI):

- Lines: 70%
- Functions: 60%
- Branches: 70%
- Statements: 70%

## Project Structure

```
frontend/
├── docs/
│   └── design-references/       # Retired Fundcy images (kept for history only)
├── __tests__/                   # Unit tests
├── app/
│   └── [locale]/                # Locale-scoped App Router pages (en, ar)
├── components/
│   ├── ledger/                  # The Ledger design system + comparison landing
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
│   ├── ledger/                 # Ledger formatting, verdict, and MC request helpers
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
- Reinstall dependencies: `rm -rf node_modules && pnpm install`

## Important Files

- `lib/api-client.ts` - API client with React Query hooks
- `lib/schemas.ts` - Zod schemas (must match backend Pydantic)
- `lib/store.ts` - Zustand store
- `components/forms/form-fields.tsx` - Reusable form field helpers
- `app/[locale]/page.tsx` - The comparison landing (main application page)

## Resources

- **shadcn/ui**: <https://ui.shadcn.com/>
- **TanStack Query**: <https://tanstack.com/query/latest>
- **Recharts**: <https://recharts.org/>
- **Zustand**: <https://docs.pmnd.rs/zustand/>

**Note**: Use shadcn MCP tool when working with UI components.
