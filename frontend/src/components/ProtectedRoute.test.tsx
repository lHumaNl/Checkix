import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@/types'

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

const mockUseAuth = vi.mocked(useAuth)

const authenticatedUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  full_name: null,
  avatar_url: null,
  bio: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const LocationDisplay = () => {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

const createWrapper = (initialRoute: string = '/protected') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return () => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<LocationDisplay />} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('redirects to /login when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
    })
    
    const Wrapper = createWrapper()
    
    render(<Wrapper />)
    
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/login')
    })
  })

  it('renders children when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: authenticatedUser,
      token: 'valid-token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
    })
    
    const Wrapper = createWrapper()
    
    render(<Wrapper />)
    
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeDefined()
    })
  })

  it('shows loading state while checking auth', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
    })
    
    const Wrapper = createWrapper()
    
    render(<Wrapper />)
    
    expect(screen.getByText('Loading...')).toBeDefined()
  })
})
