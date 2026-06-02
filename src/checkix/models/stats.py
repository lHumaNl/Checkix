"""Checklist usage statistics ORM model."""

from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import BigInteger, Date, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from checkix.models.base import Base, TimestampMixin


class ChecklistUsageStats(TimestampMixin, Base):
    """Aggregated daily usage statistics for a checklist template."""

    __tablename__ = "checklist_usage_stats"
    __table_args__ = (
        UniqueConstraint(
            "template_id",
            "date",
            name="uq_checklist_usage_stats_template_date",
        ),
    )

    template_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    date: Mapped[date_type] = mapped_column(Date, nullable=False)

    instances_created: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    instances_completed: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    avg_completion_time_seconds: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
    )

    avg_completion_percentage: Mapped[float | None] = mapped_column(
        Float, nullable=True,
    )

    def __repr__(self) -> str:
        return f"<ChecklistUsageStats(id={self.id}, template_id={self.template_id}, date={self.date})>"
