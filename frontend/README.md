# Checkix Frontend

React 19 single-page application for the Checkix checklist management platform.

## Tech Stack

- **React 19** + TypeScript
- **Vite** — build tool with HMR
- **TailwindCSS v4** — utility-first styling
- **Radix UI** — accessible, unstyled UI primitives
- **TanStack React Query** — server state management with caching
- **React Big Calendar** — calendar component
- **Axios** — HTTP client with JWT interceptors
- **vite-plugin-pwa** — Progressive Web App support

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit
```

## Project Structure

```
src/
├── api/                # API hooks (TanStack React Query mutations/queries)
│   ├── client.ts       # Axios instance with JWT refresh + trailing slash interceptor
│   ├── useChecklists.ts
│   ├── useChecklistInstances.ts
│   ├── useCommunityTemplates.ts
│   ├── useCalendarEvents.ts
│   └── ...
├── components/         # Reusable UI components
│   ├── ui/             # Base components (Button, Input, ConfirmDialog, etc.)
│   ├── calendar/       # Calendar-specific components
│   ├── checklists/     # Checklist grid, list, kanban views
│   ├── checklist-instance/  # Instance execution components
│   ├── community/      # Community template browser
│   ├── dashboard/      # Dashboard widgets (ProgressRing, etc.)
│   ├── Layout.tsx       # App shell with sidebar navigation
│   └── ErrorBoundary.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx  # JWT auth state + login/logout
├── hooks/              # Custom hooks
│   ├── useWebSocket.ts # WebSocket with auto-reconnect
│   └── useToast.ts     # Toast notification system
├── pages/              # Route page components
│   ├── auth/           # Login page
│   ├── dashboard/      # Dashboard
│   ├── checklists/     # Template management
│   ├── checklist-instance/  # Instance execution
│   ├── calendar/       # Calendar scheduling
│   ├── community/      # Community template library
│   └── ...
├── types/              # TypeScript type definitions
│   ├── index.ts        # Core types (PaginatedResponse, etc.)
│   └── dashboard.ts    # Dashboard-specific types
├── lib/                # Utilities
│   └── design-tokens.ts # Design system tokens
└── App.tsx             # Root component with routing
```

## Key Patterns

### API Hooks
All API interactions use TanStack React Query hooks in `src/api/`. Paginated responses are normalized:
```typescript
const data = Array.isArray(response) ? response : (response.results ?? [])
```

### Authentication
JWT tokens stored in localStorage. The Axios client automatically:
- Attaches Bearer token to all requests
- Refreshes expired access tokens using the refresh token
- Queues concurrent requests during token refresh
- Redirects to `/login` if refresh fails

### WebSocket
Real-time updates via `useWebSocket` hook with auto-reconnect (max 5 retries). JWT token passed as query parameter for authentication.

### Toast Notifications
```typescript
import { toast } from '@/hooks/useToast'
toast({ title: 'Success!', variant: 'default' })
toast({ title: 'Error occurred', variant: 'destructive' })
```

## Environment Variables

Configure via `.env` or `.env.local`:

```env
VITE_API_URL=/api           # API base URL (proxied in dev)
VITE_WS_URL=ws://localhost:8000  # WebSocket base URL
```

## E2E Testing (Playwright)

```bash
# Install browsers (first time)
npx playwright install chromium

# Run all tests (backend + frontend must be running)
npx playwright test --project=chromium

# Run specific test suite
npx playwright test e2e/tests/checklists/crud.spec.ts

# Run with UI mode
npx playwright test --ui
```

**100 test cases** across 13 test files covering all 15 pages:

| Suite | Tests | Description |
|-------|-------|-------------|
| auth/login | 9 | Login form, validation, error messages, theme toggle |
| auth/token-refresh | 3 | Token refresh, redirect on failure, token cleanup |
| checklists/crud | 6 | Create, edit, delete, search, empty state |
| checklists/data-isolation | 6 | Multi-user isolation, unauthenticated access |
| instances/execution | 9 | Create, start, toggle items, pause/resume, complete, cancel |
| dashboard | 5 | Stats cards, heatmap, activity feed, error handling |
| navigation/sidebar | 15 | All nav items, active highlight, theme toggle |
| profile | 6 | Display, edit, save profile |
| todos | 8 | CRUD, search, filter, item management |
| stats | 6 | Stat cards, date range, presets, export |
| community | 3 | Page rendering, error handling |
| assignments | 6 | Page rendering, create modal, search, filters |
| run-links | 6 | Page rendering, create modal, search, filters |
| webhooks | 6 | Page rendering, create modal, search, filters |
| notifications | 6 | Page rendering, tabs, filters |

## PWA

The app is a Progressive Web App with:
- Offline support via service worker
- Installable on mobile and desktop
- App manifest with icons
