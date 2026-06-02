"""E2E-only admin user seeding command."""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from checkix.database import dispose_engine, get_session_factory
from checkix.models.user import User
from checkix.services.auth import AuthService

LOGGER = logging.getLogger(__name__)
USERNAME_ENV = "E2E_ADMIN_USERNAME"
PASSWORD_ENV = "E2E_ADMIN_PASSWORD"


@dataclass(frozen=True)
class SeedResult:
    """Result of an E2E admin seed operation."""

    username: str
    created: bool


async def seed_admin_user(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    username: str,
    password: str,
) -> SeedResult:
    """Create or update the E2E admin user."""
    _validate_credentials(username=username, password=password)
    async with session_factory() as session:
        user = await _get_user(session, username)
        created = user is None
        if user is None:
            user = _build_admin_user(username=username, password=password)
            session.add(user)
        else:
            _update_admin_user(user=user, password=password)
        await session.commit()
    return SeedResult(username=username, created=created)


def read_credentials_from_env() -> tuple[str, str]:
    """Return E2E admin credentials from required environment variables."""
    username = os.getenv(USERNAME_ENV, "").strip()
    password = os.getenv(PASSWORD_ENV, "")
    _validate_credentials(username=username, password=password)
    return username, password


async def _get_user(session: AsyncSession, username: str) -> User | None:
    result = await session.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


def _build_admin_user(*, username: str, password: str) -> User:
    return User(
        username=username,
        email="",
        password=AuthService.hash_password(password),
        first_name="",
        last_name="",
        is_active=True,
        is_staff=True,
        is_superuser=True,
    )


def _update_admin_user(*, user: User, password: str) -> None:
    if not _password_matches(password=password, password_hash=user.password):
        user.password = AuthService.hash_password(password)
    user.is_active = True
    user.is_staff = True
    user.is_superuser = True


def _password_matches(*, password: str, password_hash: str) -> bool:
    try:
        return AuthService.verify_password(password, password_hash)
    except ValueError:
        return False


def _validate_credentials(*, username: str, password: str) -> None:
    if not username:
        raise ValueError(f"{USERNAME_ENV} is required")
    if not password:
        raise ValueError(f"{PASSWORD_ENV} is required")


async def _run() -> SeedResult:
    username, password = read_credentials_from_env()
    return await seed_admin_user(
        get_session_factory(),
        username=username,
        password=password,
    )


async def _main_async() -> SeedResult:
    try:
        return await _run()
    finally:
        await dispose_engine()


def main() -> None:
    """Seed the E2E admin user from CLI."""
    logging.basicConfig(level=logging.INFO)
    result = asyncio.run(_main_async())
    action = "Created" if result.created else "Updated"
    LOGGER.info("%s E2E admin user %s", action, result.username)


if __name__ == "__main__":
    main()
