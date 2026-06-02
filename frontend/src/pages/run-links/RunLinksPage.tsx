import { useState } from 'react'
import type { Dayjs } from 'dayjs'
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  QRCode,
  Segmented,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  LinkOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useRunLinks, useCreateRunLink, useDeleteRunLink } from '@/api/useRunLinks'
import type { RunLink } from '@/api/useRunLinks'
import { toast } from '@/hooks/useToast'
import { useI18n } from '@/i18n'

type AccessFilter = 'all' | 'public' | 'restricted'

interface CreateRunLinkValues {
  access_type: RunLink['access_type']
  expires_at?: Dayjs
  max_uses?: number | null
  name: string
  template_id: number
}

function formatDate(iso: string | null, emptyLabel: string): string {
  if (!iso) return emptyLabel
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getRunLinkUrl(uniqueId: string): string {
  return `${window.location.origin}/run/${uniqueId}`
}

function buildCreatePayload(values: CreateRunLinkValues) {
  const payload: Parameters<ReturnType<typeof useCreateRunLink>['mutate']>[0] = {
    access_type: values.access_type,
    name: values.name.trim(),
    template_id: values.template_id,
  }
  if (values.expires_at) payload.expires_at = values.expires_at.format('YYYY-MM-DD')
  if (values.max_uses) payload.max_uses = values.max_uses
  return payload
}

function AccessTag({ type }: { type: RunLink['access_type'] }) {
  const { t } = useI18n()
  return (
    <Tag color={type === 'public' ? 'green' : 'gold'}>
      {type === 'public' ? t('runLinks.public') : t('runLinks.restricted')}
    </Tag>
  )
}

function ValidityTag({ link }: { link: RunLink }) {
  const { t } = useI18n()
  if (link.is_expired) return <Tag color="red">{t('runLinks.expired')}</Tag>
  if (link.is_max_uses_reached) return <Tag color="orange">{t('runLinks.limitReached')}</Tag>
  return <Tag color="success">{t('runLinks.valid')}</Tag>
}

function RunLinkSkeleton() {
  return (
    <Card className="h-full">
      <Skeleton active paragraph={{ rows: 4 }} title={{ width: '60%' }} />
    </Card>
  )
}

interface CreateRunLinkModalProps {
  onClose: () => void
  open: boolean
}

function CreateRunLinkModal({ onClose, open }: CreateRunLinkModalProps) {
  const { t } = useI18n()
  const [form] = Form.useForm<CreateRunLinkValues>()
  const createMutation = useCreateRunLink()

  function handleFinish(values: CreateRunLinkValues) {
    createMutation.mutate(buildCreatePayload(values), {
      onError: () => toast({ title: t('runLinks.createFailed'), variant: 'destructive' }),
      onSuccess: () => {
        toast({ title: t('runLinks.created'), variant: 'default' })
        form.resetFields()
        onClose()
      },
    })
  }

  function handleFinishFailed({ errorFields }: { errorFields: { name: (string | number)[] }[] }) {
    if (errorFields.some((field) => field.name.includes('template_id'))) {
      toast({ title: t('runLinks.validationTemplateRequired'), variant: 'destructive' })
    }
  }

  return (
    <Modal
      confirmLoading={createMutation.isPending}
      okText={createMutation.isPending ? t('common.creating') : t('runLinks.createLink')}
      onCancel={onClose}
      onOk={() => form.submit()}
      open={open}
      title={t('runLinks.new')}
    >
      <Form
        form={form}
        initialValues={{ access_type: 'public' }}
        layout="vertical"
        onFinish={handleFinish}
        onFinishFailed={handleFinishFailed}
      >
        <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
          <Input placeholder={t('runLinks.namePlaceholder')} />
        </Form.Item>
        <Form.Item
          label={t('runLinks.checklistTemplateId')}
          name="template_id"
          rules={[{ type: 'number', min: 1, required: true, message: t('runLinks.validationTemplateRequired') }]}
        >
          <InputNumber className="w-full" min={1} placeholder={t('runLinks.templatePlaceholder')} />
        </Form.Item>
        <Form.Item label={t('runLinks.accessType')} name="access_type">
          <Segmented
            block
            options={[
              { label: t('runLinks.public'), value: 'public' },
              { label: t('runLinks.restricted'), value: 'restricted' },
            ]}
          />
        </Form.Item>
        <Form.Item label={`${t('runLinks.expiresAt')} (${t('common.optional')})`} name="expires_at">
          <DatePicker className="w-full" />
        </Form.Item>
        <Form.Item label={t('runLinks.maxUses')} name="max_uses" extra={t('runLinks.maxUsesOptional')}>
          <InputNumber className="w-full" min={1} placeholder={t('common.unlimited')} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

interface RunLinkCardProps {
  deleting: boolean
  link: RunLink
  onCopy: (link: RunLink) => void
  onDelete: (link: RunLink) => void
}

function RunLinkCard({ deleting, link, onCopy, onDelete }: RunLinkCardProps) {
  const { t } = useI18n()
  const url = getRunLinkUrl(link.unique_id)
  const usage = link.max_uses == null ? t('common.unlimited') : link.max_uses

  return (
    <Card
      actions={[
        <Button key="copy" icon={<CopyOutlined />} onClick={() => onCopy(link)} type="text">
          {t('runLinks.copyLink')}
        </Button>,
        <Popconfirm
          cancelText={t('common.cancel')}
          description={t('runLinks.deleteConfirm', { name: link.name })}
          key="delete"
          okButtonProps={{ danger: true, loading: deleting }}
          okText={t('common.delete')}
          onConfirm={() => onDelete(link)}
          title={t('runLinks.deleteTitle')}
        >
          <Button danger icon={<DeleteOutlined />} loading={deleting} type="text">
            {t('common.delete')}
          </Button>
        </Popconfirm>,
      ]}
      className="h-full"
      hoverable
    >
      <Flex align="start" gap={16} justify="space-between">
        <Space direction="vertical" size={8} className="min-w-0 flex-1">
          <Tooltip title={link.name}>
            <Typography.Title className="!mb-0 truncate" level={5}>{link.name}</Typography.Title>
          </Tooltip>
          <Typography.Text type="secondary" className="block truncate">
            {t('runLinks.templateId')}: {link.template_id}
            {link.checklist_template_name ? ` — ${link.checklist_template_name}` : ''}
          </Typography.Text>
          <Space size={[0, 4]} wrap>
            <AccessTag type={link.access_type} />
            <ValidityTag link={link} />
          </Space>
        </Space>
        <QRCode bordered={false} size={74} type="svg" value={url} />
      </Flex>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Statistic prefix={<UserOutlined />} title={t('checklists.uses')} value={`${link.usage_count} / ${usage}`} />
        <Statistic
          prefix={<ClockCircleOutlined />}
          title={t('runLinks.expires')}
          value={formatDate(link.expires_at, t('common.never'))}
        />
      </div>

      <Flex className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" gap={8}>
        <LinkOutlined className="text-gray-400" />
        <Typography.Text code className="truncate !text-xs">{url}</Typography.Text>
      </Flex>
      <Typography.Text type="secondary" className="mt-3 block text-xs">
        {t('common.created')} {formatDate(link.created_at, t('common.never'))}
      </Typography.Text>
    </Card>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useI18n()
  const title = hasFilters ? t('runLinks.noMatch') : t('runLinks.noLinks')
  const description = hasFilters ? t('runLinks.adjustFilters') : t('runLinks.createFirst')

  return (
    <Card>
      <Empty description={<Space direction="vertical"><strong>{title}</strong><span>{description}</span></Space>} />
    </Card>
  )
}

export function RunLinksPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [accessTypeFilter, setAccessTypeFilter] = useState<AccessFilter>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { data, isLoading } = useRunLinks({
    access_type: accessTypeFilter === 'all' ? undefined : accessTypeFilter,
    search: search || undefined,
  })
  const deleteMutation = useDeleteRunLink()
  const runLinks: RunLink[] = Array.isArray(data) ? data : (data?.items ?? [])
  const hasFilters = Boolean(search) || accessTypeFilter !== 'all'

  function handleCopy(link: RunLink) {
    navigator.clipboard.writeText(getRunLinkUrl(link.unique_id))
      .then(() => toast({ title: t('runLinks.copied'), variant: 'default' }))
      .catch(() => toast({ title: t('runLinks.copyFailed'), variant: 'destructive' }))
  }

  function handleDelete(link: RunLink) {
    deleteMutation.mutate(link.id, {
      onError: () => toast({ title: t('runLinks.deleteFailed'), variant: 'destructive' }),
      onSuccess: () => toast({ title: t('runLinks.deleted'), variant: 'default' }),
    })
  }

  return (
    <div className="space-y-6">
      <Flex align="start" gap={16} justify="space-between" wrap="wrap">
        <div>
          <Typography.Title className="!mb-1" level={2}>{t('runLinks.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('runLinks.subtitle')}</Typography.Text>
        </div>
        <Button icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)} type="primary">
          {t('runLinks.new')}
        </Button>
      </Flex>

      <Card>
        <Flex align="center" gap={12} wrap="wrap">
          <Input
            allowClear
            className="max-w-sm"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('runLinks.search')}
            prefix={<SearchOutlined />}
            value={search}
          />
          <Segmented
            onChange={(value) => setAccessTypeFilter(value as AccessFilter)}
            options={[
              { label: t('runLinks.all'), value: 'all' },
              { label: t('runLinks.public'), value: 'public' },
              { label: t('runLinks.restricted'), value: 'restricted' },
            ]}
            value={accessTypeFilter}
          />
        </Flex>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <RunLinkSkeleton key={index} />)}
        </div>
      ) : runLinks.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {runLinks.map((link) => (
            <RunLinkCard
              deleting={deleteMutation.isPending}
              key={link.id}
              link={link}
              onCopy={handleCopy}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateRunLinkModal onClose={() => setIsCreateOpen(false)} open={isCreateOpen} />
    </div>
  )
}

export default RunLinksPage
