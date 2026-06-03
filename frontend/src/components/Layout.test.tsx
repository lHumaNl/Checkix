import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConfigProvider } from 'antd'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { useSearch } from '@/api/useSearch'
import { useTheme } from '@/hooks/useTheme'
import { I18nProvider } from '@/i18n'
import type { SearchResults } from '@/api/useSearch'
import type { User } from '@/types'

vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext')
  return { ...actual, useAuth: vi.fn() }
})

vi.mock('@/api/useSearch', () => ({ useSearch: vi.fn() }))
vi.mock('@/hooks/useTheme', () => ({ useTheme: vi.fn() }))

const mockUseAuth = vi.mocked(useAuth)
const mockUseSearch = vi.mocked(useSearch)
const mockUseTheme = vi.mocked(useTheme)
const originalGetComputedStyle = window.getComputedStyle.bind(window)

Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: (element: Element) => originalGetComputedStyle(element),
})

const emptyResults: SearchResults = {
  checklists: [],
  folders: [],
  tags: [],
  todos: [],
}

const searchResults: SearchResults = {
  checklists: [{ id: 42, name: 'Daily checklist', description: 'Morning routine' }],
  folders: [{ id: 7, name: 'Operations' }],
  tags: [{ id: 8, name: 'urgent' }],
  todos: [{ id: 9, name: 'Pay bills', status: 'todo' }],
}

const testUser: User = {
  id: 1,
  username: 'ada',
  email: 'ada@example.com',
  full_name: 'Ada Lovelace',
  avatar_url: null,
  bio: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const managementPermissions = ['manage_assignments', 'manage_run_links', 'manage_webhooks'] as const

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function TestShell() {
  return (
    <Layout>
      <div>Page content</div>
      <LocationDisplay />
    </Layout>
  )
}

function renderLayout(initialRoute = '/') {
  return render(
    <ConfigProvider>
      <I18nProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="*" element={<TestShell />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </ConfigProvider>
  )
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.removeItem('checkix.layout.settings')
    mockUseAuth.mockReturnValue({
      user: testUser,
      token: 'token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
    })
    mockUseTheme.mockReturnValue({
      theme: 'light',
      isDark: false,
      setTheme: vi.fn(),
      cycleTheme: vi.fn(),
    })
    mockUseSearch.mockImplementation((query) => ({
      data: query.trim().length >= 2 ? searchResults : emptyResults,
    }) as ReturnType<typeof useSearch>)
  })

  it('highlights the parent menu item for nested routes', async () => {
    renderLayout('/checklists/42')

    const checklistsLink = await screen.findByRole('link', { name: /checklists/i })
    await waitFor(() => {
      expect(checklistsLink.closest('.ant-menu-item')).toHaveClass('ant-menu-item-selected')
    })
  })

  it('navigates from the generated menu', async () => {
    const user = userEvent.setup()
    renderLayout('/')

    await user.click(await screen.findByRole('link', { name: /todos/i }))

    expect(screen.getByTestId('location')).toHaveTextContent('/todos')
  })

  it('hides management menu entries for regular users', async () => {
    renderLayout('/')

    await screen.findByRole('link', { name: /dashboard/i })
    expect(screen.queryByRole('link', { name: /assignments/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /run links/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /webhooks/i })).not.toBeInTheDocument()
  })

  it('shows management menu entries with management permissions', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...testUser, permissions: [...managementPermissions] },
      token: 'token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
    })

    renderLayout('/')

    expect(await screen.findByRole('link', { name: /assignments/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /run links/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /webhooks/i })).toBeInTheDocument()
  })

  it('navigates from global search results', async () => {
    const user = userEvent.setup()
    renderLayout('/')

    await user.type(screen.getByPlaceholderText('Search...'), 'daily')
    expect(await screen.findByText('Folders')).toBeInTheDocument()
    expect(await screen.findByText('#urgent')).toBeInTheDocument()
    await user.click(await screen.findByText('Daily checklist'))

    expect(screen.getByTestId('location')).toHaveTextContent('/checklists/42')
  })

  it('keeps global search closed below the minimum query length', async () => {
    const user = userEvent.setup()
    renderLayout('/')

    await user.type(screen.getByPlaceholderText('Search...'), 'd')

    expect(screen.queryByText('Daily checklist')).not.toBeInTheDocument()
  })

  it('changes language from the shared language selector', async () => {
    renderLayout('/')

    fireEvent.mouseDown(within(screen.getByTestId('language-select')).getByRole('combobox'))
    fireEvent.click(await screen.findByText('Español'))

    expect(localStorage.getItem('language')).toBe('es')
    expect(await screen.findByRole('combobox', { name: 'Idioma' })).toBeInTheDocument()
  })

  it('sets the selected theme from the theme dropdown', async () => {
    const setTheme = vi.fn()
    const user = userEvent.setup()
    mockUseTheme.mockReturnValue({
      theme: 'light',
      isDark: false,
      setTheme,
      cycleTheme: vi.fn(),
    })

    renderLayout('/')
    await user.click(screen.getByRole('button', { name: /theme: light/i }))
    await user.click(await screen.findByText('Dark'))

    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('renders the preserved app shell controls', async () => {
    renderLayout('/')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /theme: light/i })).toHaveClass('!inline-flex', '!leading-none')
      expect(screen.getByRole('button', { name: /layout settings/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /user menu/i })).toHaveClass('!inline-flex', '!leading-none')
    })
  })

  it('keeps side layout controls in the content header instead of the sider footer', async () => {
    renderLayout('/checklists')

    const sideHeader = await screen.findByTestId('side-content-header')
    const sideActions = within(screen.getByTestId('side-header-actions'))

    expect(within(sideHeader).getByRole('heading', { name: /checklists/i })).toBeInTheDocument()
    expect(sideActions.getByRole('button', { name: /theme: light/i })).toBeInTheDocument()
    expect(sideActions.getByRole('button', { name: /layout settings/i })).toBeInTheDocument()
    expect(sideActions.getByRole('button', { name: /user menu/i })).toBeInTheDocument()
    expect(document.querySelector('.ant-pro-sider-actions .checkix-header-controls')).not.toBeInTheDocument()
  })

  it('keeps top layout controls in the ProLayout global header', async () => {
    localStorage.setItem('checkix.layout.settings', JSON.stringify({ layout: 'top' }))

    renderLayout('/')

    expect(screen.queryByTestId('side-content-header')).not.toBeInTheDocument()
    expect(document.querySelector('.checkix-pro-layout--top')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.querySelector('.ant-pro-layout-header')).toContainElement(
        screen.getByRole('button', { name: /theme: light/i })
      )
    })
  })

  it('normalizes the removed mixed layout to side layout', async () => {
    localStorage.setItem('checkix.layout.settings', JSON.stringify({ layout: 'mix' }))

    renderLayout('/checklists')

    const sideHeader = await screen.findByTestId('side-content-header')
    expect(sideHeader).toBeInTheDocument()
    expect(document.querySelector('.checkix-pro-layout--side')).toBeInTheDocument()
    expect(localStorage.getItem('checkix.layout.settings')).toContain('"layout":"side"')
  })

  it('keeps fixed layout options enabled while persisting other layout settings', async () => {
    const user = userEvent.setup()
    localStorage.setItem('checkix.layout.settings', JSON.stringify({ fixedHeader: false, fixSiderbar: false }))

    renderLayout('/')

    await user.click(screen.getAllByRole('button', { name: /layout settings/i })[0])
    expect(screen.queryByRole('switch', { name: /fixed header/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /fixed sidebar/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Mixed menu')).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('combobox', { name: /layout mode/i })[0])
    await user.click(await screen.findByText('Top menu'))

    expect(localStorage.getItem('checkix.layout.settings')).toContain('"layout":"top"')
    expect(localStorage.getItem('checkix.layout.settings')).toContain('"fixedHeader":true')
    expect(localStorage.getItem('checkix.layout.settings')).toContain('"fixSiderbar":true')
  })

  it('navigates to profile from the user menu', async () => {
    const user = userEvent.setup()
    renderLayout('/')

    await user.click(screen.getByRole('button', { name: /user menu/i }))
    const profileItems = await screen.findAllByText('Profile')
    await user.click(profileItems[profileItems.length - 1])

    expect(screen.getByTestId('location')).toHaveTextContent('/profile')
  })

  it('runs logout from the user menu', async () => {
    const logout = vi.fn()
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: testUser,
      token: 'token',
      loading: false,
      login: vi.fn(),
      logout,
      isAuthenticated: true,
    })

    renderLayout('/')
    await user.click(screen.getByRole('button', { name: /user menu/i }))
    await user.click(await screen.findByText('Logout'))

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
  })
})
