"""Router module: calendar_events."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.exceptions import NotFoundException
from checkix.models.calendar import CalendarEvent
from checkix.models.user import User
from checkix.schemas.calendar import (
    CalendarEventCreate,
    CalendarEventOut,
    CalendarEventUpdate,
)
from checkix.schemas.common import MessageResponse

router = APIRouter(tags=["calendar-events"])


async def _get_event_or_404(
    db: AsyncSession,
    event_id: int,
    user_id: int,
) -> CalendarEvent:
    """Fetch a calendar event owned by *user_id* or raise 404."""
    result = await db.execute(
        select(CalendarEvent).where(
            CalendarEvent.id == event_id,
            CalendarEvent.user_id == user_id,
        )
    )
    event = result.scalar_one_or_none()
    if event is None:
        raise NotFoundException(detail="Calendar event not found")
    return event


@router.get("/", response_model=None)
async def list_calendar_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
    start_date: Annotated[Optional[datetime], Query()] = None,
    end_date: Annotated[Optional[datetime], Query()] = None,
) -> dict:
    """Return a paginated list of calendar events for the current user.

    Optional filters: ``start_date`` and ``end_date`` to restrict the date range.
    """
    query = (
        select(CalendarEvent)
        .where(CalendarEvent.user_id == current_user.id)
        .order_by(CalendarEvent.start_datetime.desc())
    )
    if start_date is not None:
        query = query.where(CalendarEvent.start_datetime >= start_date)
    if end_date is not None:
        query = query.where(CalendarEvent.start_datetime <= end_date)

    return await paginate(db, query, pagination)


@router.post("/", response_model=CalendarEventOut, status_code=201)
async def create_calendar_event(
    body: CalendarEventCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CalendarEvent:
    """Create a new calendar event."""
    event = CalendarEvent(
        title=body.title,
        description=body.description,
        start_datetime=body.start_time or datetime.now(),
        end_datetime=body.end_time,
        all_day=body.all_day,
        location=body.location,
        color=body.color or "#3498db",
        recurrence_rule=body.recurrence_rule,
        user_id=current_user.id,
        event_type="custom",
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/{event_id}/", response_model=CalendarEventOut)
async def get_calendar_event(
    event_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CalendarEvent:
    """Return the detail of a single calendar event."""
    return await _get_event_or_404(db, event_id, current_user.id)


@router.put("/{event_id}/", response_model=CalendarEventOut)
async def update_calendar_event(
    event_id: int,
    body: CalendarEventUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CalendarEvent:
    """Update an existing calendar event."""
    event = await _get_event_or_404(db, event_id, current_user.id)

    update_data = body.model_dump(exclude_unset=True)

    if "start_time" in update_data:
        update_data["start_datetime"] = update_data.pop("start_time")
    if "end_time" in update_data:
        update_data["end_datetime"] = update_data.pop("end_time")

    for field, value in update_data.items():
        if hasattr(event, field):
            setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}/", response_model=MessageResponse)
async def delete_calendar_event(
    event_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Delete a calendar event permanently."""
    event = await _get_event_or_404(db, event_id, current_user.id)

    await db.delete(event)
    await db.commit()
    return MessageResponse(message="Calendar event deleted")


@router.post("/{event_id}/complete/", response_model=CalendarEventOut)
async def complete_calendar_event(
    event_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CalendarEvent:
    """Mark a calendar event as completed."""
    event = await _get_event_or_404(db, event_id, current_user.id)

    event.is_completed = True
    event.completed_at = datetime.now()
    await db.commit()
    await db.refresh(event)
    return event
