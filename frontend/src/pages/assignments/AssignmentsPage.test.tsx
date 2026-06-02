import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { useAssignments } from '@/api/useAssignments'
import { I18nProvider } from '@/i18n'
import { AssignmentsPage } from './AssignmentsPage'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/api/useAssignments', () => ({
  useAssignments: vi.fn(() => ({
    data: {
      total: 1,
      items: [
        {
          id: 1,
          assignment_type: 'template',
          checklist_template: 42,
          checklist_template_name: 'Safety audit',
          checklist_item: null,
          checklist_item_title: null,
          checklist_instance: null,
          checklist_instance_name: null,
          assignee_type: 'user',
          assignee_user: 3,
          assignee_user_name: 'Alex Carter',
          assignee_group: null,
          assignee_group_name: null,
          assignee_parameter: '',
          assignee_display: 'Alex Carter',
          target_display: 'Safety audit',
          is_exclusive: true,
          auto_notify: true,
          created_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-01T00:00:00Z',
        },
      ],
    },
    isError: false,
    isLoading: false,
  })),
  useCreateAssignment: () => ({ isPending: false, mutate: mocks.create }),
  useDeleteAssignment: () => ({ isPending: false, mutate: mocks.delete }),
}))

vi.mock('@/hooks/useToast', () => ({
  toast: vi.fn(),
}))

beforeAll(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({
    getPropertyValue: () => '',
  }) as unknown as CSSStyleDeclaration)
})

afterAll(() => {
  vi.restoreAllMocks()
})

function renderAssignmentsPage() {
  return render(
    <I18nProvider>
      <AssignmentsPage />
    </I18nProvider>
  )
}

describe('AssignmentsPage', () => {
  it('renders assignment data with Ant Design table labels', () => {
    renderAssignmentsPage()

    expect(screen.getByRole('heading', { name: 'Assignments' })).toBeInTheDocument()
    expect(screen.getByText('Safety audit')).toBeInTheDocument()
    expect(screen.getByText('Alex Carter')).toBeInTheDocument()
    expect(screen.getByText('Template')).toBeInTheDocument()
    expect(screen.getByText('1 assignment found')).toBeInTheDocument()
  })

  it('keeps search wired to the assignments query', async () => {
    const user = userEvent.setup()
    renderAssignmentsPage()

    await user.type(screen.getByLabelText('Search assignments...'), 'audit')

    expect(useAssignments).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'audit' }))
  })

  it('submits target and assignee modes in the create payload', async () => {
    const user = userEvent.setup()
    renderAssignmentsPage()

    await user.click(screen.getByRole('button', { name: /new assignment/i }))
    await user.type(screen.getByRole('spinbutton', { name: /checklist template id/i }), '42')
    await user.type(screen.getByRole('spinbutton', { name: /user id/i }), '3')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /new assignment/i }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalled())
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      assignment_type: 'template',
      checklist_template: 42,
      assignee_type: 'user',
      assignee_user: 3,
      auto_notify: true,
      is_exclusive: false,
    })
  })
})
