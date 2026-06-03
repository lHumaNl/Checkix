"""User, profile, group, and membership schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from checkix.schemas.common import ORMSchema

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------


class UserProfileOut(ORMSchema):
    id: int
    timezone: Optional[str] = None
    language: Optional[str] = None
    notification_preferences: Optional[dict] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timezone: Optional[str] = None
    language: Optional[str] = None
    notification_preferences: Optional[dict] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None


class UserPasswordChange(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=False)

    current_password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


class UserOut(ORMSchema):
    id: int
    username: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True
    is_staff: bool = False
    is_superuser: bool = False


class UserGroupMembershipOut(BaseModel):
    id: int
    group_id: int
    name: str
    role: str | None = None


class UserMeOut(UserOut):
    profile: Optional[UserProfileOut] = None
    date_joined: Optional[datetime] = None
    last_login: Optional[datetime] = None
    groups: list[UserGroupMembershipOut] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    capabilities: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Group
# ---------------------------------------------------------------------------


class GroupOut(ORMSchema):
    id: int
    name: str
    description: Optional[str] = None


class GroupCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    description: Optional[str] = None


class GroupMembershipOut(ORMSchema):
    id: int
    user_id: int
    role: Optional[str] = None
