"""Router module: users – profile, WebSocket tickets, and group management."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.config import settings
from checkix.dependencies import (
    PaginationParams,
    get_current_user,
    get_user_capabilities,
    get_user_permissions,
    paginate,
)
from checkix.database import get_db
from checkix.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from checkix.models.user import Group, GroupMembership, User, UserProfile
from checkix.schemas.auth import WsTicketResponse
from checkix.schemas.user import (
    GroupCreate,
    GroupMembershipOut,
    GroupOut,
    UserGroupMembershipOut,
    UserMeOut,
    UserPasswordChange,
    UserProfileUpdate,
)
from checkix.services.auth import AuthService

router = APIRouter(tags=["users"])


# ---------------------------------------------------------------------------
# Helper: Redis connection
# ---------------------------------------------------------------------------


async def _get_redis() -> Redis:
    """Create a short-lived Redis connection for ticket operations."""
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


# ---------------------------------------------------------------------------
# Inline schemas not in schemas/user.py
# ---------------------------------------------------------------------------


class GroupUpdate(BaseModel):
    """Payload for partially updating a group."""

    name: str | None = None
    description: str | None = None


class MemberAdd(BaseModel):
    """Payload for adding a member to a group."""

    user_id: int
    role: str = "member"


# ---------------------------------------------------------------------------
# Current user profile
# ---------------------------------------------------------------------------


@router.get("/me/", response_model=UserMeOut)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserMeOut:
    """Return the authenticated user's profile including nested profile data."""
    return _user_me_response(current_user)


@router.put("/me/", response_model=UserMeOut)
async def update_current_user_profile(
    payload: UserProfileUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserMeOut:
    """Update the authenticated user's profile fields."""
    profile = current_user.profile

    if profile is None:
        # Create a profile row if one does not exist yet.
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        await db.flush()

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(current_user)
    return _user_me_response(current_user)


@router.post("/me/password/", status_code=status.HTTP_204_NO_CONTENT)
async def change_current_user_password(
    payload: UserPasswordChange,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    """Change the authenticated user's password after verifying the current one."""
    if not AuthService.verify_password(payload.current_password, current_user.password):
        raise BadRequestException(detail="Current password is incorrect")

    current_user.password = AuthService.hash_password(payload.new_password)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _user_me_response(user: User) -> UserMeOut:
    """Build the authoritative current-user contract for the frontend."""
    return UserMeOut(
        id=user.id,
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        is_active=user.is_active,
        is_staff=user.is_staff,
        is_superuser=user.is_superuser,
        profile=user.profile,
        date_joined=user.date_joined,
        last_login=user.last_login,
        groups=_membership_responses(user),
        permissions=get_user_permissions(user),
        capabilities=get_user_capabilities(user),
    )


def _membership_responses(user: User) -> list[UserGroupMembershipOut]:
    """Serialize group memberships without making group names authorization data."""
    return [
        UserGroupMembershipOut(
            id=membership.id,
            group_id=membership.group_id,
            name=membership.group.name,
            role=membership.role,
        )
        for membership in user.group_memberships
    ]


# ---------------------------------------------------------------------------
# WebSocket auth ticket
# ---------------------------------------------------------------------------


@router.get("/ws-ticket/", response_model=WsTicketResponse)
async def generate_ws_ticket(
    current_user: Annotated[User, Depends(get_current_user)],
) -> WsTicketResponse:
    """Generate a one-time WebSocket authentication ticket.

    The ticket is stored in Redis and is valid for 60 seconds.
    """
    redis = await _get_redis()
    try:
        ticket = await AuthService.create_ws_ticket(current_user.id, redis)
    finally:
        await redis.aclose()

    return WsTicketResponse(ticket=ticket, expires_in=60)


# ---------------------------------------------------------------------------
# Groups – list / create
# ---------------------------------------------------------------------------


@router.get("/groups/", response_model=None)
async def list_groups(
    db: Annotated[AsyncSession, Depends(get_db)],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Return a paginated list of groups."""
    query = select(Group).order_by(Group.id)
    return await paginate(db, query, pagination)


@router.post("/groups/", response_model=GroupOut, status_code=201)
async def create_group(
    payload: GroupCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Group:
    """Create a new group. The creator is automatically added as *owner*."""
    # Check for duplicate name
    existing = await db.execute(
        select(Group).where(Group.name == payload.name),
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictException(detail=f"Group with name '{payload.name}' already exists")

    group = Group(
        name=payload.name,
        description=payload.description,
    )
    db.add(group)
    await db.flush()

    # Add the creator as owner
    membership = GroupMembership(
        user_id=current_user.id,
        group_id=group.id,
        role="owner",
    )
    db.add(membership)
    await db.commit()
    await db.refresh(group)
    return group


# ---------------------------------------------------------------------------
# Groups – detail / update / delete
# ---------------------------------------------------------------------------


async def _get_group_or_404(db: AsyncSession, group_id: int) -> Group:
    """Fetch a group by id or raise 404."""
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if group is None:
        raise NotFoundException(detail=f"Group {group_id} not found")
    return group


async def _require_group_owner(
    db: AsyncSession,
    group_id: int,
    user: User,
) -> None:
    """Ensure the user is an owner of the group, or raise 403."""
    result = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == user.id,
            GroupMembership.role == "owner",
        ),
    )
    if result.scalar_one_or_none() is None:
        raise ForbiddenException(detail="Only group owners can perform this action")


@router.get("/groups/{group_id}/", response_model=GroupOut)
async def get_group(
    group_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Group:
    """Return details for a single group."""
    return await _get_group_or_404(db, group_id)


@router.put("/groups/{group_id}/", response_model=GroupOut)
async def update_group(
    group_id: int,
    payload: GroupUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Group:
    """Update a group's name or description. Requires owner role."""
    group = await _get_group_or_404(db, group_id)
    await _require_group_owner(db, group_id, current_user)

    update_data = payload.model_dump(exclude_unset=True)

    # If renaming, check for conflicts
    new_name = update_data.get("name")
    if new_name is not None and new_name != group.name:
        existing = await db.execute(
            select(Group).where(Group.name == new_name),
        )
        if existing.scalar_one_or_none() is not None:
            raise ConflictException(detail=f"Group with name '{new_name}' already exists")

    for field, value in update_data.items():
        setattr(group, field, value)

    await db.commit()
    await db.refresh(group)
    return group


@router.delete("/groups/{group_id}/", status_code=204)
async def delete_group(
    group_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    """Delete a group. Requires owner role."""
    group = await _get_group_or_404(db, group_id)
    await _require_group_owner(db, group_id, current_user)

    await db.delete(group)
    await db.commit()


# ---------------------------------------------------------------------------
# Group membership
# ---------------------------------------------------------------------------


@router.post(
    "/groups/{group_id}/members/",
    response_model=GroupMembershipOut,
    status_code=201,
)
async def add_group_member(
    group_id: int,
    payload: MemberAdd,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> GroupMembership:
    """Add a user to a group. Requires owner role on the group."""
    await _get_group_or_404(db, group_id)
    await _require_group_owner(db, group_id, current_user)

    # Check for duplicate membership
    existing = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.user_id == payload.user_id,
        ),
    )
    if existing.scalar_one_or_none() is not None:
        raise ConflictException(
            detail=f"User {payload.user_id} is already a member of group {group_id}",
        )

    # Verify target user exists
    target = await db.execute(select(User).where(User.id == payload.user_id))
    if target.scalar_one_or_none() is None:
        raise NotFoundException(detail=f"User {payload.user_id} not found")

    membership = GroupMembership(
        user_id=payload.user_id,
        group_id=group_id,
        role=payload.role,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(membership)
    return membership
