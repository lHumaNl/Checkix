"""Authentication service: password hashing, JWT tokens, and WebSocket tickets."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.config import settings
from checkix.models.user import User

if TYPE_CHECKING:
    from redis.asyncio import Redis


class AuthService:
    """Stateless helper that groups authentication-related operations."""

    # -- password helpers -------------------------------------------------------

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Return ``True`` when *plain_password* matches *hashed_password*."""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )

    @staticmethod
    def hash_password(password: str) -> str:
        """Return a bcrypt hash of *password*."""
        return bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

    # -- user lookup -----------------------------------------------------------

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        username: str,
        password: str,
    ) -> User | None:
        """Look up a user by *username* and verify the password.

        Returns the ``User`` instance on success or ``None`` when the
        credentials are invalid or the account is inactive.
        """
        result = await db.execute(
            select(User).where(User.username == username),
        )
        user = result.scalar_one_or_none()

        if user is None:
            return None

        if not user.is_active:
            return None

        if not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
            return None

        return user

    # -- JWT tokens ------------------------------------------------------------

    @staticmethod
    def create_access_token(user_id: int) -> str:
        """Encode a short-lived access JWT for *user_id*.

        The token payload contains ``sub`` (user id), ``iat`` (issued-at),
        and ``exp`` (expiration).
        """
        now = datetime.now(timezone.utc)
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload: dict = {
            "sub": str(user_id),
            "iat": now,
            "exp": now + expires_delta,
            "type": "access",
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def create_refresh_token(user_id: int) -> str:
        """Encode a long-lived refresh JWT for *user_id*.

        Returns the encoded token string.
        """
        now = datetime.now(timezone.utc)
        expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        payload: dict = {
            "sub": str(user_id),
            "iat": now,
            "exp": now + expires_delta,
            "type": "refresh",
            "jti": str(uuid.uuid4()),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def verify_token(token: str) -> dict:
        """Decode and verify *token*.

        Returns the token payload dict.

        Raises ``jwt.InvalidTokenError`` (or a subclass) when the token is
        invalid or expired.
        """
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

    # -- WebSocket tickets -----------------------------------------------------

    @staticmethod
    async def create_ws_ticket(user_id: int, redis: Redis) -> str:
        """Generate a one-time WebSocket ticket and store it in Redis.

        The ticket is valid for 60 seconds.  Returns the ticket string.
        """
        ticket = str(uuid.uuid4())
        key = f"ws_ticket:{ticket}"
        await redis.set(key, str(user_id), ex=60)
        return ticket

    @staticmethod
    async def verify_ws_ticket(ticket: str, redis: Redis) -> int | None:
        """Validate a WebSocket ticket and return the user id.

        The ticket is consumed (deleted from Redis) on successful lookup.
        Returns ``None`` when the ticket is missing or expired.
        """
        key = f"ws_ticket:{ticket}"
        raw: str | None = await redis.get(key)
        if raw is None:
            return None
        # Consume the ticket so it cannot be reused
        await redis.delete(key)
        return int(raw)
