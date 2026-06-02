import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { CalendarView } from './Calendar'
import type { CalendarEvent } from '@/types'

const event: CalendarEvent = {
  id: 1,
  user_id: 1,
  title: 'Design review',
  description: 'Review calendar readability',
  start_datetime: '2026-06-02T10:00:00Z',
  end_datetime: '2026-06-02T11:00:00Z',
  all_day: false,
  color: '#3B82F6',
  reminder_minutes_before: null,
  event_type: 'custom',
  checklist_template: null,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

function renderCalendar(onCreateEvent = vi.fn(), onDateChange = vi.fn()) {
  return render(
    <I18nProvider>
      <CalendarView
        events={[event]}
        onEventClick={vi.fn()}
        onCreateEvent={onCreateEvent}
        currentDate={new Date('2026-06-02T00:00:00Z')}
        onDateChange={onDateChange}
      />
    </I18nProvider>
  )
}

describe('CalendarView', () => {
  it('renders Ant Design toolbar controls and events', () => {
    renderCalendar()

    expect(screen.getByRole('button', { name: /new event/i })).toBeInTheDocument()
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Week')).toBeInTheDocument()
    expect(document.querySelector('.checkix-ant-calendar')).toBeInTheDocument()
    expect(screen.getByText('Design review')).toBeInTheDocument()
  })

  it('opens event creation from the toolbar', () => {
    const onCreateEvent = vi.fn()
    renderCalendar(onCreateEvent)

    fireEvent.click(screen.getByRole('button', { name: /new event/i }))

    expect(onCreateEvent).toHaveBeenCalledWith()
  })

  it('renders a card-based week view and navigates by week', () => {
    const onDateChange = vi.fn()
    renderCalendar(vi.fn(), onDateChange)

    fireEvent.click(screen.getByText('Week'))
    expect(document.querySelector('.checkix-ant-calendar')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(onDateChange).toHaveBeenCalledWith(new Date('2026-06-09T00:00:00Z'))
  })

  it('navigates by day while the day view is selected', () => {
    const onDateChange = vi.fn()
    renderCalendar(vi.fn(), onDateChange)

    fireEvent.click(screen.getByText('Day'))
    fireEvent.click(screen.getByRole('button', { name: /previous/i }))

    expect(onDateChange).toHaveBeenCalledWith(new Date('2026-06-01T00:00:00Z'))
  })
})
