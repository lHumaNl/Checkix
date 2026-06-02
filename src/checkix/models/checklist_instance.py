"""Checklist instance, item instance, and completion log ORM models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from checkix.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from checkix.models.user import User  # noqa: F401


class ChecklistInstance(TimestampMixin, Base):
    """A concrete run of a checklist template."""

    __tablename__ = "checklist_instances"

    template_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    version_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), default="draft", nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    progress_percentage: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    calendar_event_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("calendar_events.id", ondelete="SET NULL"),
        nullable=True,
    )

    # -- relationships -------------------------------------------------------
    item_instances: Mapped[list[ChecklistItemInstance]] = relationship(
        "ChecklistItemInstance",
        back_populates="instance",
        lazy="selectin",
        order_by="ChecklistItemInstance.order",
    )
    completion_logs: Mapped[list[CompletionLog]] = relationship(
        "CompletionLog",
        back_populates="instance",
        lazy="selectin",
        order_by="CompletionLog.timestamp.desc()",
    )

    def __repr__(self) -> str:
        return f"<ChecklistInstance(id={self.id}, name={self.name!r}, status={self.status!r})>"


class ChecklistItemInstance(TimestampMixin, Base):
    """A single item within a checklist instance run."""

    __tablename__ = "checklist_item_instances"

    instance_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("checklist_instances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_items.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    placeholder_value: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    parent_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_item_instances.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # -- relationships -------------------------------------------------------
    instance: Mapped[ChecklistInstance] = relationship(
        "ChecklistInstance",
        back_populates="item_instances",
        lazy="selectin",
    )
    children: Mapped[list[ChecklistItemInstance]] = relationship(
        "ChecklistItemInstance",
        back_populates="parent",
        lazy="selectin",
        order_by="ChecklistItemInstance.order",
    )
    parent: Mapped[ChecklistItemInstance | None] = relationship(
        "ChecklistItemInstance",
        back_populates="children",
        remote_side="ChecklistItemInstance.id",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<ChecklistItemInstance(id={self.id}, title={self.title!r}, order={self.order})>"


class CompletionLog(TimestampMixin, Base):
    """Audit trail entry for actions taken on a checklist instance."""

    __tablename__ = "completion_logs"

    instance_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("checklist_instances.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_instance_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_item_instances.id", ondelete="SET NULL"),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # -- relationships -------------------------------------------------------
    instance: Mapped[ChecklistInstance] = relationship(
        "ChecklistInstance",
        back_populates="completion_logs",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<CompletionLog(id={self.id}, action={self.action!r})>"
