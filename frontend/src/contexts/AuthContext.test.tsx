import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { setAccessToken } from '@/api/client'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const AuthConsumer = () => {
  const { user, isAuthenticated, loading, login, logout } = useAuth()
  
  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="authenticated">{isAuthenticated.toString()}</span>
      <span data-testid="username">{user?.username || 'none'}</span>
      <button onClick={() => login('testuser', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    setAccessToken(null)
    vi.spyOn(window, 'location', 'get').mockRestore()
  })

  it('starts with no authenticated user', async () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <AuthConsumer />
      </Wrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    
    expect(screen.getByTestId('authenticated').textContent).toBe('false')
    expect(screen.getByTestId('username').textContent).toBe('none')
  })

  it('login sets user and stores refresh token', async () => {
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <AuthConsumer />
      </Wrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    
    await user.click(screen.getByText('Login'))
    
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true')
      expect(screen.getByTestId('username').textContent).toBe('testuser')
    })
    
    expect(localStorage.getItem('refresh_token')).toBe('mock-refresh-token')
  })

  it('logout clears user and removes refresh token', async () => {
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <AuthConsumer />
      </Wrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    
    await user.click(screen.getByText('Login'))
    
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true')
    })
    
    await user.click(screen.getByText('Logout'))
    
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      expect(screen.getByTestId('username').textContent).toBe('none')
    })
    
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('restores session from refresh token on mount', async () => {
    localStorage.setItem('refresh_token', 'existing-refresh-token')
    
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AuthConsumer />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true')
    })
  })

  it('handles login failure', async () => {
    server.use(
      http.post('/api/auth/token/', () => {
        return new HttpResponse(null, { status: 401 })
      })
    )
    
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    const LoginWithStatus = () => {
      const { login, isAuthenticated } = useAuth()
      const [loginError, setLoginError] = React.useState<string | null>(null)
      
      const handleLogin = async () => {
        try {
          await login('testuser', 'wrongpassword')
        } catch {
          setLoginError('Login failed')
        }
      }
      
      return (
        <div>
          <span data-testid="authenticated">{isAuthenticated.toString()}</span>
          <span data-testid="error">{loginError || 'none'}</span>
          <button onClick={handleLogin}>Login</button>
        </div>
      )
    }
    
    render(
      <Wrapper>
        <LoginWithStatus />
      </Wrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false')
    })
    
    await user.click(screen.getByText('Login'))
    
    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Login failed')
    })
  })

  it('logs out when refresh token fails on mount', async () => {
    localStorage.setItem('refresh_token', 'invalid-refresh-token')
    
    server.use(
      http.post('/api/auth/token/refresh/', () => {
        return new HttpResponse(null, { status: 401 })
      })
    )
    
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AuthConsumer />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    
    expect(screen.getByTestId('authenticated').textContent).toBe('false')
    expect(screen.getByTestId('username').textContent).toBe('none')
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })
})
