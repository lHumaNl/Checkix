import { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import { useSearch } from '@/api/useSearch'
import { useTheme } from '@/hooks/useTheme'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/checklists', label: 'Checklists', icon: CheckSquare },
  { to: '/todos', label: 'Todos', icon: ListTodo },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/assignments', label: 'Assignments', icon: UserCheck },
  { to: '/run-links', label: 'Run Links', icon: Link2 },
  { to: '/webhooks', label: 'Webhooks', icon: Webhook },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/stats', label: 'Statistics', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: UserCircle },
]

function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [inputVisible, setInputVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { data: results } = useSearch(query)

  const hasResults = results && (
    (results.checklists?.length ?? 0) +
    (results.todos?.length ?? 0) +
    (results.folders?.length ?? 0) +
    (results.tags?.length ?? 0)
  ) > 0

  useEffect(() => {
    if (query.trim().length >= 2) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [query])

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
            onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
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
          aria-label="Search"
        >
          <Search size={20} />
        </button>
      )}

      {open && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {!hasResults ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No results found</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {(results?.checklists?.length ?? 0) > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 uppercase tracking-wide">
                    Checklists
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
                    Todos
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
                    Folders
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
                    Tags
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

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, cycleTheme } = useTheme()
  const location = useLocation()

  return (
    <div className="min-h-screen flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
            Checkix
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Menu size={20} />
          </button>

          <div className="lg:flex-1" />

          <SearchBar />

          <button
            onClick={cycleTheme}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={`Theme: ${theme}`}
            title={`Theme: ${theme}`}
          >
            {theme === 'light' && <Sun size={20} />}
            {theme === 'dark' && <Moon size={20} />}
            {theme === 'system' && <Monitor size={20} />}
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
