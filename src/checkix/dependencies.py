"""FastAPI dependency functions for authentication, authorization, and pagination."""

from __future__ import annotations

from typing import Annotated, Any

import jwt
from fastapi import Depends, Query
from fastapi.encoders import jsonable_encoder
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.config import settings
from checkix.database import get_db
from checkix.exceptions import ForbiddenException, UnauthorizedException
from checkix.models.user import User

_bearer_scheme = HTTPBearer(auto_error=False)
ACCESS_TOKEN_TYPE = "access"
TOKEN_TYPE_CLAIM = "type"


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> User:
    """Decode the Bearer JWT, look up the user in the database, and return it.

    Raises UnauthorizedException when the token is missing, malformed, expired,
    or does not map to an active user.
    """
    if credentials is None:
        raise UnauthorizedException(detail="Not authenticated")

    token = credentials.credentials

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedException(detail="Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedException(detail="Invalid token") from exc

    if payload.get(TOKEN_TYPE_CLAIM) != ACCESS_TOKEN_TYPE:
        raise UnauthorizedException(detail="Access token required")

    raw_sub = payload.get("sub")
    if raw_sub is None:
        raise UnauthorizedException(detail="Invalid token payload")
    try:
        user_id: int = int(raw_sub)
    except (ValueError, TypeError) as exc:
        raise UnauthorizedException(detail="Invalid token payload") from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise UnauthorizedException(detail="User not found")

    if not user.is_active:
        raise UnauthorizedException(detail="User account is disabled")

    return user


async def get_optional_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> User | None:
    """Return the authenticated user when a valid Bearer token is provided.

    Unlike *get_current_user* this dependency does **not** raise on missing or
    invalid credentials -- it simply returns ``None`` so that public endpoints
    can still optionally identify the caller.
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(db, credentials)
    except UnauthorizedException:
        return None


async def get_admin_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Ensure the authenticated user has admin privileges.

    Raises ForbiddenException when the user is not an admin.
    """
    if not current_user.is_admin:
        raise ForbiddenException(detail="Admin privileges required")
    return current_user


class PaginationParams:
    """Reusable pagination parameters extracted from the query string."""

    def __init__(
        self,
        page: Annotated[int, Query(ge=1, description="Page number (1-indexed)")] = 1,
        page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        """Zero-based row offset calculated from page and page_size."""
        return (self.page - 1) * self.page_size


async def paginate(
    db: AsyncSession,
    query: Any,
    pagination: PaginationParams,
) -> dict[str, Any]:
    """Execute *query* with limit/offset and return a paginated result envelope.

    Returns a dict with ``items``, ``total``, ``page``, ``page_size`` and
    ``total_pages`` keys.
    """
    from sqlalchemy import func

    # Count total matching rows
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total: int = total_result.scalar_one()

    # Apply pagination
    paginated_query = query.offset(pagination.offset).limit(pagination.page_size)
    items_result = await db.execute(paginated_query)
    items = items_result.scalars().all()

    total_pages = (total + pagination.page_size - 1) // pagination.page_size if total > 0 else 0

    # Convert ORM objects to JSON-safe dicts via jsonable_encoder
    serialized_items = [jsonable_encoder(item) for item in items]

    return {
        "items": serialized_items,
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
        "total_pages": total_pages,
    }
