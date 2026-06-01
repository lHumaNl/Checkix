"""Router module: audit."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.models.audit import AuditLog
from checkix.models.user import User
from checkix.schemas.audit import AuditLogOut

router = APIRouter(tags=["audit"])


@router.get("/", response_model=None)
async def list_audit_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    entity_type: Annotated[Optional[str], Query()] = None,
    user_id: Annotated[Optional[int], Query()] = None,
) -> dict:
    """Return a paginated list of audit log entries.

    Optional filters: ``entity_type`` and ``user_id``.
    """
    query = select(AuditLog).order_by(AuditLog.created_at.desc())

    if entity_type is not None:
        query = query.where(AuditLog.entity_type == entity_type)
    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)

    return await paginate(db, query, pagination)
