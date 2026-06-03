import { describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { I18nProvider } from '@/i18n'

const createWrapper = (initialRoute = '/login') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders login form with username and password fields', () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    )
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByTestId('language-select')).toBeInTheDocument()
  })

  it('updates login copy and persists language before authentication', async () => {
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    )

    fireEvent.mouseDown(within(screen.getByTestId('language-select')).getByRole('combobox'))
    fireEvent.click(await screen.findByText('Español'))

    expect(localStorage.getItem('language')).toBe('es')
    expect(screen.getByText('Inicia sesión en tu cuenta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('renders Checkix title', () => {
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    )
    
    expect(screen.getByRole('heading', { name: /checkix/i })).toBeInTheDocument()
  })

  it('updates username field on input', async () => {
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    )
    
    const usernameInput = screen.getByLabelText(/username/i)
    await user.type(usernameInput, 'testuser')
    
    expect(usernameInput).toHaveValue('testuser')
  })

  it('updates password field on input', async () => {
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    )
    
    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, 'mypassword')
    
    expect(passwordInput).toHaveValue('mypassword')
  })

  it('submits form and navigates on successful login', async () => {
    const user = userEvent.setup()
    
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <I18nProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<div>Dashboard</div>} />
              </Routes>
            </AuthProvider>
          </I18nProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  it('shows error message on failed login', async () => {
    server.use(
      http.post('/api/auth/token/', () => {
        return HttpResponse.json(
          { detail: 'Invalid credentials' },
          { status: 401 }
        )
      })
    )
    
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    )
    
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('shows generic error on network failure', async () => {
    server.use(
      http.post('/api/auth/token/', () => {
        return HttpResponse.json(
          { detail: 'Something went wrong' },
          { status: 500 }
        )
      })
    )
    
    const user = userEvent.setup()
    const Wrapper = createWrapper()
    
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    )
    
    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })
})
