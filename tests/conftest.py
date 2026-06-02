"""Shared fixtures for backend integration tests."""

from __future__ import annotations

import os
import subprocess
import sys
from collections.abc import AsyncGenerator, Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from checkix.database import get_db
from checkix.main import create_app
from checkix.models import Base
from checkix.models.user import User
from checkix.services.auth import AuthService

TEST_PASSWORD = "test-password"
REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_PATH = str(REPO_ROOT / "src")


@dataclass(frozen=True)
class AuthenticatedUser:
    """A seeded user and its bearer headers."""

    id: int
    username: str
    headers: dict[str, str]


@pytest_asyncio.fixture(scope="session")
async def test_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create the test schema once when PostgreSQL is available."""
    database_url = _test_database_url()
    engine = create_async_engine(database_url, pool_pre_ping=True, poolclass=NullPool)
    try:
        await _assert_database_is_available(engine)
        await _reset_schema(engine, database_url)
    except Exception as exc:
        await engine.dispose()
        if _is_test_database_url_explicit():
            message = f"PostgreSQL integration test database setup failed: {type(exc).__name__}: {exc}"
            pytest.fail(message)
        pytest.skip(f"PostgreSQL integration tests skipped: {type(exc).__name__}")

    try:
        yield engine
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def clean_database(test_engine: AsyncEngine) -> AsyncGenerator[None, None]:
    """Keep every integration test isolated without recreating metadata."""
    await _truncate_tables(test_engine)
    yield
    await _truncate_tables(test_engine)


@pytest.fixture
def db_session_factory(test_engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Return an async session factory bound to the test engine."""
    return async_sessionmaker(test_engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def api_client(
    db_session_factory: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncClient, None]:
    """Return an HTTP client wired to the real FastAPI app and test DB."""
    app = create_app()

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with db_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def user_factory(
    db_session_factory: async_sessionmaker[AsyncSession],
) -> Callable[..., Awaitable[User]]:
    """Create active users with valid bcrypt hashes."""

    async def create_user(username: str, *, is_active: bool = True) -> User:
        async with db_session_factory() as session:
            user = User(
                username=username,
                email=f"{username}@example.test",
                password=AuthService.hash_password(TEST_PASSWORD),
                first_name="",
                last_name="",
                is_active=is_active,
                is_staff=False,
                is_superuser=False,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    return create_user


@pytest_asyncio.fixture
async def authenticated_user_factory(
    api_client: AsyncClient,
    user_factory: Callable[..., Awaitable[User]],
) -> Callable[[str], Awaitable[AuthenticatedUser]]:
    """Create a user and return bearer headers from the real login endpoint."""

    async def create_authenticated_user(username: str) -> AuthenticatedUser:
        user = await user_factory(username)
        response = await api_client.post(
            "/api/auth/token/",
            json={"username": username, "password": TEST_PASSWORD},
        )
        assert response.status_code == 200, response.text
        token = response.json()["access"]
        return AuthenticatedUser(
            id=user.id,
            username=username,
            headers={"Authorization": f"Bearer {token}"},
        )

    return create_authenticated_user


def _test_database_url() -> str:
    raw_url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not raw_url:
        pytest.skip("PostgreSQL integration tests skipped: TEST_DATABASE_URL is not set")
    url = _normalize_async_postgres_url(raw_url)
    _assert_safe_database_name(url)
    return url


def _normalize_async_postgres_url(raw_url: str) -> str:
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw_url


def _assert_safe_database_name(database_url: str) -> None:
    database_name = make_url(database_url).database or ""
    if "test" not in database_name.lower():
        pytest.skip("PostgreSQL integration tests skipped: database name must contain 'test'")


async def _assert_database_is_available(engine: AsyncEngine) -> None:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def _reset_schema(engine: AsyncEngine, database_url: str) -> None:
    async with engine.begin() as connection:
        await connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await connection.execute(text("CREATE SCHEMA public"))
    _apply_alembic_migrations(database_url)


def _apply_alembic_migrations(database_url: str) -> None:
    env = os.environ.copy()
    sync_database_url = _normalize_sync_postgres_url(database_url)
    env["DATABASE_URL"] = sync_database_url
    env["DATABASE_URL_SYNC"] = sync_database_url
    env["PYTHONPATH"] = _pythonpath_with_src(env.get("PYTHONPATH"))
    result = subprocess.run(
        [sys.executable, "-c", _alembic_upgrade_probe(sql=False)],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr or result.stdout)


def _normalize_sync_postgres_url(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if database_url.startswith("postgresql+psycopg2://"):
        return database_url.replace("postgresql+psycopg2://", "postgresql://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql://", 1)
    return database_url


def _pythonpath_with_src(current_pythonpath: str | None) -> str:
    if not current_pythonpath:
        return SRC_PATH
    return f"{SRC_PATH}{os.pathsep}{current_pythonpath}"


def _alembic_upgrade_probe(*, sql: bool) -> str:
    return "\n".join(
        (
            "from alembic import command",
            "from alembic.config import Config",
            "command.upgrade(Config('alembic.ini'), 'head', sql=%r)" % sql,
        )
    )


def _is_test_database_url_explicit() -> bool:
    return bool(os.getenv("TEST_DATABASE_URL"))


async def _truncate_tables(engine: AsyncEngine) -> None:
    table_names = [table.name for table in Base.metadata.sorted_tables]
    if not table_names:
        return
    quoted_tables = ", ".join(f'"{table_name}"' for table_name in table_names)
    async with engine.begin() as connection:
        await connection.execute(text(f"TRUNCATE TABLE {quoted_tables} RESTART IDENTITY CASCADE"))
