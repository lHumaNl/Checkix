"""Checklist models: templates, versions, placeholders, and items."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from checkix.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from checkix.models.tag import Tag  # noqa: F401
    from checkix.models.user import User  # noqa: F401

# ---------------------------------------------------------------------------
# Many-to-many: templates <-> tags
# ---------------------------------------------------------------------------

checklist_templates_tags = Table(
    "checklist_templates_tags",
    Base.metadata,
    Column(
        "template_id",
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        BigInteger,
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ---------------------------------------------------------------------------
# ChecklistTemplate
# ---------------------------------------------------------------------------


class ChecklistTemplate(TimestampMixin, Base):
    """A checklist template owned by a user, with versioned items."""

    __tablename__ = "checklist_templates"
    __table_args__ = (
        Index("ix_checklist_templates_is_favorite", "is_favorite"),
        Index("ix_checklist_templates_status", "status"),
        Index("ix_checklist_templates_is_deleted", "is_deleted"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    folder_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    current_version_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_versions.id", ondelete="SET NULL"),
        nullable=True,
    )

    sequential_mode: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)

    is_favorite: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20), default="draft", nullable=False
    )
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)

    estimated_duration_seconds: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    is_deleted: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- relationships -------------------------------------------------------
    tags: Mapped[list["Tag"]] = relationship(
        "Tag",
        secondary=checklist_templates_tags,
        lazy="selectin",
    )

    versions: Mapped[list["ChecklistVersion"]] = relationship(
        "ChecklistVersion",
        back_populates="template",
        lazy="selectin",
        order_by="ChecklistVersion.version_number",
        foreign_keys="ChecklistVersion.template_id",
    )

    current_version: Mapped["ChecklistVersion | None"] = relationship(
        "ChecklistVersion",
        foreign_keys=[current_version_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<ChecklistTemplate(id={self.id}, name={self.name!r})>"


# ---------------------------------------------------------------------------
# ChecklistVersion
# ---------------------------------------------------------------------------


class ChecklistVersion(TimestampMixin, Base):
    """A specific version of a checklist template."""

    __tablename__ = "checklist_versions"
    __table_args__ = (
        UniqueConstraint(
            "template_id",
            "version_number",
            name="uq_checklist_versions_template_version",
        ),
    )

    template_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("checklist_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    changelog: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # -- relationships -------------------------------------------------------
    template: Mapped[ChecklistTemplate] = relationship(
        "ChecklistTemplate",
        back_populates="versions",
        lazy="selectin",
        foreign_keys=[template_id],
    )

    items: Mapped[list["ChecklistItem"]] = relationship(
        "ChecklistItem",
        back_populates="version",
        lazy="selectin",
        order_by="ChecklistItem.order",
    )

    placeholders: Mapped[list["Placeholder"]] = relationship(
        "Placeholder",
        back_populates="version",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<ChecklistVersion(id={self.id}, "
            f"template_id={self.template_id}, "
            f"version_number={self.version_number})>"
        )


# ---------------------------------------------------------------------------
# Placeholder
# ---------------------------------------------------------------------------


class Placeholder(TimestampMixin, Base):
    """A placeholder / variable definition for a checklist version."""

    __tablename__ = "checklist_placeholders"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    placeholder_type: Mapped[str] = mapped_column(String(20), nullable=False)
    is_required: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    default_value: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )

    version_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_versions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # -- relationships -------------------------------------------------------
    version: Mapped[ChecklistVersion | None] = relationship(
        "ChecklistVersion",
        back_populates="placeholders",
        lazy="selectin",
    )

    options: Mapped[list["PlaceholderOption"]] = relationship(
        "PlaceholderOption",
        back_populates="placeholder",
        lazy="selectin",
        order_by="PlaceholderOption.order",
    )

    def __repr__(self) -> str:
        return f"<Placeholder(id={self.id}, name={self.name!r})>"


# ---------------------------------------------------------------------------
# PlaceholderOption
# ---------------------------------------------------------------------------


class PlaceholderOption(TimestampMixin, Base):
    """An option choice for a placeholder (dropdown / radio / etc.)."""

    __tablename__ = "checklist_placeholder_options"

    placeholder_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("checklist_placeholders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    value: Mapped[str] = mapped_column(String(200), nullable=False)
    display_text: Mapped[str | None] = mapped_column(String(200), nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # -- relationships -------------------------------------------------------
    placeholder: Mapped[Placeholder] = relationship(
        "Placeholder",
        back_populates="options",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<PlaceholderOption(id={self.id}, value={self.value!r})>"


# ---------------------------------------------------------------------------
# ChecklistItem
# ---------------------------------------------------------------------------


class ChecklistItem(TimestampMixin, Base):
    """A single step / item inside a checklist version (tree-structured)."""

    __tablename__ = "checklist_items"

    version_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("checklist_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    parent_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_items.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[str | None] = mapped_column(String(20), nullable=True)

    placeholder_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("checklist_placeholders.id", ondelete="SET NULL"),
        nullable=True,
    )

    is_halt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    halt_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # -- MPTT / nested-set columns -------------------------------------------
    lft: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rght: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tree_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    level: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # -- relationships -------------------------------------------------------
    version: Mapped[ChecklistVersion] = relationship(
        "ChecklistVersion",
        back_populates="items",
        lazy="selectin",
    )

    children: Mapped[list["ChecklistItem"]] = relationship(
        "ChecklistItem",
        back_populates="parent",
        lazy="selectin",
        order_by="ChecklistItem.order",
    )

    parent: Mapped[ChecklistItem | None] = relationship(
        "ChecklistItem",
        back_populates="children",
        remote_side="ChecklistItem.id",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<ChecklistItem(id={self.id}, title={self.title!r})>"
