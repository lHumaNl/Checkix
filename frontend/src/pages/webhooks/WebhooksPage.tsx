import { useState, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Plus,
  Trash2,
  Pencil,
  Power,
  PowerOff,
  Search,
  Webhook,
  ChevronDown,
  ChevronUp,
  Activity,
  X,
} from 'lucide-react'
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useToggleWebhook,
  type Webhook as WebhookType,
  type WebhookEvent,
} from '@/api/useWebhooks'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/hooks/useToast'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

// ---------------------------------------------------------------------------
// Helpers / sub-components
// ---------------------------------------------------------------------------

type EventType = 'instance_started' | 'instance_completed' | 'item_completed'
type EventStatus = 'pending' | 'sent' | 'failed'

const EVENT_TYPE_OPTIONS: { value: EventType; labelKey: MessageKey }[] = [
  { value: 'instance_started', labelKey: 'webhooks.eventInstanceStarted' },
  { value: 'instance_completed', labelKey: 'webhooks.eventInstanceCompleted' },
  { value: 'item_completed', labelKey: 'webhooks.eventItemCompleted' },
]

const EVENT_TYPE_LABEL_KEYS = EVENT_TYPE_OPTIONS.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.labelKey }),
  {} as Record<EventType, MessageKey>
)

const STATUS_LABEL_KEYS: Record<EventStatus, MessageKey> = {
  pending: 'status.pending',
  sent: 'status.sent',
  failed: 'status.failed',
}

function eventTypeBadge(type: string) {
  const map: Record<string, string> = {
    instance_started: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    instance_completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    item_completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  }
  return map[type] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

function statusBadge(status: EventStatus | string | null) {
  const map: Record<string, string> = {
    sent: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  }
  return status ? (map[status] ?? 'bg-gray-100 text-gray-600') : ''
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function WebhookSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="flex gap-2">
        <div className="h-7 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-7 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent events collapsible
// ---------------------------------------------------------------------------

function RecentEvents({ events }: { events: WebhookEvent[] }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  if (events.length === 0) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t('webhooks.noEvents')}</p>
    )
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <Activity size={13} />
        {t('webhooks.recentEvents', { count: events.length })}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(ev.status)}`}
                >
                  {ev.status && STATUS_LABEL_KEYS[ev.status as EventStatus] ? t(STATUS_LABEL_KEYS[ev.status as EventStatus]) : (ev.status_display ?? ev.status)}
                </span>
                {ev.checklist_instance_name && (
                  <span className="truncate text-gray-600 dark:text-gray-400">
                    {ev.checklist_instance_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2 text-gray-400 dark:text-gray-500">
                {ev.response_code !== null && (
                  <span className="font-mono">{ev.response_code}</span>
                )}
                <span>{formatDate(ev.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Webhook form (create + edit)
// ---------------------------------------------------------------------------

interface WebhookFormValues {
  name: string
  event_type: EventType
  endpoint_url: string
  secret: string
  is_active: boolean
}

const EMPTY_FORM: WebhookFormValues = {
  name: '',
  event_type: 'instance_started',
  endpoint_url: '',
  secret: '',
  is_active: true,
}

function webhookToForm(wh: WebhookType): WebhookFormValues {
  return {
    name: wh.name,
    event_type: wh.event_type,
    endpoint_url: wh.endpoint_url,
    secret: '',
    is_active: wh.is_active,
  }
}

interface WebhookFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: WebhookType | null
}

function WebhookFormModal({ open, onOpenChange, editing }: WebhookFormModalProps) {
  const { t } = useI18n()
  const createMutation = useCreateWebhook()
  const updateMutation = useUpdateWebhook()

  const [form, setForm] = useState<WebhookFormValues>(
    editing ? webhookToForm(editing) : EMPTY_FORM
  )
  const [errors, setErrors] = useState<Partial<Record<keyof WebhookFormValues, string>>>({})

  // Re-sync form when the dialog opens or editing target changes
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setForm(editing ? webhookToForm(editing) : EMPTY_FORM)
        setErrors({})
      }
      onOpenChange(next)
    },
    [editing, onOpenChange]
  )

  function validate(): boolean {
    const errs: Partial<Record<keyof WebhookFormValues, string>> = {}
    if (!form.name.trim()) errs.name = t('webhooks.validationNameRequired')
    if (!form.endpoint_url.trim()) {
      errs.endpoint_url = t('webhooks.validationEndpointRequired')
    } else if (!/^https?:\/\//.test(form.endpoint_url)) {
      errs.endpoint_url = t('webhooks.validationEndpointProtocol')
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      name: form.name.trim(),
      events: [form.event_type],
      url: form.endpoint_url.trim(),
      is_active: form.is_active,
      ...(form.secret ? { secret: form.secret } : {}),
    }

    if (editing) {
      updateMutation.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: t('webhooks.updated'), variant: 'default' })
            onOpenChange(false)
          },
          onError: () => {
            toast({ title: t('webhooks.updateFailed'), variant: 'destructive' })
          },
        }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: t('webhooks.created'), variant: 'default' })
          onOpenChange(false)
        },
        onError: () => {
          toast({ title: t('webhooks.createFailed'), variant: 'destructive' })
        },
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const title = editing ? t('webhooks.edit') : t('webhooks.new')

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm'
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
  const errorCls = 'mt-1 text-xs text-red-500'

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className={labelCls}>{t('common.name')} *</label>
              <input
                type="text"
                className={inputCls}
                placeholder={t('webhooks.namePlaceholder')}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {errors.name && <p className={errorCls}>{errors.name}</p>}
            </div>

            {/* Event type */}
            <div>
              <label className={labelCls}>{t('notifications.eventType')} *</label>
              <select
                className={inputCls}
                value={form.event_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, event_type: e.target.value as EventType }))
                }
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Endpoint URL */}
            <div>
              <label className={labelCls}>{t('webhooks.endpointUrl')} *</label>
              <input
                type="text"
                className={inputCls}
                placeholder="https://example.com/hook"
                value={form.endpoint_url}
                onChange={(e) => setForm((f) => ({ ...f, endpoint_url: e.target.value }))}
              />
              {errors.endpoint_url && <p className={errorCls}>{errors.endpoint_url}</p>}
            </div>

            {/* Secret */}
            <div>
              <label className={labelCls}>
                {t('webhooks.secret')}{' '}
                <span className="text-gray-400 dark:text-gray-500 font-normal">({t('common.optional')})</span>
              </label>
              <input
                type="password"
                className={inputCls}
                placeholder={editing ? t('webhooks.secretKeepPlaceholder') : t('webhooks.secretPlaceholder')}
                value={form.secret}
                onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                autoComplete="new-password"
              />
            </div>

            {/* Is active */}
            <div className="flex items-center gap-3">
              <input
                id="wh-is-active"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <label
                htmlFor="wh-is-active"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {t('common.active')}
              </label>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? (editing ? t('common.saving') : t('common.creating')) : editing ? t('common.saveChanges') : t('webhooks.new')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ---------------------------------------------------------------------------
// Webhook card
// ---------------------------------------------------------------------------

interface WebhookCardProps {
  webhook: WebhookType
  onEdit: (wh: WebhookType) => void
  onDelete: (wh: WebhookType) => void
}

function WebhookCard({ webhook, onEdit, onDelete }: WebhookCardProps) {
  const { t } = useI18n()
  const toggleMutation = useToggleWebhook()

  function handleToggle() {
    toggleMutation.mutate(webhook.id, {
      onSuccess: (updated) => {
        toast({
          title: updated.is_active ? t('webhooks.activated') : t('webhooks.deactivated'),
          variant: 'default',
        })
      },
      onError: () => {
        toast({ title: t('webhooks.toggleFailed'), variant: 'destructive' })
      },
    })
  }

  const truncateUrl = (url: string, max = 50) =>
    url.length > max ? `${url.slice(0, max)}…` : url

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col gap-3 transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {webhook.name}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${eventTypeBadge(webhook.event_type)}`}
            >
              {EVENT_TYPE_LABEL_KEYS[webhook.event_type] ? t(EVENT_TYPE_LABEL_KEYS[webhook.event_type]) : webhook.event_type_display}
            </span>
            {webhook.last_event_status && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(webhook.last_event_status)}`}
              >
                {STATUS_LABEL_KEYS[webhook.last_event_status as EventStatus] ? t(STATUS_LABEL_KEYS[webhook.last_event_status as EventStatus]) : webhook.last_event_status}
              </span>
            )}
          </div>
          <p
            className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-mono truncate"
            title={webhook.endpoint_url}
          >
            {truncateUrl(webhook.endpoint_url)}
          </p>
        </div>

        {/* Active indicator */}
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            webhook.is_active
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {webhook.is_active ? t('common.active') : t('common.inactive')}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <Activity size={12} />
          {t('webhooks.eventCount', { count: webhook.events_count, plural: webhook.events_count === 1 ? '' : 's' })}
        </span>
        <span>{t('common.created')} {formatDate(webhook.created_at)}</span>
      </div>

      {/* Recent events */}
      <RecentEvents events={webhook.recent_events ?? []} />

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800 mt-1">
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggleMutation.isPending}
          title={webhook.is_active ? t('common.deactivate') : t('common.activate')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            webhook.is_active
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60'
          }`}
        >
          {webhook.is_active ? (
            <>
              <PowerOff size={13} /> {t('common.deactivate')}
            </>
          ) : (
            <>
              <Power size={13} /> {t('common.activate')}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onEdit(webhook)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          <Pencil size={13} /> {t('common.edit')}
        </button>

        <button
          type="button"
          onClick={() => onDelete(webhook)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors ml-auto"
        >
          <Trash2 size={13} /> {t('common.delete')}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <Webhook className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        {hasFilters ? t('webhooks.noMatch') : t('webhooks.noWebhooks')}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {hasFilters
          ? t('webhooks.adjustFilters')
          : t('webhooks.createFirst')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function WebhooksPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WebhookType | null>(null)

  const deleteMutation = useDeleteWebhook()

  const { data, isLoading } = useWebhooks({ search: search || undefined })
  const webhooks = Array.isArray(data) ? data : (data?.items ?? [])

  const filtered =
    eventTypeFilter === 'all'
      ? webhooks
      : webhooks.filter((wh) => wh.event_type === eventTypeFilter)

  function openCreate() {
    setEditingWebhook(null)
    setFormOpen(true)
  }

  function openEdit(wh: WebhookType) {
    setEditingWebhook(wh)
    setFormOpen(true)
  }

  function openDelete(wh: WebhookType) {
    setDeleteTarget(wh)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: t('webhooks.deleted'), variant: 'default' })
        setDeleteTarget(null)
      },
      onError: () => {
        toast({ title: t('webhooks.deleteFailed'), variant: 'destructive' })
      },
    })
  }

  const hasFilters = !!search || eventTypeFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('webhooks.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('webhooks.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          {t('webhooks.new')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('webhooks.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Event type filter */}
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value as EventType | 'all')}
        >
          <option value="all">{t('webhooks.allEventTypes')}</option>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <WebhookSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((wh) => (
            <WebhookCard
              key={wh.id}
              webhook={wh}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))}
        </div>
      )}

      {/* Create / Edit form modal */}
      <WebhookFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingWebhook}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={t('webhooks.deleteTitle')}
        description={t('webhooks.deleteConfirm', { name: deleteTarget?.name ?? '—' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}

export default WebhooksPage
