# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-11-09

### Added
- **Environment Configuration System** ([config.py](config.py))
  - Centralized configuration management
  - Support for development/production/testing environments
  - Configurable ports, CORS origins, and logging
  - Configuration validation with helpful error messages

- **GitHub Actions CI/CD** ([.github/workflows/test.yml](.github/workflows/test.yml))
  - Automated testing on push/PR
  - Matrix testing across Python 3.10, 3.11, 3.12
  - Code coverage reporting to Codecov
  - Separate linting job with Ruff and MyPy

- **Pre-commit Hooks** ([.pre-commit-config.yaml](.pre-commit-config.yaml))
  - Automatic code formatting with Ruff
  - Type checking with MyPy
  - Security scanning with Bandit
  - File quality checks

- **Code Quality Tools**
  - pytest-cov for coverage reporting
  - Ruff for linting and formatting
  - MyPy for type checking
  - Bandit for security scanning

- **Development Documentation**
  - [IMPROVEMENTS.md](IMPROVEMENTS.md) - Detailed improvement summary
  - [.env.example](.env.example) - Environment variable template
  - This CHANGELOG.md file

### Changed
- **DevContainer Configuration** ([.devcontainer/devcontainer.json](.devcontainer/devcontainer.json))
  - Fixed references from `comparison_v3.py` to `app.py`
  - Updated to use `uv` package manager
  - Added both API and frontend port forwarding
  - Parallel service startup

- **Startup Scripts**
  - [start.sh](start.sh): Updated to use `uv` instead of `pip`
  - [start.bat](start.bat): Updated to use `uv` instead of `pip`
  - Auto-installation of `uv` on Linux/Mac

- **Documentation** ([CLAUDE.md](CLAUDE.md))
  - Complete rewrite with modern architecture diagram
  - Updated all commands to use `uv`
  - Added comprehensive testing instructions
  - Removed references to non-existent `requirements.txt`

- **Project Configuration** ([pyproject.toml](pyproject.toml))
  - Project name: `worth-it-temp` → `worth-it`
  - Version: `0.1.0` → `1.0.0`
  - Added proper project description
  - Added `pytest-cov` dependency
  - Added dev dependencies (pre-commit, ruff, mypy, bandit)
  - Added tool configurations (pytest, coverage, ruff, mypy, bandit)
  - Fixed httpx version constraint (0.29.1 → 0.27.0) for Python 3.10 compatibility

- **API Server** ([api.py](api.py))
  - Integrated configuration system from [config.py](config.py)
  - CORS origins now configurable via environment variables
  - Host and port configurable via settings
  - Added startup logging with configuration info

- **API Client** ([api_client.py](api_client.py))
  - Uses centralized configuration from [config.py](config.py)
  - Removed direct `os.getenv()` calls
  - Cleaner configuration management

- **Gitignore** ([.gitignore](.gitignore))
  - Added `.env` and `.env.local`
  - Added `coverage.xml`
  - Added `.ruff_cache/`
  - Added `.mypy_cache/`

### Fixed
- DevContainer configuration pointing to deleted files
- Inconsistent dependency management (pip vs uv)
- Documentation referencing non-existent files
- Hardcoded configuration values
- Missing test coverage reporting
- No automated CI/CD pipeline

### Test Results
- ✅ 20 unit tests (test_calculations.py) - All passing
- ✅ 11 API tests (test_api.py) - All passing
- ✅ 4 integration tests (test_integration.py) - All passing
- ✅ 35 total tests - 100% passing
- 📊 Code coverage: 51.23% (core modules at 76-86%)

### Development Tools
- Python 3.10+ support
- uv package manager for fast dependency management
- Pre-commit hooks for code quality
- Comprehensive test suite with coverage
- GitHub Actions for CI/CD
- Environment-based configuration

---

## Pre-1.0.0 (Historical)

### Features
- Pure Python calculation engine ([calculations.py](calculations.py))
- FastAPI REST API backend ([api.py](api.py))
- Streamlit web frontend ([app.py](app.py))
- Pydantic validation models ([models.py](models.py))
- Comprehensive test suite (40 tests across 3 files)
- Monte Carlo simulations (vectorized & iterative)
- IRR/NPV financial calculations
- Dilution modeling
- Opportunity cost analysis
- Equity sales support (RSUs & Stock Options)
