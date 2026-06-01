"""Router module: webhooks."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.exceptions import NotFoundException
from checkix.models.webhook import Webhook, WebhookEvent
from checkix.models.user import User
from checkix.schemas.webhook import (
    WebhookCreate,
    WebhookEventOut,
    WebhookOut,
    WebhookUpdate,
)
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["webhooks"])


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
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Return a paginated list of webhooks for the current user."""
    query = (
        select(Webhook)
        .where(Webhook.user_id == current_user.id)
        .order_by(Webhook.created_at.desc())
    )
    return await paginate(db, query, pagination)


@router.post("/", response_model=WebhookOut, status_code=201)
async def create_webhook(
    body: WebhookCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Webhook:
    """Create a new webhook."""
    webhook = Webhook(
        name=body.name or "",
        endpoint_url=body.url,
        event_type=body.events[0] if body.events else "checklist_completed",
        secret=body.secret or "",
        is_active=body.is_active,
        user_id=current_user.id,
    )
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return webhook


@router.put("/{webhook_id}/", response_model=WebhookOut)
async def update_webhook(
    webhook_id: int,
    body: WebhookUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Webhook:
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
    return webhook


@router.delete("/{webhook_id}/", response_model=MessageResponse)
async def delete_webhook(
    webhook_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
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
    current_user: Annotated[User, Depends(get_current_user)],
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
    current_user: Annotated[User, Depends(get_current_user)],
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
        return {"items": [], "total": 0, "page": 1, "page_size": 20, "total_pages": 0}

    query = (
        select(WebhookEvent)
        .where(WebhookEvent.webhook_id.in_(webhook_ids))
        .order_by(WebhookEvent.created_at.desc())
    )
    if status is not None:
        query = query.where(WebhookEvent.status == status)

    return await paginate(db, query, pagination)
