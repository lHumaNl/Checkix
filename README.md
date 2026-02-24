# Checkix (cx)

Enterprise-grade web application for managing reusable checklists and one-time todo lists with calendar integration, statistical tracking, team collaboration, and advanced automation features.

## Features

- **Checklist Templates** - Reusable procedural templates with version control and conditional logic
- **Checklist Instances** - Concrete executions with progress tracking and timestamps
- **Todo Lists** - One-time task lists convertible to templates
- **Calendar Integration** - Schedule instances with drag-and-drop rescheduling
- **Statistics & Analytics** - Completion metrics, heatmaps, and trend visualizations
- **Auto-Assignments** - LDAP/GPO integration for automated task distribution
- **Notifications** - Multi-level notification sequences via email/webhooks
- **Webhooks** - Real-time integrations with external systems
- **Audit Trail** - Complete compliance tracking
- **Community Sharing** - Template library with sharing capabilities
- **Run Links** - One-click instant checklist creation
- **Real-time Updates** - WebSocket-based live collaboration via Django Channels
- **Progressive Web App** - React 19 + TypeScript SPA with offline support

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourorg/checkix.git
cd checkix

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows

# Install dependencies
make install

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
make migrate

# Start development server
make run
```

## Installation

### Prerequisites

- Python 3.11+
- PostgreSQL 16+ (production) or SQLite (development)
- Redis (for Celery tasks and Django Channels)
- Node.js 18+ (for frontend)

### Development Setup

1. **Clone and setup virtual environment:**
   ```bash
   git clone https://github.com/yourorg/checkix.git
   cd checkix
   python -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements/development.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

4. **Initialize database:**
   ```bash
   python scripts/manage.py migrate
   python scripts/manage.py createsuperuser
   ```

5. **Run development server:**
   ```bash
   python scripts/manage.py runserver
   ```

6. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

7. **Run frontend development server:**
   ```bash
   npm run dev
   ```

### Production Setup

1. Install production dependencies:
   ```bash
   pip install -r requirements/production.txt
   ```

2. Set environment variables:
   ```bash
   export DJANGO_ENV=production
   export DJANGO_SECRET_KEY=your-secure-key
   export DATABASE_URL=postgres://user:pass@host:5432/checkix
   ```

3. Collect static files:
   ```bash
   python scripts/manage.py collectstatic --noinput
   ```

4. Start ASGI server (for WebSocket support):
   ```bash
   daphne -b 0.0.0.0 -p 8000 config.asgi:application
   ```

## API Documentation

API documentation is available at:
- **Swagger UI:** `/api/docs/`
- **ReDoc:** `/api/redoc/`
- **OpenAPI Schema:** `/api/schema/`

See [docs/api/README.md](docs/api/README.md) for detailed API documentation.

## Testing

### Backend Tests (pytest)

```bash
# Run all backend tests
make test

# Run with coverage
pytest --cov=apps --cov-report=html

# Run specific test file
pytest apps/checklists/tests/test_models.py

# Run with verbose output
pytest -v
```

### E2E Tests (Playwright)

```bash
cd frontend

# Install Playwright browsers (first time)
npx playwright install chromium

# Run all E2E tests
npx playwright test --project=chromium

# Run specific test file
npx playwright test e2e/tests/checklists/crud.spec.ts

# Run with UI mode
npx playwright test --ui

# Generate HTML report
npx playwright show-report
```

**Note:** Both backend (`localhost:8000`) and frontend (`localhost:5173`) servers must be running for E2E tests.

**Test coverage:** 100 test cases across 13 files covering all 15 pages (auth, checklists, instances, dashboard, navigation, profile, todos, stats, community, assignments, run-links, webhooks, notifications).

## Deployment

### Docker Deployment

```bash
# Build and start containers
make docker-up

# Stop containers
make docker-down

# View logs
docker-compose logs -f
```

### Manual Deployment

1. Set `DJANGO_ENV=production`
2. Configure PostgreSQL database
3. Set up Redis for Celery
4. Run migrations: `python scripts/manage.py migrate`
5. Collect static: `python scripts/manage.py collectstatic`
6. Configure reverse proxy (nginx/Apache)
7. Start Daphne: `daphne -b 0.0.0.0 -p 8000 config.asgi:application`
8. Start Celery worker: `celery -A config worker -l info`

## Project Structure

```
Checkix/
├── config/                 # Django project settings
│   ├── settings/          # Environment-specific settings
│   ├── urls.py            # URL configuration
│   ├── wsgi.py            # WSGI application
│   ├── asgi.py            # ASGI application (Daphne)
│   ├── routing.py         # WebSocket URL routing
│   ├── middleware.py       # WebSocket JWT auth middleware
│   └── exception_handler.py # Custom DRF exception handler
├── apps/                   # Django applications
│   ├── core/              # Base models and utilities
│   ├── users/             # User management
│   ├── checklists/        # Checklist templates
│   ├── checklist_instances/
│   ├── folders/           # Folder organization
│   ├── calendar/          # Scheduling
│   ├── notifications/     # Notification system
│   ├── webhooks/          # Webhook integrations
│   ├── audit/             # Audit logging
│   ├── stats/             # Statistics
│   ├── community/         # Community features
│   ├── todo/              # Todo lists
│   ├── assignments/       # Auto-assignments
│   ├── run_links/         # One-click run links
│   ├── ldap/              # LDAP/GPO integration
│   └── tags/              # Tag management
├── frontend/               # React SPA
│   ├── src/
│   │   ├── api/            # API hooks (TanStack Query)
│   │   ├── components/     # UI components (Radix UI)
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── hooks/          # Custom hooks (WebSocket)
│   │   ├── pages/          # Route pages
│   │   ├── types/          # TypeScript types
│   │   └── lib/            # Utilities
│   └── public/             # Static assets
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── static/                 # Static files
├── media/                  # User uploads
├── templates/              # HTML templates
├── locale/                 # Translation files
└── requirements/           # Python dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `make test`
5. Run linting: `make lint`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- Follow PEP 8 guidelines
- Use Black for formatting: `make format`
- Use isort for import sorting
- Add type hints where possible
- Write docstrings for public APIs

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/yourorg/checkix/issues)
- **Email:** support@checkix.local
