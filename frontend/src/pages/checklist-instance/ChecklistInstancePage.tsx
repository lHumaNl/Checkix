import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  MoreVertical,
  ChevronRight,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQueryClient } from '@tanstack/react-query'
import { useChecklistInstance, useUpdateResponse, useStartInstance, usePauseInstance, useResumeInstance, useCompleteInstance, useCancelInstance, useSetPlaceholder } from '@/api/useChecklistInstances'
import { InstanceProgressBar } from '@/components/checklist-instance/InstanceProgressBar'
import { ItemCheckbox } from '@/components/checklist-instance/ItemCheckbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/hooks/useToast'
import { useWebSocket } from '@/hooks/useWebSocket'
import { InstanceSkeleton } from '@/components/skeletons/InstanceSkeleton'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { ChecklistItemInstance } from '@/types'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
}

const statusLabelKeys: Record<string, MessageKey> = {
  draft: 'status.draft',
  in_progress: 'status.inProgress',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
  paused: 'status.paused',
}

export function ChecklistInstancePage() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const parsedInstanceId = id ? parseInt(id, 10) : undefined
  const hasInvalidInstanceId = parsedInstanceId !== undefined && isNaN(parsedInstanceId)
  const instanceId = hasInvalidInstanceId ? undefined : parsedInstanceId
  const { data: instance, isLoading } = useChecklistInstance(instanceId)
  const updateResponse = useUpdateResponse()
  const startInstance = useStartInstance()
  const pauseInstance = usePauseInstance()
  const resumeInstance = useResumeInstance()
  const completeInstance = useCompleteInstance()
  const cancelInstance = useCancelInstance()
  const setPlaceholder = useSetPlaceholder()

  const [selectedItem, setSelectedItem] = useState<ChecklistItemInstance | null>(null)
  const [placeholderInputs, setPlaceholderInputs] = useState<Record<number, string>>({})
  const placeholderTimerRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    variant: 'default' | 'destructive'
    confirmLabel: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', variant: 'default', confirmLabel: t('common.apply'), onConfirm: () => {} })

  const queryClient = useQueryClient()

  const handleWsMessage = useCallback(
    (msg: unknown) => {
      const data = msg as { type: string }
      if (data.type === 'item_update' || data.type === 'instance_update') {
        queryClient.invalidateQueries({ queryKey: ['checklist-instance', instanceId] })
      }
    },
    [queryClient, instanceId]
  )

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  useWebSocket({
    url: `${wsProtocol}//${window.location.host}/ws/checklists/${instanceId}/`,
    onMessage: handleWsMessage,
    enabled: !!instanceId,
  })

  const isPaused = instance?.status === 'paused'
  const isActive = instance?.status === 'in_progress'

  const items = useMemo(() => {
    if (!instance?.item_instances) return []
    // Top-level items (no children or leaf items)
    return instance.item_instances.filter(
      (ii: ChecklistItemInstance) => !ii.children || ii.children.length === 0
    )
  }, [instance])

  const completedCount = useMemo(() => {
    return items.filter(ii => ii.is_completed).length
  }, [items])

  // Placeholder items are top-level item_instances that have at least one child
  const placeholderItems = useMemo<ChecklistItemInstance[]>(() => {
    if (!instance?.item_instances) return []
    return instance.item_instances.filter(
      (ii: ChecklistItemInstance) => ii.children && ii.children.length > 0
    )
  }, [instance])

  // Sync placeholder input values from server data whenever instance refreshes
  useEffect(() => {
    if (!instance?.item_instances) return
    setPlaceholderInputs(prev => {
      const next = { ...prev }
      instance.item_instances
        .filter((ii: ChecklistItemInstance) => ii.children && ii.children.length > 0)
        .forEach((ii: ChecklistItemInstance) => {
          if (!placeholderTimerRef.current[ii.id]) {
            next[ii.id] = ii.placeholder_value ?? ''
          }
        })
      return next
    })
  }, [instance])

  const handleToggleItem = (itemId: number) => {
    if (!instance || !instanceId || (instance.status !== 'in_progress')) return

    const item = instance.item_instances.find(ii => ii.id === itemId)
    const newChecked = !item?.is_completed

    updateResponse.mutate({
      instanceId,
      itemId,
      data: { is_checked: newChecked },
    })
  }

  const handlePlaceholderChange = useCallback((itemInstance: ChecklistItemInstance, value: string) => {
    if (!instanceId) return
    setPlaceholderInputs(prev => ({ ...prev, [itemInstance.id]: value }))
    clearTimeout(placeholderTimerRef.current[itemInstance.id])
    placeholderTimerRef.current[itemInstance.id] = setTimeout(() => {
      delete placeholderTimerRef.current[itemInstance.id]
      setPlaceholder.mutate({
        instanceId,
        placeholderKey: itemInstance.title,
        value,
      })
    }, 500)
  }, [instanceId, setPlaceholder])

  const handleStart = () => {
    if (instanceId) startInstance.mutate(instanceId)
  }

  const handlePause = () => {
    if (instanceId) pauseInstance.mutate(instanceId)
  }

  const handleResume = () => {
    if (instanceId) resumeInstance.mutate(instanceId)
  }

  const handleComplete = () => {
    setConfirmState({
      open: true,
      title: t('checklistInstance.completeTitle'),
      description: t('checklistInstance.completeConfirm'),
      variant: 'default',
      confirmLabel: t('status.completed'),
      onConfirm: () => {
        if (instanceId) {
          completeInstance.mutate(instanceId, {
            onSuccess: () => {
              toast({ title: t('checklistInstance.completedToast'), variant: 'default' })
            },
            onError: () => {
              toast({ title: t('checklistInstance.completeFailed'), variant: 'destructive' })
            },
          })
        }
      },
    })
  }

  const handleCancel = () => {
    setConfirmState({
      open: true,
      title: t('checklistInstance.cancelTitle'),
      description: t('checklistInstance.cancelConfirm'),
      variant: 'destructive',
      confirmLabel: t('checklistInstance.cancelTitle'),
      onConfirm: () => {
        if (instanceId) {
          cancelInstance.mutate(instanceId, {
            onSuccess: () => {
              toast({ title: t('checklistInstance.cancelledToast'), variant: 'default' })
            },
            onError: () => {
              toast({ title: t('checklistInstance.cancelFailed'), variant: 'destructive' })
            },
          })
        }
      },
    })
  }

  if (hasInvalidInstanceId) return <Navigate to="/checklists" />

  if (isLoading) {
    return <InstanceSkeleton />
  }

  if (!instance) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        {t('checklistInstance.notFound')}
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-4">
            <Link
              to="/checklists"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {instance.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[instance.status] ?? statusColors.draft}`}>
                  {t(statusLabelKeys[instance.status] ?? 'status.draft')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {instance.status === 'draft' && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 min-h-[44px]"
              >
                <Play size={16} />
                {t('checklists.start')}
              </button>
            )}

            {isActive && (
              <>
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900 min-h-[44px]"
                >
                  <Pause size={16} />
                  <span className="hidden sm:inline">{t('status.paused')}</span>
                </button>
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
                >
                  <CheckCircle size={16} />
                  <span className="hidden sm:inline">{t('status.completed')}</span>
                </button>
              </>
            )}

            {isPaused && (
              <>
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]"
                >
                  <Play size={16} />
                  <span className="hidden sm:inline">{t('checklistInstance.resume')}</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 min-h-[44px]"
                >
                  <XCircle size={16} />
                  <span className="hidden sm:inline">{t('status.cancelled')}</span>
                </button>
              </>
            )}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <MoreVertical size={20} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[140px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-1 z-50"
                  sideOffset={5}
                >
                  <DropdownMenu.Item asChild>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none w-full"
                    >
                      <XCircle size={14} />
                      {t('status.cancelled')}
                    </button>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>

        {instance.status !== 'draft' && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <InstanceProgressBar
                completed={completedCount}
                total={items.length}
              />
              <div className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                {instance.progress_percentage}%
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {placeholderItems.length > 0 && (
            <div className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                {t('checklistInstance.parameters')}
              </h3>
              <div className="space-y-3">
                {placeholderItems.map((ii: ChecklistItemInstance) => (
                  <div key={ii.id}>
                    <label
                      htmlFor={`placeholder-${ii.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      {ii.title}
                      {ii.description && (
                        <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                          — {ii.description}
                        </span>
                      )}
                    </label>
                    <input
                      id={`placeholder-${ii.id}`}
                      type="text"
                      value={placeholderInputs[ii.id] ?? ''}
                      onChange={e => handlePlaceholderChange(ii, e.target.value)}
                      placeholder={t('checklistInstance.enterPlaceholder', { name: ii.title })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {t('checklistInstance.conditionalVisible', {
                        visible: ii.children.filter(c => c.is_visible).length,
                        total: ii.children.length,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {instance.status === 'draft' ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('checklistInstance.itemsCountTitle', { count: items.length })}
              </h3>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('checklistInstance.noItemsStart')}
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded text-sm text-gray-500 dark:text-gray-400">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center"
                  onPointerDown={() => handleToggleItem(item.id)}
                >
                  <ItemCheckbox
                    content={item.title}
                    description={item.description}
                    isChecked={item.is_completed}
                    checkedAt={item.completed_at}
                    onToggle={() => handleToggleItem(item.id)}
                    disabled={instance.status !== 'in_progress'}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedItem(item)
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-2"
                  >
                    <ChevronRight size={16} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('checklistInstance.itemDetails')}</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <XCircle size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedItem.title}</p>
                {selectedItem.description && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{selectedItem.description}</p>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>{t('checklistInstance.statusLine', { status: t(selectedItem.is_completed ? 'status.completed' : 'status.pending') })}</p>
                {selectedItem.completed_at && (
                  <p>{t('checklistInstance.completedAt', { date: new Date(selectedItem.completed_at).toLocaleString() })}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState(prev => ({ ...prev, open }))}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
      />
    </div>
  )
}
