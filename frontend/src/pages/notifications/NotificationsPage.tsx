import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  MailOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Drawer,
  Empty,
  Form,
  InputNumber,
  List,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { toast } from '@/hooks/useToast'
import {
  useCreateNotificationRule,
  useDeleteNotificationRule,
  useNotificationLogs,
  useNotificationRules,
} from '@/api/useNotifications'
import type { NotificationLog, NotificationRule, NotificationSequence } from '@/api/useNotifications'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

const { Paragraph, Text, Title } = Typography
const FILTER_SELECT_WIDTH = 220
const TABLE_SCROLL_WIDTH = 760
const DRAWER_WIDTH = 520

const EVENT_TYPE_OPTIONS = [
  { value: 'task_due_in', labelKey: 'notifications.eventTaskDueIn' },
  { value: 'task_overdue_by', labelKey: 'notifications.eventTaskOverdue' },
  { value: 'task_completed', labelKey: 'notifications.eventTaskCompleted' },
  { value: 'task_status_changed', labelKey: 'notifications.eventStatusChanged' },
  { value: 'checklist_completed', labelKey: 'notifications.eventChecklistCompleted' },
  { value: 'task_assigned', labelKey: 'notifications.eventTaskAssigned' },
] as const

type NotificationEventType = (typeof EVENT_TYPE_OPTIONS)[number]['value']
type Translate = (key: MessageKey, values?: Record<string, string | number>) => string
type RuleFormValues = { event_type: NotificationEventType; checklist_template?: number; is_active: boolean }
type TabKey = 'rules' | 'logs'

const EVENT_TYPE_LABEL_KEYS = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map(({ value, labelKey }) => [value, labelKey])
) as Record<NotificationEventType, MessageKey>

const EVENT_TYPE_TAG_COLORS: Record<NotificationEventType, string> = {
  task_due_in: 'warning',
  task_overdue_by: 'error',
  task_completed: 'success',
  task_status_changed: 'processing',
  checklist_completed: 'purple',
  task_assigned: 'cyan',
}

const STATUS_TAG_CONFIG: Record<NotificationLog['status'], { color: string; icon: ReactNode; labelKey: MessageKey }> = {
  failed: { color: 'error', icon: <CloseCircleOutlined />, labelKey: 'status.failed' },
  pending: { color: 'warning', icon: <ClockCircleOutlined />, labelKey: 'status.pending' },
  sent: { color: 'success', icon: <CheckCircleOutlined />, labelKey: 'status.sent' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function offsetLabel(minutes: number, immediateLabel: string): string {
  if (minutes === 0) return immediateLabel
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  return `${minutes < 0 ? '-' : '+'}${[hours && `${hours}h`, mins && `${mins}m`].filter(Boolean).join(' ')}`
}

function getEventLabel(rule: NotificationRule, t: Translate): string {
  const labelKey = EVENT_TYPE_LABEL_KEYS[rule.event_type]
  return labelKey ? t(labelKey) : rule.event_type_display
}

function getInstanceLabel(log: NotificationLog): string {
  if (log.checklist_instance_name) return log.checklist_instance_name
  return log.checklist_instance ? `#${log.checklist_instance}` : '—'
}

function getRecipientLabel(seq: NotificationSequence, t: Translate): string {
  if (seq.recipient_type === 'assignee') return t('notifications.assignee')
  if (seq.recipient_type === 'custom') return seq.custom_email || t('notifications.customEmail')
  return seq.recipient_group_name ?? t('notifications.groupFallback', { id: seq.recipient_group ?? '—' })
}

function EventTypeTag({ eventType, label }: { eventType: NotificationRule['event_type']; label: string }) {
  return <Tag color={EVENT_TYPE_TAG_COLORS[eventType]}>{label}</Tag>
}

function StatusTag({ status }: { status: NotificationLog['status'] }) {
  const { t } = useI18n()
  const config = STATUS_TAG_CONFIG[status]
  return <Tag color={config.color} icon={config.icon}>{t(config.labelKey)}</Tag>
}

function SequenceList({ sequences }: { sequences: NotificationSequence[] }) {
  const { t } = useI18n()
  return (
    <List
      size="small"
      dataSource={sequences}
      renderItem={(seq) => (
        <List.Item>
          <Space wrap size="middle">
            <Text type="secondary">#{seq.sequence_order}</Text>
            <Text>{t('notifications.offset')}: <Text code>{offsetLabel(seq.trigger_offset_minutes, t('notifications.immediately'))}</Text></Text>
            <Text><MailOutlined /> {getRecipientLabel(seq, t)}</Text>
            {seq.email_subject && <Text type="secondary" ellipsis>{seq.email_subject}</Text>}
          </Space>
        </List.Item>
      )}
    />
  )
}

function NewRuleDrawer({ onClose, open }: { onClose: () => void; open: boolean }) {
  const { t } = useI18n()
  const [form] = Form.useForm<RuleFormValues>()
  const createMutation = useCreateNotificationRule()

  const handleFinish = (values: RuleFormValues) => {
    const payload = { event_type: values.event_type, is_active: values.is_active, template_id: values.checklist_template ?? null }
    createMutation.mutate(payload, {
      onError: () => toast({ title: t('notifications.ruleCreateFailed'), variant: 'destructive' }),
      onSuccess: () => {
        toast({ title: t('notifications.ruleCreated'), variant: 'default' })
        form.resetFields()
        onClose()
      },
    })
  }

  return (
    <Drawer destroyOnClose open={open} title={t('notifications.newRuleTitle')} width={DRAWER_WIDTH} onClose={onClose}>
      <Form form={form} layout="vertical" initialValues={{ event_type: 'task_due_in', is_active: true }} onFinish={handleFinish}>
        <Form.Item label={t('notifications.eventType')} name="event_type" rules={[{ required: true }]}>
          <Select options={EVENT_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))} />
        </Form.Item>
        <Form.Item label={`${t('notifications.templateId')} (${t('common.optional')})`} name="checklist_template">
          <InputNumber min={1} placeholder={t('notifications.templatePlaceholder')} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label={t('common.active')} name="is_active" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending}>{createMutation.isPending ? t('common.creating') : t('notifications.createRule')}</Button>
        </Space>
      </Form>
    </Drawer>
  )
}

function RuleCard({ rule }: { rule: NotificationRule }) {
  const { t } = useI18n()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteMutation = useDeleteNotificationRule()
  const sequenceCount = rule.sequences?.length ?? 0

  const handleDelete = () => {
    deleteMutation.mutate(rule.id, {
      onError: () => toast({ title: t('notifications.ruleDeleteFailed'), variant: 'destructive' }),
      onSuccess: () => {
        toast({ title: t('notifications.ruleDeleted'), variant: 'default' })
        setDeleteOpen(false)
      },
    })
  }

  return (
    <>
      <Card size="small" style={{ width: '100%' }} title={<RuleTitle rule={rule} sequenceCount={sequenceCount} />} extra={<RuleActions rule={rule} loading={deleteMutation.isPending} onDelete={() => setDeleteOpen(true)} />}>
        <Text type="secondary">{rule.checklist_template_name ? `${t('notifications.template')}: ${rule.checklist_template_name}` : t('notifications.allTemplates')}</Text>
        {sequenceCount > 0 && (
          <Collapse ghost size="small" items={[{ key: 'sequences', label: t('notifications.sequences'), children: <SequenceList sequences={rule.sequences} /> }]} />
        )}
      </Card>
      <Modal cancelText={t('common.cancel')} okButtonProps={{ danger: true, loading: deleteMutation.isPending }} okText={t('common.delete')} open={deleteOpen} title={t('notifications.deleteRuleTitle')} onCancel={() => setDeleteOpen(false)} onOk={handleDelete}>
        <Paragraph>{t('notifications.deleteRuleConfirm')}</Paragraph>
      </Modal>
    </>
  )
}

function RuleTitle({ rule, sequenceCount }: { rule: NotificationRule; sequenceCount: number }) {
  const { t } = useI18n()
  return (
    <Space wrap>
      <EventTypeTag eventType={rule.event_type} label={getEventLabel(rule, t)} />
      <Text type="secondary">{t('notifications.sequenceCount', { count: sequenceCount, plural: sequenceCount === 1 ? '' : 's' })}</Text>
    </Space>
  )
}

function RuleActions({ loading, onDelete, rule }: { loading: boolean; onDelete: () => void; rule: NotificationRule }) {
  const { t } = useI18n()
  return (
    <Space>
      <Badge status={rule.is_active ? 'success' : 'default'} text={rule.is_active ? t('common.active') : t('common.inactive')} />
      <Button aria-label={t('notifications.deleteRule')} danger disabled={loading} icon={<DeleteOutlined />} type="text" onClick={onDelete} />
    </Space>
  )
}

function RulesTab() {
  const { t } = useI18n()
  const [newRuleOpen, setNewRuleOpen] = useState(false)
  const [filterEventType, setFilterEventType] = useState('')
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('')
  const params = useMemo(() => getRuleParams(filterEventType, filterActive), [filterEventType, filterActive])
  const { data, isError, isLoading } = useNotificationRules(params)
  const rules = Array.isArray(data) ? data : (data?.items ?? [])

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <RulesToolbar filterActive={filterActive} filterEventType={filterEventType} onActiveChange={setFilterActive} onEventChange={setFilterEventType} onNewRule={() => setNewRuleOpen(true)} />
      <NewRuleDrawer open={newRuleOpen} onClose={() => setNewRuleOpen(false)} />
      {isError && <Alert showIcon type="error" message={t('notifications.rulesLoadFailed')} />}
      {isLoading && <Card aria-busy="true"><Text type="secondary">{t('notifications.loadingRules')}</Text><Skeleton active paragraph={{ rows: 5 }} /></Card>}
      {!isLoading && !isError && rules.length === 0 && <RulesEmptyState onCreate={() => setNewRuleOpen(true)} />}
      {!isLoading && !isError && rules.length > 0 && <List dataSource={rules} renderItem={(rule) => <List.Item><RuleCard rule={rule} /></List.Item>} />}
    </Space>
  )
}

function getRuleParams(eventType: string, active: '' | 'true' | 'false') {
  return { ...(eventType && { event_type: eventType }), ...(active && { is_active: active === 'true' }) }
}

function RulesToolbar({ filterActive, filterEventType, onActiveChange, onEventChange, onNewRule }: { filterActive: '' | 'true' | 'false'; filterEventType: string; onActiveChange: (value: '' | 'true' | 'false') => void; onEventChange: (value: string) => void; onNewRule: () => void }) {
  const { t } = useI18n()
  return (
    <Card size="small">
      <Space wrap>
        <Select value={filterEventType} style={{ width: FILTER_SELECT_WIDTH }} onChange={onEventChange} options={[{ value: '', label: t('notifications.allEventTypes') }, ...EVENT_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))]} />
        <Select value={filterActive} style={{ width: FILTER_SELECT_WIDTH }} onChange={onActiveChange} options={[{ value: '', label: t('common.allStatuses') }, { value: 'true', label: t('notifications.activeOnly') }, { value: 'false', label: t('notifications.inactiveOnly') }]} />
        <Button type="primary" icon={<PlusOutlined />} onClick={onNewRule}>{t('notifications.newRule')}</Button>
      </Space>
    </Card>
  )
}

function RulesEmptyState({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n()
  return <Empty description={t('notifications.noRules')}><Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>{t('notifications.createFirstRule')}</Button></Empty>
}

function LogsTab() {
  const { t } = useI18n()
  const [filterStatus, setFilterStatus] = useState('')
  const params = useMemo(() => (filterStatus ? { status: filterStatus } : {}), [filterStatus])
  const { data, isError, isLoading } = useNotificationLogs(params)
  const logs = Array.isArray(data) ? data : (data?.items ?? [])
  const columns = useLogColumns(t)

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Select value={filterStatus} style={{ width: FILTER_SELECT_WIDTH }} onChange={setFilterStatus} options={[{ value: '', label: t('common.allStatuses') }, { value: 'sent', label: t('status.sent') }, { value: 'failed', label: t('status.failed') }, { value: 'pending', label: t('status.pending') }]} />
      {isError && <Alert showIcon type="error" message={t('notifications.logsLoadFailed')} />}
      <Table<NotificationLog> rowKey="id" columns={columns} dataSource={isError ? [] : logs} loading={{ spinning: isLoading, tip: t('notifications.loadingLogs') }} pagination={false} scroll={{ x: TABLE_SCROLL_WIDTH }} locale={{ emptyText: <Empty description={t('notifications.noLogs')} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} />
    </Space>
  )
}

function useLogColumns(t: Translate): ColumnsType<NotificationLog> {
  return useMemo(() => [
    { title: t('notifications.recipient'), dataIndex: 'recipient_email', render: (email: string) => <Space><MailOutlined />{email}</Space> },
    { title: t('common.status'), dataIndex: 'status', render: (status: NotificationLog['status']) => <StatusTag status={status} /> },
    { title: t('notifications.sentAt'), dataIndex: 'sent_at', render: formatDate },
    { title: t('notifications.instance'), render: (_, log) => getInstanceLabel(log) },
    { title: t('common.created'), dataIndex: 'created_at', render: formatDate },
  ], [t])
}

export function NotificationsPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabKey>('rules')

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Title level={2} style={{ margin: 0 }}>{t('notifications.title')}</Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>{t('notifications.subtitle')}</Paragraph>
      </Card>
      <Tabs activeKey={activeTab} destroyOnHidden onChange={(key) => setActiveTab(key as TabKey)} items={[{ key: 'rules', label: <Space><BellOutlined />{t('notifications.rules')}</Space>, children: <RulesTab /> }, { key: 'logs', label: <Space><MailOutlined />{t('notifications.logs')}</Space>, children: <LogsTab /> }]} />
    </Space>
  )
}

export default NotificationsPage
