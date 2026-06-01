"""Community template and rating ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from checkix.database import Base
from checkix.models.base import TimestampMixin


class CommunityTemplate(TimestampMixin, Base):
    """A template published to the community library."""

    __tablename__ = "community_templates"

    checklist_template_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    author_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped[str | None] = mapped_column(String(20), nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True,
    )

    tags: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    download_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    rating: Mapped[float | None] = mapped_column(Float, nullable=True)

    rating_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    is_featured: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
    )

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    approved_by_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<CommunityTemplate(id={self.id}, name={self.name!r})>"


class TemplateRating(TimestampMixin, Base):
    """A user rating for a community template."""

    __tablename__ = "community_template_ratings"
    __table_args__ = (
        UniqueConstraint(
            "community_template_id",
            "user_id",
            name="uq_community_template_ratings_template_user",
        ),
    )

    community_template_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("community_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="CASCADE"),
        nullable=False,
    )

    rating: Mapped[int] = mapped_column(Integer, nullable=False)

    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<TemplateRating(id={self.id}, "
            f"community_template_id={self.community_template_id}, "
            f"user_id={self.user_id}, rating={self.rating})>"
        )
