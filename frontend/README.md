# Worth It - Frontend

Modern Next.js frontend with shadcn/ui for the Worth It job offer financial analyzer.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
```

Visit <http://localhost:3000> once running.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI Library:** shadcn/ui (Radix UI + Tailwind CSS)
- **Forms:** React Hook Form + Zod validation
- **Data Fetching:** TanStack Query (React Query)
- **Charts:** Recharts
- **Styling:** Tailwind CSS + CSS Variables for theming

## Features

- Real-time scenario calculations
- Interactive Recharts visualizations
- Monte Carlo simulation with WebSocket progress
- Dark mode support
- Fully type-safe with TypeScript strict mode
- Responsive design

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
├── components/
│   ├── charts/            # Recharts visualizations
│   ├── forms/             # Form components
│   ├── layout/            # Layout components
│   ├── results/           # Results dashboard
│   └── ui/                # shadcn/ui components
└── lib/
    ├── api-client.ts      # Type-safe API client
    └── schemas.ts         # Zod validation schemas
```

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```
