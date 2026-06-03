"""Router module: webhooks."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import MANAGE_WEBHOOKS_PERMISSION, PaginationParams, paginate_mapped, require_permission
from checkix.exceptions import NotFoundException
from checkix.models.checklist_instance import ChecklistInstance
from checkix.models.user import User
from checkix.models.webhook import Webhook, WebhookEvent
from checkix.schemas.webhook import (
    WebhookCreate,
    WebhookEventOut,
    WebhookOut,
    WebhookUpdate,
)
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["webhooks"])

EVENT_TYPE_DISPLAY = {
    "instance_started": "Instance Started",
    "instance_completed": "Instance Completed",
    "item_completed": "Item Completed",
    "checklist_completed": "Checklist Completed",
    "test": "Test",
}
STATUS_DISPLAY = {"pending": "Pending", "sent": "Sent", "delivered": "Sent", "failed": "Failed"}


def _display(mapping: dict[str, str], value: str | None) -> str:
    return mapping.get(value or "", (value or "").replace("_", " ").title())


def _event_status(status: str | None) -> str | None:
    return "sent" if status == "delivered" else status


def _webhook_event_data(row) -> dict:
    event = row[0]
    return {
        "id": event.id,
        "webhook_id": event.webhook_id,
        "webhook": event.webhook_id,
        "webhook_name": row.webhook_name or "",
        "checklist_instance": event.checklist_instance_id,
        "checklist_instance_name": row.checklist_instance_name,
        "event_type": event.event_type,
        "status": _event_status(event.status),
        "status_display": _display(STATUS_DISPLAY, event.status),
        "response_code": event.response_code,
        "retry_count": event.retry_count,
        "attempts": event.retry_count,
        "last_attempt_at": event.sent_at,
        "sent_at": event.sent_at,
        "created_at": event.created_at,
    }


def _webhook_data(webhook: Webhook, events: list[dict] | None = None) -> dict:
    recent_events = events or []
    return {
        "id": webhook.id,
        "name": webhook.name,
        "url": webhook.endpoint_url,
        "endpoint_url": webhook.endpoint_url,
        "events": webhook.event_type,
        "event_type": webhook.event_type,
        "event_type_display": _display(EVENT_TYPE_DISPLAY, webhook.event_type),
        "is_active": webhook.is_active,
        "headers": webhook.headers or {},
        "events_count": len(recent_events),
        "recent_events": recent_events[:3],
        "last_event_status": recent_events[0]["status"] if recent_events else None,
        "created_at": webhook.created_at,
        "updated_at": webhook.updated_at,
    }


def _webhook_row(row) -> dict:
    return _webhook_data(row[0])


async def _add_webhook_events(db: AsyncSession, items: list[dict]) -> None:
    webhook_ids = [item["id"] for item in items]
    if not webhook_ids:
        return
    events_by_webhook: dict[int, list[dict]] = {webhook_id: [] for webhook_id in webhook_ids}
    result = await db.execute(_webhook_events_query().where(WebhookEvent.webhook_id.in_(webhook_ids)))
    for row in result.all():
        events_by_webhook[row[0].webhook_id].append(_webhook_event_data(row))
    for item in items:
        events = events_by_webhook[item["id"]]
        item["events_count"] = len(events)
        item["recent_events"] = events[:3]
        item["last_event_status"] = events[0]["status"] if events else None


def _webhook_events_query():
    return (
        select(
            WebhookEvent,
            Webhook.name.label("webhook_name"),
            ChecklistInstance.name.label("checklist_instance_name"),
        )
        .join(Webhook, Webhook.id == WebhookEvent.webhook_id)
        .outerjoin(ChecklistInstance, ChecklistInstance.id == WebhookEvent.checklist_instance_id)
        .order_by(WebhookEvent.created_at.desc())
    )


async def _get_webhook_or_404(
    db: AsyncSession,
    webhook_id: int,
    user_id: int,
) -> Webhook:
    """Fetch a webhook owned by *user_id* or raise 404."""
    result = await db.execute(
        select(Webhook).where(
            Webhook.id == webhook_id,
            Webhook.user_id == user_id,
        )
    )
    webhook = result.scalar_one_or_none()
    if webhook is None:
        raise NotFoundException(detail="Webhook not found")
    return webhook


# ---------------------------------------------------------------------------
# Webhook CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=None)
async def list_webhooks(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(MANAGE_WEBHOOKS_PERMISSION))],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Return a paginated list of webhooks for the current user."""
    query = (
        select(Webhook)
        .where(Webhook.user_id == current_user.id)
        .order_by(Webhook.created_at.desc())
    )
    page = await paginate_mapped(db, query, pagination, _webhook_row)
    await _add_webhook_events(db, page["items"])
    return page


@router.post("/", response_model=WebhookOut, status_code=201)
async def create_webhook(
    body: WebhookCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(MANAGE_WEBHOOKS_PERMISSION))],
) -> dict:
    """Create a new webhook."""
    webhook = Webhook(
        name=body.name or "",
        endpoint_url=body.url,
        event_type=body.events[0] if body.events else "instance_started",
        secret=body.secret or "",
        is_active=body.is_active,
        user_id=current_user.id,
    )
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return _webhook_data(webhook)


@router.put("/{webhook_id}/", response_model=WebhookOut)
async def update_webhook(
    webhook_id: int,
    body: WebhookUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(MANAGE_WEBHOOKS_PERMISSION))],
) -> dict:
    """Update an existing webhook."""
    webhook = await _get_webhook_or_404(db, webhook_id, current_user.id)

    update_data = body.model_dump(exclude_unset=True)

    if "url" in update_data:
        update_data["endpoint_url"] = update_data.pop("url")
    if "events" in update_data:
        events = update_data.pop("events")
        if events:
            update_data["event_type"] = events[0]

    for field, value in update_data.items():
        if hasattr(webhook, field):
            setattr(webhook, field, value)

    await db.commit()
    await db.refresh(webhook)
    return _webhook_data(webhook)


@router.delete("/{webhook_id}/", response_model=MessageResponse)
async def delete_webhook(
    webhook_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(MANAGE_WEBHOOKS_PERMISSION))],
) -> MessageResponse:
    """Delete a webhook permanently."""
    webhook = await _get_webhook_or_404(db, webhook_id, current_user.id)

    await db.delete(webhook)
    await db.commit()
    return MessageResponse(message="Webhook deleted")


@router.post("/{webhook_id}/test/", response_model=MessageResponse)
async def test_webhook(
    webhook_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(MANAGE_WEBHOOKS_PERMISSION))],
) -> MessageResponse:
    """Send a test payload to the webhook endpoint."""
    webhook = await _get_webhook_or_404(db, webhook_id, current_user.id)

    # Record a test event
    event = WebhookEvent(
        webhook_id=webhook.id,
        event_type="test",
        payload={"test": True, "webhook_name": webhook.name},
        status="pending",
    )
    db.add(event)
    await db.commit()

    return MessageResponse(
        message="Test event queued",
        detail=f"Webhook test event created for {webhook.name}",
    )


# ---------------------------------------------------------------------------
# Webhook Events
# ---------------------------------------------------------------------------


@router.get("/events/", response_model=None)
async def list_webhook_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission(MANAGE_WEBHOOKS_PERMISSION))],
    pagination: Annotated[PaginationParams, Depends()],
    status: Annotated[Optional[str], Query()] = None,
) -> dict:
    """Return a paginated list of webhook events for the current user's webhooks."""
    # Get user's webhook IDs first
    user_webhooks = await db.execute(
        select(Webhook.id).where(Webhook.user_id == current_user.id)
    )
    webhook_ids = [row[0] for row in user_webhooks.all()]

    if not webhook_ids:
        return {"items": [], "total": 0, "page": pagination.page, "page_size": pagination.page_size, "total_pages": 0}

    query = _webhook_events_query().where(WebhookEvent.webhook_id.in_(webhook_ids))
    if status is not None:
        statuses = ["sent", "delivered"] if status == "sent" else [status]
        query = query.where(WebhookEvent.status.in_(statuses))

    return await paginate_mapped(db, query, pagination, _webhook_event_data)
