"""Service layer for calendar event CRUD, completion, and scheduling."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Sequence

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.exceptions import BadRequestException, ForbiddenException, NotFoundException
from checkix.models.calendar import CalendarEvent
from checkix.models.user import User


class CalendarEventService:
    """Async service for calendar event lifecycle operations."""

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    @staticmethod
    async def create_event(
        db: AsyncSession,
        user: User,
        data: Any,
    ) -> CalendarEvent:
        """Create a new calendar event for *user*.

        Returns the persisted ``CalendarEvent``.
        """
        event = CalendarEvent(
            title=data.title,
            user_id=user.id,
            event_type=getattr(data, "event_type", "custom"),
            checklist_template_id=getattr(data, "checklist_template_id", None),
            todo_list_id=getattr(data, "todo_list_id", None),
            start_datetime=getattr(data, "start_time", None) or datetime.now(timezone.utc),
            end_datetime=getattr(data, "end_time", None),
            all_day=getattr(data, "all_day", False),
            recurrence=getattr(data, "recurrence_rule", "once") or "once",
            recurrence_rule=None,
            location=getattr(data, "location", None),
            description=getattr(data, "description", None),
            color=getattr(data, "color", "#3498db") or "#3498db",
            reminder_minutes_before=getattr(data, "reminder_minutes_before", None),
            template_presets=getattr(data, "template_presets", None),
            is_completed=False,
        )
        db.add(event)
        await db.flush()
        await db.refresh(event)
        return event

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    async def get_events(
        db: AsyncSession,
        user: User,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> Sequence[CalendarEvent]:
        """Return calendar events for *user*, optionally filtered by date range.

        Events are ordered by ``start_datetime`` ascending.
        """
        stmt = (
            select(CalendarEvent)
            .where(CalendarEvent.user_id == user.id)
            .order_by(CalendarEvent.start_datetime.asc())
        )

        if start_date is not None:
            stmt = stmt.where(CalendarEvent.start_datetime >= start_date)
        if end_date is not None:
            stmt = stmt.where(CalendarEvent.start_datetime <= end_date)

        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def get_event(
        db: AsyncSession,
        event_id: int,
        user: User,
    ) -> CalendarEvent:
        """Fetch a single calendar event by *event_id*, verifying ownership.

        Raises ``NotFoundException`` when the event does not exist or
        ``ForbiddenException`` when *user* is not the owner (and not admin).
        """
        result = await db.execute(
            select(CalendarEvent).where(CalendarEvent.id == event_id),
        )
        event: CalendarEvent | None = result.scalar_one_or_none()
        if event is None:
            raise NotFoundException(f"Calendar event {event_id} not found")
        if event.user_id != user.id and not user.is_admin:
            raise ForbiddenException("Not authorized to access this event")
        return event

    # ------------------------------------------------------------------
    # Update
    # ------------------------------------------------------------------

    @staticmethod
    async def update_event(
        db: AsyncSession,
        event: CalendarEvent,
        data: Any,
    ) -> CalendarEvent:
        """Apply partial updates to an existing calendar event."""
        update_fields = [
            "title",
            "description",
            "location",
            "color",
            "all_day",
            "recurrence",
            "recurrence_rule",
            "reminder_minutes_before",
            "template_presets",
        ]
        for field in update_fields:
            value = getattr(data, field, None)
            if value is not None:
                setattr(event, field, value)

        # Map schema field names to model column names
        start_time = getattr(data, "start_time", None)
        if start_time is not None:
            event.start_datetime = start_time

        end_time = getattr(data, "end_time", None)
        if end_time is not None:
            event.end_datetime = end_time

        await db.flush()
        await db.refresh(event)
        return event

    # ------------------------------------------------------------------
    # Delete
    # ------------------------------------------------------------------

    @staticmethod
    async def delete_event(
        db: AsyncSession,
        event: CalendarEvent,
    ) -> None:
        """Hard-delete a calendar event."""
        await db.delete(event)
        await db.flush()

    # ------------------------------------------------------------------
    # Complete
    # ------------------------------------------------------------------

    @staticmethod
    async def complete_event(
        db: AsyncSession,
        event_id: int,
        user: User,
    ) -> CalendarEvent:
        """Mark a calendar event as completed.

        Sets ``is_completed`` to ``True`` and records ``completed_at``.
        """
        event = await CalendarEventService.get_event(db, event_id, user)

        if event.is_completed:
            raise BadRequestException("Event is already completed")

        event.is_completed = True
        event.completed_at = datetime.now(timezone.utc)
        await db.flush()
        await db.refresh(event)
        return event

    # ------------------------------------------------------------------
    # Upcoming
    # ------------------------------------------------------------------

    @staticmethod
    async def get_upcoming_events(
        db: AsyncSession,
        user: User,
        limit: int = 10,
    ) -> Sequence[CalendarEvent]:
        """Return upcoming (future, non-completed) events for *user*.

        Results are ordered by ``start_datetime`` ascending and capped at
        *limit* rows.
        """
        now = datetime.now(timezone.utc)
        stmt = (
            select(CalendarEvent)
            .where(
                and_(
                    CalendarEvent.user_id == user.id,
                    CalendarEvent.start_datetime >= now,
                    CalendarEvent.is_completed.is_(False),
                )
            )
            .order_by(CalendarEvent.start_datetime.asc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    # ------------------------------------------------------------------
    # Reschedule
    # ------------------------------------------------------------------

    @staticmethod
    async def reschedule_event(
        db: AsyncSession,
        event_id: int,
        user: User,
        new_start: datetime,
        new_end: datetime | None = None,
    ) -> CalendarEvent:
        """Reschedule an event to a new start/end datetime."""
        event = await CalendarEventService.get_event(db, event_id, user)

        event.start_datetime = new_start
        if new_end is not None:
            event.end_datetime = new_end

        await db.flush()
        await db.refresh(event)
        return event
