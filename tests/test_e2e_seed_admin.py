"""E2E admin seeding integration tests."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from checkix.e2e_seed_admin import seed_admin_user
from checkix.models.user import User
from checkix.services.auth import AuthService


async def test_seed_admin_user_creates_active_staff_superuser(
    clean_database: None,
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    result = await seed_admin_user(
        db_session_factory,
        username="admin",
        password="test-password",
    )

    user = await _get_user(db_session_factory, "admin")

    assert result.created is True
    assert user is not None
    assert user.is_active is True
    assert user.is_staff is True
    assert user.is_superuser is True
    assert AuthService.verify_password("test-password", user.password)


async def test_seed_admin_user_updates_existing_admin_idempotently(
    clean_database: None,
    db_session_factory: async_sessionmaker[AsyncSession],
) -> None:
    await seed_admin_user(db_session_factory, username="admin", password="old-password")
    first_user = await _get_user(db_session_factory, "admin")
    assert first_user is not None
    await _disable_user(db_session_factory, first_user.id)

    result = await seed_admin_user(
        db_session_factory,
        username="admin",
        password="new-password",
    )
    updated_user = await _get_user(db_session_factory, "admin")

    assert result.created is False
    assert updated_user is not None
    assert updated_user.id == first_user.id
    assert updated_user.is_active is True
    assert updated_user.is_staff is True
    assert updated_user.is_superuser is True
    assert AuthService.verify_password("new-password", updated_user.password)


async def _get_user(
    session_factory: async_sessionmaker[AsyncSession],
    username: str,
) -> User | None:
    async with session_factory() as session:
        result = await session.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()


async def _disable_user(
    session_factory: async_sessionmaker[AsyncSession],
    user_id: int,
) -> None:
    async with session_factory() as session:
        user = await session.get(User, user_id)
        assert user is not None
        user.password = "legacy-password-hash"
        user.is_active = False
        user.is_staff = False
        user.is_superuser = False
        await session.commit()
