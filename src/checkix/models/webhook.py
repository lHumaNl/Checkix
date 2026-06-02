"""Webhook and webhook-event ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from checkix.models.base import Base, TimestampMixin


class Webhook(TimestampMixin, Base):
    """Outgoing webhook configuration."""

    __tablename__ = "webhooks"

    name: Mapped[str] = mapped_column(String(200), nullable=False)

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(String(30), nullable=False)

    endpoint_url: Mapped[str] = mapped_column(String(500), nullable=False)

    secret: Mapped[str] = mapped_column(String(100), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    headers: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Webhook(id={self.id}, name={self.name!r})>"


class WebhookEvent(TimestampMixin, Base):
    """Individual webhook delivery attempt."""

    __tablename__ = "webhook_events"

    webhook_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("webhooks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    checklist_instance_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_instances.id", ondelete="SET NULL"),
        nullable=True,
    )

    event_type: Mapped[str] = mapped_column(String(30), nullable=False)

    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False,
    )

    response_code: Mapped[int | None] = mapped_column(Integer, nullable=True)

    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)

    retry_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    max_retries: Mapped[int] = mapped_column(
        Integer, default=3, nullable=False,
    )

    next_retry_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    def __repr__(self) -> str:
        return f"<WebhookEvent(id={self.id}, status={self.status!r})>"
