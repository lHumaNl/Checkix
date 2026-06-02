import { isToday, isTomorrow, addDays } from 'date-fns'
import type { CalendarEvent } from '@/types'
import { useI18n } from '@/i18n'
import { EventCard } from './EventCard'

interface UpcomingEventsProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export function UpcomingEvents({ events, onEventClick }: UpcomingEventsProps) {
  const { language, t } = useI18n()
  const safeEvents = Array.isArray(events) ? events : []
  const upcomingEvents = safeEvents
    .filter((event) => new Date(event.start_datetime) >= new Date())
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    .slice(0, 5)

  const groupedEvents = upcomingEvents.reduce((groups, event) => {
    const date = new Date(event.start_datetime)
    let key: string

    if (isToday(date)) {
      key = t('calendar.today')
    } else if (isTomorrow(date)) {
      key = t('calendar.tomorrow')
    } else if (date <= addDays(new Date(), 7)) {
      key = date.toLocaleDateString(language, { weekday: 'long' })
    } else {
      key = date.toLocaleDateString(language, { dateStyle: 'medium' })
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
          {t('calendar.upcomingEvents')}
        </h3>
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
          {t('calendar.noUpcomingEvents')}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        {t('calendar.upcomingEvents')}
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
