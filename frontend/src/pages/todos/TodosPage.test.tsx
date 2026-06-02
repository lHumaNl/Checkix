import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/i18n'
import { TodosPage } from './TodosPage'
import type { TodoList } from '@/api/useTodos'

const mocks = vi.hoisted(() => ({
  createItemMutate: vi.fn(),
  createListMutate: vi.fn(),
  deleteItemMutate: vi.fn(),
  deleteListMutate: vi.fn(),
  updateItemMutate: vi.fn(),
  updateListMutate: vi.fn(),
  useTodoLists: vi.fn(),
}))

vi.mock('@/hooks/useToast', () => ({ toast: vi.fn() }))

vi.mock('@/api/useTodos', () => ({
  useCreateTodoItem: () => ({ isPending: false, mutate: mocks.createItemMutate }),
  useCreateTodoList: () => ({ isPending: false, mutate: mocks.createListMutate }),
  useDeleteTodoItem: () => ({ isPending: false, mutate: mocks.deleteItemMutate }),
  useDeleteTodoList: () => ({ isPending: false, mutate: mocks.deleteListMutate }),
  useTodoLists: mocks.useTodoLists,
  useUpdateTodoItem: () => ({ isPending: false, mutate: mocks.updateItemMutate }),
  useUpdateTodoList: () => ({ isPending: false, mutate: mocks.updateListMutate }),
}))

const todoList: TodoList = {
  id: 1,
  name: 'Road trip',
  description: 'Prepare the car and documents',
  status: 'active',
  due_date: null,
  priority: 'high',
  icon: '🚗',
  is_favorite: false,
  items_count: 2,
  completed_items_count: 1,
  progress_percentage: 50,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  items: [
    {
      id: 10,
      todo_list_id: 1,
      title: 'Pack tickets',
      description: null,
      status: 'pending',
      order: 1,
      due_date: null,
      completed_at: null,
      priority: 'medium',
      parent_id: null,
      is_completed: false,
      children: [],
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    },
  ],
}

function renderTodos() {
  render(
    <I18nProvider>
      <TodosPage />
    </I18nProvider>
  )
}

describe('TodosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useTodoLists.mockReturnValue({ data: { items: [todoList] }, error: null, isLoading: false })
  })

  it('renders the Ant Design todo card and expands list items', () => {
    renderTodos()

    expect(screen.getByRole('heading', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByText('Road trip')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Expand list' }))

    expect(screen.getByText('Pack tickets')).toBeInTheDocument()
  })

  it('preserves search params for the todo list query', async () => {
    renderTodos()

    fireEvent.change(screen.getByPlaceholderText('Search lists...'), { target: { value: 'road' } })

    await waitFor(() => expect(mocks.useTodoLists).toHaveBeenLastCalledWith({ search: 'road', status: '' }))
  })

  it('trims and submits new list values', async () => {
    renderTodos()

    fireEvent.click(screen.getByRole('button', { name: 'New List' }))
    fireEvent.change(screen.getByPlaceholderText('List name'), { target: { value: ' Launch plan ' } })
    fireEvent.change(screen.getByPlaceholderText('Description (optional)'), {
      target: { value: ' Prepare release ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(mocks.createListMutate).toHaveBeenCalled())
    expect(mocks.createListMutate.mock.calls[0][0]).toEqual({
      name: 'Launch plan',
      description: 'Prepare release',
      priority: 'medium',
    })
  })

  it('preserves item completion toggle payloads', () => {
    renderTodos()

    fireEvent.click(screen.getByRole('button', { name: 'Expand list' }))
    fireEvent.click(screen.getByLabelText('Mark as done'))

    expect(mocks.updateItemMutate).toHaveBeenCalledWith(
      { listId: 1, itemId: 10, data: { status: 'completed' } },
      expect.objectContaining({ onError: expect.any(Function) })
    )
  })
})
