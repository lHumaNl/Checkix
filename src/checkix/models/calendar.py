"""Calendar event ORM model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from checkix.models.base import Base, TimestampMixin


class CalendarEvent(TimestampMixin, Base):
    """A calendar event linked to a checklist or standalone."""

    __tablename__ = "calendar_events"

    title: Mapped[str] = mapped_column(String(200), nullable=False)

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(String(20), nullable=False)

    checklist_template_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="SET NULL"),
        nullable=True,
    )

    todo_list_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("todo_lists.id", ondelete="SET NULL"),
        nullable=True,
    )

    start_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True,
    )

    end_datetime: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    all_day: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    recurrence: Mapped[str] = mapped_column(
        String(20), default="once", nullable=False,
    )

    recurrence_rule: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    location: Mapped[str | None] = mapped_column(String(200), nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    color: Mapped[str] = mapped_column(
        String(7), default="#3498db", nullable=False,
    )

    reminder_minutes_before: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
    )

    template_presets: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    is_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    def __repr__(self) -> str:
        return f"<CalendarEvent(id={self.id}, title={self.title!r})>"
