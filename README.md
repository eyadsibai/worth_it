# Worth It - Job Offer Financial Analyzer

[![Test Suite](https://github.com/eyadsibai/worth_it/actions/workflows/test.yml/badge.svg)](https://github.com/eyadsibai/worth_it/actions/workflows/test.yml)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)

Modern financial analysis tool for evaluating startup job offers with real-time calculations, Monte Carlo simulations, and interactive visualizations.

## 🚀 Quick Start

**Backend:**
```bash
cd backend
uv sync
uv run uvicorn worth_it.api:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## 📁 Monorepo Structure

```
worth_it/
├── backend/                    # FastAPI Python backend
│   ├── src/worth_it/          # Core application code
│   │   ├── calculations.py    # Financial calculations
│   │   ├── api.py             # REST API + WebSocket
│   │   ├── models.py          # Pydantic models
│   │   └── config.py          # Configuration
│   ├── tests/                 # Test suite (35 tests)
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
├── scripts/                    # Utility scripts
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
│  FastAPI Backend (8000)  │  9 REST endpoints + WS
│  Pydantic Models         │  Real-time Monte Carlo
└────────────┬─────────────┘
             │ Pure Functions
             ▼
┌──────────────────────────┐
│  Core Calculations       │  NumPy + Pandas
│  Framework-Agnostic      │  35 unit tests
└──────────────────────────┘
```

## ✨ Features

- **Real-time Calculations**: Instant scenario analysis as you type
- **Monte Carlo Simulations**: WebSocket-powered probabilistic modeling
- **7 Interactive Visualizations**: Histogram, ECDF, Box Plot, Scatter, PDF, Stats, Summary
- **Dilution Modeling**: Track equity across 6 funding rounds
- **RSU vs Stock Options**: Compare different equity compensation types
- **Dark Mode**: Beautiful UI that adapts to your preference
- **Type-Safe**: Full TypeScript + Zod validation on frontend, Pydantic on backend

## 📖 Documentation

- **[Backend README](backend/README.md)** - Backend API documentation
- **[Frontend README](frontend/README.md)** - Frontend development guide
- **[Development Guide](CLAUDE.md)** - Setup and workflows for Claude Code

## 🧪 Testing

**Backend:**
```bash
cd backend
uv run pytest                          # Run all 35 tests
uv run pytest --cov=src --cov-report  # With coverage
```

**Frontend:**
```bash
cd frontend
npm run type-check  # TypeScript validation
npm run lint        # ESLint
```

**E2E Tests (Playwright):**
```bash
npm run test:e2e        # Run all E2E tests
npm run test:e2e:ui     # Run tests in UI mode
npm run test:e2e:headed # Run tests with visible browser
npm run test:e2e:report # View test report
```

See [playwright/README.md](playwright/README.md) for detailed E2E testing documentation.

## 🛠️ Tech Stack

**Backend:**
- FastAPI + Pydantic + WebSocket
- NumPy, Pandas, SciPy for calculations
- pytest with 35 tests (51% coverage)
- uv for dependency management

**Frontend:**
- Next.js 16 + TypeScript + Turbopack
- shadcn/ui (Radix UI + Tailwind CSS)
- React Hook Form + Zod + TanStack Query
- Recharts for data visualization

**E2E Testing:**
- Playwright for automated browser testing
- 59 end-to-end tests covering full user flows
- Automated CI/CD integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests:
   - Backend: `cd backend && uv run pytest`
   - Frontend: `cd frontend && npm run type-check && npm run lint`
   - E2E: `npm run test:e2e`
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

---

**Monorepo** | **Python 3.10+** | **Node 18+** | **Production Ready**
