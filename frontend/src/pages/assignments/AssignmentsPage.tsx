import { useState } from 'react'
import { Plus, Trash2, Search, UserCheck, Filter } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import {
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  type Assignment,
} from '@/api/useAssignments'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/hooks/useToast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssignmentTypeFilter = '' | 'template' | 'item' | 'runtime'
type AssigneeTypeFilter = '' | 'user' | 'group' | 'parameter' | 'manager'

interface CreateFormState {
  assignment_type: 'template' | 'item' | 'runtime'
  assignee_type: 'user' | 'group' | 'parameter' | 'manager'
  checklist_template: string
  checklist_item: string
  checklist_instance: string
  assignee_user: string
  assignee_group: string
  assignee_parameter: string
  is_exclusive: boolean
  auto_notify: boolean
}

const defaultForm: CreateFormState = {
  assignment_type: 'template',
  assignee_type: 'user',
  checklist_template: '',
  checklist_item: '',
  checklist_instance: '',
  assignee_user: '',
  assignee_group: '',
  assignee_parameter: '',
  is_exclusive: false,
  auto_notify: true,
}

// ---------------------------------------------------------------------------
// Helpers / sub-components
// ---------------------------------------------------------------------------

const ASSIGNMENT_TYPE_LABELS: Record<Assignment['assignment_type'], string> = {
  template: 'Template',
  item: 'Item',
  runtime: 'Runtime',
}

const ASSIGNEE_TYPE_LABELS: Record<Assignment['assignee_type'], string> = {
  user: 'User',
  group: 'Group',
  parameter: 'Parameter',
  manager: 'Manager',
}

const ASSIGNMENT_TYPE_COLORS: Record<Assignment['assignment_type'], string> = {
  template: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  item: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  runtime: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

const ASSIGNEE_TYPE_COLORS: Record<Assignment['assignee_type'], string> = {
  user: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  group: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  parameter: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  manager: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 w-8"></th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Target</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Assignee</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Exclusive</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
              <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
              <td className="px-4 py-3 text-right"><div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <UserCheck size={32} className="text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-lg font-medium mb-1 text-gray-700 dark:text-gray-300">
        {hasFilters ? 'No assignments match your filters' : 'No assignments yet'}
      </p>
      <p className="text-sm">
        {hasFilters
          ? 'Try adjusting the search or filter criteria.'
          : 'Create your first assignment to get started.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create Assignment Modal
// ---------------------------------------------------------------------------

interface CreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateAssignmentModal({ open, onOpenChange }: CreateModalProps) {
  const [form, setForm] = useState<CreateFormState>(defaultForm)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateFormState, string>>>({})

  const createMutation = useCreateAssignment()

  const setField = <K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const validate = (): boolean => {
    const next: Partial<Record<keyof CreateFormState, string>> = {}

    if (form.assignment_type === 'template' && !form.checklist_template.trim()) {
      next.checklist_template = 'Template ID is required for template assignments.'
    }
    if (form.assignment_type === 'item' && !form.checklist_item.trim()) {
      next.checklist_item = 'Item ID is required for item assignments.'
    }
    if (form.assignment_type === 'runtime' && !form.checklist_instance.trim()) {
      next.checklist_instance = 'Instance ID is required for runtime assignments.'
    }
    if (form.assignee_type === 'user' && !form.assignee_user.trim()) {
      next.assignee_user = 'User ID is required.'
    }
    if (form.assignee_type === 'group' && !form.assignee_group.trim()) {
      next.assignee_group = 'Group ID is required.'
    }
    if (form.assignee_type === 'parameter' && !form.assignee_parameter.trim()) {
      next.assignee_parameter = 'Parameter name is required.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const payload: Parameters<typeof createMutation.mutate>[0] = {
      template_id: Number(form.checklist_template),
      assignee_type: form.assignee_type,
    }

    if (form.assignee_type === 'user') {
      payload.assignee_id = Number(form.assignee_user)
    }
    if (form.assignee_type === 'group') {
      payload.assignee_id = Number(form.assignee_group)
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: 'Assignment created successfully', variant: 'default' })
        setForm(defaultForm)
        setErrors({})
        onOpenChange(false)
      },
      onError: () => {
        toast({ title: 'Failed to create assignment', variant: 'destructive' })
      },
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForm(defaultForm)
      setErrors({})
    }
    onOpenChange(nextOpen)
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const errorClass = 'mt-1 text-xs text-red-500'

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              New Assignment
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <form
            id="create-assignment-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
          >
            {/* Assignment Type */}
            <div>
              <label className={labelClass}>Assignment Type *</label>
              <select
                value={form.assignment_type}
                onChange={e => setField('assignment_type', e.target.value as CreateFormState['assignment_type'])}
                className={inputClass}
              >
                <option value="template">Template</option>
                <option value="item">Item</option>
                <option value="runtime">Runtime</option>
              </select>
            </div>

            {/* Target field — changes based on assignment_type */}
            {form.assignment_type === 'template' && (
              <div>
                <label className={labelClass}>Checklist Template ID *</label>
                <input
                  type="number"
                  min={1}
                  value={form.checklist_template}
                  onChange={e => setField('checklist_template', e.target.value)}
                  placeholder="e.g. 42"
                  className={inputClass}
                />
                {errors.checklist_template && <p className={errorClass}>{errors.checklist_template}</p>}
              </div>
            )}

            {form.assignment_type === 'item' && (
              <div>
                <label className={labelClass}>Checklist Item ID *</label>
                <input
                  type="number"
                  min={1}
                  value={form.checklist_item}
                  onChange={e => setField('checklist_item', e.target.value)}
                  placeholder="e.g. 7"
                  className={inputClass}
                />
                {errors.checklist_item && <p className={errorClass}>{errors.checklist_item}</p>}
              </div>
            )}

            {form.assignment_type === 'runtime' && (
              <div>
                <label className={labelClass}>Checklist Instance ID *</label>
                <input
                  type="number"
                  min={1}
                  value={form.checklist_instance}
                  onChange={e => setField('checklist_instance', e.target.value)}
                  placeholder="e.g. 15"
                  className={inputClass}
                />
                {errors.checklist_instance && <p className={errorClass}>{errors.checklist_instance}</p>}
              </div>
            )}

            {/* Assignee Type */}
            <div>
              <label className={labelClass}>Assignee Type *</label>
              <select
                value={form.assignee_type}
                onChange={e => setField('assignee_type', e.target.value as CreateFormState['assignee_type'])}
                className={inputClass}
              >
                <option value="user">User</option>
                <option value="group">Group</option>
                <option value="parameter">Parameter</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            {/* Assignee field — changes based on assignee_type */}
            {form.assignee_type === 'user' && (
              <div>
                <label className={labelClass}>User ID *</label>
                <input
                  type="number"
                  min={1}
                  value={form.assignee_user}
                  onChange={e => setField('assignee_user', e.target.value)}
                  placeholder="e.g. 3"
                  className={inputClass}
                />
                {errors.assignee_user && <p className={errorClass}>{errors.assignee_user}</p>}
              </div>
            )}

            {form.assignee_type === 'group' && (
              <div>
                <label className={labelClass}>Group ID *</label>
                <input
                  type="number"
                  min={1}
                  value={form.assignee_group}
                  onChange={e => setField('assignee_group', e.target.value)}
                  placeholder="e.g. 2"
                  className={inputClass}
                />
                {errors.assignee_group && <p className={errorClass}>{errors.assignee_group}</p>}
              </div>
            )}

            {form.assignee_type === 'parameter' && (
              <div>
                <label className={labelClass}>Parameter Name *</label>
                <input
                  type="text"
                  value={form.assignee_parameter}
                  onChange={e => setField('assignee_parameter', e.target.value)}
                  placeholder="e.g. department_head"
                  className={inputClass}
                />
                {errors.assignee_parameter && <p className={errorClass}>{errors.assignee_parameter}</p>}
              </div>
            )}

            {form.assignee_type === 'manager' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                The assignment will be resolved to the assignee's manager at runtime.
              </p>
            )}

            {/* Flags */}
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.is_exclusive}
                  onChange={e => setField('is_exclusive', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Exclusive{' '}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    (only this assignee, no others)
                  </span>
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.auto_notify}
                  onChange={e => setField('auto_notify', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-notify{' '}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    (send notification when assigned)
                  </span>
                </span>
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="submit"
              form="create-assignment-form"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Assignment
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function AssignmentsPage() {
  const [search, setSearch] = useState('')
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState<AssignmentTypeFilter>('')
  const [assigneeTypeFilter, setAssigneeTypeFilter] = useState<AssigneeTypeFilter>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const { data, isLoading } = useAssignments({
    search: search || undefined,
    assignment_type: assignmentTypeFilter || undefined,
    assignee_type: assigneeTypeFilter || undefined,
  })

  const deleteMutation = useDeleteAssignment()

  const assignments: Assignment[] = Array.isArray(data) ? data : (data?.items ?? [])
  const hasFilters = Boolean(search || assignmentTypeFilter || assigneeTypeFilter)

  const handleDeleteClick = (assignment: Assignment) => {
    setConfirmState({
      open: true,
      title: 'Delete assignment',
      description: `Remove the assignment of "${assignment.target_display}" to "${assignment.assignee_display}"? This action cannot be undone.`,
      onConfirm: () => {
        deleteMutation.mutate(assignment.id, {
          onSuccess: () => {
            toast({ title: 'Assignment deleted', variant: 'default' })
          },
          onError: () => {
            toast({ title: 'Failed to delete assignment', variant: 'destructive' })
          },
        })
      },
    })
  }

  const selectClass =
    'pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer'

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assignments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage who is assigned to which checklists, items, or instances.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] self-start sm:self-auto"
        >
          <Plus size={18} />
          New Assignment
        </button>
      </div>

      {/* Filter / search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assignments..."
            className="pl-9 pr-4 py-2 text-sm w-full border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Assignment type filter */}
        <div className="relative flex items-center">
          <Filter
            size={14}
            className="absolute left-3 text-gray-400 pointer-events-none"
          />
          <select
            value={assignmentTypeFilter}
            onChange={e => setAssignmentTypeFilter(e.target.value as AssignmentTypeFilter)}
            className={`${selectClass} pl-8`}
          >
            <option value="">All types</option>
            <option value="template">Template</option>
            <option value="item">Item</option>
            <option value="runtime">Runtime</option>
          </select>
        </div>

        {/* Assignee type filter */}
        <div className="relative flex items-center">
          <UserCheck
            size={14}
            className="absolute left-3 text-gray-400 pointer-events-none"
          />
          <select
            value={assigneeTypeFilter}
            onChange={e => setAssigneeTypeFilter(e.target.value as AssigneeTypeFilter)}
            className={`${selectClass} pl-8`}
          >
            <option value="">All assignees</option>
            <option value="user">User</option>
            <option value="group">Group</option>
            <option value="parameter">Parameter</option>
            <option value="manager">Manager</option>
          </select>
        </div>
      </div>

      {/* Result count pill */}
      {!isLoading && data && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {data.count ?? assignments.length}{' '}
          {(data.count ?? assignments.length) === 1 ? 'assignment' : 'assignments'} found
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : assignments.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Target
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Assignee
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Assign. Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Assignee Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Exclusive
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Notify
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(assignment => (
                <tr
                  key={assignment.id}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  {/* Target */}
                  <td className="px-4 py-3">
                    <span
                      className="font-medium text-gray-900 dark:text-white truncate max-w-[200px] block"
                      title={assignment.target_display}
                    >
                      {assignment.target_display || '—'}
                    </span>
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-3">
                    <span
                      className="text-gray-700 dark:text-gray-300 truncate max-w-[180px] block"
                      title={assignment.assignee_display}
                    >
                      {assignment.assignee_display || '—'}
                    </span>
                  </td>

                  {/* Assignment type badge */}
                  <td className="px-4 py-3">
                    <Badge
                      label={ASSIGNMENT_TYPE_LABELS[assignment.assignment_type]}
                      colorClass={ASSIGNMENT_TYPE_COLORS[assignment.assignment_type]}
                    />
                  </td>

                  {/* Assignee type badge */}
                  <td className="px-4 py-3">
                    <Badge
                      label={ASSIGNEE_TYPE_LABELS[assignment.assignee_type]}
                      colorClass={ASSIGNEE_TYPE_COLORS[assignment.assignee_type]}
                    />
                  </td>

                  {/* Exclusive */}
                  <td className="px-4 py-3">
                    {assignment.is_exclusive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">No</span>
                    )}
                  </td>

                  {/* Auto-notify */}
                  <td className="px-4 py-3">
                    {assignment.auto_notify ? (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">On</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 text-xs">Off</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteClick(assignment)}
                      disabled={deleteMutation.isPending}
                      title="Delete assignment"
                      className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <CreateAssignmentModal open={showCreateModal} onOpenChange={setShowCreateModal} />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={open => setConfirmState(prev => ({ ...prev, open }))}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmState.onConfirm}
      />
    </div>
  )
}

export default AssignmentsPage
