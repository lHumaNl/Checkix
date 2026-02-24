# Checkix API Documentation

RESTful API for the Checkix checklist management platform.

## Base URL

```
Development: http://localhost:8000/api/v1/
Production: https://api.checkix.local/api/v1/
```

## Authentication

The API uses JWT (JSON Web Token) authentication via Bearer tokens.

### Obtain Token

```http
POST /api/v1/auth/token/
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

Response:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Refresh Token

```http
POST /api/v1/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

> **Note:** The frontend Axios client automatically handles token refresh. On a 401 response, the client attempts to refresh using the stored refresh token before redirecting to login. Concurrent requests are queued during refresh.

### Using the Token

Include the access token in all authenticated requests:

```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/token/` | POST | Obtain JWT token |
| `/auth/token/refresh/` | POST | Refresh access token |
| `/auth/token/verify/` | POST | Verify token validity |

### Users

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/` | GET | List users |
| `/users/{id}/` | GET | Get user details |
| `/users/me/` | GET | Get current user |
| `/users/me/` | PATCH | Update current user |

### Checklists

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/checklists/` | GET, POST | List or create checklists |
| `/checklists/{id}/` | GET, PUT, PATCH, DELETE | CRUD operations |
| `/checklists/{id}/versions/` | GET, POST | List or create versions |
| `/checklists/{id}/instantiate/` | POST | Create instance from template |
| `/checklists/{id}/duplicate/` | POST | Duplicate checklist |

### Checklist Instances

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/instances/` | GET, POST | List or create instances |
| `/instances/{id}/` | GET, PUT, PATCH | CRUD operations |
| `/instances/{id}/complete/` | POST | Mark instance complete |
| `/instances/{id}/progress/` | GET | Get completion progress |

### Folders

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/folders/` | GET, POST | List or create folders |
| `/folders/{id}/` | GET, PUT, PATCH, DELETE | CRUD operations |
| `/folders/{id}/items/` | GET | Get folder contents |

### Calendar

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/calendar/events/` | GET, POST | List or create events |
| `/calendar/events/{id}/` | GET, PUT, PATCH, DELETE | CRUD operations |
| `/calendar/schedule/` | POST | Schedule checklist instance |

### Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications/` | GET | List notifications |
| `/notifications/{id}/read/` | POST | Mark as read |
| `/notifications/read-all/` | POST | Mark all as read |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/` | GET, POST | List or create webhooks |
| `/webhooks/{id}/` | GET, PUT, PATCH, DELETE | CRUD operations |
| `/webhooks/{id}/test/` | POST | Test webhook delivery |

### Statistics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stats/overview/` | GET | Dashboard overview |
| `/stats/completion/` | GET | Completion metrics |
| `/stats/usage/` | GET | Usage statistics |

### Audit Log

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/audit/logs/` | GET | List audit logs |
| `/audit/logs/{id}/` | GET | Get log details |

## Pagination

List endpoints use page-number pagination:

```json
{
  "count": 100,
  "next": "http://api.example.com/api/v1/checklists/?page=2",
  "previous": null,
  "results": [...]
}
```

Query parameters:
- `page` - Page number (default: 1)
- `page_size` - Items per page (default: 20, max: 100)

## Filtering

Most list endpoints support filtering via query parameters:

```http
GET /api/v1/checklists/?folder=1&is_favorite=true&search=server
```

Common filters:
- `search` - Full-text search
- `ordering` - Sort results (e.g., `-created_at`)
- `created_at_after` / `created_at_before` - Date range
- `is_active` - Boolean filter

## Error Handling

Errors use a standardized format via a custom DRF exception handler. All errors include a `detail` field:

### Validation Error (400)
```json
{
  "detail": {
    "name": ["This field is required."],
    "email": ["Enter a valid email address."]
  }
}
```

### Authentication Error (401)
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### Not Found (404)
```json
{
  "detail": "Not found."
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting

- Anonymous users: 100 requests/hour
- Authenticated users: 1000 requests/hour

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1700000000
```

## Interactive Documentation

- **Swagger UI:** `/api/docs/`
- **ReDoc:** `/api/redoc/`
- **OpenAPI Schema:** `/api/schema/`

## SDK Examples

### Python

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Authenticate
response = requests.post(f"{BASE_URL}/auth/token/", json={
    "username": "user",
    "password": "pass"
})
token = response.json()["access"]

# Get checklists
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{BASE_URL}/checklists/", headers=headers)
checklists = response.json()["results"]
```

### JavaScript

```javascript
const BASE_URL = 'http://localhost:8000/api/v1';

// Authenticate
const authResponse = await fetch(`${BASE_URL}/auth/token/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user', password: 'pass' })
});
const { access } = await authResponse.json();

// Get checklists
const response = await fetch(`${BASE_URL}/checklists/`, {
  headers: { Authorization: `Bearer ${access}` }
});
const { results } = await response.json();
```

### cURL

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' | jq -r '.access')

# Get checklists
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/checklists/
```

## Webhooks

Configure webhooks to receive real-time notifications:

### Event Types

| Event | Description |
|-------|-------------|
| `checklist.created` | Checklist template created |
| `checklist.updated` | Checklist template updated |
| `instance.created` | Instance created |
| `instance.completed` | Instance marked complete |
| `instance.overdue` | Instance past due date |

### Payload Format

```json
{
  "event": "instance.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "instance_id": 123,
    "checklist_id": 45,
    "completed_by": "user@example.com",
    "completed_at": "2024-01-15T10:30:00Z"
  },
  "signature": "sha256=abc123..."
}
```

### Signature Verification

Webhooks include an HMAC-SHA256 signature in the `X-Signature` header:

```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

## WebSocket (Real-time Updates)

Real-time updates are delivered via Django Channels WebSocket connections.

### Connection

```
ws://localhost:8000/ws/instance/{instance_id}/?token={jwt_access_token}
```

### Authentication
JWT token is passed as a query parameter. The server validates the token and verifies the user has access to the specified checklist instance.

### Message Format
```json
{
  "type": "item_updated",
  "data": {
    "instance_id": 123,
    "item_id": 456,
    "status": "completed"
  }
}
```

## Security

- All ViewSet querysets are filtered by the authenticated user — users can only access their own data
- Webhook secrets are write-only and never returned in API responses
- SSRF protection validates webhook URLs against internal IP ranges
- LDAP management endpoints require admin permissions
- WebSocket connections verify both authentication and instance access

## Versioning

The API is versioned via URL path (`/api/v1/`). Breaking changes will result in a new version (`/api/v2/`).

## Support

For API support, contact api-support@checkix.local or open an issue on GitHub.
