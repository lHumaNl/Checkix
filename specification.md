# Checkix Project Specification

## Overview

Checkix manages reusable checklist templates, checklist executions, todo lists, scheduling, notifications,
webhooks, audit logs, community templates, and reporting.

## Current technical stack

### Backend

- FastAPI ASGI application in `src/checkix/main.py`
- SQLAlchemy 2.x async ORM models in `src/checkix/models`
- Alembic migrations in `alembic/`
- JWT authentication with PyJWT and bcrypt password verification
- PostgreSQL for persistence
- Redis for features that need ephemeral shared state
- Pytest for tests
- Ruff for formatting and linting

### Frontend

- React 19 with TypeScript
- Vite build tooling
- TanStack Query and React context for client state
- Nginx serving the compiled SPA and proxying backend routes

## Runtime entry points

- Backend app: `checkix.main:app`
- Development server: `uvicorn checkix.main:app --reload`
- Native API prefix: `/api`
- WebSocket prefix: `/ws`
- OpenAPI schema: `/openapi.json`
- Swagger UI: `/docs`
- ReDoc: `/redoc`

## Repository structure

```text
Checkix/
├── alembic/                # Migration environment and versions
├── docs/                   # Documentation
├── frontend/               # React SPA
├── nginx/                  # Reverse proxy configuration
├── scripts/                # Non-framework utility scripts
├── src/checkix/            # FastAPI backend package
│   ├── models/             # SQLAlchemy models
│   ├── routers/            # API routers
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   └── websocket/          # WebSocket routes
└── tests/                  # Backend tests
```

## Data compatibility

The migration to FastAPI preserved several legacy table names in SQLAlchemy models for database compatibility.
Examples include `auth_user`, `users_userprofile`, `users_group`, and `users_groupmembership`. These names are
intentional and must not be renamed without a dedicated data migration plan.

## Migration policy

- Use Alembic for schema changes.
- Keep migration files immutable after merge.
- Review generated migrations before applying them.
- Existing databases with legacy tables should be compared to the baseline schema before stamping the baseline.

## Authentication compatibility

The current authentication service verifies bcrypt hashes. If existing production users still have legacy password
hash formats, a compatibility verifier or password reset migration is required before those users can log in.

## Quality gates

```bash
make test
make lint
make format-check
```

CI installs the backend from `pyproject.toml`, runs Ruff, and runs the pytest suite.
