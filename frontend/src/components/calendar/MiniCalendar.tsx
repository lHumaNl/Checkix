import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEvent } from '@/types'

interface MiniCalendarProps {
  events?: CalendarEvent[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  currentMonth?: Date
  onMonthChange?: (date: Date) => void
}

export function MiniCalendar({ events = [], selectedDate, onDateSelect, currentMonth: externalMonth, onMonthChange }: MiniCalendarProps) {
  const [internalMonth, setInternalMonth] = useState(new Date())
  const currentMonth = externalMonth ?? internalMonth

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const startDay = monthStart.getDay()
  const emptyDays = Array(startDay).fill(null)

  const hasEventOnDay = (date: Date) => {
    if (!Array.isArray(events)) return false
    return events.some((event) => isSameDay(new Date(event.start_time), date))
  }

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1)
    if (onMonthChange) {
      onMonthChange(newMonth)
    } else {
      setInternalMonth(newMonth)
    }
  }

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1)
    if (onMonthChange) {
      onMonthChange(newMonth)
    } else {
      setInternalMonth(newMonth)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-xs text-gray-400 text-center font-medium">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {days.map((day) => {
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isCurrentDay = isToday(day)
          const hasEvent = hasEventOnDay(day)

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect?.(day)}
              className={`aspect-square flex items-center justify-center text-xs rounded-md transition-colors relative ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : isCurrentDay
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {format(day, 'd')}
              {hasEvent && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MiniCalendar
