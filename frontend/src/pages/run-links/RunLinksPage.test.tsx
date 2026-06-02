import { ConfigProvider } from 'antd'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { RunLinkExecutePage } from './RunLinkExecutePage'
import { RunLinksPage } from './RunLinksPage'

const runLinkApi = vi.hoisted(() => ({
  useCreateRunLink: vi.fn(),
  useDeleteRunLink: vi.fn(),
  useExecuteRunLink: vi.fn(),
  useRunLinks: vi.fn(),
}))

vi.mock('@/api/useRunLinks', () => runLinkApi)

const getComputedStyle = window.getComputedStyle
let getComputedStyleSpy: { mockRestore: () => void } | null = null

const sampleRunLink = {
  access_type: 'public',
  access_type_display: 'Public',
  checklist_template_name: 'Safety checks',
  created_at: '2026-06-01T00:00:00Z',
  created_by: 1,
  created_by_email: 'owner@example.com',
  expires_at: null,
  id: 7,
  is_expired: false,
  is_max_uses_reached: false,
  is_valid: true,
  max_uses: null,
  name: 'Factory floor run',
  template_id: 42,
  unique_id: 'public-link-1',
  updated_at: '2026-06-01T00:00:00Z',
  usage_count: 3,
} as const

function renderWithShell(ui: ReactElement, initialEntries = ['/']) {
  return render(
    <ConfigProvider>
      <I18nProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </I18nProvider>
    </ConfigProvider>
  )
}

describe('RunLinksPage', () => {
  beforeEach(() => {
    getComputedStyleSpy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation((element: Element) => getComputedStyle(element))
    runLinkApi.useRunLinks.mockReturnValue({ data: { items: [sampleRunLink] }, isLoading: false })
    runLinkApi.useCreateRunLink.mockReturnValue({ isPending: false, mutate: vi.fn() })
    runLinkApi.useDeleteRunLink.mockReturnValue({ isPending: false, mutate: vi.fn() })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    getComputedStyleSpy?.mockRestore()
    getComputedStyleSpy = null
  })

  it('renders run links and copies the public URL', async () => {
    renderWithShell(<RunLinksPage />)

    expect(screen.getByRole('heading', { name: 'Run Links' })).toBeInTheDocument()
    expect(screen.getByText('Factory floor run')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Copy Link/i }))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:3000/run/public-link-1')
  })

  it('submits new run link values through the create mutation', async () => {
    const mutate = vi.fn()
    runLinkApi.useCreateRunLink.mockReturnValue({ isPending: false, mutate })
    renderWithShell(<RunLinksPage />)

    await userEvent.click(screen.getByRole('button', { name: /New Run Link/i }))
    await userEvent.type(screen.getByLabelText('Name'), ' Daily inspections ')
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Checklist Template ID' }), '42')
    await userEvent.click(screen.getByRole('button', { name: 'Create Link' }))

    await waitFor(() => expect(mutate).toHaveBeenCalled())
    expect(mutate).toHaveBeenCalledWith(
      { access_type: 'public', name: 'Daily inspections', template_id: 42 },
      expect.objectContaining({ onError: expect.any(Function), onSuccess: expect.any(Function) })
    )
  })
})

describe('RunLinkExecutePage', () => {
  beforeEach(() => {
    runLinkApi.useExecuteRunLink.mockReturnValue({ error: null, isPending: false, mutate: vi.fn() })
  })

  it('executes a public run link and shows backend confirmation', async () => {
    const mutate = vi.fn((_id: string, options: { onSuccess: (result: { message: string }) => void }) => {
      options.onSuccess({ message: 'Run link executed successfully' })
    })
    runLinkApi.useExecuteRunLink.mockReturnValue({ error: null, isPending: false, mutate })

    renderWithShell(
      <Routes><Route path="/run/:uniqueId" element={<RunLinkExecutePage />} /></Routes>,
      ['/run/public-link-1']
    )

    await userEvent.click(screen.getByRole('button', { name: /Start Checklist/i }))

    expect(mutate).toHaveBeenCalledWith('public-link-1', expect.objectContaining({ onSuccess: expect.any(Function) }))
    expect(await screen.findByRole('heading', { name: 'Checklist Started!' })).toBeInTheDocument()
    expect(screen.getByText('Run link executed successfully')).toBeInTheDocument()
  })
})
