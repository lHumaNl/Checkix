"""Auth schemas for login, token, and WebSocket ticket requests."""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Schema for login request."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Schema for token response.

    Field names match the frontend expectations (``access`` / ``refresh``).
    """

    access: str
    refresh: str


class TokenRefreshRequest(BaseModel):
    """Schema for token refresh request.

    Frontend sends ``{refresh: "..."}``.
    """

    refresh: str


class WsTicketResponse(BaseModel):
    """Schema for WebSocket ticket response."""

    ticket: str
    expires_in: int = Field(description="Ticket lifetime in seconds")
