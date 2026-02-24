import { useState, useCallback } from 'react'
import { addMonths, subMonths } from 'date-fns'
import { CalendarView, EventModal, MiniCalendar, UpcomingEvents } from '@/components/calendar'
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent } from '@/api/useCalendarEvents'
import { CalendarSkeleton } from '@/components/skeletons/CalendarSkeleton'
import { toast } from '@/hooks/useToast'
import type { CalendarEvent, CalendarEventCreate } from '@/types'

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [defaultEventDate, setDefaultEventDate] = useState<Date | undefined>()

  const startDate = subMonths(currentDate, 1)
  const endDate = addMonths(currentDate, 1)

  const { data: events = [], isLoading } = useCalendarEvents(startDate, endDate)
  const createMutation = useCreateCalendarEvent()
  const updateMutation = useUpdateCalendarEvent()

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setDefaultEventDate(new Date(event.start_datetime))
    setIsModalOpen(true)
  }, [])

  const handleCreateEvent = useCallback((date?: Date) => {
    setSelectedEvent(null)
    setDefaultEventDate(date)
    setIsModalOpen(true)
  }, [])

  const handleSubmitEvent = useCallback(
    async (data: CalendarEventCreate) => {
      if (selectedEvent) {
        await updateMutation.mutateAsync({ id: selectedEvent.id, ...data })
        toast({ title: 'Event updated' })
      } else {
        await createMutation.mutateAsync(data)
        toast({ title: 'Event created' })
      }
      setSelectedEvent(null)
    },
    [selectedEvent, createMutation, updateMutation]
  )

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedEvent(null)
    setDefaultEventDate(undefined)
  }, [])

  const handleMonthChange = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  if (isLoading) {
    return <CalendarSkeleton />
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      <div className="lg:w-64 shrink-0 space-y-4">
        <MiniCalendar
          events={events}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          currentMonth={currentDate}
          onMonthChange={handleMonthChange}
        />
        <UpcomingEvents events={events} onEventClick={handleEventClick} />
      </div>

      <div className="flex-1 min-w-0">
        <CalendarView
          events={events}
          onEventClick={handleEventClick}
          onCreateEvent={handleCreateEvent}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        onSubmit={handleSubmitEvent}
        defaultDate={defaultEventDate}
      />
    </div>
  )
}

export default CalendarPage
