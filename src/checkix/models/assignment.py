"""Assignment ORM model."""

from __future__ import annotations

from sqlalchemy import BigInteger, Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from checkix.database import Base
from checkix.models.base import TimestampMixin


class Assignment(TimestampMixin, Base):
    """Assignment configuration for a template, item, or instance."""

    __tablename__ = "assignments"

    user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    assignment_type: Mapped[str] = mapped_column(String(20), nullable=False)

    checklist_template_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="CASCADE"),
        nullable=True,
    )

    checklist_item_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_items.id", ondelete="CASCADE"),
        nullable=True,
    )

    checklist_instance_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_instances.id", ondelete="CASCADE"),
        nullable=True,
    )

    assignee_type: Mapped[str] = mapped_column(String(20), nullable=False)

    assignee_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
    )

    assignee_group_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users_group.id", ondelete="SET NULL"),
        nullable=True,
    )

    assignee_parameter: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
    )

    is_exclusive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    auto_notify: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Assignment(id={self.id}, assignment_type={self.assignment_type!r})>"
