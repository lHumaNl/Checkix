from pydantic import BaseModel, ConfigDict
from typing import Generic, TypeVar, Optional

T = TypeVar("T")


class ORMSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PaginatedResponse(BaseModel, Generic[T]):
    count: int
    next: Optional[str] = None
    previous: Optional[str] = None
    results: list[T]


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class TokenResponse(BaseModel):
    access: str
    refresh: str


class TokenRefreshRequest(BaseModel):
    refresh: str
