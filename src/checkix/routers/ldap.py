"""Router module: ldap."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import PaginationParams, get_current_user, paginate
from checkix.models.ldap import LDAPSyncLog
from checkix.models.user import User
from checkix.schemas.ldap import LDAPSyncLogOut

router = APIRouter(tags=["ldap"])


@router.get("/sync-logs/", response_model=None)
async def list_ldap_sync_logs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends()],
) -> dict:
    """Return a paginated list of LDAP sync logs."""
    query = select(LDAPSyncLog).order_by(LDAPSyncLog.started_at.desc())

    return await paginate(db, query, pagination)
