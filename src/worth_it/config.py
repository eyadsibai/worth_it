"""
Configuration management for the Worth It application.
Loads settings from environment variables with sensible defaults.
"""

import os
from typing import List


class Settings:
    """Application settings loaded from environment variables."""

    # API Configuration
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_BASE_URL: str = os.getenv("API_BASE_URL", f"http://localhost:{API_PORT}")

    # Frontend Configuration
    STREAMLIT_PORT: int = int(os.getenv("STREAMLIT_PORT", "8501"))

    # CORS Configuration
    @staticmethod
    def get_cors_origins() -> List[str]:
        """Get list of allowed CORS origins from environment."""
        default_origins = [
            "http://localhost:8501",
            "http://localhost:3000",
            "http://127.0.0.1:8501",
            "http://127.0.0.1:3000",
        ]
        env_origins = os.getenv("CORS_ORIGINS", "")
        if env_origins:
            return [origin.strip() for origin in env_origins.split(",")]
        return default_origins

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Monte Carlo Simulation Limits
    MAX_SIMULATIONS: int = int(os.getenv("MAX_SIMULATIONS", "10000"))

    # Rate Limiting (optional - for production)
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

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
            errors.append(f"Invalid STREAMLIT_PORT: {cls.STREAMLIT_PORT}. Must be between 1 and 65535.")

        if cls.MAX_SIMULATIONS < 1 or cls.MAX_SIMULATIONS > 100000:
            errors.append(f"Invalid MAX_SIMULATIONS: {cls.MAX_SIMULATIONS}. Must be between 1 and 100000.")

        if cls.LOG_LEVEL not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            errors.append(f"Invalid LOG_LEVEL: {cls.LOG_LEVEL}. Must be one of DEBUG, INFO, WARNING, ERROR, CRITICAL.")

        if errors:
            raise ValueError("Configuration validation failed:\n" + "\n".join(errors))


# Singleton instance
settings = Settings()

# Validate on import (fails fast if misconfigured)
try:
    settings.validate()
except ValueError as e:
    print(f"⚠️  Configuration Warning: {e}")
