"""Tests that configuration is actually loaded from backend/.env and the environment."""

from __future__ import annotations

from pathlib import Path

import pytest

from worth_it import config

SETTING_ENV_VARS = (
    "API_HOST",
    "API_PORT",
    "API_BASE_URL",
    "STREAMLIT_PORT",
    "CORS_ORIGINS",
    "ENVIRONMENT",
    "LOG_LEVEL",
    "MAX_SIMULATIONS",
    "RATE_LIMIT_ENABLED",
    "RATE_LIMIT_PER_MINUTE",
    "RATE_LIMIT_MONTE_CARLO_PER_MINUTE",
    "WS_MAX_CONCURRENT_PER_IP",
    "WS_SIMULATION_TIMEOUT_SECONDS",
)


@pytest.fixture
def env_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Point the loader at a throwaway .env and drop inherited overrides.

    The returned path is not written to disk unless the test writes it, so a test
    that leaves it alone exercises the "no .env at all" path.
    """
    for name in SETTING_ENV_VARS:
        monkeypatch.delenv(name, raising=False)
    path = tmp_path / ".env"
    monkeypatch.setitem(config.EnvSettings.model_config, "env_file", path)
    return path


class TestEnvFileLoading:
    """The .env file documented in backend/CLAUDE.md must actually be honored."""

    def test_values_from_env_file_are_used(self, env_file: Path) -> None:
        env_file.write_text(
            "API_HOST=0.0.0.0\n"
            "API_PORT=9001\n"
            "ENVIRONMENT=production\n"
            "LOG_LEVEL=WARNING\n"
            "MAX_SIMULATIONS=1234\n"
            "RATE_LIMIT_ENABLED=false\n"
        )

        settings = config.Settings()

        assert settings.API_HOST == "0.0.0.0"
        assert settings.API_PORT == 9001
        assert settings.ENVIRONMENT == "production"
        assert settings.LOG_LEVEL == "WARNING"
        assert settings.MAX_SIMULATIONS == 1234
        assert settings.RATE_LIMIT_ENABLED is False

    def test_real_environment_overrides_env_file(
        self, env_file: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        env_file.write_text("API_HOST=10.0.0.1\nMAX_SIMULATIONS=1234\n")
        monkeypatch.setenv("API_HOST", "192.168.1.1")
        monkeypatch.setenv("MAX_SIMULATIONS", "4321")

        settings = config.Settings()

        assert settings.API_HOST == "192.168.1.1"
        assert settings.MAX_SIMULATIONS == 4321

    def test_defaults_apply_when_nothing_is_set(self, env_file: Path) -> None:
        assert not env_file.exists()

        settings = config.Settings()

        assert settings.API_HOST == "127.0.0.1"
        assert settings.API_PORT == 8000
        assert settings.API_BASE_URL == "http://localhost:8000"
        assert settings.STREAMLIT_PORT == 8501
        assert settings.ENVIRONMENT == "development"
        assert settings.LOG_LEVEL == "INFO"
        assert settings.MAX_SIMULATIONS == 10000
        assert settings.RATE_LIMIT_ENABLED is True
        assert settings.RATE_LIMIT_PER_MINUTE == 60
        assert settings.RATE_LIMIT_MONTE_CARLO_PER_MINUTE == 10
        assert settings.WS_MAX_CONCURRENT_PER_IP == 5
        assert settings.WS_SIMULATION_TIMEOUT_SECONDS == 60

    def test_settings_resolve_at_instantiation_not_at_import(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("API_HOST", "0.0.0.0")
        monkeypatch.setenv("WS_MAX_CONCURRENT_PER_IP", "9")

        settings = config.Settings()

        assert settings.API_HOST == "0.0.0.0"
        assert settings.WS_MAX_CONCURRENT_PER_IP == 9

    def test_env_file_defaults_to_the_backend_directory(self) -> None:
        backend_env = Path(config.__file__).resolve().parents[2] / ".env"

        assert backend_env == config.ENV_FILE
        assert config.EnvSettings.model_config["env_file"] == backend_env


class TestProductionCorsOrigins:
    """A production deploy must not silently get the development CORS list."""

    def test_production_from_env_file_excludes_development_origins(self, env_file: Path) -> None:
        env_file.write_text("ENVIRONMENT=production\n")

        assert config.Settings.is_production() is True
        origins = config.Settings.get_cors_origins()
        assert "https://localhost:3000" not in origins
        assert "https://localhost:3001" not in origins

    def test_production_from_environment_excludes_development_origins(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("CORS_ORIGINS", raising=False)
        monkeypatch.setenv("ENVIRONMENT", "production")

        origins = config.Settings.get_cors_origins()

        assert "https://localhost:3000" not in origins
        assert "https://localhost:3001" not in origins

    def test_explicit_cors_origins_from_env_file_are_used(self, env_file: Path) -> None:
        env_file.write_text(
            "ENVIRONMENT=production\nCORS_ORIGINS=https://app.example.com,https://api.example.com\n"
        )

        assert config.Settings.get_cors_origins() == [
            "https://app.example.com",
            "https://api.example.com",
        ]
