import { useState } from 'react'
import { Plus, Trash2, Copy, Search, Link2, Clock, Users } from 'lucide-react'
import { useRunLinks, useCreateRunLink, useDeleteRunLink } from '@/api/useRunLinks'
import type { RunLink } from '@/api/useRunLinks'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/hooks/useToast'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AccessTypeBadge({ type }: { type: RunLink['access_type'] }) {
  if (type === 'public') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
        Public
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-300">
      Restricted
    </span>
  )
}

function ValidityBadge({ link }: { link: RunLink }) {
  if (link.is_expired) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
        Expired
      </span>
    )
  }
  if (link.is_max_uses_reached) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-300">
        Limit reached
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
      Valid
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
      <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-600" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-600" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create form modal
// ---------------------------------------------------------------------------

interface CreateFormState {
  name: string
  checklist_template: string
  access_type: 'public' | 'restricted'
  expires_at: string
  max_uses: string
}

const INITIAL_FORM: CreateFormState = {
  name: '',
  checklist_template: '',
  access_type: 'public',
  expires_at: '',
  max_uses: '',
}

interface CreateRunLinkModalProps {
  onClose: () => void
}

function CreateRunLinkModal({ onClose }: CreateRunLinkModalProps) {
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM)
  const createMutation = useCreateRunLink()

  function handleChange(field: keyof CreateFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const templateId = parseInt(form.checklist_template, 10)
    if (isNaN(templateId) || templateId <= 0) {
      toast({ title: 'Please enter a valid checklist template ID', variant: 'destructive' })
      return
    }

    const payload: Parameters<typeof createMutation.mutate>[0] = {
      name: form.name.trim(),
      template_id: templateId,
      access_type: form.access_type,
    }
    if (form.expires_at) payload.expires_at = form.expires_at
    if (form.max_uses) payload.max_uses = parseInt(form.max_uses, 10)

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: 'Run link created', variant: 'default' })
        onClose()
      },
      onError: () => {
        toast({ title: 'Failed to create run link', variant: 'destructive' })
      },
    })
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Run Link</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Onboarding checklist link"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Checklist Template ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Checklist Template ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              value={form.checklist_template}
              onChange={(e) => handleChange('checklist_template', e.target.value)}
              placeholder="Enter template ID"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Access Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Access Type
            </label>
            <select
              value={form.access_type}
              onChange={(e) => handleChange('access_type', e.target.value as 'public' | 'restricted')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="public">Public</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>

          {/* Expires At */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expires At <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) => handleChange('expires_at', e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Max Uses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Uses <span className="text-gray-400 font-normal">(optional, leave blank for unlimited)</span>
            </label>
            <input
              type="number"
              min={1}
              value={form.max_uses}
              onChange={(e) => handleChange('max_uses', e.target.value)}
              placeholder="Unlimited"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Run Link Card
// ---------------------------------------------------------------------------

interface RunLinkCardProps {
  link: RunLink
  onDeleteRequest: (link: RunLink) => void
}

function RunLinkCard({ link, onDeleteRequest }: RunLinkCardProps) {
  function handleCopy() {
    const url = `${window.location.origin}/run/${link.unique_id}`
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'Link copied!', variant: 'default' })
    }).catch(() => {
      toast({ title: 'Failed to copy link', variant: 'destructive' })
    })
  }

  const usageLabel =
    link.max_uses != null
      ? `${link.usage_count} / ${link.max_uses}`
      : `${link.usage_count} / unlimited`

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Top row: name + badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{link.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            Template ID: {link.checklist_template}
            {link.checklist_template_name ? ` — ${link.checklist_template_name}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <AccessTypeBadge type={link.access_type} />
          <ValidityBadge link={link} />
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {usageLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Expires: {formatDate(link.expires_at)}
        </span>
      </div>

      {/* Unique ID / URL preview */}
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-3 py-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="truncate text-xs font-mono text-gray-500 dark:text-gray-400">
          {window.location.origin}/run/{link.unique_id}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Created {formatDate(link.created_at)}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Link
          </button>
          <button
            onClick={() => onDeleteRequest(link)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-16 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
        <Link2 className="h-7 w-7 text-blue-500 dark:text-blue-400" />
      </div>
      {hasFilters ? (
        <>
          <p className="text-base font-medium text-gray-900 dark:text-white">No run links match your filters</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your search or access type filter.
          </p>
        </>
      ) : (
        <>
          <p className="text-base font-medium text-gray-900 dark:text-white">No run links yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create a shareable link to let others run a checklist template.
          </p>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function RunLinksPage() {
  const [search, setSearch] = useState('')
  const [accessTypeFilter, setAccessTypeFilter] = useState<'all' | 'public' | 'restricted'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RunLink | null>(null)

  const queryParams = {
    search: search || undefined,
    access_type: accessTypeFilter !== 'all' ? accessTypeFilter : undefined,
  }

  const { data, isLoading } = useRunLinks(queryParams)
  const deleteMutation = useDeleteRunLink()

  const runLinks: RunLink[] = Array.isArray(data) ? data : (data?.items ?? [])

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: 'Run link deleted', variant: 'default' })
        setDeleteTarget(null)
      },
      onError: () => {
        toast({ title: 'Failed to delete run link', variant: 'destructive' })
        setDeleteTarget(null)
      },
    })
  }

  const hasFilters = !!search || accessTypeFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Run Links</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-0.5">
            Shareable links that allow others to run your checklist templates.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Run Link
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search run links..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>

        {/* Access Type Filter */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
          {(['all', 'public', 'restricted'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setAccessTypeFilter(type)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                accessTypeFilter === type
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : runLinks.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {runLinks.map((link) => (
            <RunLinkCard
              key={link.id}
              link={link}
              onDeleteRequest={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateRunLinkModal onClose={() => setIsCreateOpen(false)} />
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Run Link"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone and the link will stop working immediately.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export default RunLinksPage
