import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { NotificationsPage } from './NotificationsPage'

const notificationMocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  deleteMutate: vi.fn(),
  toggleMutate: vi.fn(),
  useNotificationLogs: vi.fn(),
  useNotificationRules: vi.fn(),
}))

vi.mock('@/api/useNotifications', () => ({
  useCreateNotificationRule: () => ({ isPending: false, mutate: notificationMocks.createMutate }),
  useDeleteNotificationRule: () => ({ isPending: false, mutate: notificationMocks.deleteMutate }),
  useNotificationLogs: notificationMocks.useNotificationLogs,
  useNotificationRules: notificationMocks.useNotificationRules,
  useToggleNotificationRule: () => ({ isPending: false, mutate: notificationMocks.toggleMutate }),
}))

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }))

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const rule = {
  checklist_item: null,
  checklist_item_title: null,
  checklist_template: 7,
  checklist_template_name: 'Safety template',
  created_at: '2026-06-01T10:00:00Z',
  event_type: 'task_due_in' as const,
  event_type_display: 'Task Due In',
  id: 1,
  is_active: true,
  sequences: [{
    custom_email: 'ops@example.com',
    email_body: 'Body',
    email_subject: 'Due reminder',
    id: 11,
    notification_rule: 1,
    recipient_group: null,
    recipient_group_name: null,
    recipient_type: 'custom' as const,
    sequence_order: 1,
    trigger_offset_minutes: -60,
  }],
  updated_at: '2026-06-01T10:00:00Z',
}

const log = {
  checklist_instance: 9,
  checklist_instance_name: 'Daily opening',
  created_at: '2026-06-01T10:00:00Z',
  error_message: '',
  id: 2,
  notification_sequence: 11,
  recipient_email: 'user@example.com',
  sent_at: null,
  status: 'sent' as const,
  status_display: 'Sent',
}

beforeAll(() => {
  const getComputedStyle = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element))
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

beforeEach(() => {
  notificationMocks.createMutate.mockReset()
  notificationMocks.useNotificationLogs.mockReturnValue({ data: { items: [log] }, isError: false, isLoading: false })
  notificationMocks.useNotificationRules.mockReturnValue({ data: { items: [rule] }, isError: false, isLoading: false })
})

function renderPage() {
  render(
    <I18nProvider>
      <NotificationsPage />
    </I18nProvider>
  )
}

describe('NotificationsPage', () => {
  it('renders notification rules with sequences in Ant Design cards', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByText('Task Due In')).toBeInTheDocument()
    expect(screen.getByText(/Safety template/)).toBeInTheDocument()

    await user.click(screen.getByText('Sequences'))

    expect(screen.getByText('ops@example.com')).toBeInTheDocument()
    expect(screen.getByText('Due reminder')).toBeInTheDocument()
  })

  it('renders delivery logs in the Ant Design table tab', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('tab', { name: /logs/i }))

    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.getByText('Sent')).toBeInTheDocument()
    expect(screen.getByText('Daily opening')).toBeInTheDocument()
  })

  it('submits the create rule drawer with the existing API payload shape', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /new rule/i }))
    await user.clear(screen.getByRole('spinbutton'))
    await user.type(screen.getByRole('spinbutton'), '42')
    await user.click(screen.getByRole('button', { name: 'Create Rule' }))

    await waitFor(() => {
      expect(notificationMocks.createMutate).toHaveBeenCalledWith(
        { template_id: 42, event_type: 'task_due_in', is_active: true },
        expect.any(Object)
      )
    })
  })
})
