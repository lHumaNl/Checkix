import { useMemo, useState } from 'react'
import { addDays, addMonths, addWeeks, endOfMonth, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { Calendar as AntCalendar, Badge, Button, Card, Drawer, Empty, List, Popconfirm, Segmented, Space, Tag, Tooltip, Typography } from 'antd'
import type { CalendarProps } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Edit, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { CalendarEvent } from '@/types'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda'
type NavigateAction = 'TODAY' | 'PREV' | 'NEXT'

interface CalendarViewProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: (date?: Date) => void
  onDeleteEvent?: (event: CalendarEvent) => Promise<void> | void
  currentDate?: Date
  onDateChange?: (date: Date) => void
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
}

const eventStyles = {
  checklist: { color: '#2563eb', tint: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', labelKey: 'event.typeChecklist' },
  todo: { color: '#059669', tint: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', labelKey: 'event.typeTodo' },
  custom: { color: '#7c3aed', tint: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', labelKey: 'event.typeCustom' },
} satisfies Record<CalendarEvent['event_type'], { color: string; tint: string; labelKey: MessageKey }>

const viewLabelKeys = {
  month: 'calendar.month',
  week: 'calendar.week',
  day: 'calendar.day',
  agenda: 'calendar.agenda',
} satisfies Record<CalendarViewMode, MessageKey>

export function CalendarView(props: CalendarViewProps) {
  const [internalDate, setInternalDate] = useState(new Date())
  const [view, setView] = useState<CalendarViewMode>('month')
  const [drawerDate, setDrawerDate] = useState<Date | null>(null)
  const { language } = useI18n()
  const currentDate = props.currentDate ?? internalDate
  const safeEvents = useMemo(() => sortEvents(props.events), [props.events])
  const selectedDate = props.selectedDate ?? currentDate

  const handleDateChange = (date: Date) => {
    if (props.onDateChange) {
      props.onDateChange(date)
      return
    }
    setInternalDate(date)
  }

  const handleDateSelect = (date: Date) => {
    props.onDateSelect?.(date)
    handleDateChange(date)
    setDrawerDate(date)
  }

  const handleNavigate = (action: NavigateAction) => {
    const nextDate = getNavigatedDate(currentDate, view, action)
    handleDateChange(nextDate)
  }

  return (
    <section className="calendar-shell relative h-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-blue-950/5 dark:border-gray-800 dark:bg-gray-950 dark:shadow-black/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.12),transparent_32%)]" />
      <div className="relative flex h-full flex-col">
        <CalendarToolbar currentDate={currentDate} onCreateEvent={props.onCreateEvent} onNavigate={handleNavigate} onViewChange={setView} view={view} />
        <div className="min-h-0 flex-1 p-3 sm:p-4">
          {view === 'month' ? (
            <MonthCalendar events={safeEvents} selectedDate={selectedDate} currentDate={currentDate} onCreateEvent={props.onCreateEvent} onDateSelect={handleDateSelect} onEventClick={props.onEventClick} />
          ) : (
            <AlternativeCalendarView currentDate={currentDate} events={safeEvents} onCreateEvent={props.onCreateEvent} onDateSelect={handleDateSelect} onDeleteEvent={props.onDeleteEvent} onEventClick={props.onEventClick} view={view} />
          )}
        </div>
      </div>
      <EventDrawer date={drawerDate} events={safeEvents} language={language} onClose={() => setDrawerDate(null)} onCreateEvent={props.onCreateEvent} onDeleteEvent={props.onDeleteEvent} onEventClick={props.onEventClick} />
    </section>
  )
}

interface ToolbarProps {
  currentDate: Date
  onCreateEvent: (date?: Date) => void
  onNavigate: (action: NavigateAction) => void
  onViewChange: (view: CalendarViewMode) => void
  view: CalendarViewMode
}

function CalendarToolbar({ currentDate, onCreateEvent, onNavigate, onViewChange, view }: ToolbarProps) {
  const { language, t } = useI18n()
  const title = formatMonthTitle(currentDate, language)
  const views = ['month', 'week', 'day', 'agenda'] as const

  return (
    <header className="relative border-b border-gray-200/80 bg-white/85 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <Space wrap>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => onCreateEvent()}>{t('calendar.newEvent')}</Button>
          <Button onClick={() => onNavigate('TODAY')}>{t('calendar.today')}</Button>
          <Space.Compact>
            <Button aria-label={t('calendar.previous')} icon={<ChevronLeft size={18} />} onClick={() => onNavigate('PREV')} />
            <Button aria-label={t('calendar.next')} icon={<ChevronRight size={18} />} onClick={() => onNavigate('NEXT')} />
          </Space.Compact>
        </Space>
        <div className="min-w-0 flex-1 text-center xl:text-left">
          <div className="flex items-center justify-center gap-2 xl:justify-start">
            <Sparkles size={18} className="text-blue-500" />
            <Typography.Title level={3} className="!m-0 truncate !text-gray-950 dark:!text-gray-50">{title}</Typography.Title>
          </div>
          <Typography.Text type="secondary">{t('calendar.title')}</Typography.Text>
        </div>
        <Segmented value={view} onChange={value => onViewChange(value as CalendarViewMode)} options={views.map(item => ({ label: t(viewLabelKeys[item]), value: item }))} />
      </div>
    </header>
  )
}

interface MonthCalendarProps {
  currentDate: Date
  events: CalendarEvent[]
  selectedDate: Date
  onCreateEvent: (date?: Date) => void
  onDateSelect: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
}

function MonthCalendar({ currentDate, events, selectedDate, onCreateEvent, onDateSelect, onEventClick }: MonthCalendarProps) {
  const fullCellRender: CalendarProps<Dayjs>['fullCellRender'] = (value, info) => {
    if (info.type !== 'date') return info.originNode
    return <MonthDateCell date={value.toDate()} events={events} selectedDate={selectedDate} visibleMonth={currentDate} onCreateEvent={onCreateEvent} onEventClick={onEventClick} />
  }

  return (
    <AntCalendar
      className="checkix-ant-calendar rounded-2xl border border-gray-200/70 bg-white/90 p-2 shadow-inner dark:border-gray-800 dark:bg-gray-900/70"
      fullCellRender={fullCellRender}
      fullscreen
      headerRender={() => null}
      value={dayjs(currentDate)}
      onPanelChange={date => onDateSelect(date.toDate())}
      onSelect={(date, info) => info.source === 'date' && onDateSelect(date.toDate())}
    />
  )
}

interface DateCellProps {
  date: Date
  events: CalendarEvent[]
  selectedDate: Date
  visibleMonth: Date
  onCreateEvent: (date?: Date) => void
  onEventClick: (event: CalendarEvent) => void
}

function MonthDateCell({ date, events, selectedDate, visibleMonth, onCreateEvent, onEventClick }: DateCellProps) {
  const { t } = useI18n()
  const dayEvents = getEventsForDay(events, date)
  const isSelected = isSameDay(date, selectedDate)
  const isMuted = !isSameMonth(date, visibleMonth)

  return (
    <div className={`calendar-date-content group flex min-h-[72px] flex-col rounded-xl p-2 transition ${isSelected ? 'bg-blue-500/10 ring-1 ring-blue-400' : 'hover:bg-blue-500/5'} ${isMuted ? 'opacity-45' : ''}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <time className="calendar-day-number text-sm font-bold text-gray-800 dark:text-gray-100" dateTime={formatIsoDate(date)}>
          {date.getDate()}
        </time>
        <Tooltip title={t('calendar.newEvent')}>
          <Button size="small" type="text" icon={<Plus size={13} />} onClick={event => { event.stopPropagation(); onCreateEvent(date) }} />
        </Tooltip>
      </div>
      <div className="space-y-1 overflow-hidden">
        {dayEvents.slice(0, 3).map(event => <EventPill key={event.id} event={event} onClick={onEventClick} />)}
        {dayEvents.length > 3 && <Tag className="m-0 rounded-full border-0 bg-gray-100 text-xs dark:bg-gray-800">{t('calendar.showMore', { count: dayEvents.length - 3 })}</Tag>}
      </div>
    </div>
  )
}

interface AlternativeViewProps {
  currentDate: Date
  events: CalendarEvent[]
  view: Exclude<CalendarViewMode, 'month'>
  onCreateEvent: (date?: Date) => void
  onDateSelect: (date: Date) => void
  onDeleteEvent?: (event: CalendarEvent) => Promise<void> | void
  onEventClick: (event: CalendarEvent) => void
}

function AlternativeCalendarView(props: AlternativeViewProps) {
  if (props.view === 'week') return <WeekView {...props} />
  if (props.view === 'day') return <DayView {...props} />
  return <AgendaView {...props} />
}

function WeekView({ currentDate, events, onCreateEvent, onDateSelect, onDeleteEvent, onEventClick }: AlternativeViewProps) {
  const days = getWeekDays(currentDate)
  return (
    <div className="grid h-full gap-3 overflow-auto lg:grid-cols-7">
      {days.map(day => <DayColumn key={day.toISOString()} date={day} events={getEventsForDay(events, day)} onCreateEvent={onCreateEvent} onDateSelect={onDateSelect} onDeleteEvent={onDeleteEvent} onEventClick={onEventClick} />)}
    </div>
  )
}

function DayView({ currentDate, events, onCreateEvent, onDeleteEvent, onEventClick }: AlternativeViewProps) {
  const { language } = useI18n()
  return (
    <Card className="h-full overflow-auto border-blue-200/70 bg-white/90 dark:border-blue-900/60 dark:bg-gray-900/80" title={<DayTitle date={currentDate} language={language} />}>
      <EventList date={currentDate} events={getEventsForDay(events, currentDate)} onCreateEvent={onCreateEvent} onDeleteEvent={onDeleteEvent} onEventClick={onEventClick} />
    </Card>
  )
}

function AgendaView({ currentDate, events, onCreateEvent, onDeleteEvent, onEventClick }: AlternativeViewProps) {
  const agendaEvents = getRangeEvents(events, startOfMonth(currentDate), endOfMonth(currentDate))
  return <GroupedEventList events={agendaEvents} onCreateEvent={onCreateEvent} onDeleteEvent={onDeleteEvent} onEventClick={onEventClick} />
}

interface DayColumnProps {
  date: Date
  events: CalendarEvent[]
  onCreateEvent: (date?: Date) => void
  onDateSelect: (date: Date) => void
  onDeleteEvent?: (event: CalendarEvent) => Promise<void> | void
  onEventClick: (event: CalendarEvent) => void
}

function DayColumn({ date, events, onCreateEvent, onDateSelect, onDeleteEvent, onEventClick }: DayColumnProps) {
  const { language } = useI18n()
  return (
    <Card className="min-h-64 bg-white/90 dark:bg-gray-900/80" size="small" title={<button className="text-left" onClick={() => onDateSelect(date)}>{formatDate(date, language, { weekday: 'short', day: 'numeric' })}</button>} extra={<Button size="small" type="text" icon={<Plus size={14} />} onClick={() => onCreateEvent(date)} />}>
      <EventList date={date} events={events} onCreateEvent={onCreateEvent} onDeleteEvent={onDeleteEvent} onEventClick={onEventClick} compact />
    </Card>
  )
}

interface EventListProps {
  date?: Date
  events: CalendarEvent[]
  compact?: boolean
  onCreateEvent: (date?: Date) => void
  onDeleteEvent?: (event: CalendarEvent) => Promise<void> | void
  onEventClick: (event: CalendarEvent) => void
}

function EventList({ compact, date, events, onCreateEvent, onDeleteEvent, onEventClick }: EventListProps) {
  const { t } = useI18n()
  if (events.length === 0) return <Empty description={t('calendar.noEventsInRange')}><Button icon={<Plus size={14} />} onClick={() => onCreateEvent(date)}>{t('calendar.newEvent')}</Button></Empty>
  return <List dataSource={events} renderItem={event => <EventListItem compact={compact} event={event} onDeleteEvent={onDeleteEvent} onEventClick={onEventClick} />} />
}

interface EventListItemProps {
  compact?: boolean
  event: CalendarEvent
  onDeleteEvent?: (event: CalendarEvent) => Promise<void> | void
  onEventClick: (event: CalendarEvent) => void
}

function EventListItem({ compact, event, onDeleteEvent, onEventClick }: EventListItemProps) {
  const { language, t } = useI18n()
  const style = eventStyles[event.event_type]
  return (
    <List.Item className="!px-0">
      <Card className="w-full cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md" size="small" onClick={() => onEventClick(event)}>
        <div className="flex items-start gap-3">
          <span className="mt-1 h-10 w-1 rounded-full" style={{ backgroundColor: event.color ?? style.color }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Typography.Text strong ellipsis>{event.title}</Typography.Text>
              {!compact && <Tag className={`${style.tint} m-0 border-0`}>{t(style.labelKey)}</Tag>}
            </div>
            <Typography.Text type="secondary" className="flex items-center gap-1 text-xs"><Clock size={12} />{formatEventTime(event, language, t('calendar.allDay'))}</Typography.Text>
          </div>
          <Space onClick={click => click.stopPropagation()}>
            <Button aria-label={t('event.actionEdit')} size="small" type="text" icon={<Edit size={14} />} onClick={() => onEventClick(event)} />
            {onDeleteEvent && <Popconfirm title={t('event.actionDelete')} okText={t('common.delete')} cancelText={t('common.cancel')} onConfirm={() => onDeleteEvent(event)}><Button aria-label={t('event.actionDelete')} danger size="small" type="text" icon={<Trash2 size={14} />} /></Popconfirm>}
          </Space>
        </div>
      </Card>
    </List.Item>
  )
}

function EventPill({ event, onClick }: { event: CalendarEvent; onClick: (event: CalendarEvent) => void }) {
  const style = eventStyles[event.event_type]
  return (
    <button className="flex w-full items-center gap-1 rounded-lg border border-transparent bg-white/80 px-2 py-1 text-left text-xs font-medium text-gray-800 shadow-sm transition hover:border-blue-300 hover:shadow dark:bg-gray-800/90 dark:text-gray-100" onClick={click => { click.stopPropagation(); onClick(event) }}>
      <Badge color={event.color ?? style.color} />
      <span className="truncate">{event.title}</span>
    </button>
  )
}

interface DrawerProps {
  date: Date | null
  events: CalendarEvent[]
  language: string
  onClose: () => void
  onCreateEvent: (date?: Date) => void
  onDeleteEvent?: (event: CalendarEvent) => Promise<void> | void
  onEventClick: (event: CalendarEvent) => void
}

function EventDrawer({ date, events, language, onClose, onCreateEvent, onDeleteEvent, onEventClick }: DrawerProps) {
  const { t } = useI18n()
  const dayEvents = date ? getEventsForDay(events, date) : []
  return (
    <Drawer open={Boolean(date)} width={420} onClose={onClose} title={date ? formatDate(date, language, { dateStyle: 'full' }) : ''} extra={<Button type="primary" icon={<Plus size={14} />} onClick={() => onCreateEvent(date ?? undefined)}>{t('calendar.newEvent')}</Button>}>
      {date && <EventList date={date} events={dayEvents} onCreateEvent={onCreateEvent} onDeleteEvent={onDeleteEvent} onEventClick={onEventClick} />}
    </Drawer>
  )
}

function GroupedEventList({ events, onCreateEvent, onDeleteEvent, onEventClick }: EventListProps) {
  const { language, t } = useI18n()
  if (events.length === 0) return <Empty description={t('calendar.noEventsInRange')}><Button icon={<Plus size={14} />} onClick={() => onCreateEvent()}>{t('calendar.newEvent')}</Button></Empty>
  return (
    <div className="h-full space-y-4 overflow-auto rounded-2xl bg-white/75 p-3 dark:bg-gray-900/70">
      {groupEventsByDay(events).map(group => <Card key={group.day} size="small" title={formatDate(new Date(group.day), language, { dateStyle: 'medium' })}><EventList events={group.events} onCreateEvent={onCreateEvent} onDeleteEvent={onDeleteEvent} onEventClick={onEventClick} /></Card>)}
    </div>
  )
}

function DayTitle({ date, language }: { date: Date; language: string }) {
  return <span className="flex items-center gap-2"><CalendarDays size={18} />{formatDate(date, language, { dateStyle: 'full' })}</span>
}

function getNavigatedDate(currentDate: Date, view: CalendarViewMode, navigate: NavigateAction) {
  if (navigate === 'TODAY') return new Date()
  const direction = navigate === 'NEXT' ? 1 : -1
  if (view === 'week') return addWeeks(currentDate, direction)
  if (view === 'day') return addDays(currentDate, direction)
  return addMonths(currentDate, direction)
}

function getWeekDays(date: Date) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

function getEventsForDay(events: CalendarEvent[], date: Date) {
  return events.filter(event => isSameDay(new Date(event.start_datetime), date))
}

function getRangeEvents(events: CalendarEvent[], start: Date, end: Date) {
  return events.filter(event => {
    const eventDate = new Date(event.start_datetime)
    return eventDate >= startOfDay(start) && eventDate <= end
  })
}

function sortEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
}

function groupEventsByDay(events: CalendarEvent[]) {
  return Object.values(events.reduce<Record<string, { day: string; events: CalendarEvent[] }>>((groups, event) => {
    const day = startOfDay(new Date(event.start_datetime)).toISOString()
    groups[day] ??= { day, events: [] }
    groups[day].events.push(event)
    return groups
  }, {}))
}

function formatDate(date: Date, language: string, options: Intl.DateTimeFormatOptions) {
  return date.toLocaleDateString(language, options)
}

function formatMonthTitle(date: Date, language: string) {
  const title = formatDate(date, language, { month: 'long', year: 'numeric' })
  return capitalizeHeading(title, language)
}

function capitalizeHeading(value: string, language: string) {
  if (!value) return value
  return value.charAt(0).toLocaleUpperCase(language) + value.slice(1)
}

function formatIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function formatEventTime(event: CalendarEvent, language: string, allDayLabel: string) {
  if (event.all_day) return allDayLabel
  const start = new Date(event.start_datetime)
  const end = new Date(event.end_datetime ?? event.start_datetime)
  return `${start.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}`
}

export default CalendarView
