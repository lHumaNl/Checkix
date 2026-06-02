"""Application configuration loaded from environment variables."""

from __future__ import annotations

import json

from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_async_postgres_url(url: str) -> str:
    """Convert PostgreSQL URL schemes to SQLAlchemy's asyncpg driver form."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres+asyncpg://"):
        return url.replace("postgres+asyncpg://", "postgresql+asyncpg://", 1)
    return url


def _normalize_sync_postgres_url(url: str) -> str:
    """Convert PostgreSQL URL schemes to SQLAlchemy's sync PostgreSQL form."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgres+asyncpg://"):
        return url.replace("postgres+asyncpg://", "postgresql://", 1)
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return url


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://checkix:checkix@localhost:5432/checkix"
    DATABASE_URL_SYNC: str = "postgresql://checkix:checkix@localhost:5432/checkix"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str | list[str] = '["http://localhost","http://localhost:80","http://localhost:5173"]'
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"

    @property
    def cors_origins(self) -> list[str]:
        """Return CORS origins from a JSON array or comma-separated setting."""
        if isinstance(self.CORS_ORIGINS, list):
            return [str(origin).strip() for origin in self.CORS_ORIGINS if str(origin).strip()]

        raw_origins = self.CORS_ORIGINS.strip()
        if not raw_origins:
            return []
        try:
            parsed = json.loads(raw_origins)
        except json.JSONDecodeError:
            return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
        if not isinstance(parsed, list):
            return []
        return [str(origin).strip() for origin in parsed if str(origin).strip()]

    @property
    def database_url(self) -> str:
        """Return the normalized async database URL."""
        return _normalize_async_postgres_url(self.DATABASE_URL)

    @property
    def database_url_sync(self) -> str:
        """Return the normalized sync database URL."""
        return _normalize_sync_postgres_url(self.DATABASE_URL_SYNC)


settings = Settings()
