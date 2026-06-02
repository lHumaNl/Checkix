"""Lazy async SQLAlchemy database engine and session factory."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from checkix.config import settings
from checkix.models.base import Base

DEFAULT_POOL_SIZE = 20

_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Return the async engine, creating it on first runtime use."""
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            pool_size=DEFAULT_POOL_SIZE,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the async session factory, creating it on first runtime use."""
    global _async_session_factory
    if _async_session_factory is None:
        _async_session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session_factory


async def dispose_engine() -> None:
    """Dispose of the async engine if it has been initialized."""
    global _async_session_factory, _engine
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _async_session_factory = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session, ensuring cleanup on exit."""
    async with get_session_factory()() as session:
        yield session
