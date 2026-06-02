# Checkix

Checkix is a FastAPI and React application for reusable checklists, one-time todo lists, scheduling,
notifications, webhooks, auditing, and reporting.

## Stack

- FastAPI, Uvicorn, Pydantic settings
- SQLAlchemy 2.x async ORM with Alembic migrations
- PostgreSQL and Redis
- React 19, TypeScript, Vite
- Pytest and Ruff for backend quality checks

## Quick start

```bash
python3 -m venv venv
source venv/bin/activate
make install
cp .env.example .env
make migrate
make run
```

The backend runs on `http://localhost:8000` by default.

## Configuration

Python dependencies are defined in `pyproject.toml`; legacy requirements files are not used. Configure the
backend with environment variables from `.env.example`:

- `DATABASE_URL` for the async application engine.
- `DATABASE_URL_SYNC` for Alembic.
- `REDIS_URL` for Redis-backed features.
- `SECRET_KEY`, `ALGORITHM`, and token expiration settings for JWT authentication.
- `CORS_ORIGINS` as a JSON array of allowed origins.

## Database migrations

Run migrations with Alembic:

```bash
make migrate
```

Create a migration after model changes:

```bash
make migrations MSG="describe change"
```

`alembic/versions/0001_baseline_schema.py` is a FastAPI/SQLAlchemy baseline migration. Existing databases that
already contain the legacy tables should be reviewed and stamped to the baseline only after schema compatibility is
verified.

## API documentation

FastAPI exposes interactive documentation at:

- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI schema: `/openapi.json`

Application API routes are mounted under `/api`. The Docker nginx config still rewrites `/api/v1` to `/api` for
frontend/backward compatibility.

See [docs/api/README.md](docs/api/README.md) for endpoint notes.

## Testing and quality

```bash
make test
make lint
make format-check
```

Use `make test-cov` for a coverage report.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Both backend (`localhost:8000`) and frontend (`localhost:5173`) servers must be running for browser E2E tests.

## Deployment

### Docker

```bash
make docker-up
make docker-logs
make docker-down
```

### Manual

1. Install production dependencies with `pip install .`.
2. Configure PostgreSQL, Redis, and required environment variables.
3. Run `alembic upgrade head`.
4. Start Uvicorn or Gunicorn with the Uvicorn worker against `checkix.main:app`.
5. Serve the React build and proxy `/api`, `/docs`, `/openapi.json`, and `/ws` to the backend.

## Project structure

```text
Checkix/
├── alembic/                # Alembic migration environment and versions
├── docs/                   # Project documentation
├── frontend/               # React SPA
├── nginx/                  # Reverse proxy configuration
├── scripts/                # Non-framework utility scripts
├── src/checkix/            # FastAPI application package
│   ├── models/             # SQLAlchemy models
│   ├── routers/            # FastAPI routers
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   └── websocket/          # WebSocket endpoints
└── tests/                  # Backend tests
```

## Migration notes

- Some SQLAlchemy models intentionally keep legacy table names such as `auth_user` to preserve database compatibility.
- Password hash compatibility is not fully migrated: current authentication verifies bcrypt hashes, while legacy
  password hashes may require a compatibility verifier before existing users can log in.
