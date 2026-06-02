import { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, Views, type NavigateAction, type View, type EventProps } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarEvent } from '@/types'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const eventColors: Record<string, { bg: string; border: string; text: string }> = {
  checklist: { bg: 'bg-blue-100 dark:bg-blue-900/50', border: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  todo: { bg: 'bg-green-100 dark:bg-green-900/50', border: 'border-green-500', text: 'text-green-700 dark:text-green-300' },
  custom: { bg: 'bg-purple-100 dark:bg-purple-900/50', border: 'border-purple-500', text: 'text-purple-700 dark:text-purple-300' },
}

interface FormattedEvent {
  start: Date
  end: Date
  resource: CalendarEvent
}

interface CalendarViewProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onEventDrop: (event: CalendarEvent, start: Date, end: Date) => void
  onEventResize: (event: CalendarEvent, start: Date, end: Date) => void
  onCreateEvent: (date?: Date) => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
}

function EventComponent({ event, onEventClick }: EventProps<FormattedEvent> & { onEventClick: (event: CalendarEvent) => void }) {
  const colors = eventColors[event.resource.event_type] || eventColors.custom
  return (
    <div
      className={`h-full w-full ${colors.bg} ${colors.text} rounded text-xs px-1.5 py-0.5 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={() => onEventClick(event.resource)}
    >
      <div className="truncate font-medium">{event.resource.title}</div>
      {!event.resource.all_day && (
        <div className="truncate opacity-75">
          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
        </div>
      )}
    </div>
  )
}

export function CalendarView({ events, onEventClick, onCreateEvent, currentDate: externalDate, onDateChange }: Omit<CalendarViewProps, 'onEventDrop' | 'onEventResize'>) {
  const [internalDate, setInternalDate] = useState(new Date())
  const [view, setView] = useState<View>(Views.MONTH)
  const currentDate = externalDate ?? internalDate

  const formattedEvents: FormattedEvent[] = useMemo(() => {
    return events.map((event) => ({
      start: new Date(event.start_datetime),
      end: new Date(event.end_datetime ?? event.start_datetime),
      resource: event,
    }))
  }, [events])

  const WrappedEventComponent = useMemo(() => {
    return (props: EventProps<FormattedEvent>) => <EventComponent {...props} onEventClick={onEventClick} />
  }, [onEventClick])

  const handleNavigate = (navigate: NavigateAction) => {
    let newDate: Date
    if (navigate === 'TODAY') {
      newDate = new Date()
    } else if (navigate === 'PREV') {
      newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    } else if (navigate === 'NEXT') {
      newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    } else {
      return
    }
    if (onDateChange) {
      onDateChange(newDate)
    } else {
      setInternalDate(newDate)
    }
  }

  return (
    <div className="h-full bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <div className="rbc-toolbar flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCreateEvent()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Event
          </button>
        </div>
      </div>
      <div className="h-[calc(100%-64px)]">
        <Calendar<FormattedEvent>
          localizer={localizer}
          events={formattedEvents}
          startAccessor="start"
          endAccessor="end"
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          view={view}
          date={currentDate}
          onView={setView}
          onNavigate={() => {}}
          components={{
            event: WrappedEventComponent,
            toolbar: (props) => <CustomToolbar {...props} onNavigate={handleNavigate} />,
          }}
          onDoubleClickEvent={(event: FormattedEvent) => onEventClick(event.resource)}
          onSelectSlot={({ start }: { start: Date }) => onCreateEvent(start)}
          selectable
          popup
          className="text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
  )
}

interface CustomToolbarProps {
  label: string
  onNavigate: (navigate: NavigateAction) => void
  onView: (view: View) => void
  view: View
}

function CustomToolbar({ label, onNavigate, onView, view }: CustomToolbarProps) {
  const views: { label: string; value: View }[] = [
    { label: 'Month', value: 'month' },
    { label: 'Week', value: 'week' },
    { label: 'Day', value: 'day' },
    { label: 'Agenda', value: 'agenda' },
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => onNavigate('PREV')}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <ChevronRight size={20} />
        </button>
        <span className="text-lg font-semibold text-gray-900 dark:text-white ml-2">{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {views.map((v) => (
          <button
            key={v.value}
            onClick={() => onView(v.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === v.value
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default CalendarView
