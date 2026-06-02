import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type { CalendarEventCreate } from '@/types'
import { CalendarPage } from './CalendarPage'

const calendarMocks = vi.hoisted(() => ({
  createMutateAsync: vi.fn(),
  deleteMutateAsync: vi.fn(),
  updateMutateAsync: vi.fn(),
}))

vi.mock('@/api/useCalendarEvents', () => ({
  useCalendarEvents: () => ({ data: [], isLoading: false }),
  useCreateCalendarEvent: () => ({ mutateAsync: calendarMocks.createMutateAsync }),
  useDeleteCalendarEvent: () => ({ mutateAsync: calendarMocks.deleteMutateAsync }),
  useUpdateCalendarEvent: () => ({ mutateAsync: calendarMocks.updateMutateAsync }),
}))

vi.mock('@/components/calendar', () => ({
  CalendarSkeleton: () => <div>Loading calendar</div>,
  MiniCalendar: () => <div>Mini calendar</div>,
  UpcomingEvents: () => <div>Upcoming events</div>,
  CalendarView: ({ onCreateEvent }: { onCreateEvent: (date: Date) => void }) => (
    <button onClick={() => onCreateEvent(new Date('2026-06-02T10:00:00Z'))}>Create mock event</button>
  ),
  EventModal: ({ isOpen, onSubmit }: { isOpen: boolean; onSubmit: (data: CalendarEventCreate) => Promise<void> }) => (
    isOpen ? <button onClick={() => onSubmit(createEventData())}>Submit mock event</button> : null
  ),
}))

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }))

function createEventData(): CalendarEventCreate {
  return {
    title: 'Launch review',
    description: 'Review launch checklist',
    start_datetime: '2026-06-02T10:00',
    end_datetime: '2026-06-02T11:00',
    all_day: false,
    color: '#3B82F6',
    reminder_minutes_before: 30,
    event_type: 'checklist',
    checklist_template: 7,
  }
}

function renderCalendarPage() {
  render(
    <I18nProvider>
      <CalendarPage />
    </I18nProvider>
  )
}

describe('CalendarPage', () => {
  beforeEach(() => {
    calendarMocks.createMutateAsync.mockResolvedValue({})
    calendarMocks.createMutateAsync.mockClear()
    calendarMocks.deleteMutateAsync.mockClear()
    calendarMocks.updateMutateAsync.mockClear()
  })

  it('preserves reminder and checklist fields in create payloads', async () => {
    const user = userEvent.setup()
    renderCalendarPage()

    await user.click(screen.getByRole('button', { name: 'Create mock event' }))
    await user.click(screen.getByRole('button', { name: 'Submit mock event' }))

    await waitFor(() => expect(calendarMocks.createMutateAsync).toHaveBeenCalledTimes(1))
    expect(calendarMocks.createMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      reminder_minutes_before: 30,
      event_type: 'checklist',
      checklist_template: 7,
    }))
  })
})
