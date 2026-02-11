# Worth It - Job Offer Financial Analyzer

[![Test Suite](https://github.com/eyadsibai/worth_it/actions/workflows/test.yml/badge.svg)](https://github.com/eyadsibai/worth_it/actions/workflows/test.yml)
[![Python 3.14+](https://img.shields.io/badge/python-3.14+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)

Modern financial analysis tool for evaluating startup job offers with real-time calculations, Monte Carlo simulations, cap table modeling, and interactive visualizations. Features both **Employee Mode** (analyze job offers) and **Founder Mode** (cap table & waterfall analysis).

## 🚀 Quick Start

### One Command (Recommended)

```bash
./scripts/start.sh
```

This starts both backend and frontend with automatic dependency installation.

**Options:**

```bash
./scripts/start.sh --clean   # Kill existing processes on ports 8000/3000 first
./scripts/start.sh --stop    # Stop all running services
./scripts/start.sh --help    # Show help
```

**Troubleshooting:**

If you see "port already in use" errors:

```bash
./scripts/start.sh --clean   # Automatically kill blocking processes
```

### Manual Start (Alternative)

**Backend:**

```bash
cd backend
uv sync
uv run uvicorn worth_it.api:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
pnpm install
pnpm dev
```

**Visit:**

- **Frontend**: <http://localhost:3000>
- **API Docs**: <http://localhost:8000/docs>

## 📁 Monorepo Structure

```
worth_it/
├── backend/                    # FastAPI Python backend
│   ├── src/worth_it/          # Core application code
│   │   ├── calculations.py    # Financial calculations
│   │   ├── api.py             # REST API + WebSocket
│   │   ├── models.py          # Pydantic models
│   │   ├── config.py          # Configuration
│   │   ├── types.py           # TypedDict definitions
│   │   └── exceptions.py      # Custom exceptions
│   ├── tests/                 # Test suite (100+ tests)
│   ├── pyproject.toml         # Python dependencies
│   └── README.md              # Backend docs
├── frontend/                   # Next.js React frontend
│   ├── app/                   # Next.js pages
│   ├── components/            # React components
│   │   ├── charts/           # Recharts visualizations
│   │   ├── forms/            # Form components
│   │   └── results/          # Results dashboard
│   ├── lib/                   # Utilities
│   │   ├── api-client.ts     # Type-safe API client
│   │   └── schemas.ts        # Zod validation
│   ├── package.json           # Node dependencies
│   └── README.md              # Frontend docs
├── playwright/                 # E2E Playwright tests (17 test suites)
├── scripts/                    # Utility scripts
├── docs/                       # Additional documentation
└── README.md                   # This file
```

## 🏗️ Architecture

**3-Tier Design:**

```
┌──────────────────────────┐
│  Next.js Frontend (3000) │  shadcn/ui + Recharts
│  TanStack Query + Zod    │  WebSocket for live updates
└────────────┬─────────────┘
             │ REST + WebSocket
             ▼
┌──────────────────────────┐
│  FastAPI Backend (8000)  │  11 REST endpoints + WS
│  Pydantic Models         │  Real-time Monte Carlo
└────────────┬─────────────┘
             │ Pure Functions
             ▼
┌──────────────────────────┐
│  Core Calculations       │  NumPy + Pandas
│  Framework-Agnostic      │  148 unit tests
└──────────────────────────┘
```

### Responsibility Split

| Layer | Responsibilities |
|-------|------------------|
| **Frontend** | UI rendering, user interaction, API calls, display formatting |
| **Backend** | All calculations, business logic, data validation, transformations |

**Key Principle**: All business logic lives in the backend. The frontend calls APIs and renders results—it never duplicates calculation logic. See [CLAUDE.md](CLAUDE.md) for detailed guidelines.

## ✨ Features

### Employee Mode

- **Real-time Calculations**: Instant scenario analysis as you type
- **Monte Carlo Simulations**: WebSocket-powered probabilistic modeling with live progress
- **7 Interactive Visualizations**: Histogram, ECDF, Box Plot, Scatter, PDF, Stats, Summary
- **RSU vs Stock Options**: Compare different equity compensation types
- **Scenario Management**: Save, duplicate, compare, and export scenarios
- **What-If Analysis**: Quick adjustment panel for sensitivity testing

### Founder Mode

- **Cap Table Management**: Track ownership across multiple funding rounds
- **Waterfall Analysis**: Model exit distributions with liquidation preferences
- **Dilution Modeling**: Visualize equity dilution across 6+ funding rounds
- **Preference Stack Editor**: Configure participation caps and preferences

### Core Features

- **Onboarding Flow**: Guided welcome modal for first-time users
- **Command Palette**: Quick actions via Cmd+K (or Ctrl+K)
- **Auto-Save & Recovery**: Draft forms saved automatically with recovery dialog
- **Data Export**: PDF, CSV, and JSON export options
- **Dark/Light Mode**: Beautiful UI that adapts to your preference
- **Accessibility**: Skip links, live regions, reduced motion support
- **Type-Safe**: Full TypeScript + Zod on frontend, Pydantic on backend

## 📖 Documentation

- **[Backend README](backend/README.md)** - Backend API documentation
- **[Frontend README](frontend/README.md)** - Frontend development guide
- **[Development Guide](CLAUDE.md)** - Setup and workflows for Claude Code

## 🧪 Testing

**Backend (148 tests):**

```bash
cd backend
uv run pytest                          # Run all tests
uv run pytest --cov=src --cov-report   # With coverage
```

**Frontend (688 tests):**

```bash
cd frontend
pnpm test:unit     # Run all unit tests
pnpm type-check    # TypeScript validation
pnpm lint          # ESLint
```

**E2E Tests (17 test suites):**

```bash
./scripts/run-e2e-tests.sh    # Convenience script (recommended)

# Or manually:
cd playwright && pnpm exec playwright test           # Run all E2E tests
cd playwright && pnpm exec playwright test --ui      # UI mode
cd playwright && pnpm exec playwright test --headed  # Visible browser
```

See [playwright/README.md](playwright/README.md) for detailed E2E testing documentation.

## 🛠️ Tech Stack

**Backend:**

- FastAPI + Pydantic + WebSocket
- NumPy, Pandas, SciPy for calculations
- pytest with 148 tests
- uv for dependency management

**Frontend:**

- Next.js 16 + TypeScript + Turbopack
- shadcn/ui (Radix UI + Tailwind CSS)
- React Hook Form + Zod + TanStack Query
- Recharts + Framer Motion for visualizations
- Vitest with 688 tests

**E2E Testing:**

- Playwright for automated browser testing
- 17 test suites covering full user flows
- Automated CI/CD integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests:
   - Backend: `cd backend && uv run pytest`
   - Frontend: `cd frontend && pnpm test:unit && pnpm type-check && pnpm lint`
   - E2E: `./scripts/run-e2e-tests.sh`
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

---

**Monorepo** | **Python 3.14+** | **Node 18+** | **Production Ready**
