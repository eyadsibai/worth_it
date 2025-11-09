# Worth It - Startup Job Offer Analyzer

[![Test Suite](https://github.com/eyadsibai/worth_it/actions/workflows/test.yml/badge.svg)](https://github.com/eyadsibai/worth_it/actions/workflows/test.yml)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)

A comprehensive financial analysis tool for evaluating startup job offers with Monte Carlo simulations, dilution modeling, and opportunity cost analysis.

## 🚀 Quick Start

```bash
# Install dependencies
uv sync

# Run the application
./scripts/start.sh  # Linux/Mac
scripts\start.bat   # Windows
```

Visit:
- **Frontend**: http://localhost:8501
- **API Docs**: http://localhost:8000/docs

## 📁 Project Structure

```
worth_it/
├── src/worth_it/           # Core application code
│   ├── calculations.py     # Pure Python calculation engine
│   ├── api.py             # FastAPI REST API
│   ├── models.py          # Pydantic validation models
│   ├── config.py          # Configuration management
│   ├── api_client.py      # HTTP client for API
│   └── app.py             # Streamlit web interface
├── tests/                  # Test suite
│   ├── test_calculations.py   # Unit tests (20 tests)
│   ├── test_api.py           # API tests (11 tests)
│   └── test_integration.py   # Integration tests (4 tests)
├── docs/                   # Documentation
│   ├── README.md          # Detailed project documentation
│   ├── BACKEND.md         # API reference
│   ├── IMPROVEMENTS.md    # Recent improvements
│   ├── CHANGELOG.md       # Version history
│   └── ...
├── scripts/               # Utility scripts
│   ├── start.sh          # Linux/Mac startup
│   ├── start.bat         # Windows startup
│   └── example_backend_usage.py
├── .github/workflows/     # CI/CD pipelines
└── pyproject.toml        # Project configuration
```

## 🏗️ Architecture

Modern **3-tier microservices architecture**:

```
┌─────────────────────┐
│   Frontend (UI)     │  Streamlit (app.py)
│   Port: 8501        │  + API Client
└──────────┬──────────┘
           │ HTTP/REST
           ▼
┌─────────────────────┐
│   Backend API       │  FastAPI (api.py)
│   Port: 8000        │  + Pydantic Models
└──────────┬──────────┘
           │ Function Calls
           ▼
┌─────────────────────┐
│   Core Logic        │  Pure Python
│   Framework-Agnostic│  (calculations.py)
└─────────────────────┘
```

## ✨ Features

- **Monte Carlo Simulations**: Probabilistic outcome modeling
- **Dilution Modeling**: Track equity across funding rounds
- **RSU vs Stock Options**: Compare different equity types
- **IRR/NPV Calculations**: Financial metrics analysis
- **Opportunity Cost**: Compare against current employment
- **Sensitivity Analysis**: Understand parameter impacts
- **Interactive UI**: Real-time visualization with Plotly

## 📖 Documentation

- **[Detailed Documentation](docs/README.md)** - Complete project guide
- **[API Reference](docs/BACKEND.md)** - REST API documentation
- **[Development Guide](CLAUDE.md)** - Setup and workflows
- **[Improvements](docs/IMPROVEMENTS.md)** - Recent changes
- **[Changelog](docs/CHANGELOG.md)** - Version history

## 🧪 Testing

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-report=html

# Run specific test suite
uv run pytest tests/test_calculations.py -v
```

**Test Coverage:**
- ✅ 35 tests (100% passing)
- 📊 51% overall coverage
- 🎯 Core modules: 76-86% coverage

## 🛠️ Development

### Prerequisites
- Python 3.10+
- [uv](https://docs.astral.sh/uv/) package manager

### Setup

```bash
# Clone repository
git clone https://github.com/eyadsibai/worth_it.git
cd worth_it

# Install dependencies
uv sync

# Install dev tools
uv sync --extra dev

# Setup pre-commit hooks
uv pip install pre-commit
pre-commit install
```

### Development Workflow

```bash
# Run API server
uv run uvicorn src.worth_it.api:app --reload --port 8000

# Run frontend
uv run streamlit run src/worth_it/app.py

# Format code
uv run ruff format .

# Lint
uv run ruff check .

# Type check
uv run mypy src/worth_it/
```

## ⚙️ Configuration

Copy `.env.example` to `.env` and customize:

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:8501,http://localhost:3000
```

See [.env.example](.env.example) for all options.

## 🚢 Deployment

### Production Settings

```bash
export ENVIRONMENT=production
export API_HOST=0.0.0.0
export API_PORT=8000
export CORS_ORIGINS="https://yourdomain.com"

uv run uvicorn src.worth_it.api:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📊 Tech Stack

- **Backend**: FastAPI, Pydantic
- **Frontend**: Streamlit, Plotly
- **Calculations**: NumPy, Pandas, SciPy
- **Testing**: pytest, pytest-cov
- **Code Quality**: Ruff, MyPy, Bandit
- **Package Manager**: uv

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `uv run pytest`
5. Run pre-commit: `pre-commit run --all-files`
6. Submit a pull request

## 📄 License

[Add your license here]

## 🙏 Acknowledgments

Built with [FastAPI](https://fastapi.tiangolo.com/), [Streamlit](https://streamlit.io/), and [uv](https://docs.astral.sh/uv/).

---

**Version**: 1.0.0 | **Python**: 3.10+ | **Status**: Production Ready
