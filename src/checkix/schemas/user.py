"""User, profile, group, and membership schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from checkix.schemas.common import ORMSchema


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


class UserMeOut(UserOut):
    profile: Optional[UserProfileOut] = None
    date_joined: Optional[datetime] = None


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
