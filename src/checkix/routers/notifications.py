"""Router module: notifications."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.exceptions import NotFoundException
from checkix.models.notification import NotificationLog, NotificationRule
from checkix.models.user import User
from checkix.schemas.notification import (
    NotificationLogOut,
    NotificationRuleCreate,
    NotificationRuleOut,
)
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["notifications"])


# ---------------------------------------------------------------------------
# Notification Rules
# ---------------------------------------------------------------------------


@router.get("/rules/", response_model=None)
async def list_notification_rules(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Return a paginated list of notification rules for the current user."""
    query = (
        select(NotificationRule)
        .where(NotificationRule.created_by_id == current_user.id)
        .order_by(NotificationRule.created_at.desc())
    )
    return await paginate(db, query, pagination)


@router.post("/rules/", response_model=NotificationRuleOut, status_code=201)
async def create_notification_rule(
    body: NotificationRuleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> NotificationRule:
    """Create a new notification rule."""
    rule = NotificationRule(
        event_type=body.event_type or "checklist_completed",
        is_active=body.is_active,
        created_by_id=current_user.id,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}/", response_model=MessageResponse)
async def delete_notification_rule(
    rule_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Delete a notification rule permanently."""
    result = await db.execute(
        select(NotificationRule).where(
            NotificationRule.id == rule_id,
            NotificationRule.created_by_id == current_user.id,
        )
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise NotFoundException(detail="Notification rule not found")

    await db.delete(rule)
    await db.commit()
    return MessageResponse(message="Notification rule deleted")


# ---------------------------------------------------------------------------
# Notification Logs
# ---------------------------------------------------------------------------


@router.get("/logs/", response_model=None)
async def list_notification_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    status: Annotated[Optional[str], Query()] = None,
) -> dict:
    """Return a paginated list of notification logs."""
    query = (
        select(NotificationLog)
        .order_by(NotificationLog.created_at.desc())
    )
    if status is not None:
        query = query.where(NotificationLog.status == status)

    return await paginate(db, query, pagination)
