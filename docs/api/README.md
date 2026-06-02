# Checkix API Documentation

The Checkix backend is a FastAPI application. Native API routes are mounted under `/api`; nginx keeps a
compatibility rewrite from `/api/v1` to `/api` for older frontend builds.

## Interactive documentation

- Swagger UI: `/docs`
- ReDoc: `/redoc`
- OpenAPI schema: `/openapi.json`

## Authentication

The API uses JWT Bearer tokens.

### Obtain tokens

```http
POST /api/auth/token/
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

Response:

```json
{
  "access": "eyJhbGciOi...",
  "refresh": "eyJhbGciOi..."
}
```

### Refresh tokens

```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJhbGciOi..."
}
```

### Use access tokens

```http
Authorization: Bearer eyJhbGciOi...
```

## Main route groups

| Prefix | Description |
| --- | --- |
| `/api/auth` | Login, refresh, and token verification |
| `/api/users` | User and profile endpoints |
| `/api/checklists` | Checklist templates and versions |
| `/api/instances` | Checklist executions |
| `/api/todos` | Todo lists and items |
| `/api/folders` | Folder organization |
| `/api/tags` | Tags |
| `/api/calendar-events` | Calendar scheduling |
| `/api/assignments` | Assignment automation |
| `/api/notifications` | Notification rules and logs |
| `/api/webhooks` | Webhook configuration and delivery events |
| `/api/audit` | Audit logs |
| `/api/run-links` | One-click run links |
| `/api/community` | Community template features |
| `/api/stats` | Reporting and analytics |
| `/api/ldap` | LDAP-related sync endpoints |
| `/api/search` | Search endpoints |
| `/api/dashboard` | Dashboard summaries |

Use `/openapi.json` as the source of truth for request and response schemas.

## Pagination

Paginated endpoints use `page` and `page_size` query parameters. Responses generally include item data plus total
count and page metadata; consult the OpenAPI schema for endpoint-specific shapes.

## Error handling

Errors return JSON with a `detail` field. Common status codes:

- `200` success
- `201` created
- `204` no content
- `400` validation or bad request
- `401` unauthenticated or invalid token
- `403` insufficient permissions
- `404` resource not found
- `500` internal server error

## WebSockets

FastAPI WebSocket routes are mounted under `/ws`, including notification and todo channels. Token or ticket handling
depends on the specific channel; consult the router implementation and OpenAPI-adjacent docs for current behavior.

## Security notes

- Authenticated endpoints must filter data by the current user or enforce admin permissions.
- Webhook secrets should remain write-only in API responses.
- Webhook delivery should validate target URLs to avoid SSRF risk.
- Legacy table names in SQLAlchemy models are intentional for database compatibility.
- Legacy password hash compatibility is not complete if existing users still have non-bcrypt hashes.
