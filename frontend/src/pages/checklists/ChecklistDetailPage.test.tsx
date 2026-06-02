import { ConfigProvider } from 'antd'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import type { ChecklistTemplate } from '@/types'
import { ChecklistDetailPage } from './ChecklistDetailPage'

interface StartInstanceOptions {
  onSuccess: (instance: { id: number }) => void
}

interface StartInstancePayload {
  name: string
  template: number
}

const checklistApi = vi.hoisted(() => ({
  useChecklist: vi.fn(),
  useDeleteChecklist: vi.fn(),
  useDuplicateChecklist: vi.fn(),
}))

const instanceApi = vi.hoisted(() => ({
  useCreateChecklistInstance: vi.fn(),
}))

vi.mock('@/api/useChecklists', () => checklistApi)
vi.mock('@/api/useChecklistInstances', () => instanceApi)
vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }))

const getComputedStyle = window.getComputedStyle
let getComputedStyleSpy: { mockRestore: () => void } | null = null

const checklist: ChecklistTemplate = {
  category: 'Workplace',
  created_at: '2026-06-01T00:00:00Z',
  current_version: {
    items: [
      {
        content: 'Review extinguisher',
        description: 'Confirm the gauge is green.',
        estimated_time_seconds: null,
        id: 11,
        is_required: true,
        order: 1,
        title: 'Review extinguisher',
      },
      {
        content: 'Check exits',
        description: null,
        estimated_time_seconds: null,
        id: 12,
        is_required: false,
        order: 2,
      },
    ],
  },
  description: 'Daily safety walk-through.',
  execution_mode: 'sequential',
  folder_id: null,
  id: 1,
  items_count: 2,
  name: 'Safety Audit',
  status: 'active',
  tags: ['safety', 'daily'],
  title: 'Safety Audit',
  updated_at: '2026-06-01T00:00:00Z',
  usage_count: 4,
}

function renderDetailPage() {
  return render(
    <ConfigProvider>
      <I18nProvider>
        <MemoryRouter initialEntries={['/checklists/1']}>
          <Routes>
            <Route path="/checklists/:id" element={<ChecklistDetailPage />} />
            <Route path="/instances/:id" element={<h1>Instance route</h1>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </ConfigProvider>
  )
}

describe('ChecklistDetailPage', () => {
  beforeEach(() => {
    getComputedStyleSpy = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation((element: Element) => getComputedStyle(element))
    checklistApi.useChecklist.mockReturnValue({ data: checklist, isLoading: false })
    checklistApi.useDeleteChecklist.mockReturnValue({ isPending: false, mutate: vi.fn() })
    checklistApi.useDuplicateChecklist.mockReturnValue({ isPending: false, mutate: vi.fn() })
    instanceApi.useCreateChecklistInstance.mockReturnValue({ isPending: false, mutate: vi.fn() })
  })

  afterEach(() => {
    getComputedStyleSpy?.mockRestore()
    getComputedStyleSpy = null
  })

  it('renders checklist detail content with Ant Design actions and sections', () => {
    renderDetailPage()

    expect(screen.getByRole('heading', { name: 'Safety Audit' })).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getAllByText('Sequential')).toHaveLength(2)
    expect(screen.getByText('Daily safety walk-through.')).toBeInTheDocument()
    expect(screen.getByText('Workplace')).toBeInTheDocument()
    expect(screen.getByText('safety')).toBeInTheDocument()
    expect(screen.getByText('Review extinguisher')).toBeInTheDocument()
    expect(screen.getByText('required')).toBeInTheDocument()
  })

  it('starts an active checklist through the existing create-instance mutation', async () => {
    const mutate = vi.fn((_payload: StartInstancePayload, options: StartInstanceOptions) => {
      options.onSuccess({ id: 99 })
    })
    instanceApi.useCreateChecklistInstance.mockReturnValue({ isPending: false, mutate })

    renderDetailPage()

    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(mutate).toHaveBeenCalledWith(
      { name: 'Safety Audit', template: 1 },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(await screen.findByRole('heading', { name: 'Instance route' })).toBeInTheDocument()
  })

  it('opens the Ant Design delete confirmation from the actions menu', async () => {
    renderDetailPage()

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }))
    await userEvent.click(await screen.findByText('Delete'))

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete this checklist? This action cannot be undone.')).toBeInTheDocument()
    })
  })
})
