"""Custom exception classes and handlers for the Checkix application."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse

if TYPE_CHECKING:
    from fastapi import FastAPI, Request


class CheckixException(Exception):
    """Base exception for all Checkix application errors."""

    status_code: int = 500
    detail: str = "Internal server error"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundException(CheckixException):
    """Resource not found (404)."""

    status_code = 404
    detail = "Not found"


class ForbiddenException(CheckixException):
    """Access forbidden (403)."""

    status_code = 403
    detail = "Forbidden"


class BadRequestException(CheckixException):
    """Bad request (400)."""

    status_code = 400
    detail = "Bad request"


class UnauthorizedException(CheckixException):
    """Unauthorized access (401)."""

    status_code = 401
    detail = "Unauthorized"


class ConflictException(CheckixException):
    """Conflict with current state (409)."""

    status_code = 409
    detail = "Conflict"


def _format_error_response(status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail},
    )


async def checkix_exception_handler(_request: Request, exc: CheckixException) -> JSONResponse:
    """Handle all CheckixException subclasses."""
    return _format_error_response(exc.status_code, exc.detail)


async def validation_exception_handler(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Handle FastAPI RequestValidationError and return 422."""
    errors = jsonable_encoder(exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on a FastAPI application."""
    app.add_exception_handler(CheckixException, checkix_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]


class GoneException(CheckixException):
    """Resource is gone (410)."""

    status_code = 410
    detail = "Gone"
