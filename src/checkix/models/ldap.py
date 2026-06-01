"""LDAP synchronisation log ORM model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from checkix.database import Base
from checkix.models.base import TimestampMixin


class LDAPSyncLog(TimestampMixin, Base):
    """Record of an LDAP directory synchronisation run."""

    __tablename__ = "ldap_sync_logs"

    status: Mapped[str] = mapped_column(
        String(20), default="success", nullable=False,
    )

    users_synced: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    groups_synced: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    users_created: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    groups_created: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    users_updated: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    groups_updated: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<LDAPSyncLog(id={self.id}, status={self.status!r})>"
