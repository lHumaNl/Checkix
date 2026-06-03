"""Auth router: login, token refresh, and token verification endpoints."""

from __future__ import annotations

from json import JSONDecodeError
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from checkix.database import get_db
from checkix.exceptions import UnauthorizedException
from checkix.schemas.auth import LoginRequest, TokenRefreshRequest, TokenResponse
from checkix.services.auth import AuthService

router = APIRouter(tags=["auth"])


async def _parse_login_request(request: Request) -> LoginRequest:
    """Parse login credentials from JSON or form-encoded requests."""
    content_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    if content_type in {"application/x-www-form-urlencoded", "multipart/form-data"}:
        form = await request.form()
        payload = {
            "username": form.get("username"),
            "password": form.get("password"),
        }
    else:
        try:
            payload = await request.json()
        except JSONDecodeError as exc:
            raise RequestValidationError([
                {
                    "type": "json_invalid",
                    "loc": ("body",),
                    "msg": "Invalid JSON body",
                    "input": None,
                }
            ]) from exc

    try:
        return LoginRequest.model_validate(payload)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc


class TokenVerifyResponse(BaseModel):
    """Response schema for token verification."""

    valid: bool
    user_id: int | None = None
    token_type: str | None = None


@router.post("/token/", response_model=TokenResponse)
async def login(
    body: Annotated[LoginRequest, Depends(_parse_login_request)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Authenticate with username and password, return access + refresh JWT tokens."""
    user = await AuthService.authenticate_user(db, body.username, body.password)
    if user is None:
        raise UnauthorizedException(detail="Invalid username or password")

    access_token = AuthService.create_access_token(user.id)
    refresh_token = AuthService.create_refresh_token(user.id)

    return TokenResponse(
        access=access_token,
        refresh=refresh_token,
    )


@router.post("/token/refresh/", response_model=TokenResponse)
async def refresh_token(
    body: TokenRefreshRequest,
) -> TokenResponse:
    """Exchange a valid refresh token for a new access + refresh token pair."""
    try:
        payload = AuthService.verify_token(body.refresh)
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedException(detail="Invalid or expired refresh token") from exc

    if payload.get("type") != "refresh":
        raise UnauthorizedException(detail="Token is not a refresh token")

    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException(detail="Invalid token payload")

    access_token = AuthService.create_access_token(user_id)
    new_refresh_token = AuthService.create_refresh_token(user_id)

    return TokenResponse(
        access=access_token,
        refresh=new_refresh_token,
    )


@router.post("/token/verify/", response_model=TokenVerifyResponse)
async def verify_token(
    body: TokenRefreshRequest,
) -> TokenVerifyResponse:
    """Verify whether a token is valid and return its decoded metadata."""
    try:
        payload = AuthService.verify_token(body.refresh)
    except jwt.InvalidTokenError:
        return TokenVerifyResponse(valid=False)

    user_id: int | None = payload.get("sub")
    token_type: str | None = payload.get("type")

    return TokenVerifyResponse(
        valid=True,
        user_id=user_id,
        token_type=token_type,
    )
