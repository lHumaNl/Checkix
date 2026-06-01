"""Tag model for categorizing checklists."""

from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from checkix.database import Base
from checkix.models.base import TimestampMixin


class Tag(TimestampMixin, Base):
    """A user-owned tag for organizing checklists."""

    __tablename__ = "tags"
    __table_args__ = (
        UniqueConstraint("name", "user_id", name="uq_tags_name_user_id"),
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(
        String(7), default="#3498db", nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("auth_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(
        Text, default=None, nullable=True
    )
