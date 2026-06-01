"""Todo models: lists and items with soft-delete, priorities, and tags."""

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
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from checkix.database import Base
from checkix.models.base import TimestampMixin

if TYPE_CHECKING:
    from checkix.models.tag import Tag  # noqa: F401
    from checkix.models.user import User  # noqa: F401

# ---------------------------------------------------------------------------
# Many-to-many: todo_lists <-> tags
# ---------------------------------------------------------------------------

todo_lists_tags = Table(
    "todo_lists_tags",
    Base.metadata,
    Column(
        "todo_list_id",
        BigInteger,
        ForeignKey("todo_lists.id", ondelete="CASCADE"),
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
# TodoList
# ---------------------------------------------------------------------------


class TodoList(TimestampMixin, Base):
    """A user-owned to-do list with items, tags, and soft deletion."""

    __tablename__ = "todo_lists"
    __table_args__ = (
        Index("ix_todo_lists_is_deleted", "is_deleted"),
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

    status: Mapped[str] = mapped_column(
        String(20), default="active", nullable=False
    )

    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    priority: Mapped[str] = mapped_column(
        String(20), default="medium", nullable=False
    )

    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)

    is_favorite: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
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
        secondary=todo_lists_tags,
        lazy="selectin",
    )

    items: Mapped[list["TodoItem"]] = relationship(
        "TodoItem",
        back_populates="todo_list",
        lazy="selectin",
        order_by="TodoItem.order",
    )

    def __repr__(self) -> str:
        return f"<TodoList(id={self.id}, name={self.name!r})>"


# ---------------------------------------------------------------------------
# TodoItem
# ---------------------------------------------------------------------------


class TodoItem(TimestampMixin, Base):
    """A single item inside a to-do list (tree-structured)."""

    __tablename__ = "todo_items"

    todo_list_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("todo_lists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )

    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    priority: Mapped[str | None] = mapped_column(String(20), nullable=True)

    parent_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("todo_items.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # -- relationships -------------------------------------------------------
    todo_list: Mapped[TodoList] = relationship(
        "TodoList",
        back_populates="items",
        lazy="selectin",
    )

    children: Mapped[list["TodoItem"]] = relationship(
        "TodoItem",
        back_populates="parent",
        lazy="selectin",
        order_by="TodoItem.order",
    )

    parent: Mapped[TodoItem | None] = relationship(
        "TodoItem",
        back_populates="children",
        remote_side="TodoItem.id",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<TodoItem(id={self.id}, title={self.title!r})>"
