import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, ListChecks, ListTodo, Calendar, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface QuickAction {
  id: string
  label: string
  icon: typeof ListChecks
  path: string
}

const actions: QuickAction[] = [
  { id: 'checklist', label: 'New Checklist', icon: ListChecks, path: '/checklists' },
  { id: 'todo', label: 'New Todo', icon: ListTodo, path: '/checklists' },
  { id: 'event', label: 'New Event', icon: Calendar, path: '/calendar' },
]

export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstButton = menuRef.current.querySelector('button')
      firstButton?.focus()
    }
  }, [isOpen])

  const handleAction = (path: string) => {
    navigate(path)
    handleClose()
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 md:bottom-8 md:right-8">
      <div className="relative">
        {isOpen && (
          <div
            ref={menuRef}
            className="absolute bottom-16 right-0 mb-2 w-48 space-y-2"
            role="menu"
            aria-label="Quick actions"
          >
            {actions.map((action, index) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.path)}
                  className="flex w-full items-center gap-3 rounded-lg bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 shadow-lg transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  style={{
                    opacity: 1,
                    transform: 'translateY(0)',
                    transitionDelay: `${index * 50}ms`,
                  }}
                  role="menuitem"
                >
                  <Icon className="h-5 w-5" />
                  {action.label}
                </button>
              )
            })}
          </div>
        )}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isOpen ? 'rotate-45' : ''
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
      {isOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
