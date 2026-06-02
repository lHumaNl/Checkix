from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from checkix.models.base import Base, TimestampMixin


class User(Base):
    """Maps to the Django ``auth_user`` table."""

    __tablename__ = "auth_user"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    password: Mapped[str] = mapped_column(String(128), nullable=False)
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    username: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    last_name: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(254), nullable=False, default="")
    is_staff: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    date_joined: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # -- relationships -------------------------------------------------------
    profile: Mapped[UserProfile | None] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        foreign_keys="UserProfile.user_id",
        lazy="selectin",
    )
    group_memberships: Mapped[list[GroupMembership]] = relationship(
        "GroupMembership",
        back_populates="user",
        lazy="selectin",
    )
    managed_profiles: Mapped[list[UserProfile]] = relationship(
        "UserProfile",
        back_populates="manager",
        foreign_keys="UserProfile.manager_id",
        lazy="noload",
    )

    # -- convenience properties ----------------------------------------------
    @property
    def is_admin(self) -> bool:
        """Return ``True`` if the user is a superuser or staff member."""
        return self.is_superuser or self.is_staff

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username!r})>"


class UserProfile(TimestampMixin, Base):
    """Maps to the Django ``users_userprofile`` table."""

    __tablename__ = "users_userprofile"

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    notification_preferences: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    ldap_dn: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employee_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    manager_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="SET NULL"),
        nullable=True,
    )

    # -- relationships -------------------------------------------------------
    user: Mapped[User] = relationship(
        "User",
        back_populates="profile",
        foreign_keys=[user_id],
        lazy="selectin",
    )
    manager: Mapped[User | None] = relationship(
        "User",
        back_populates="managed_profiles",
        foreign_keys=[manager_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<UserProfile(id={self.id}, user_id={self.user_id})>"


class Group(TimestampMixin, Base):
    """Maps to the Django ``users_group`` table."""

    __tablename__ = "users_group"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ldap_group_dn: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # -- relationships -------------------------------------------------------
    members: Mapped[list[GroupMembership]] = relationship(
        "GroupMembership",
        back_populates="group",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Group(id={self.id}, name={self.name!r})>"


class GroupMembership(Base):
    """Maps to the Django ``users_groupmembership`` table."""

    __tablename__ = "users_groupmembership"
    __table_args__ = (
        UniqueConstraint("user_id", "group_id", name="uq_groupmembership_user_group"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("auth_user.id", ondelete="CASCADE"),
        nullable=False,
    )
    group_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users_group.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), default="member", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # -- relationships -------------------------------------------------------
    user: Mapped[User] = relationship(
        "User",
        back_populates="group_memberships",
        lazy="selectin",
    )
    group: Mapped[Group] = relationship(
        "Group",
        back_populates="members",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<GroupMembership(id={self.id}, user_id={self.user_id}, group_id={self.group_id}, role={self.role!r})>"
