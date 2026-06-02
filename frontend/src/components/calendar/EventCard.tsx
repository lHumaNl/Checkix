import { format } from 'date-fns'
import { Clock, CheckSquare, ListTodo, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { CalendarEvent } from '@/types'

interface EventCardProps {
  event: CalendarEvent
  onClick?: () => void
  onDelete?: () => void
  compact?: boolean
}

const eventColors: Record<string, { bg: string; border: string; text: string; indicator: string }> = {
  checklist: { 
    bg: 'bg-blue-50 dark:bg-blue-900/30', 
    border: 'border-blue-200 dark:border-blue-800', 
    text: 'text-blue-700 dark:text-blue-300',
    indicator: 'bg-blue-500'
  },
  todo: { 
    bg: 'bg-green-50 dark:bg-green-900/30', 
    border: 'border-green-200 dark:border-green-800', 
    text: 'text-green-700 dark:text-green-300',
    indicator: 'bg-green-500'
  },
  custom: { 
    bg: 'bg-purple-50 dark:bg-purple-900/30', 
    border: 'border-purple-200 dark:border-purple-800', 
    text: 'text-purple-700 dark:text-purple-300',
    indicator: 'bg-purple-500'
  },
}

export function EventCard({ event, onClick, onDelete, compact = false }: EventCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const colors = eventColors[event.event_type] || eventColors.custom

  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const getEventIcon = () => {
    switch (event.event_type) {
      case 'checklist':
        return <CheckSquare size={compact ? 12 : 16} className={colors.text} />
      case 'todo':
        return <ListTodo size={compact ? 12 : 16} className={colors.text} />
      default:
        return <Clock size={compact ? 12 : 16} className={colors.text} />
    }
  }

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2 p-2 rounded-md ${colors.bg} ${colors.border} border cursor-pointer hover:opacity-80 transition-opacity`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${colors.indicator}`} />
        {getEventIcon()}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium ${colors.text} truncate`}>{event.title}</p>
          {!event.all_day && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {format(new Date(event.start_datetime), 'HH:mm')}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative p-4 rounded-lg ${colors.bg} ${colors.border} border cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`w-1 h-full min-h-[60px] rounded-full ${colors.indicator} absolute left-0 top-0 bottom-0`} />
        <div className="flex-1 ml-2">
          <div className="flex items-center gap-2 mb-1">
            {getEventIcon()}
            <h4 className={`font-medium ${colors.text}`}>{event.title}</h4>
          </div>
          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {event.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {!event.all_day ? (
              <>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {format(new Date(event.start_datetime), 'HH:mm')} - {format(new Date(event.end_datetime ?? event.start_datetime), 'HH:mm')}
                </span>
                <span>{format(new Date(event.start_datetime), 'MMM d, yyyy')}</span>
              </>
            ) : (
              <span>{format(new Date(event.start_datetime), 'MMM d, yyyy')} (All day)</span>
            )}
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-10 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClick?.()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit size={14} />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventCard
