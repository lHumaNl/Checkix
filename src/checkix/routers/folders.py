"""Router module: folders."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.dependencies import get_current_user
from checkix.exceptions import NotFoundException
from checkix.models.folder import Folder
from checkix.models.user import User
from checkix.schemas.common import MessageResponse
from checkix.schemas.folder import FolderCreate, FolderOut, FolderTreeOut, FolderUpdate

router = APIRouter(tags=["folders"])


@router.get("/", response_model=None)
async def list_folders(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Folder]:
    """Return the flat list of all folders for the current user."""
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(Folder.order, Folder.name)
    )
    return list(result.scalars().all())


@router.get("/tree/", response_model=None)
async def folder_tree(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[FolderTreeOut]:
    """Build and return a nested tree of folders for the current user.

    Fetches all folders as a flat list, then assembles them into a tree
    rooted at the top-level folders (parent_id is None).
    """
    result = await db.execute(
        select(Folder)
        .where(Folder.user_id == current_user.id)
        .order_by(Folder.order, Folder.name)
    )
    all_folders = list(result.scalars().all())

    nodes: dict[int, FolderTreeOut] = {}
    for folder in all_folders:
        nodes[folder.id] = FolderTreeOut(
            id=folder.id,
            name=folder.name,
            user_id=folder.user_id,
            parent_id=folder.parent_id,
            icon=folder.icon,
            order=folder.order,
            children=[],
        )

    roots: list[FolderTreeOut] = []
    for folder in all_folders:
        node = nodes[folder.id]
        if folder.parent_id is None:
            roots.append(node)
        else:
            parent_node = nodes.get(folder.parent_id)
            if parent_node is not None:
                parent_node.children.append(node)
            else:
                # Orphaned folder (parent was deleted) -- treat as root
                roots.append(node)

    return roots


@router.post("/", response_model=FolderOut, status_code=201)
async def create_folder(
    body: FolderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Folder:
    """Create a new folder for the current user."""
    folder = Folder(
        name=body.name,
        parent_id=body.parent_id,
        icon=body.icon or "folder",
        user_id=current_user.id,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.put("/{folder_id}/", response_model=FolderOut)
async def update_folder(
    folder_id: int,
    body: FolderUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Folder:
    """Update an existing folder owned by the current user."""
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    if folder is None:
        raise NotFoundException(detail="Folder not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(folder, field, value)

    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete("/{folder_id}/", response_model=MessageResponse)
async def delete_folder(
    folder_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> MessageResponse:
    """Delete a folder owned by the current user.

    Because the Folder model uses ``ondelete="CASCADE"`` on parent_id,
    child folders are automatically deleted by the database.
    """
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.user_id == current_user.id)
    )
    folder = result.scalar_one_or_none()
    if folder is None:
        raise NotFoundException(detail="Folder not found")

    await db.delete(folder)
    await db.commit()
    return MessageResponse(message="Folder deleted")
