import { useEffect, useMemo, useState } from 'react'
import { DeleteOutlined, EditOutlined, HistoryOutlined, LinkOutlined, PlusOutlined, PoweroffOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Tag,
  Timeline,
  Typography,
} from 'antd'
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useToggleWebhook,
  type Webhook as WebhookType,
  type WebhookEvent,
} from '@/api/useWebhooks'
import { toast } from '@/hooks/useToast'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

type EventType = WebhookType['event_type']
type EventStatus = NonNullable<WebhookType['last_event_status']>
type Translate = (key: MessageKey, values?: Record<string, string | number>) => string

interface WebhookFormValues {
  name: string
  event_type: EventType
  endpoint_url: string
  secret: string
  is_active: boolean
}

const { Paragraph, Text, Title } = Typography
const ENDPOINT_PROTOCOL_RE = /^https?:\/\//
const SKELETON_CARD_COUNT = 6

const EVENT_TYPE_OPTIONS: { value: EventType; labelKey: MessageKey; color: string }[] = [
  { value: 'instance_started', labelKey: 'webhooks.eventInstanceStarted', color: 'blue' },
  { value: 'instance_completed', labelKey: 'webhooks.eventInstanceCompleted', color: 'green' },
  { value: 'item_completed', labelKey: 'webhooks.eventItemCompleted', color: 'purple' },
]

const EVENT_TYPE_LABEL_KEYS = EVENT_TYPE_OPTIONS.reduce(
  (labels, option) => ({ ...labels, [option.value]: option.labelKey }),
  {} as Record<EventType, MessageKey>
)

const EMPTY_FORM: WebhookFormValues = {
  name: '',
  event_type: 'instance_started',
  endpoint_url: '',
  secret: '',
  is_active: true,
}

const STATUS_LABEL_KEYS: Record<EventStatus, MessageKey> = {
  pending: 'status.pending',
  sent: 'status.sent',
  failed: 'status.failed',
}

const STATUS_TAG_COLORS: Record<EventStatus, string> = {
  pending: 'warning',
  sent: 'success',
  failed: 'error',
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

function getEventTypeColor(type: EventType) {
  return EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.color ?? 'default'
}

function getEventTypeLabel(t: Translate, webhook: WebhookType) {
  const labelKey = EVENT_TYPE_LABEL_KEYS[webhook.event_type]
  return labelKey ? t(labelKey) : webhook.event_type_display
}

function getStatusLabel(t: Translate, status: EventStatus | string | null) {
  if (!status) return null
  const labelKey = STATUS_LABEL_KEYS[status as EventStatus]
  return labelKey ? t(labelKey) : status
}

function webhookToForm(webhook: WebhookType): WebhookFormValues {
  return {
    name: webhook.name,
    event_type: webhook.event_type,
    endpoint_url: webhook.endpoint_url,
    secret: '',
    is_active: webhook.is_active,
  }
}

function WebhookSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <Card key={index}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      ))}
    </div>
  )
}

function RecentEvents({ events }: { events: WebhookEvent[] }) {
  const { t } = useI18n()
  if (events.length === 0) return <Text type="secondary">{t('webhooks.noEvents')}</Text>

  return (
    <Collapse
      ghost
      size="small"
      items={[{
        key: 'recent-events',
        label: <RecentEventsLabel count={events.length} />,
        children: <RecentEventsTimeline events={events} t={t} />,
      }]}
    />
  )
}

function RecentEventsLabel({ count }: { count: number }) {
  const { t } = useI18n()
  return (
    <Space size={6}>
      <HistoryOutlined />
      <Text type="secondary">{t('webhooks.recentEvents', { count })}</Text>
    </Space>
  )
}

function RecentEventsTimeline({ events, t }: { events: WebhookEvent[]; t: Translate }) {
  return (
    <Timeline
      style={{ marginTop: 8 }}
      items={events.map((event) => ({
        color: event.status === 'failed' ? 'red' : event.status === 'sent' ? 'green' : 'gold',
        children: <RecentEvent event={event} t={t} />,
      }))}
    />
  )
}

function RecentEvent({ event, t }: { event: WebhookEvent; t: Translate }) {
  return (
    <Space direction="vertical" size={2} style={{ width: '100%' }}>
      <Space wrap size={8}>
        <StatusTag status={event.status} t={t} />
        {event.response_code !== null && <Text code>{event.response_code}</Text>}
        <Text type="secondary">{formatDate(event.created_at)}</Text>
      </Space>
      {event.checklist_instance_name && <Text ellipsis>{event.checklist_instance_name}</Text>}
    </Space>
  )
}

function StatusTag({ status, t }: { status: EventStatus | string | null; t: Translate }) {
  const label = getStatusLabel(t, status)
  if (!status || !label) return null
  return <Tag color={STATUS_TAG_COLORS[status as EventStatus] ?? 'default'}>{label}</Tag>
}

interface WebhookFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: WebhookType | null
}

function WebhookFormModal({ open, onOpenChange, editing }: WebhookFormModalProps) {
  const { t } = useI18n()
  const [form] = Form.useForm<WebhookFormValues>()
  const createMutation = useCreateWebhook()
  const updateMutation = useUpdateWebhook()

  useEffect(() => {
    if (open) form.setFieldsValue(editing ? webhookToForm(editing) : EMPTY_FORM)
  }, [editing, form, open])

  const isPending = createMutation.isPending || updateMutation.isPending
  const title = editing ? t('webhooks.edit') : t('webhooks.new')

  function handleSubmit(values: WebhookFormValues) {
    const payload = createPayload(values)
    if (editing) updateWebhook(editing.id, payload)
    else createWebhook(payload)
  }

  function createWebhook(payload: ReturnType<typeof createPayload>) {
    createMutation.mutate(payload, {
      onSuccess: () => handleSuccess(t('webhooks.created')),
      onError: () => toast({ title: t('webhooks.createFailed'), variant: 'destructive' }),
    })
  }

  function updateWebhook(id: number, payload: ReturnType<typeof createPayload>) {
    updateMutation.mutate({ id, data: payload }, {
      onSuccess: () => handleSuccess(t('webhooks.updated')),
      onError: () => toast({ title: t('webhooks.updateFailed'), variant: 'destructive' }),
    })
  }

  function handleSuccess(titleText: string) {
    toast({ title: titleText, variant: 'default' })
    onOpenChange(false)
  }

  return (
    <Modal
      centered
      open={open}
      title={title}
      onCancel={() => onOpenChange(false)}
      footer={null}
    >
      <Form form={form} layout="vertical" initialValues={EMPTY_FORM} onFinish={handleSubmit}>
        <WebhookFormFields editing={editing} t={t} />
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={isPending}>
              {isPending ? getPendingLabel(editing, t) : title}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

function WebhookFormFields({ editing, t }: { editing: WebhookType | null; t: Translate }) {
  return (
    <>
      <Form.Item name="name" label={t('common.name')} rules={[requiredRule(t('webhooks.validationNameRequired'))]}>
        <Input placeholder={t('webhooks.namePlaceholder')} />
      </Form.Item>
      <Form.Item name="event_type" label={t('notifications.eventType')} rules={[{ required: true }]}>
        <Select options={eventTypeSelectOptions(t)} />
      </Form.Item>
      <Form.Item name="endpoint_url" label={t('webhooks.endpointUrl')} rules={endpointRules(t)}>
        <Input placeholder="https://example.com/hook" />
      </Form.Item>
      <Form.Item name="secret" label={`${t('webhooks.secret')} (${t('common.optional')})`}>
        <Input.Password placeholder={editing ? t('webhooks.secretKeepPlaceholder') : t('webhooks.secretPlaceholder')} autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="is_active" label={t('common.status')} valuePropName="checked">
        <Switch checkedChildren={t('common.active')} unCheckedChildren={t('common.inactive')} />
      </Form.Item>
    </>
  )
}

function requiredRule(message: string) {
  return { required: true, whitespace: true, message }
}

function endpointRules(t: Translate) {
  return [
    requiredRule(t('webhooks.validationEndpointRequired')),
    {
      validator: (_: unknown, value?: string) => {
        if (!value || ENDPOINT_PROTOCOL_RE.test(value.trim())) return Promise.resolve()
        return Promise.reject(new Error(t('webhooks.validationEndpointProtocol')))
      },
    },
  ]
}

function eventTypeSelectOptions(t: Translate) {
  return EVENT_TYPE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))
}

function createPayload(values: WebhookFormValues) {
  return {
    name: values.name.trim(),
    events: [values.event_type],
    url: values.endpoint_url.trim(),
    is_active: values.is_active,
    ...(values.secret ? { secret: values.secret } : {}),
  }
}

function getPendingLabel(editing: WebhookType | null, t: Translate) {
  return editing ? t('common.saving') : t('common.creating')
}

interface WebhookCardProps {
  webhook: WebhookType
  onDelete: (webhook: WebhookType) => void
  onEdit: (webhook: WebhookType) => void
  deletePending: boolean
}

function WebhookCard({ webhook, onDelete, onEdit, deletePending }: WebhookCardProps) {
  const { t } = useI18n()
  const toggleMutation = useToggleWebhook()

  function handleToggle() {
    toggleMutation.mutate({ id: webhook.id, isActive: !webhook.is_active }, {
      onSuccess: (updated) => toast({ title: updated.is_active ? t('webhooks.activated') : t('webhooks.deactivated'), variant: 'default' }),
      onError: () => toast({ title: t('webhooks.toggleFailed'), variant: 'destructive' }),
    })
  }

  return (
    <Card hoverable actions={cardActions(webhook, t, onEdit, onDelete, handleToggle, toggleMutation.isPending, deletePending)}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <WebhookCardHeader webhook={webhook} t={t} />
        <EndpointUrl url={webhook.endpoint_url} />
        <WebhookMeta webhook={webhook} t={t} />
        <RecentEvents events={webhook.recent_events ?? []} />
      </Space>
    </Card>
  )
}

function WebhookCardHeader({ webhook, t }: { webhook: WebhookType; t: Translate }) {
  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      <Space align="start" wrap style={{ justifyContent: 'space-between', width: '100%' }}>
        <Text strong ellipsis style={{ maxWidth: 240, fontSize: 16 }}>{webhook.name}</Text>
        <Badge status={webhook.is_active ? 'success' : 'default'} text={webhook.is_active ? t('common.active') : t('common.inactive')} />
      </Space>
      <Space wrap size={6}>
        <Tag color={getEventTypeColor(webhook.event_type)}>{getEventTypeLabel(t, webhook)}</Tag>
        <StatusTag status={webhook.last_event_status} t={t} />
      </Space>
    </Space>
  )
}

function EndpointUrl({ url }: { url: string }) {
  return (
    <Paragraph ellipsis={{ rows: 1 }} copyable={{ text: url }} style={{ marginBottom: 0 }}>
      <Text type="secondary"><LinkOutlined /> </Text>
      <Text code>{url}</Text>
    </Paragraph>
  )
}

function WebhookMeta({ webhook, t }: { webhook: WebhookType; t: Translate }) {
  return (
    <Space wrap size={[12, 4]}>
      <Text type="secondary">{t('webhooks.eventCount', { count: webhook.events_count, plural: webhook.events_count === 1 ? '' : 's' })}</Text>
      <Text type="secondary">{t('common.created')} {formatDate(webhook.created_at)}</Text>
    </Space>
  )
}

function cardActions(
  webhook: WebhookType,
  t: Translate,
  onEdit: (webhook: WebhookType) => void,
  onDelete: (webhook: WebhookType) => void,
  onToggle: () => void,
  togglePending: boolean,
  deletePending: boolean
) {
  return [
    <Button key="toggle" type="text" icon={<PoweroffOutlined />} loading={togglePending} onClick={onToggle}>
      {webhook.is_active ? t('common.deactivate') : t('common.activate')}
    </Button>,
    <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => onEdit(webhook)}>
      {t('common.edit')}
    </Button>,
    <Popconfirm key="delete" title={t('webhooks.deleteTitle')} description={t('webhooks.deleteConfirm', { name: webhook.name })} okText={t('common.delete')} cancelText={t('common.cancel')} okButtonProps={{ danger: true, loading: deletePending }} onConfirm={() => onDelete(webhook)}>
      <Button type="text" danger icon={<DeleteOutlined />}>{t('common.delete')}</Button>
    </Popconfirm>,
  ]
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useI18n()
  return (
    <Card>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={hasFilters ? t('webhooks.noMatch') : t('webhooks.noWebhooks')}
      >
        <Text type="secondary">{hasFilters ? t('webhooks.adjustFilters') : t('webhooks.createFirst')}</Text>
      </Empty>
    </Card>
  )
}

export function WebhooksPage() {
  const { t } = useI18n()
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | 'all'>('all')
  const deleteMutation = useDeleteWebhook()
  const { data, isLoading } = useWebhooks({ search: search || undefined })
  const webhooks = useMemo(() => Array.isArray(data) ? data : (data?.items ?? []), [data])
  const filtered = useMemo(() => filterWebhooks(webhooks, eventTypeFilter), [eventTypeFilter, webhooks])
  const hasFilters = !!search || eventTypeFilter !== 'all'

  function openCreate() {
    setEditingWebhook(null)
    setFormOpen(true)
  }

  function handleDelete(webhook: WebhookType) {
    deleteMutation.mutate(webhook.id, {
      onSuccess: () => toast({ title: t('webhooks.deleted'), variant: 'default' }),
      onError: () => toast({ title: t('webhooks.deleteFailed'), variant: 'destructive' }),
    })
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <HeaderCard onCreate={openCreate} t={t} />
      <FiltersCard t={t} onSearch={setSearch} onEventTypeChange={setEventTypeFilter} />
      {isLoading ? <WebhookSkeletonGrid /> : <WebhookContent filtered={filtered} hasFilters={hasFilters} onEdit={(webhook) => { setEditingWebhook(webhook); setFormOpen(true) }} onDelete={handleDelete} deletePending={deleteMutation.isPending} />}
      <WebhookFormModal open={formOpen} onOpenChange={setFormOpen} editing={editingWebhook} />
    </Space>
  )
}

function HeaderCard({ onCreate, t }: { onCreate: () => void; t: Translate }) {
  return (
    <Card styles={{ body: { padding: '16px 24px' } }}>
      <Row align="middle" justify="space-between" gutter={[16, 12]}>
        <Col xs={24} sm={16}>
          <Title level={3} style={{ margin: 0 }}>{t('webhooks.title')}</Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>{t('webhooks.subtitle')}</Paragraph>
        </Col>
        <Col><Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>{t('webhooks.new')}</Button></Col>
      </Row>
    </Card>
  )
}

function FiltersCard({ t, onSearch, onEventTypeChange }: {
  t: Translate
  onSearch: (value: string) => void
  onEventTypeChange: (value: EventType | 'all') => void
}) {
  return (
    <Card size="small">
      <Form layout="inline" initialValues={{ search: '', eventType: 'all' }}>
        <Form.Item name="search" style={{ minWidth: 260, flex: 1 }}>
          <Input allowClear prefix={<SearchOutlined />} placeholder={t('webhooks.search')} onChange={(event) => onSearch(event.target.value)} />
        </Form.Item>
        <Form.Item name="eventType">
          <Select style={{ minWidth: 220 }} onChange={onEventTypeChange} options={[{ value: 'all', label: t('webhooks.allEventTypes') }, ...eventTypeSelectOptions(t)]} />
        </Form.Item>
      </Form>
    </Card>
  )
}

function WebhookContent({ filtered, hasFilters, onEdit, onDelete, deletePending }: {
  filtered: WebhookType[]
  hasFilters: boolean
  onEdit: (webhook: WebhookType) => void
  onDelete: (webhook: WebhookType) => void
  deletePending: boolean
}) {
  if (filtered.length === 0) return <EmptyState hasFilters={hasFilters} />
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((webhook) => <WebhookCard key={webhook.id} webhook={webhook} onEdit={onEdit} onDelete={onDelete} deletePending={deletePending} />)}
    </div>
  )
}

function filterWebhooks(webhooks: WebhookType[], eventTypeFilter: EventType | 'all') {
  return eventTypeFilter === 'all' ? webhooks : webhooks.filter((webhook) => webhook.event_type === eventTypeFilter)
}

export default WebhooksPage
