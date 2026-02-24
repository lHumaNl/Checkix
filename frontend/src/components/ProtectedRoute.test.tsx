import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext')
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

const mockUseAuth = vi.mocked(useAuth)

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
  
  return ({ children }: { children: React.ReactNode }) => (
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
    
    render(<Wrapper children={null} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/login')
    })
  })

  it('renders children when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com' } as any,
      token: 'valid-token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
    })
    
    const Wrapper = createWrapper()
    
    render(<Wrapper children={null} />)
    
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
    
    render(<Wrapper children={null} />)
    
    expect(screen.getByText('Loading...')).toBeDefined()
  })
})
