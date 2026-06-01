"""Notification rule, sequence, and log ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from checkix.database import Base
from checkix.models.base import TimestampMixin


class DynamicDueDateRule(TimestampMixin, Base):
    """Rule for computing dynamic due dates based on trigger conditions."""

    __tablename__ = "dynamic_due_date_rules"

    checklist_template_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="SET NULL"),
        nullable=True,
    )

    checklist_item_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_items.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_by_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
    )

    trigger_type: Mapped[str] = mapped_column(String(30), nullable=False)

    trigger_item_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    trigger_parameter_name: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
    )

    offset_minutes: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    business_days_only: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
    )

    def __repr__(self) -> str:
        return f"<DynamicDueDateRule(id={self.id}, trigger_type={self.trigger_type!r})>"


class NotificationRule(TimestampMixin, Base):
    """Notification rule attached to a template, item, or assignment."""

    __tablename__ = "notification_rules"

    checklist_template_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="SET NULL"),
        nullable=True,
    )

    checklist_item_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_items.id", ondelete="SET NULL"),
        nullable=True,
    )

    assignment_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("assignments.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_by_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
    )

    event_type: Mapped[str] = mapped_column(String(30), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<NotificationRule(id={self.id}, event_type={self.event_type!r})>"


class NotificationSequence(TimestampMixin, Base):
    """Ordered step within a notification rule."""

    __tablename__ = "notification_sequences"

    notification_rule_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("notification_rules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)

    trigger_offset_minutes: Mapped[int] = mapped_column(Integer, nullable=False)

    recipient_type: Mapped[str] = mapped_column(String(20), nullable=False)

    recipient_group_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users_group.id", ondelete="SET NULL"),
        nullable=True,
    )

    custom_email: Mapped[str | None] = mapped_column(String(254), nullable=True)

    email_subject: Mapped[str | None] = mapped_column(String(200), nullable=True)

    email_body: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<NotificationSequence(id={self.id}, "
            f"sequence_order={self.sequence_order})>"
        )


class NotificationLog(TimestampMixin, Base):
    """Log entry for a dispatched notification."""

    __tablename__ = "notification_logs"

    notification_sequence_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("notification_sequences.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    checklist_instance_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_instances.id", ondelete="CASCADE"),
        nullable=True,
    )

    recipient_email: Mapped[str] = mapped_column(String(254), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False,
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<NotificationLog(id={self.id}, "
            f"recipient_email={self.recipient_email!r}, "
            f"status={self.status!r})>"
        )
