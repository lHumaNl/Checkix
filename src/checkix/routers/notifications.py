"""Router module: notifications."""

from __future__ import annotations

from collections import defaultdict
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate_mapped
from checkix.exceptions import NotFoundException
from checkix.models.checklist import ChecklistItem, ChecklistTemplate
from checkix.models.checklist_instance import ChecklistInstance
from checkix.models.notification import NotificationLog, NotificationRule, NotificationSequence
from checkix.models.user import Group, User
from checkix.schemas.notification import (
    NotificationLogOut,
    NotificationRuleCreate,
    NotificationRuleOut,
)
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["notifications"])

EVENT_TYPE_DISPLAY = {
    "task_due_in": "Task Due In",
    "task_overdue_by": "Task Overdue By",
    "task_completed": "Task Completed",
    "task_status_changed": "Task Status Changed",
    "checklist_completed": "Checklist Completed",
    "task_assigned": "Task Assigned",
}
STATUS_DISPLAY = {"pending": "Pending", "sent": "Sent", "failed": "Failed"}


def _display(mapping: dict[str, str], value: str | None) -> str:
    return mapping.get(value or "", (value or "").replace("_", " ").title())


def _sequence_data(sequence: NotificationSequence, group_name: str | None = None) -> dict:
    return {
        "id": sequence.id,
        "notification_rule": sequence.notification_rule_id,
        "sequence_order": sequence.sequence_order,
        "trigger_offset_minutes": sequence.trigger_offset_minutes,
        "recipient_type": sequence.recipient_type,
        "recipient_group": sequence.recipient_group_id,
        "recipient_group_name": group_name,
        "custom_email": sequence.custom_email or "",
        "email_subject": sequence.email_subject or "",
        "email_body": sequence.email_body or "",
        "created_at": sequence.created_at,
    }


def _rule_data(row, sequences: list[dict] | None = None) -> dict:
    rule = row[0]
    return {
        "id": rule.id,
        "event_type": rule.event_type,
        "event_type_display": _display(EVENT_TYPE_DISPLAY, rule.event_type),
        "is_active": rule.is_active,
        "template_id": rule.checklist_template_id,
        "checklist_template": rule.checklist_template_id,
        "checklist_template_name": row.checklist_template_name,
        "checklist_item": rule.checklist_item_id,
        "checklist_item_title": row.checklist_item_title,
        "sequences": sequences or [],
        "created_at": rule.created_at,
        "updated_at": rule.updated_at,
    }


async def _load_sequences(db: AsyncSession, rule_ids: list[int]) -> dict[int, list[dict]]:
    if not rule_ids:
        return {}
    result = await db.execute(
        select(NotificationSequence, Group.name.label("recipient_group_name"))
        .outerjoin(Group, Group.id == NotificationSequence.recipient_group_id)
        .where(NotificationSequence.notification_rule_id.in_(rule_ids))
        .order_by(NotificationSequence.sequence_order)
    )
    sequences_by_rule: dict[int, list[dict]] = defaultdict(list)
    for row in result.all():
        sequences_by_rule[row[0].notification_rule_id].append(_sequence_data(row[0], row.recipient_group_name))
    return sequences_by_rule


def _log_row(row) -> dict:
    log = row[0]
    return {
        "id": log.id,
        "rule_id": log.notification_sequence_id,
        "notification_sequence": log.notification_sequence_id,
        "checklist_instance": log.checklist_instance_id,
        "checklist_instance_name": row.checklist_instance_name,
        "recipient_email": log.recipient_email,
        "status": log.status,
        "status_display": _display(STATUS_DISPLAY, log.status),
        "sent_at": log.sent_at,
        "error": log.error_message or "",
        "error_message": log.error_message or "",
        "created_at": log.created_at,
    }


# ---------------------------------------------------------------------------
# Notification Rules
# ---------------------------------------------------------------------------


@router.get("/rules/", response_model=None)
async def list_notification_rules(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    event_type: Annotated[Optional[str], Query()] = None,
    is_active: Annotated[Optional[bool], Query()] = None,
) -> dict:
    """Return a paginated list of notification rules for the current user."""
    query = (
        select(
            NotificationRule,
            ChecklistTemplate.name.label("checklist_template_name"),
            ChecklistItem.title.label("checklist_item_title"),
        )
        .outerjoin(ChecklistTemplate, ChecklistTemplate.id == NotificationRule.checklist_template_id)
        .outerjoin(ChecklistItem, ChecklistItem.id == NotificationRule.checklist_item_id)
        .where(NotificationRule.created_by_id == current_user.id)
        .order_by(NotificationRule.created_at.desc())
    )
    if event_type is not None:
        query = query.where(NotificationRule.event_type == event_type)
    if is_active is not None:
        query = query.where(NotificationRule.is_active.is_(is_active))

    page = await paginate_mapped(db, query, pagination, _rule_data)
    sequences_by_rule = await _load_sequences(db, [item["id"] for item in page["items"]])
    for item in page["items"]:
        item["sequences"] = sequences_by_rule.get(item["id"], [])
    return page


@router.post("/rules/", response_model=NotificationRuleOut, status_code=201)
async def create_notification_rule(
    body: NotificationRuleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Create a new notification rule."""
    rule = NotificationRule(
        event_type=body.event_type or "checklist_completed",
        checklist_template_id=body.template_id,
        is_active=body.is_active,
        created_by_id=current_user.id,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    result = await db.execute(
        select(
            NotificationRule,
            ChecklistTemplate.name.label("checklist_template_name"),
            ChecklistItem.title.label("checklist_item_title"),
        )
        .outerjoin(ChecklistTemplate, ChecklistTemplate.id == NotificationRule.checklist_template_id)
        .outerjoin(ChecklistItem, ChecklistItem.id == NotificationRule.checklist_item_id)
        .where(NotificationRule.id == rule.id)
    )
    return _rule_data(result.one())


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
        select(NotificationLog, ChecklistInstance.name.label("checklist_instance_name"))
        .join(NotificationSequence, NotificationSequence.id == NotificationLog.notification_sequence_id)
        .join(NotificationRule, NotificationRule.id == NotificationSequence.notification_rule_id)
        .outerjoin(ChecklistInstance, ChecklistInstance.id == NotificationLog.checklist_instance_id)
        .where(NotificationRule.created_by_id == current_user.id)
        .order_by(NotificationLog.created_at.desc())
    )
    if status is not None:
        query = query.where(NotificationLog.status == status)

    return await paginate_mapped(db, query, pagination, _log_row)
