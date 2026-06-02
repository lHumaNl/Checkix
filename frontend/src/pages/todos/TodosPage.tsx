import { useState, useRef } from 'react'
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp, CheckSquare, Square, Search } from 'lucide-react'
import {
  useTodoLists,
  useCreateTodoList,
  useUpdateTodoList,
  useDeleteTodoList,
  useCreateTodoItem,
  useUpdateTodoItem,
  useDeleteTodoItem,
} from '@/api/useTodos'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/hooks/useToast'
import type { TodoList, TodoItem } from '@/api/useTodos'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

// ─── Priority helpers ───────────────────────────────────────────────────────

const PRIORITY_LABEL_KEYS: Record<TodoList['priority'], MessageKey> = {
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
}

const PRIORITY_CLASSES: Record<TodoList['priority'], string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABEL_KEYS: Record<TodoList['status'], MessageKey> = {
  active: 'status.active',
  paused: 'status.paused',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
}

const STATUS_CLASSES: Record<TodoList['status'], string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paused: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function TodoListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex gap-2 ml-4">
              <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CheckSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {hasSearch ? t('todos.noSearchMatch') : t('todos.noLists')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {hasSearch
          ? t('todos.adjustSearch')
          : t('todos.createFirst')}
      </p>
    </div>
  )
}

// ─── New List Form ────────────────────────────────────────────────────────────

interface NewListFormProps {
  onCancel: () => void
  onSubmit: (name: string, description: string, priority: TodoList['priority']) => void
  isLoading: boolean
}

function NewListForm({ onCancel, onSubmit, isLoading }: NewListFormProps) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TodoList['priority']>('medium')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), description.trim(), priority)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-5 space-y-3"
    >
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('todos.newTodoList')}</h3>
      <input
        autoFocus
        type="text"
        placeholder={t('todos.listName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        placeholder={t('todos.descriptionOptional')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-400">{t('todos.priority')}</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoList['priority'])}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">{t('priority.low')}</option>
          <option value="medium">{t('priority.medium')}</option>
          <option value="high">{t('priority.high')}</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {isLoading ? t('common.creating') : t('common.create')}
        </button>
      </div>
    </form>
  )
}

// ─── Edit List Form ────────────────────────────────────────────────────────────

interface EditListFormProps {
  list: TodoList
  onCancel: () => void
  onSubmit: (name: string, description: string, priority: TodoList['priority']) => void
  isLoading: boolean
}

function EditListForm({ list, onCancel, onSubmit, isLoading }: EditListFormProps) {
  const { t } = useI18n()
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description ?? '')
  const [priority, setPriority] = useState<TodoList['priority']>(list.priority)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit(name.trim(), description.trim(), priority)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-3"
    >
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        placeholder={t('todos.descriptionOptional')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-400">{t('todos.priority')}</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TodoList['priority'])}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">{t('priority.low')}</option>
          <option value="medium">{t('priority.medium')}</option>
          <option value="high">{t('priority.high')}</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 text-sm font-medium text-white transition-colors"
        >
          {isLoading ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}

// ─── Todo Item Row ─────────────────────────────────────────────────────────────

interface TodoItemRowProps {
  item: TodoItem
  listId: number
}

function TodoItemRow({ item, listId }: TodoItemRowProps) {
  const { t } = useI18n()
  const updateItem = useUpdateTodoItem()
  const deleteItem = useDeleteTodoItem()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleToggle = () => {
    const newStatus: TodoItem['status'] = item.status === 'completed' ? 'pending' : 'completed'
    updateItem.mutate(
      { listId, itemId: item.id, data: { status: newStatus } },
      {
        onError: () => {
          toast({ title: t('todos.itemUpdatedFailed'), variant: 'destructive' })
        },
      }
    )
  }

  const handleDelete = () => {
    deleteItem.mutate(
      { listId, itemId: item.id },
      {
        onSuccess: () => {
          toast({ title: t('todos.itemDeleted'), variant: 'default' })
        },
        onError: () => {
          toast({ title: t('todos.itemDeleteFailed'), variant: 'destructive' })
        },
      }
    )
  }

  const isDone = item.status === 'completed' || item.is_completed

  return (
    <>
      <div className="flex items-center gap-3 py-2 group">
        <button
          onClick={handleToggle}
          disabled={updateItem.isPending}
          className="shrink-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
          aria-label={isDone ? t('todos.markTodo') : t('todos.markDone')}
        >
          {isDone ? (
            <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>

        <span
          className={`flex-1 text-sm ${
            isDone
              ? 'line-through text-gray-400 dark:text-gray-500'
              : 'text-gray-800 dark:text-gray-200'
          }`}
        >
          {item.title}
        </span>

        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASSES[item.priority]}`}
        >
          {t(PRIORITY_LABEL_KEYS[item.priority])}
        </span>

        <button
          onClick={() => setConfirmOpen(true)}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
          aria-label={t('todos.deleteItem')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('todos.deleteItemTitle')}
        description={t('todos.deleteItemConfirm', { title: item.title })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}

// ─── Add Item Input ────────────────────────────────────────────────────────────

interface AddItemInputProps {
  listId: number
}

function AddItemInput({ listId }: AddItemInputProps) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const createItem = useCreateTodoItem()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    createItem.mutate(
      { listId, payload: { title: value.trim() } },
      {
        onSuccess: () => {
          setValue('')
          inputRef.current?.focus()
          toast({ title: t('todos.itemAdded'), variant: 'default' })
        },
        onError: () => {
          toast({ title: t('todos.itemAddFailed'), variant: 'destructive' })
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      <input
        ref={inputRef}
        type="text"
        placeholder={t('todos.addItem')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={!value.trim() || createItem.isPending}
        className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 text-sm font-medium text-white transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
    </form>
  )
}

// ─── Todo List Card ────────────────────────────────────────────────────────────

interface TodoListCardProps {
  list: TodoList
}

function TodoListCard({ list }: TodoListCardProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const updateList = useUpdateTodoList()
  const deleteList = useDeleteTodoList()

  const handleEdit = (name: string, description: string, priority: TodoList['priority']) => {
    updateList.mutate(
      { id: list.id, data: { name, description: description || null, priority } },
      {
        onSuccess: () => {
          setEditing(false)
          toast({ title: t('todos.listUpdated'), variant: 'default' })
        },
        onError: () => {
          toast({ title: t('todos.listUpdateFailed'), variant: 'destructive' })
        },
      }
    )
  }

  const handleDelete = () => {
    deleteList.mutate(list.id, {
      onSuccess: () => {
        toast({ title: t('todos.listDeleted'), variant: 'default' })
      },
      onError: () => {
        toast({ title: t('todos.listDeleteFailed'), variant: 'destructive' })
      },
    })
  }

  const items = Array.isArray(list.items) ? list.items : []
  const progress = list.progress_percentage ?? 0
  const itemsCount = list.items_count ?? items.length
  const completedCount = list.completed_items_count ?? items.filter((i) => i.is_completed || i.status === 'completed').length

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 transition-shadow hover:shadow-md">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-0.5 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={expanded ? t('todos.collapseList') : t('todos.expandList')}
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {list.icon && <span className="mr-1">{list.icon}</span>}
                {list.name}
              </h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASSES[list.priority]}`}>
                {t(PRIORITY_LABEL_KEYS[list.priority])}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[list.status]}`}>
                {t(STATUS_LABEL_KEYS[list.status])}
              </span>
            </div>

            {list.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">{list.description}</p>
            )}

            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {completedCount}/{itemsCount}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setEditing((prev) => !prev); setExpanded(false) }}
              className="rounded-lg p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              aria-label={t('todos.editList')}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label={t('todos.deleteList')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <EditListForm
            list={list}
            onCancel={() => setEditing(false)}
            onSubmit={handleEdit}
            isLoading={updateList.isPending}
          />
        )}

        {/* Expanded items */}
        {expanded && !editing && (
          <div className="mt-4 pl-8">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{t('todos.noItems')}</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {items.map((item) => (
                  <TodoItemRow key={item.id} item={item} listId={list.id} />
                ))}
              </div>
            )}
            <AddItemInput listId={list.id} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('todos.deleteListTitle')}
        description={t('todos.deleteListConfirm', { title: list.name })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TodosPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)

  const { data, isLoading } = useTodoLists({ search, status: statusFilter })
  const createList = useCreateTodoList()

  const lists = Array.isArray(data) ? data : (data?.items ?? [])

  const handleCreate = (name: string, description: string, priority: TodoList['priority']) => {
    createList.mutate(
      { name, description: description || undefined, priority },
      {
        onSuccess: () => {
          setShowNewForm(false)
          toast({ title: t('todos.listCreated'), variant: 'default' })
        },
        onError: () => {
          toast({ title: t('todos.listCreateFailed'), variant: 'destructive' })
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('todos.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('todos.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowNewForm((prev) => !prev)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('todos.newList')}
        </button>
      </div>

      {/* New list form */}
      {showNewForm && (
        <NewListForm
          onCancel={() => setShowNewForm(false)}
          onSubmit={handleCreate}
          isLoading={createList.isPending}
        />
      )}

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('todos.searchLists')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="paused">{t('status.paused')}</option>
          <option value="completed">{t('status.completed')}</option>
          <option value="cancelled">{t('status.cancelled')}</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <TodoListSkeleton />
      ) : lists.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <TodoListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  )
}

export default TodosPage
