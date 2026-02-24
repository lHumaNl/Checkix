import { format, isToday, isTomorrow, addDays } from 'date-fns'
import type { CalendarEvent } from '@/types'
import { EventCard } from './EventCard'

interface UpcomingEventsProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export function UpcomingEvents({ events, onEventClick }: UpcomingEventsProps) {
  const safeEvents = Array.isArray(events) ? events : []
  const upcomingEvents = safeEvents
    .filter((event) => new Date(event.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5)

  const groupedEvents = upcomingEvents.reduce((groups, event) => {
    const date = new Date(event.start_time)
    let key: string

    if (isToday(date)) {
      key = 'Today'
    } else if (isTomorrow(date)) {
      key = 'Tomorrow'
    } else if (date <= addDays(new Date(), 7)) {
      key = format(date, 'EEEE')
    } else {
      key = format(date, 'MMMM d, yyyy')
    }

    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(event)
    return groups
  }, {} as Record<string, CalendarEvent[]>)

  if (upcomingEvents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Upcoming Events
        </h3>
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
          No upcoming events
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Upcoming Events
      </h3>
      <div className="space-y-4">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date}>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              {date}
            </h4>
            <div className="space-y-2">
              {dateEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                  compact
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UpcomingEvents
