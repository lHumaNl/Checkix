import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, Card, Drawer, Dropdown, Input, List, Progress, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  MoreVertical,
  ChevronRight,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useChecklistInstance, useUpdateResponse, useStartInstance, usePauseInstance, useResumeInstance, useCompleteInstance, useCancelInstance, useSetPlaceholder } from '@/api/useChecklistInstances'
import { ItemCheckbox } from '@/components/checklist-instance/ItemCheckbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from '@/hooks/useToast'
import { useWebSocket } from '@/hooks/useWebSocket'
import { InstanceSkeleton } from '@/components/skeletons/InstanceSkeleton'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { ChecklistItemInstance } from '@/types'

const { Text, Title } = Typography

const statusTagColors: Record<string, string> = {
  draft: 'default',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
  paused: 'gold',
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

  const overflowMenuItems: MenuProps['items'] = [
    {
      key: 'cancel',
      danger: true,
      icon: <XCircle size={14} />,
      label: t('status.cancelled'),
      onClick: handleCancel,
    },
  ]

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
                <Tag color={statusTagColors[instance.status] ?? statusTagColors.draft} className="m-0">
                  {t(statusLabelKeys[instance.status] ?? 'status.draft')}
                </Tag>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {instance.status === 'draft' && (
              <Button
                onClick={handleStart}
                icon={<Play size={16} />}
                size="large"
                type="primary"
                className="min-h-[44px] bg-green-600 hover:!bg-green-700"
              >
                {t('checklists.start')}
              </Button>
            )}

            {isActive && (
              <>
                <Button
                  onClick={handlePause}
                  icon={<Pause size={16} />}
                  size="large"
                  className="min-h-[44px] text-yellow-700 dark:text-yellow-300"
                >
                  <span className="hidden sm:inline">{t('status.paused')}</span>
                </Button>
                <Button
                  onClick={handleComplete}
                  icon={<CheckCircle size={16} />}
                  size="large"
                  type="primary"
                  className="min-h-[44px] bg-green-600 hover:!bg-green-700"
                >
                  <span className="hidden sm:inline">{t('status.completed')}</span>
                </Button>
              </>
            )}

            {isPaused && (
              <>
                <Button
                  onClick={handleResume}
                  icon={<Play size={16} />}
                  size="large"
                  type="primary"
                  className="min-h-[44px]"
                >
                  <span className="hidden sm:inline">{t('checklistInstance.resume')}</span>
                </Button>
                <Button
                  onClick={handleCancel}
                  danger
                  icon={<XCircle size={16} />}
                  size="large"
                  className="min-h-[44px]"
                >
                  <span className="hidden sm:inline">{t('status.cancelled')}</span>
                </Button>
              </>
            )}

            <Dropdown menu={{ items: overflowMenuItems }} trigger={['click']}>
              <Button
                aria-label={t('common.actions')}
                icon={<MoreVertical size={20} />}
                size="large"
                type="text"
                className="min-h-[44px] min-w-[44px] text-gray-500"
              />
            </Dropdown>
          </div>
        </div>

        {instance.status !== 'draft' && (
          <Card className="mb-6" styles={{ body: { padding: 16 } }}>
            <Progress
              percent={Math.round(instance.progress_percentage)}
              status={completedCount === items.length && items.length > 0 ? 'success' : 'active'}
              strokeColor={completedCount === items.length ? '#22c55e' : '#2563eb'}
              format={(percent) => `${t('checklistInstance.progressCompleted', { completed: completedCount, total: items.length })} · ${percent}%`}
            />
          </Card>
        )}

        <div className="flex-1 overflow-y-auto">
          {placeholderItems.length > 0 && (
            <Card className="mb-4" styles={{ body: { padding: 16 } }}>
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
                    <Input
                      id={`placeholder-${ii.id}`}
                      value={placeholderInputs[ii.id] ?? ''}
                      onChange={e => handlePlaceholderChange(ii, e.target.value)}
                      placeholder={t('checklistInstance.enterPlaceholder', { name: ii.title })}
                      size="large"
                    />
                    <Text className="mt-1 block text-xs" type="secondary">
                      {t('checklistInstance.conditionalVisible', {
                        visible: ii.children.filter(c => c.is_visible).length,
                        total: ii.children.length,
                      })}
                    </Text>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {instance.status === 'draft' ? (
            <Card>
              <Title level={3} className="!mb-4 !text-lg">
                {t('checklistInstance.itemsCountTitle', { count: items.length })}
              </Title>
              {items.length === 0 ? (
                <Text type="secondary">
                  {t('checklistInstance.noItemsStart')}
                </Text>
              ) : (
                <List
                  dataSource={items}
                  renderItem={(item, index) => (
                    <List.Item className="rounded-lg bg-gray-50 px-3 dark:bg-gray-800/50">
                      <List.Item.Meta
                        avatar={<Tag className="m-0 min-w-6 text-center">{index + 1}</Tag>}
                        title={<Text>{item.title}</Text>}
                        description={item.description}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          ) : (
            <Card styles={{ body: { padding: 0 } }}>
              <List
                dataSource={items}
                renderItem={(item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onPointerDown={() => handleToggleItem(item.id)}
                  >
                    <List.Item className="!px-3 !py-0">
                      <ItemCheckbox
                        content={item.title}
                        description={item.description}
                        isChecked={item.is_completed}
                        checkedAt={item.completed_at}
                        onToggle={() => handleToggleItem(item.id)}
                        disabled={instance.status !== 'in_progress'}
                      />
                      <Button
                        icon={<ChevronRight size={16} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedItem(item)
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        type="text"
                      />
                    </List.Item>
                  </motion.div>
                )}
              />
            </Card>
          )}
        </div>
      </div>

      <Drawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={t('checklistInstance.itemDetails')}
        width={320}
      >
        {selectedItem && (
          <div className="space-y-3">
            <div>
              <Text strong>{selectedItem.title}</Text>
              {selectedItem.description && (
                <Text className="mt-1 block text-xs" type="secondary">{selectedItem.description}</Text>
              )}
            </div>
            <Text className="block text-xs" type="secondary">
              {t('checklistInstance.statusLine', {
                status: t(selectedItem.is_completed ? 'status.completed' : 'status.pending'),
              })}
            </Text>
            {selectedItem.completed_at && (
              <Text className="block text-xs" type="secondary">
                {t('checklistInstance.completedAt', { date: new Date(selectedItem.completed_at).toLocaleString() })}
              </Text>
            )}
          </div>
        )}
      </Drawer>

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
