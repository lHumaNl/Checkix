import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, Card, Descriptions, Dropdown, Flex, List, Modal, Space, Statistic, Tag, Typography } from 'antd'
import type { DescriptionsProps, MenuProps } from 'antd'
import {
  ArrowLeft,
  Play,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Folder,
  Clock,
  CheckSquare,
  Tags,
} from 'lucide-react'
import { useChecklist, useDeleteChecklist, useDuplicateChecklist } from '@/api/useChecklists'
import { useCreateChecklistInstance } from '@/api/useChecklistInstances'
import { ChecklistFormModal } from './ChecklistFormModal'
import { toast } from '@/hooks/useToast'
import { ChecklistDetailSkeleton } from '@/components/skeletons/ChecklistDetailSkeleton'
import type { ChecklistItem, ChecklistTemplate } from '@/types'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

const { Paragraph, Text, Title } = Typography

const CARD_BODY_STYLE = { padding: 20 }

type ChecklistStatus = ChecklistTemplate['status']
type Translate = (key: MessageKey, values?: Record<string, string | number>) => string
type DescriptionItems = NonNullable<DescriptionsProps['items']>

interface ChecklistVersionDetail {
  items?: ChecklistItem[]
}

const statusColors = {
  draft: 'default',
  active: 'success',
  archived: 'orange',
} satisfies Record<ChecklistStatus, string>

const statusLabelKeys = {
  draft: 'status.draft',
  active: 'status.active',
  archived: 'status.archived',
} satisfies Record<ChecklistStatus, MessageKey>

const executionModeLabelKeys = {
  sequential: 'checklists.sequential',
  free_order: 'checklists.freeOrder',
} satisfies Record<string, MessageKey>

function getChecklistItems(checklist: ChecklistTemplate) {
  const version = checklist.current_version as ChecklistVersionDetail | number | null | undefined
  const versionItems = typeof version === 'object' ? version?.items ?? [] : []
  return versionItems.length > 0 ? versionItems : checklist.items ?? []
}

function ChecklistItemRow({ index, item, t }: { index: number; item: ChecklistItem; t: Translate }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <List.Item className="rounded-lg bg-gray-50 px-3 py-3 dark:bg-gray-800/50">
        <Flex align="flex-start" gap={12} className="w-full">
          <Tag className="mt-0 min-w-8 text-center">{index + 1}</Tag>
          <Space direction="vertical" size={2} className="min-w-0 flex-1">
            <Space size={6} wrap>
              <Text strong>{item.title || item.content}</Text>
              {item.is_required && <Tag color="red">{t('common.required')}</Tag>}
            </Space>
            {item.description && <Text type="secondary">{item.description}</Text>}
          </Space>
        </Flex>
      </List.Item>
    </motion.div>
  )
}

type DisplayTag = string | { name: string }

function getTagName(tag: DisplayTag): string {
  return typeof tag === 'string' ? tag : tag.name
}

function TagSection({ tags, t }: { tags: DisplayTag[]; t: Translate }) {
  return (
    <Card title={<Space><Tags size={16} />{t('checklists.tags')}</Space>} styles={{ body: CARD_BODY_STYLE }}>
      <Space size={[4, 8]} wrap>
        {tags.map((tag) => <Tag key={getTagName(tag)} color="blue">{getTagName(tag)}</Tag>)}
      </Space>
    </Card>
  )
}

export function ChecklistDetailPage() {
  const { t } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const checklistId = id ? parseInt(id, 10) : undefined
  const hasInvalidChecklistId = checklistId !== undefined && isNaN(checklistId)
  const { data: checklist, isLoading } = useChecklist(checklistId)
  const deleteChecklist = useDeleteChecklist()
  const duplicateChecklist = useDuplicateChecklist()
  const createInstance = useCreateChecklistInstance()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (hasInvalidChecklistId) {
    return <Navigate to="/checklists" />
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (checklist) {
      deleteChecklist.mutate(checklist.id, {
        onSuccess: () => {
          toast({ title: t('checklists.deleted'), variant: 'default' })
          navigate('/checklists')
        },
        onError: () => {
          toast({ title: t('checklists.deleteFailed'), variant: 'destructive' })
        },
      })
    }
  }

  const handleDuplicate = () => {
    if (checklist) {
      duplicateChecklist.mutate(checklist.id, {
        onSuccess: (newChecklist) => {
          toast({ title: t('checklists.duplicated'), variant: 'default' })
          navigate(`/checklists/${newChecklist.id}`)
        },
        onError: () => {
          toast({ title: t('checklists.duplicateFailed'), variant: 'destructive' })
        },
      })
    }
  }

  const handleStartInstance = () => {
    if (checklist) {
      createInstance.mutate(
        { name: checklist.name || checklist.title, template: Number(checklist.id) },
        {
          onSuccess: (instance) => {
            navigate(`/instances/${instance.id}`)
          },
        }
      )
    }
  }

  if (isLoading) {
    return <ChecklistDetailSkeleton />
  }

  if (!checklist) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card styles={{ body: CARD_BODY_STYLE }}>
          <Text type="secondary">{t('checklists.notFound')}</Text>
        </Card>
      </div>
    )
  }

  const status = checklist.status || 'draft'
  const executionMode = checklist.execution_mode || 'free_order'
  const detailItems = getChecklistItems(checklist)
  const metadataItems: DescriptionItems = [
    ...getCategoryItem(checklist, t),
    {
      key: 'mode',
      label: t('checklists.mode'),
      children: <Tag icon={<Clock size={12} />}>{t(executionModeLabelKeys[executionMode])}</Tag>,
    },
  ]
  const actionItems: MenuProps['items'] = [
    { key: 'duplicate', icon: <Copy size={14} />, label: t('checklists.duplicate'), onClick: handleDuplicate },
    { type: 'divider' },
    { key: 'delete', danger: true, icon: <Trash2 size={14} />, label: t('common.delete'), onClick: handleDelete },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="shadow-sm" styles={{ body: CARD_BODY_STYLE }}>
        <Flex align="flex-start" gap={16} justify="space-between" wrap="wrap">
          <Space align="start" size={16}>
            <Button
              aria-label={t('nav.checklists')}
              icon={<ArrowLeft size={18} />}
              onClick={() => navigate('/checklists')}
              shape="circle"
              type="text"
            />
            <Space direction="vertical" size={6}>
              <Title level={2} style={{ margin: 0 }}>{checklist.title || checklist.name}</Title>
              <Space size={6} wrap>
                <Tag color={statusColors[status]}>{t(statusLabelKeys[status])}</Tag>
                {executionMode === 'sequential' && <Tag icon={<Clock size={12} />}>{t('checklists.sequential')}</Tag>}
              </Space>
            </Space>
          </Space>

          <Space wrap>
            <Button
              disabled={status !== 'active'}
              icon={<Play size={16} />}
              loading={createInstance.isPending}
              onClick={handleStartInstance}
              type="primary"
            >
              {t('checklists.start')}
            </Button>
            <Button aria-label={t('common.edit')} icon={<Edit size={18} />} onClick={() => setShowEditModal(true)} />
            <Dropdown menu={{ items: actionItems }} trigger={['click']}>
              <Button aria-label={t('common.actions')} icon={<MoreVertical size={18} />} />
            </Dropdown>
          </Space>
        </Flex>
      </Card>

      <Space className="w-full" direction="vertical" size={24}>
        {checklist.description && (
          <Card styles={{ body: CARD_BODY_STYLE }}>
            <Paragraph type="secondary" style={{ margin: 0 }}>{checklist.description}</Paragraph>
          </Card>
        )}

        <Card styles={{ body: CARD_BODY_STYLE }}>
          <Flex gap={32} wrap="wrap">
            <Statistic prefix={<CheckSquare size={18} />} title={t('checklists.items')} value={checklist.items_count ?? detailItems.length} />
            <Statistic prefix={<Play size={18} />} title={t('checklists.uses')} value={checklist.usage_count || 0} />
          </Flex>
          <Descriptions className="mt-4" column={{ xs: 1, sm: 2 }} items={metadataItems} />
        </Card>

        {checklist.tags?.length > 0 && <TagSection tags={checklist.tags as DisplayTag[]} t={t} />}

        <Card title={t('checklists.itemsTitle')} styles={{ body: CARD_BODY_STYLE }}>
          <List
            dataSource={detailItems}
            renderItem={(item, index) => <ChecklistItemRow index={index} item={item} t={t} />}
            rowKey="id"
            split={false}
          />
        </Card>
      </Space>

      {showEditModal && (
        <ChecklistFormModal
          onClose={() => setShowEditModal(false)}
          checklist={checklist}
        />
      )}

      <Modal
        cancelText={t('common.cancel')}
        confirmLoading={deleteChecklist.isPending}
        okButtonProps={{ danger: true }}
        okText={t('common.delete')}
        onCancel={() => setShowDeleteConfirm(false)}
        onOk={confirmDelete}
        open={showDeleteConfirm}
        title={t('checklists.deleteTitle')}
      >
        <Text>{t('checklists.deleteOneConfirm')}</Text>
      </Modal>
    </div>
  )
}

function getCategoryItem(checklist: ChecklistTemplate, t: Translate): DescriptionItems {
  if (!checklist.category) return []
  return [{ key: 'category', label: t('checklists.category'), children: <Tag icon={<Folder size={12} />}>{checklist.category}</Tag> }]
}
