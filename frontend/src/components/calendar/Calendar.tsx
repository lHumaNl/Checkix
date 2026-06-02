import { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, Views, type NavigateAction, type View, type EventProps } from 'react-big-calendar'
import { addDays, addMonths, addWeeks, format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS, ru, es, de, fr, zhCN } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button, Segmented, Space, Typography } from 'antd'
import type { CalendarEvent } from '@/types'
import { useI18n } from '@/i18n'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  en: enUS,
  ru,
  es,
  de,
  fr,
  zh: zhCN,
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
  const { language, t } = useI18n()
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
    const newDate = getNavigatedDate(currentDate, view, navigate)
    if (!newDate) return

    if (onDateChange) {
      onDateChange(newDate)
    } else {
      setInternalDate(newDate)
    }
  }

  const calendarMessages = useMemo(
    () => ({
      today: t('calendar.today'),
      previous: t('calendar.previous'),
      next: t('calendar.next'),
      month: t('calendar.month'),
      week: t('calendar.week'),
      day: t('calendar.day'),
      agenda: t('calendar.agenda'),
      noEventsInRange: t('calendar.noEventsInRange'),
      showMore: (count: number) => t('calendar.showMore', { count }),
    }),
    [t]
  )

  return (
    <div className="calendar-shell h-full rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            onClick={() => onCreateEvent()}
            icon={<Plus size={16} />}
          >
            {t('calendar.newEvent')}
          </Button>
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
          culture={language}
          messages={calendarMessages}
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
  const { t } = useI18n()
  const views: { label: string; value: View }[] = [
    { label: t('calendar.month'), value: 'month' },
    { label: t('calendar.week'), value: 'week' },
    { label: t('calendar.day'), value: 'day' },
    { label: t('calendar.agenda'), value: 'agenda' },
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-200 dark:border-gray-800">
      <Space wrap>
        <Button
          onClick={() => onNavigate('TODAY')}
        >
          {t('calendar.today')}
        </Button>
        <Button
          aria-label={t('calendar.previous')}
          onClick={() => onNavigate('PREV')}
          icon={<ChevronLeft size={20} />}
        />
        <Button
          aria-label={t('calendar.next')}
          onClick={() => onNavigate('NEXT')}
          icon={<ChevronRight size={20} />}
        />
        <Typography.Title level={4} style={{ margin: '0 0 0 8px' }}>
          {label}
        </Typography.Title>
      </Space>
      <Segmented
        value={view}
        onChange={(value) => onView(value as View)}
        options={views.map((viewOption) => ({
          label: viewOption.label,
          value: viewOption.value,
        }))}
      />
    </div>
  )
}

function getNavigatedDate(currentDate: Date, view: View, navigate: NavigateAction) {
  if (navigate === 'TODAY') return new Date()
  if (navigate !== 'PREV' && navigate !== 'NEXT') return null

  const direction = navigate === 'NEXT' ? 1 : -1
  if (view === Views.WEEK) return addWeeks(currentDate, direction)
  if (view === Views.DAY) return addDays(currentDate, direction)
  return addMonths(currentDate, direction)
}

export default CalendarView
