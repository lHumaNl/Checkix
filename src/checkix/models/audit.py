"""Audit-log ORM model."""

from __future__ import annotations

from sqlalchemy import BigInteger, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from checkix.models.base import Base, TimestampMixin


class AuditLog(TimestampMixin, Base):
    """Immutable audit trail for entity changes."""

    __tablename__ = "audit_logs"

    user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    action: Mapped[str] = mapped_column(String(20), nullable=False)

    entity_type: Mapped[str] = mapped_column(String(30), nullable=False)

    entity_id: Mapped[int] = mapped_column(
        BigInteger, nullable=False,
    )

    entity_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    checklist_instance_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_instances.id", ondelete="SET NULL"),
        nullable=True,
    )

    changes: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    additional_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<AuditLog(id={self.id}, action={self.action!r}, "
            f"entity_type={self.entity_type!r})>"
        )
