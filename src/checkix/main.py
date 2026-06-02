"""Checkix FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator as AsyncGen

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from checkix.database import dispose_engine, get_engine
from checkix.exceptions import (
    CheckixException,
    register_exception_handlers,
)
from checkix.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGen[None, None]:
    """Application lifespan: startup and shutdown hooks."""
    logger.info("Checkix starting up ...")
    # Startup ---------------------------------------------------------------
    # Verify database connectivity
    from sqlalchemy import text

    async with get_engine().connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("Database connection verified")

    yield

    # Shutdown --------------------------------------------------------------
    await dispose_engine()
    logger.info("Checkix shutting down ...")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    """Build and return the fully configured FastAPI application."""
    application = FastAPI(
        title="Checkix",
        version="2.0.0",
        description="Checklist management platform",
        lifespan=lifespan,
    )

    # -- Middleware ----------------------------------------------------------
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -- Exception handlers -------------------------------------------------
    register_exception_handlers(application)

    # -- Generic exception fallback -----------------------------------------
    @application.exception_handler(Exception)  # type: ignore[arg-type]
    async def _unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    # -- Health check -------------------------------------------------------
    @application.get("/health/", tags=["health"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok"}

    # -- Routers ------------------------------------------------------------
    _include_routers(application)

    # -- WebSocket routers --------------------------------------------------
    _include_websocket_routers(application)

    return application


# ---------------------------------------------------------------------------
# Router inclusion
# ---------------------------------------------------------------------------


def _include_routers(app: FastAPI) -> None:
    """Import and include every API router."""

    from checkix.routers.assignments import router as assignments_router
    from checkix.routers.audit import router as audit_router
    from checkix.routers.auth import router as auth_router
    from checkix.routers.calendar_events import router as calendar_events_router
    from checkix.routers.checklists import router as checklists_router
    from checkix.routers.community import router as community_router
    from checkix.routers.dashboard import router as dashboard_router
    from checkix.routers.folders import router as folders_router
    from checkix.routers.instances import router as instances_router
    from checkix.routers.ldap import router as ldap_router
    from checkix.routers.notifications import router as notifications_router
    from checkix.routers.run_links import router as run_links_router
    from checkix.routers.search import router as search_router
    from checkix.routers.stats import router as stats_router
    from checkix.routers.tags import router as tags_router
    from checkix.routers.todos import router as todos_router
    from checkix.routers.users import router as users_router
    from checkix.routers.webhooks import router as webhooks_router

    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(users_router, prefix="/api/users", tags=["users"])
    app.include_router(tags_router, prefix="/api/tags", tags=["tags"])
    app.include_router(folders_router, prefix="/api/folders", tags=["folders"])
    app.include_router(checklists_router, prefix="/api/checklists", tags=["checklists"])
    app.include_router(instances_router, prefix="/api/instances", tags=["instances"])
    app.include_router(todos_router, prefix="/api/todos", tags=["todos"])
    app.include_router(calendar_events_router, prefix="/api/calendar-events", tags=["calendar-events"])
    app.include_router(assignments_router, prefix="/api/assignments", tags=["assignments"])
    app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
    app.include_router(webhooks_router, prefix="/api/webhooks", tags=["webhooks"])
    app.include_router(audit_router, prefix="/api/audit", tags=["audit"])
    app.include_router(run_links_router, prefix="/api/run-links", tags=["run-links"])
    app.include_router(community_router, prefix="/api/community", tags=["community"])
    app.include_router(stats_router, prefix="/api/stats", tags=["stats"])
    app.include_router(ldap_router, prefix="/api/ldap", tags=["ldap"])
    app.include_router(search_router, prefix="/api/search", tags=["search"])
    app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])


def _include_websocket_routers(app: FastAPI) -> None:
    """Import and include every WebSocket router."""

    from checkix.websocket.notifications import ws_router as ws_notifications_router
    from checkix.websocket.todos import ws_router as ws_todos_router

    app.include_router(ws_notifications_router, prefix="/ws/notifications", tags=["ws-notifications"])
    app.include_router(ws_todos_router, prefix="/ws/todos", tags=["ws-todos"])


# ---------------------------------------------------------------------------
# Module-level app instance
# ---------------------------------------------------------------------------

app = create_app()
