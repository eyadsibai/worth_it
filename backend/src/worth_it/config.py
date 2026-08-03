"""
Configuration management for the Worth It application.
Loads settings from the backend .env file and environment variables, in that
order of increasing precedence, with sensible defaults.
"""

from __future__ import annotations

import ipaddress
import logging
import os
from pathlib import Path
from typing import Annotated, Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

logger = logging.getLogger(__name__)

IPNetwork = ipaddress.IPv4Network | ipaddress.IPv6Network

# Validation boundary constants
MAX_PORT = 65535
MAX_SIMULATIONS_UPPER = 100000
MAX_WS_CONCURRENT = 20
MIN_WS_TIMEOUT = 5
MAX_WS_TIMEOUT = 300

# backend/.env, resolved from src/worth_it/config.py so it is found from any cwd
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class EnvSettings(BaseSettings):
    """Setting values as they exist in the environment right now.

    Real environment variables take precedence over the .env file.
    """

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Default to localhost for security; set API_HOST=0.0.0.0 explicitly for Docker/containers
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000
    API_BASE_URL: str | None = None
    STREAMLIT_PORT: int = 8501
    CORS_ORIGINS: str = ""
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    MAX_SIMULATIONS: int = 10000
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_MONTE_CARLO_PER_MINUTE: int = 10
    WS_MAX_CONCURRENT_PER_IP: int = 5
    WS_SIMULATION_TIMEOUT_SECONDS: int = 60

    # Addresses or CIDR blocks allowed to speak for their clients via
    # X-Forwarded-For. Empty means trust nobody, which keeps the header inert.
    TRUSTED_PROXIES: Annotated[tuple[IPNetwork, ...], NoDecode] = ()

    @field_validator("TRUSTED_PROXIES", mode="before")
    @classmethod
    def _parse_trusted_proxies(cls, value: Any) -> Any:
        """Parse the comma-separated form an operator actually writes.

        NoDecode stops pydantic-settings from JSON-decoding the raw value first,
        so "10.0.0.0/8, 192.168.0.0/16" is read as a list rather than rejected.
        Host bits are tolerated (10.1.2.3/8 means the /8 that contains it), but
        an entry that is not an address at all raises: a silently dropped typo
        is how this setting shipped inert in the first place.
        """
        if isinstance(value, str):
            value = value.split(",")
        if not isinstance(value, (list, tuple)):
            return value
        return tuple(
            ipaddress.ip_network(entry.strip(), strict=False) if isinstance(entry, str) else entry
            for entry in value
            if not isinstance(entry, str) or entry.strip()
        )


_ENV_CACHE: dict[object, EnvSettings] = {}


def reset_settings_cache() -> None:
    """Drop memoised settings so the next read re-parses the environment."""
    _ENV_CACHE.clear()


def _env_file_paths() -> tuple[Path, ...]:
    configured = EnvSettings.model_config.get("env_file")
    if configured is None:
        return ()
    if isinstance(configured, (str, Path)):
        return (Path(configured),)
    return tuple(Path(entry) for entry in configured)


def _env_fingerprint() -> tuple[object, ...]:
    """Cheap identity of everything EnvSettings would read.

    A stat per .env file plus one dict lookup per field, versus opening and
    parsing the file. Any environment change, and any .env write that moves the
    file's size or mtime, changes the fingerprint, so the memo invalidates
    itself; reset_settings_cache() covers rewriting a file in place within a
    single filesystem timestamp tick.
    """
    stamps: list[tuple[object, ...]] = []
    for path in _env_file_paths():
        try:
            stat = path.stat()
        except OSError:
            stamps.append((str(path), None))
        else:
            stamps.append((str(path), stat.st_mtime_ns, stat.st_size))
    overrides = tuple((name, os.environ.get(name)) for name in EnvSettings.model_fields)
    return (tuple(stamps), overrides)


def _resolve_env() -> EnvSettings:
    """Read every setting from the environment and the .env file.

    Memoised against the fingerprint above: settings are read on every request
    and once per Monte Carlo batch, and re-parsing the .env file from disk on
    each of those attribute accesses is pure overhead.
    """
    fingerprint = _env_fingerprint()
    cached = _ENV_CACHE.get(fingerprint)
    if cached is None:
        # Only the current environment is worth keeping.
        _ENV_CACHE.clear()
        cached = _ENV_CACHE.setdefault(fingerprint, EnvSettings())
    return cached


class _SettingsMeta(type):
    """Serves setting values read off the class itself, resolved on each access."""

    def __getattr__(cls, name: str) -> Any:
        if name.startswith("_") or name not in EnvSettings.model_fields:
            raise AttributeError(f"{cls.__name__!r} has no attribute {name!r}")
        return getattr(_resolve_env(), name)


class Settings(metaclass=_SettingsMeta):
    """Application settings.

    Instances snapshot the environment at construction time; reading a setting off
    the class re-resolves it, so subclasses can override any value as a plain
    class attribute.
    """

    def __init__(self) -> None:
        self._resolved: EnvSettings = _resolve_env()

    def __getattr__(self, name: str) -> Any:
        if name.startswith("_"):
            raise AttributeError(f"{type(self).__name__!r} has no attribute {name!r}")
        return getattr(self._resolved, name)

    @property
    def API_BASE_URL(self) -> str:
        """Get API base URL, using API_PORT if not explicitly set."""
        configured = self._resolved.API_BASE_URL
        if configured is not None:
            return configured
        return f"http://localhost:{self.API_PORT}"

    # CORS Configuration
    @classmethod
    def get_cors_origins(cls) -> list[str]:
        """Get list of allowed CORS origins from environment.

        In production, set CORS_ORIGINS environment variable with comma-separated list:
        CORS_ORIGINS="https://app.example.com,https://preview-*.vercel.app"
        """
        # Default origins for local development
        default_origins = [
            "http://localhost:3000",  # Next.js default port
            "http://localhost:3001",  # Alternate Next.js dev port
            "http://localhost:8501",  # Legacy Streamlit port
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:8501",
        ]

        env_origins = cls.CORS_ORIGINS
        if env_origins:
            # In production, use environment-specified origins
            # Filter out empty strings from malformed input (e.g., "https://a.com,,https://b.com")
            origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
            return origins

        # In development, add potential Vercel preview URLs
        if cls.ENVIRONMENT.lower() == "development":
            return [*default_origins, "https://localhost:3000", "https://localhost:3001"]

        return default_origins

    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production environment."""
        environment: str = cls.ENVIRONMENT
        return environment.lower() == "production"

    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development environment."""
        environment: str = cls.ENVIRONMENT
        return environment.lower() == "development"

    @classmethod
    def validate(cls) -> None:
        """Validate critical configuration settings."""
        errors = []

        if cls.API_PORT < 1 or cls.API_PORT > MAX_PORT:
            errors.append(f"Invalid API_PORT: {cls.API_PORT}. Must be between 1 and {MAX_PORT}.")

        if cls.STREAMLIT_PORT < 1 or cls.STREAMLIT_PORT > MAX_PORT:
            errors.append(
                f"Invalid STREAMLIT_PORT: {cls.STREAMLIT_PORT}. Must be between 1 and {MAX_PORT}."
            )

        if cls.MAX_SIMULATIONS < 1 or cls.MAX_SIMULATIONS > MAX_SIMULATIONS_UPPER:
            errors.append(
                f"Invalid MAX_SIMULATIONS: {cls.MAX_SIMULATIONS}. Must be between 1 and {MAX_SIMULATIONS_UPPER}."
            )

        if cls.WS_MAX_CONCURRENT_PER_IP < 1 or cls.WS_MAX_CONCURRENT_PER_IP > MAX_WS_CONCURRENT:
            errors.append(
                f"Invalid WS_MAX_CONCURRENT_PER_IP: {cls.WS_MAX_CONCURRENT_PER_IP}. Must be between 1 and {MAX_WS_CONCURRENT}."
            )

        if (
            cls.WS_SIMULATION_TIMEOUT_SECONDS < MIN_WS_TIMEOUT
            or cls.WS_SIMULATION_TIMEOUT_SECONDS > MAX_WS_TIMEOUT
        ):
            errors.append(
                f"Invalid WS_SIMULATION_TIMEOUT_SECONDS: {cls.WS_SIMULATION_TIMEOUT_SECONDS}. Must be between {MIN_WS_TIMEOUT} and {MAX_WS_TIMEOUT}."
            )

        if cls.LOG_LEVEL not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            errors.append(
                f"Invalid LOG_LEVEL: {cls.LOG_LEVEL}. Must be one of DEBUG, INFO, WARNING, ERROR, CRITICAL."
            )

        # Validate CORS origins format
        cors_origins = cls.get_cors_origins()
        errors.extend(
            f"Invalid CORS origin '{origin}'. Must be '*' or start with http:// or https://"
            for origin in cors_origins
            if origin != "*" and not (origin.startswith("http://") or origin.startswith("https://"))
        )

        # In production, reject wildcard CORS as a hard error
        if cls.is_production() and "*" in cors_origins:
            errors.append(
                "Wildcard '*' CORS origin is not allowed in production. "
                "Set CORS_ORIGINS to specific allowed origins."
            )

        # In production, reject insecure HTTP origins
        if cls.is_production():
            http_origins = [o for o in cors_origins if o.startswith("http://")]
            if http_origins:
                errors.append(
                    f"HTTP origins not allowed in production: {', '.join(http_origins)}. "
                    "Use HTTPS origins only."
                )

        if errors:
            raise ValueError("Configuration validation failed:\n" + "\n".join(errors))

    @classmethod
    def validate_security(cls) -> None:
        """Validate security-sensitive settings and log warnings.

        This method checks for potentially insecure configurations
        that are acceptable in development but risky in production.
        """
        if cls.is_production():
            cors_origins = cls.get_cors_origins()
            # Note: Wildcard CORS and HTTP origin checks are handled by validate()
            # which raises an error before this method is called

            # Warn about binding to all interfaces
            if cls.API_HOST == "0.0.0.0":  # nosec B104 - intentional check
                logger.warning(
                    "SECURITY WARNING: API_HOST is set to 0.0.0.0 in production. "
                    "This exposes the API to all network interfaces. "
                    "Ensure this is behind a reverse proxy or firewall."
                )

            # Log production configuration summary
            logger.info(
                f"Production security config: "
                f"HOST={cls.API_HOST}, "
                f"CORS_ORIGINS={len(cors_origins)} origins, "
                f"RATE_LIMIT={cls.RATE_LIMIT_ENABLED}"
            )
        else:
            logger.debug(
                f"Development mode: HOST={cls.API_HOST}, CORS defaults to localhost origins"
            )


# Singleton instance
settings = Settings()

# Validate on import (fails fast if misconfigured)
settings.validate()

# Log security warnings (non-blocking)
settings.validate_security()
