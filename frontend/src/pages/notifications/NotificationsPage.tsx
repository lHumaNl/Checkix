import { useState } from 'react'
import {
  Plus,
  Trash2,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { toast } from '@/hooks/useToast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  useNotificationRules,
  useCreateNotificationRule,
  useDeleteNotificationRule,
  useToggleNotificationRule,
  useNotificationLogs,
} from '@/api/useNotifications'
import type { NotificationRule, NotificationSequence } from '@/api/useNotifications'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_TYPE_OPTIONS = [
  { value: 'task_due_in', labelKey: 'notifications.eventTaskDueIn' },
  { value: 'task_overdue_by', labelKey: 'notifications.eventTaskOverdue' },
  { value: 'task_completed', labelKey: 'notifications.eventTaskCompleted' },
  { value: 'task_status_changed', labelKey: 'notifications.eventStatusChanged' },
  { value: 'checklist_completed', labelKey: 'notifications.eventChecklistCompleted' },
  { value: 'task_assigned', labelKey: 'notifications.eventTaskAssigned' },
] as const

type NotificationEventType = (typeof EVENT_TYPE_OPTIONS)[number]['value']

const EVENT_TYPE_LABEL_KEYS = EVENT_TYPE_OPTIONS.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.labelKey }),
  {} as Record<NotificationEventType, MessageKey>
)

const EVENT_TYPE_BADGE_COLORS: Record<string, string> = {
  task_due_in: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  task_overdue_by: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  task_completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  task_status_changed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  checklist_completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  task_assigned: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function offsetLabel(minutes: number, immediateLabel: string): string {
  if (minutes === 0) return immediateLabel
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  return (minutes < 0 ? '-' : '+') + parts.join(' ')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventTypeBadge({ eventType, label }: { eventType: string; label: string }) {
  const colorClass = EVENT_TYPE_BADGE_COLORS[eventType] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: 'pending' | 'sent' | 'failed' }) {
  const { t } = useI18n()
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircle className="h-3 w-3" />
        {t('status.sent')}
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
        <XCircle className="h-3 w-3" />
        {t('status.failed')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
      <Clock className="h-3 w-3" />
      {t('status.pending')}
    </span>
  )
}

function SequenceRow({ seq }: { seq: NotificationSequence }) {
  const { t } = useI18n()
  const recipientLabel =
    seq.recipient_type === 'group'
      ? seq.recipient_group_name ?? t('notifications.groupFallback', { id: seq.recipient_group ?? '—' })
      : seq.recipient_type === 'custom'
      ? seq.custom_email || t('notifications.customEmail')
      : t('notifications.assignee')

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/50">
      <span className="font-medium text-gray-500 dark:text-gray-400">#{seq.sequence_order}</span>
      <span className="text-gray-700 dark:text-gray-300">
        {t('notifications.offset')}: <span className="font-mono">{offsetLabel(seq.trigger_offset_minutes, t('notifications.immediately'))}</span>
      </span>
      <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
        <Mail className="h-3.5 w-3.5 text-gray-400" />
        {recipientLabel}
      </span>
      {seq.email_subject && (
        <span className="truncate text-gray-500 dark:text-gray-400 max-w-xs" title={seq.email_subject}>
          "{seq.email_subject}"
        </span>
      )}
    </div>
  )
}

// ─── New Rule Form ─────────────────────────────────────────────────────────────

interface NewRuleFormProps {
  onClose: () => void
}

function NewRuleForm({ onClose }: NewRuleFormProps) {
  const { t } = useI18n()
  const [eventType, setEventType] = useState<string>('task_due_in')
  const [templateId, setTemplateId] = useState<string>('')
  const [isActive, setIsActive] = useState(true)

  const createMutation = useCreateNotificationRule()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: { event_type: string; checklist_template?: number | null; is_active: boolean } = {
      event_type: eventType,
      is_active: isActive,
    }
    if (templateId.trim() !== '') {
      const parsed = parseInt(templateId, 10)
      if (!isNaN(parsed)) payload.checklist_template = parsed
    }
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: t('notifications.ruleCreated'), variant: 'default' })
        onClose()
      },
      onError: () => {
        toast({ title: t('notifications.ruleCreateFailed'), variant: 'destructive' })
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 space-y-4"
    >
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('notifications.newRuleTitle')}</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Event type */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('notifications.eventType')} <span className="text-red-500">*</span>
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Template ID */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('notifications.templateId')} <span className="text-gray-400">({t('common.optional')})</span>
          </label>
          <input
            type="number"
            min={1}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            placeholder={t('notifications.templatePlaceholder')}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            {t('common.active')}
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {createMutation.isPending ? t('common.creating') : t('notifications.createRule')}
        </button>
      </div>
    </form>
  )
}

// ─── Rule Card ─────────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule: NotificationRule
}

function RuleCard({ rule }: RuleCardProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const toggleMutation = useToggleNotificationRule()
  const deleteMutation = useDeleteNotificationRule()

  const handleToggle = () => {
    toggleMutation.mutate(rule.id, {
      onSuccess: (updated) => {
        toast({
          title: updated.is_active ? t('notifications.ruleActivated') : t('notifications.ruleDeactivated'),
          variant: 'default',
        })
      },
      onError: () => {
        toast({ title: t('notifications.ruleUpdateFailed'), variant: 'destructive' })
      },
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate(rule.id, {
      onSuccess: () => {
        toast({ title: t('notifications.ruleDeleted'), variant: 'default' })
      },
      onError: () => {
        toast({ title: t('notifications.ruleDeleteFailed'), variant: 'destructive' })
      },
    })
  }

  const seqCount = rule.sequences?.length ?? 0

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
        {/* Card header */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          {/* Event type badge */}
          <EventTypeBadge
            eventType={rule.event_type}
            label={EVENT_TYPE_LABEL_KEYS[rule.event_type as NotificationEventType] ? t(EVENT_TYPE_LABEL_KEYS[rule.event_type as NotificationEventType]) : rule.event_type_display}
          />

          {/* Template scope */}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {rule.checklist_template_name ? (
              <>
                {t('notifications.template')}:{' '}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {rule.checklist_template_name}
                </span>
              </>
            ) : (
              <span className="italic text-gray-400 dark:text-gray-500">{t('notifications.allTemplates')}</span>
            )}
          </span>

          {/* Sequence count */}
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {t('notifications.sequenceCount', { count: seqCount, plural: seqCount === 1 ? '' : 's' })}
          </span>

          {/* Active indicator */}
          <span
            className={`flex h-2 w-2 rounded-full ${
              rule.is_active ? 'bg-green-500' : 'bg-gray-400'
            }`}
            title={rule.is_active ? t('common.active') : t('common.inactive')}
          />

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Toggle button */}
            <button
              onClick={handleToggle}
              disabled={toggleMutation.isPending}
              title={rule.is_active ? t('common.deactivate') : t('common.activate')}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              {rule.is_active ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
            </button>

            {/* Delete button */}
            <button
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
              title={t('notifications.deleteRule')}
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Expand sequences */}
            {seqCount > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? t('common.collapse') : t('notifications.showSequences')}
                className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sequences panel */}
        {expanded && seqCount > 0 && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('notifications.sequences')}
            </p>
            {rule.sequences.map((seq) => (
              <SequenceRow key={seq.id} seq={seq} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('notifications.deleteRuleTitle')}
        description={t('notifications.deleteRuleConfirm')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}

// ─── Rules Tab ─────────────────────────────────────────────────────────────────

function RulesTab() {
  const { t } = useI18n()
  const [showNewForm, setShowNewForm] = useState(false)
  const [filterEventType, setFilterEventType] = useState('')
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('')

  const params: { event_type?: string; is_active?: boolean } = {}
  if (filterEventType) params.event_type = filterEventType
  if (filterActive === 'true') params.is_active = true
  if (filterActive === 'false') params.is_active = false

  const { data, isLoading, isError } = useNotificationRules(params)
  const rules = Array.isArray(data) ? data : (data?.items ?? [])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Event type filter */}
        <select
          value={filterEventType}
          onChange={(e) => setFilterEventType(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          <option value="">{t('notifications.allEventTypes')}</option>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>

        {/* Active filter */}
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as '' | 'true' | 'false')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="true">{t('notifications.activeOnly')}</option>
          <option value="false">{t('notifications.inactiveOnly')}</option>
        </select>

        <div className="ml-auto">
          <button
            onClick={() => setShowNewForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('notifications.newRule')}
          </button>
        </div>
      </div>

      {/* New rule form */}
      {showNewForm && <NewRuleForm onClose={() => setShowNewForm(false)} />}

      {/* Loading */}
      {isLoading && (
        <div className="flex h-40 items-center justify-center text-gray-500 dark:text-gray-400">
          {t('notifications.loadingRules')}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex h-40 items-center justify-center text-red-500 dark:text-red-400">
          {t('notifications.rulesLoadFailed')}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && rules.length === 0 && (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Bell className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">{t('notifications.noRules')}</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {t('notifications.createFirstRule')}
          </button>
        </div>
      )}

      {/* Rules list */}
      {!isLoading && !isError && rules.length > 0 && (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Logs Tab ──────────────────────────────────────────────────────────────────

function LogsTab() {
  const { t } = useI18n()
  const [filterStatus, setFilterStatus] = useState('')

  const params: { status?: string } = {}
  if (filterStatus) params.status = filterStatus

  const { data, isLoading, isError } = useNotificationLogs(params)
  const logs = Array.isArray(data) ? data : (data?.items ?? [])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="sent">{t('status.sent')}</option>
          <option value="failed">{t('status.failed')}</option>
          <option value="pending">{t('status.pending')}</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex h-40 items-center justify-center text-gray-500 dark:text-gray-400">
          {t('notifications.loadingLogs')}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex h-40 items-center justify-center text-red-500 dark:text-red-400">
          {t('notifications.logsLoadFailed')}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && logs.length === 0 && (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Mail className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">{t('notifications.noLogs')}</p>
        </div>
      )}

      {/* Logs table */}
      {!isLoading && !isError && logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('notifications.recipient')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('common.status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('notifications.sentAt')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('notifications.instance')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('common.created')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700/50 dark:bg-gray-800">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {log.recipient_email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(log.sent_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {log.checklist_instance_name
                      ? log.checklist_instance_name
                      : log.checklist_instance
                      ? `#${log.checklist_instance}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-500">
                    {formatDate(log.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'rules' | 'logs'

export function NotificationsPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<Tab>('rules')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('notifications.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('notifications.subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <Bell className="h-4 w-4" />
            {t('notifications.rules')}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <Mail className="h-4 w-4" />
            {t('notifications.logs')}
          </button>
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'rules' ? <RulesTab /> : <LogsTab />}
    </div>
  )
}

export default NotificationsPage
