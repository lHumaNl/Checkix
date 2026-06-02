import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { I18nProvider } from '@/i18n'
import { ChecklistFormModal } from './ChecklistFormModal'

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
}))

vi.mock('@/api/useChecklists', () => ({
  useCreateChecklist: () => ({ mutate: mocks.createMutate, isPending: false }),
  useUpdateChecklist: () => ({ mutate: mocks.updateMutate, isPending: false }),
}))

vi.mock('@/api/useFolders', () => ({
  useFolders: () => ({ data: [{ id: 12, name: 'Operations' }] }),
}))

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }))

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DndContext: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
  }),
  verticalListSortingStrategy: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}))

interface MutationOptions {
  onSuccess: () => void
  onError: (error: unknown) => void
}

function renderModal(onClose = vi.fn()) {
  render(
    <I18nProvider>
      <ChecklistFormModal onClose={onClose} />
    </I18nProvider>
  )

  return { onClose }
}

describe('ChecklistFormModal', () => {
  const originalGetComputedStyle = window.getComputedStyle
  let restoreGetComputedStyle = () => {}

  beforeEach(() => {
    const spy = vi.spyOn(window, 'getComputedStyle')
    spy.mockImplementation(element => originalGetComputedStyle(element))
    restoreGetComputedStyle = () => spy.mockRestore()
    mocks.createMutate.mockReset()
    mocks.updateMutate.mockReset()
  })

  afterEach(() => {
    restoreGetComputedStyle()
  })

  it('keeps zod title validation before creating a checklist', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'Create Checklist' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(mocks.createMutate).not.toHaveBeenCalled()
  })

  it('creates a checklist with tags and items from Ant Design controls', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.type(screen.getByPlaceholderText('Checklist title'), 'Launch checklist')
    await user.type(screen.getByPlaceholderText('Item content'), 'Confirm fuel level')
    await user.click(screen.getByRole('checkbox', { name: 'Required' }))
    await user.type(screen.getByPlaceholderText('Add tag'), 'ops')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: 'Create Checklist' }))

    await waitFor(() => expect(mocks.createMutate).toHaveBeenCalledTimes(1))
    expect(mocks.createMutate.mock.calls[0]?.[0]).toMatchObject({
      name: 'Launch checklist',
      description: '',
      category: '',
      folder_id: null,
      execution_mode: 'free_order',
      status: 'draft',
      tags: ['ops'],
      items: [
        {
          content: 'Confirm fuel level',
          description: null,
          is_required: true,
          order: 0,
        },
      ],
    })

    const options = mocks.createMutate.mock.calls[0]?.[1] as MutationOptions
    options.onSuccess()

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
