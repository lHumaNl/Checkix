import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type { Webhook } from '@/api/useWebhooks'
import { WebhooksPage } from './WebhooksPage'

const apiMocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  deleteMutate: vi.fn(),
  toggleMutate: vi.fn(),
  updateMutate: vi.fn(),
  useWebhooks: vi.fn(),
}))

vi.mock('@/api/useWebhooks', () => ({
  useWebhooks: apiMocks.useWebhooks,
  useCreateWebhook: () => ({ isPending: false, mutate: apiMocks.createMutate }),
  useUpdateWebhook: () => ({ isPending: false, mutate: apiMocks.updateMutate }),
  useDeleteWebhook: () => ({ isPending: false, mutate: apiMocks.deleteMutate }),
  useToggleWebhook: () => ({ isPending: false, mutate: apiMocks.toggleMutate }),
}))

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }))

const webhook: Webhook = {
  id: 7,
  name: 'Deploy hook',
  event_type: 'instance_started',
  event_type_display: 'Instance Started',
  endpoint_url: 'https://example.com/hooks/deploy',
  is_active: true,
  headers: {},
  events_count: 2,
  recent_events: [],
  last_event_status: 'sent',
  created_at: '2026-06-01T12:00:00Z',
  updated_at: '2026-06-01T12:00:00Z',
}

const originalGetComputedStyle = window.getComputedStyle.bind(window)
let getComputedStyleSpy: { mockRestore: () => void }

function renderPage() {
  render(
    <I18nProvider>
      <WebhooksPage />
    </I18nProvider>
  )
}

describe('WebhooksPage', () => {
  beforeEach(() => {
    apiMocks.createMutate.mockReset()
    apiMocks.deleteMutate.mockReset()
    apiMocks.toggleMutate.mockReset()
    apiMocks.updateMutate.mockReset()
    getComputedStyleSpy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation((element) => originalGetComputedStyle(element))
    apiMocks.useWebhooks.mockReturnValue({ data: { items: [webhook] }, isLoading: false })
  })

  afterEach(() => {
    getComputedStyleSpy.mockRestore()
  })

  it('renders localized Webhooks chrome and data', () => {
    localStorage.setItem('language', 'ru')
    renderPage()

    expect(screen.getByRole('button', { name: /\u041d\u043e\u0432\u044b\u0439 \u0432\u0435\u0431\u0445\u0443\u043a/ })).toBeInTheDocument()
    expect(screen.getByText('Deploy hook')).toBeInTheDocument()
    expect(screen.queryByText('New Webhook')).not.toBeInTheDocument()
  })

  it('submits create payload with existing API shape', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /New Webhook/ }))
    await user.type(screen.getByPlaceholderText('My webhook'), ' Audit hook ')
    await user.type(screen.getByPlaceholderText('https://example.com/hook'), ' https://example.com/audit ')
    await user.type(screen.getByPlaceholderText('Signing secret'), 'secret-value')

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'New Webhook' }))

    await waitFor(() => expect(apiMocks.createMutate).toHaveBeenCalled())
    expect(apiMocks.createMutate.mock.calls[0][0]).toEqual({
      name: 'Audit hook',
      events: ['instance_started'],
      url: 'https://example.com/audit',
      is_active: true,
      secret: 'secret-value',
    })
  })
})
