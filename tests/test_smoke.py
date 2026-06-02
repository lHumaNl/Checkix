"""Smoke tests for the FastAPI application."""

import os

from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "postgresql+asyncpg://checkix:checkix@localhost:5432/checkix"

from checkix.config import Settings  # noqa: E402
from checkix.main import app  # noqa: E402


def test_health_check_returns_ok() -> None:
    """Health check should respond without database access during request handling."""
    client = TestClient(app)

    response = client.get("/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_schema_is_available() -> None:
    """FastAPI should expose a valid OpenAPI schema."""
    client = TestClient(app)

    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Checkix"


def test_settings_normalize_legacy_postgres_schemes() -> None:
    """Settings should normalize legacy postgres URL schemes."""
    settings = Settings(
        DATABASE_URL="postgres+asyncpg://checkix:checkix@localhost:5432/checkix",
        DATABASE_URL_SYNC="postgresql://checkix:checkix@localhost:5432/checkix",
    )

    assert settings.database_url == "postgresql+asyncpg://checkix:checkix@localhost:5432/checkix"
    assert settings.database_url_sync == "postgresql://checkix:checkix@localhost:5432/checkix"
