"""
Configuration management for the Worth It application.
Loads settings from environment variables with sensible defaults.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


class Settings:
    """Application settings loaded from environment variables."""

    # API Configuration
    # Default to localhost for security; set API_HOST=0.0.0.0 explicitly for Docker/containers
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    @property
    def API_BASE_URL(self) -> str:
        """Get API base URL, using API_PORT if not explicitly set."""
        return os.getenv("API_BASE_URL", f"http://localhost:{self.API_PORT}")

    # Frontend Configuration
    STREAMLIT_PORT: int = int(os.getenv("STREAMLIT_PORT", "8501"))

    # CORS Configuration
    @staticmethod
    def get_cors_origins() -> list[str]:
        """Get list of allowed CORS origins from environment.

        In production, set CORS_ORIGINS environment variable with comma-separated list:
        CORS_ORIGINS="https://app.example.com,https://preview-*.vercel.app"
        """
        # Default origins for local development
        default_origins = [
            "http://localhost:3000",  # Next.js default port
            "http://localhost:8501",  # Legacy Streamlit port
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8501",
        ]

        env_origins = os.getenv("CORS_ORIGINS", "")
        if env_origins:
            # In production, use environment-specified origins
            # Filter out empty strings from malformed input (e.g., "https://a.com,,https://b.com")
            origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
            return origins

        # In development, add potential Vercel preview URLs
        if Settings.ENVIRONMENT.lower() == "development":
            return default_origins + [
                "https://localhost:3000",
            ]

        return default_origins

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Monte Carlo Simulation Limits
    MAX_SIMULATIONS: int = int(os.getenv("MAX_SIMULATIONS", "10000"))

    # Rate Limiting (enabled by default for API protection)
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    RATE_LIMIT_MONTE_CARLO_PER_MINUTE: int = int(
        os.getenv("RATE_LIMIT_MONTE_CARLO_PER_MINUTE", "10")
    )

    # WebSocket Security Settings
    WS_MAX_CONCURRENT_PER_IP: int = int(os.getenv("WS_MAX_CONCURRENT_PER_IP", "5"))
    WS_SIMULATION_TIMEOUT_SECONDS: int = int(
        os.getenv("WS_SIMULATION_TIMEOUT_SECONDS", "60")
    )

    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production environment."""
        return cls.ENVIRONMENT.lower() == "production"

    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development environment."""
        return cls.ENVIRONMENT.lower() == "development"

    @classmethod
    def validate(cls) -> None:
        """Validate critical configuration settings."""
        errors = []

        if cls.API_PORT < 1 or cls.API_PORT > 65535:
            errors.append(f"Invalid API_PORT: {cls.API_PORT}. Must be between 1 and 65535.")

        if cls.STREAMLIT_PORT < 1 or cls.STREAMLIT_PORT > 65535:
            errors.append(
                f"Invalid STREAMLIT_PORT: {cls.STREAMLIT_PORT}. Must be between 1 and 65535."
            )

        if cls.MAX_SIMULATIONS < 1 or cls.MAX_SIMULATIONS > 100000:
            errors.append(
                f"Invalid MAX_SIMULATIONS: {cls.MAX_SIMULATIONS}. Must be between 1 and 100000."
            )

        if cls.WS_MAX_CONCURRENT_PER_IP < 1 or cls.WS_MAX_CONCURRENT_PER_IP > 20:
            errors.append(
                f"Invalid WS_MAX_CONCURRENT_PER_IP: {cls.WS_MAX_CONCURRENT_PER_IP}. Must be between 1 and 20."
            )

        if cls.WS_SIMULATION_TIMEOUT_SECONDS < 5 or cls.WS_SIMULATION_TIMEOUT_SECONDS > 300:
            errors.append(
                f"Invalid WS_SIMULATION_TIMEOUT_SECONDS: {cls.WS_SIMULATION_TIMEOUT_SECONDS}. Must be between 5 and 300."
            )

        if cls.LOG_LEVEL not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            errors.append(
                f"Invalid LOG_LEVEL: {cls.LOG_LEVEL}. Must be one of DEBUG, INFO, WARNING, ERROR, CRITICAL."
            )

        # Validate CORS origins format
        cors_origins = cls.get_cors_origins()
        for origin in cors_origins:
            if origin != "*" and not (
                origin.startswith("http://") or origin.startswith("https://")
            ):
                errors.append(
                    f"Invalid CORS origin '{origin}'. Must be '*' or start with http:// or https://"
                )

        # In production, reject wildcard CORS as a hard error
        if cls.is_production() and "*" in cors_origins:
            errors.append(
                "Wildcard '*' CORS origin is not allowed in production. "
                "Set CORS_ORIGINS to specific allowed origins."
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
            # Note: Wildcard CORS check is handled by validate() which raises an error
            # before this method is called, so no need to check for "*" here

            # Check for overly permissive CORS patterns (warn for ALL HTTP origins)
            for origin in cors_origins:
                if origin.startswith("http://"):
                    logger.warning(
                        f"SECURITY WARNING: Non-HTTPS origin '{origin}' in production CORS. "
                        "Consider using HTTPS origins only."
                    )

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
                f"Development mode: HOST={cls.API_HOST}, "
                f"CORS defaults to localhost origins"
            )


# Singleton instance
settings = Settings()

# Validate on import (fails fast if misconfigured)
settings.validate()

# Log security warnings (non-blocking)
settings.validate_security()
