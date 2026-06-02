"""Folder model for organizing checklists into a tree structure."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from checkix.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from checkix.models.user import User  # noqa: F401


class Folder(TimestampMixin, Base):
    """A user-owned folder that supports nested sub-folders (adjacency list)."""

    __tablename__ = "folders"

    name: Mapped[str] = mapped_column(String(200), nullable=False)

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    parent_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    icon: Mapped[str] = mapped_column(
        String(50), default="folder", nullable=False
    )

    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # -- MPTV / nested-set compatibility columns (nullable) -----------------
    lft: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rght: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tree_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    level: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # -- relationships -------------------------------------------------------
    children: Mapped[list[Folder]] = relationship(
        "Folder",
        back_populates="parent",
        lazy="selectin",
        order_by="Folder.order",
    )

    parent: Mapped[Folder | None] = relationship(
        "Folder",
        back_populates="children",
        remote_side="Folder.id",
        lazy="selectin",
    )

    user: Mapped["User"] = relationship(
        "User",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Folder(id={self.id}, name={self.name!r}, user_id={self.user_id})>"
