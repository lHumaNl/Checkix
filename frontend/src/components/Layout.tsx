import { useState, useEffect, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  ListTodo,
  Calendar,
  Users,
  Link2,
  Webhook,
  Bell,
  UserCheck,
  BarChart3,
  UserCircle,
  Search,
  X as XIcon,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  LogOut,
} from 'lucide-react'
import { useSearch } from '@/api/useSearch'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/Dropdown'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/checklists', labelKey: 'nav.checklists', icon: CheckSquare },
  { to: '/todos', labelKey: 'nav.todos', icon: ListTodo },
  { to: '/calendar', labelKey: 'nav.calendar', icon: Calendar },
  { to: '/community', labelKey: 'nav.community', icon: Users },
  { to: '/assignments', labelKey: 'nav.assignments', icon: UserCheck },
  { to: '/run-links', labelKey: 'nav.runLinks', icon: Link2 },
  { to: '/webhooks', labelKey: 'nav.webhooks', icon: Webhook },
  { to: '/notifications', labelKey: 'nav.notifications', icon: Bell },
  { to: '/stats', labelKey: 'nav.stats', icon: BarChart3 },
  { to: '/profile', labelKey: 'nav.profile', icon: UserCircle },
] satisfies Array<{ to: string; labelKey: MessageKey; icon: typeof LayoutDashboard }>

function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [inputVisible, setInputVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { t } = useI18n()
  const { data: results } = useSearch(query)

  const hasResults = results && (
    (results.checklists?.length ?? 0) +
    (results.todos?.length ?? 0) +
    (results.folders?.length ?? 0) +
    (results.tags?.length ?? 0)
  ) > 0

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setInputVisible(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function showInput() {
    setInputVisible(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleResultClick(path: string) {
    navigate(path)
    setOpen(false)
    setInputVisible(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      {inputVisible ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value
              setQuery(nextQuery)
              setOpen(nextQuery.trim().length >= 2)
            }}
            placeholder={t('common.search')}
            className="w-48 sm:w-64 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => { setInputVisible(false); setQuery(''); setOpen(false) }}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XIcon size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={showInput}
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={t('common.search')}
        >
          <Search size={20} />
        </button>
      )}

      {open && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {!hasResults ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{t('common.noResults')}</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {(results?.checklists?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase tracking-wide">
                    {t('search.checklists')}
                  </div>
                  {results!.checklists.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleResultClick(`/checklists/${c.id}`)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-800 dark:text-gray-200"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.description && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {c.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {(results?.todos?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase tracking-wide">
                    {t('search.todos')}
                  </div>
                  {results!.todos.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleResultClick('/todos')}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-800 dark:text-gray-200"
                    >
                      {t.name}
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{t.status}</span>
                    </button>
                  ))}
                </div>
              )}
              {(results?.folders?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase tracking-wide">
                    {t('search.folders')}
                  </div>
                  {results!.folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleResultClick('/checklists')}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-800 dark:text-gray-200"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
              {(results?.tags?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase tracking-wide">
                    {t('search.tags')}
                  </div>
                  {results!.tags.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleResultClick('/checklists')}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-800 dark:text-gray-200"
                    >
                      #{t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UserDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()

  const displayName = user?.full_name || user?.username || 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={t('common.userMenu')}
        >
          <Avatar
            size="sm"
            src={user?.avatar_url || undefined}
            alt={displayName}
            fallback={initials}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            {user?.email && (
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <UserCircle size={16} />
          {t('common.profile')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut size={16} />
          {t('common.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const MOBILE_BREAKPOINT = 1024 // matches Tailwind's lg breakpoint

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, cycleTheme } = useTheme()
  const { t } = useI18n()
  const location = useLocation()

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const openSidebar = useCallback(() => setSidebarOpen(true), [])

  // Auto-close sidebar when viewport shrinks below the breakpoint
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay — rendered outside aside to guarantee it covers the viewport */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
            Checkix
          </Link>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={t('common.closeSidebar')}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            onClick={openSidebar}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={t('common.openSidebar')}
          >
            <Menu size={20} />
          </button>

          <div className="lg:flex-1" />

          <SearchBar />
          <LanguageSelector />

          <button
            onClick={cycleTheme}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={`${t('common.theme')}: ${theme}`}
            title={`${t('common.theme')}: ${theme}`}
          >
            {theme === 'light' && <Sun size={20} />}
            {theme === 'dark' && <Moon size={20} />}
            {theme === 'system' && <Monitor size={20} />}
          </button>

          <UserDropdown />
        </header>

        <main className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
