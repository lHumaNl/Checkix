"""Run-link ORM model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from checkix.models.base import Base, TimestampMixin


class RunLink(TimestampMixin, Base):
    """Shareable link for running a checklist template."""

    __tablename__ = "run_links"

    checklist_template_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    unique_id: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False,
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)

    access_type: Mapped[str] = mapped_column(
        String(20), default="public", nullable=False,
    )

    preset_values: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)

    usage_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    created_by_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<RunLink(id={self.id}, unique_id={self.unique_id!r})>"
