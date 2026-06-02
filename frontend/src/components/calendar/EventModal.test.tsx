import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type { CalendarEvent } from '@/types'
import { EventModal } from './EventModal'

vi.mock('@/api/useChecklists', () => ({
  useChecklists: () => ({
    data: {
      items: [
        { id: 7, name: 'Launch checklist', title: 'Launch checklist' },
      ],
    },
  }),
}))

const editableEvent: CalendarEvent = {
  id: 1,
  user_id: 1,
  title: 'Design review',
  description: 'Review calendar readability',
  start_datetime: '2026-06-02T10:00:00Z',
  end_datetime: '2026-06-02T11:00:00Z',
  all_day: false,
  color: '#3B82F6',
  reminder_minutes_before: 15,
  event_type: 'custom',
  checklist_template: null,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
}

function renderModal(props?: Partial<Parameters<typeof EventModal>[0]>) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()

  render(
    <I18nProvider>
      <EventModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        defaultDate={new Date('2026-06-02T10:00:00Z')}
        {...props}
      />
    </I18nProvider>
  )

  return { onClose, onSubmit }
}

describe('EventModal', () => {
  const originalGetComputedStyle = window.getComputedStyle
  let restoreGetComputedStyle = () => {}

  beforeEach(() => {
    const spy = vi.spyOn(window, 'getComputedStyle')
    spy.mockImplementation(element => originalGetComputedStyle(element))
    restoreGetComputedStyle = () => spy.mockRestore()
  })

  afterEach(() => {
    restoreGetComputedStyle()
  })

  it('keeps zod title validation before creating an event', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the existing event payload from Ant Design controls', async () => {
    const user = userEvent.setup()
    const { onClose, onSubmit } = renderModal({ event: editableEvent })

    await user.click(screen.getByRole('button', { name: 'Update Event' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: 'Design review',
      description: 'Review calendar readability',
      all_day: false,
      color: '#3B82F6',
      reminder_minutes_before: 15,
      event_type: 'custom',
      checklist_template: null,
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('submits checklist reminder fields from a checklist event', async () => {
    const user = userEvent.setup()
    const checklistEvent = {
      ...editableEvent,
      event_type: 'checklist' as const,
      checklist_template: 7,
    }
    const { onSubmit } = renderModal({ event: checklistEvent })

    await user.click(screen.getByRole('button', { name: 'Update Event' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      reminder_minutes_before: 15,
      event_type: 'checklist',
      checklist_template: 7,
    })
  })

  it('allows same-day all-day events', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(screen.getByPlaceholderText('Event title'), 'Team offsite')
    await user.click(screen.getByRole('switch'))
    await user.click(screen.getByRole('button', { name: 'Create Event' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      all_day: true,
      title: 'Team offsite',
    })
  })

  it('shows checklist linking when editing a checklist event', () => {
    renderModal({ event: { ...editableEvent, event_type: 'checklist' } })

    expect(screen.getByText('Link to Template')).toBeInTheDocument()
  })
})
