import { Link } from 'react-router-dom'
import { Button, Dropdown, Space, Table, Tag, Typography } from 'antd'
import type { MenuProps, TableColumnsType } from 'antd'
import {
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  CheckSquare,
} from 'lucide-react'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { ChecklistTemplate } from '@/types'
import { TagPills } from './TagPills'

const { Text } = Typography

interface ChecklistListProps {
  checklists: ChecklistTemplate[]
  onDuplicate?: (id: number) => void
  onDelete?: (id: number) => void
  selectedIds?: number[]
  onSelect?: (id: number, selected: boolean) => void
  onSelectAll?: () => void
  onClearSelection?: () => void
}

const statusColors = {
  draft: 'default',
  active: 'success',
  archived: 'orange',
}

const statusLabelKeys = {
  draft: 'status.draft',
  active: 'status.active',
  archived: 'status.archived',
} as const satisfies Record<'draft' | 'active' | 'archived', MessageKey>

export function ChecklistList({
  checklists,
  onDuplicate,
  onDelete,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onClearSelection,
}: ChecklistListProps) {
  const { t } = useI18n()
  const columns: TableColumnsType<ChecklistTemplate> = [
    {
      title: t('checklists.titleLabel'),
      dataIndex: 'title',
      render: (_value, checklist) => (
        <Space direction="vertical" size={2} className="min-w-0">
          <Link
            to={`/checklists/${checklist.id}`}
            className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
          >
            {checklist.title || checklist.name}
          </Link>
          {checklist.tags?.length > 0 && <TagPills tags={checklist.tags} maxVisible={3} size="sm" />}
        </Space>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      width: 140,
      render: (status: ChecklistTemplate['status']) => (
        <Tag color={statusColors[status || 'draft']}>
          {t(statusLabelKeys[status || 'draft'])}
        </Tag>
      ),
    },
    {
      title: t('checklists.items'),
      width: 140,
      render: (_, checklist) => (
        <Text type="secondary">
          {t('checklists.itemsCount', { count: checklist.items_count ?? checklist.items?.length ?? 0 })}
        </Text>
      ),
    },
    {
      title: t('checklists.uses'),
      dataIndex: 'usage_count',
      width: 110,
      render: (usageCount: number | undefined) => (
        <Space size={4}>
          <CheckSquare size={14} />
          <Text type="secondary">{usageCount || 0}</Text>
        </Space>
      ),
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      width: 72,
      render: (_, checklist) => (
        <Dropdown menu={{ items: getMenuItems(checklist) }} trigger={['click']}>
          <Button type="text" icon={<MoreVertical size={16} />} aria-label={t('common.actions')} />
        </Dropdown>
      ),
    },
  ]

  function getMenuItems(checklist: ChecklistTemplate): MenuProps['items'] {
    return [
      {
        key: 'edit',
        icon: <Edit size={14} />,
        label: <Link to={`/checklists/${checklist.id}`}>{t('common.edit')}</Link>,
      },
      {
        key: 'duplicate',
        icon: <Copy size={14} />,
        label: t('checklists.duplicate'),
        onClick: () => onDuplicate?.(checklist.id),
      },
      { type: 'divider' },
      {
        key: 'delete',
        danger: true,
        icon: <Trash2 size={14} />,
        label: t('common.delete'),
        onClick: () => onDelete?.(checklist.id),
      },
    ]
  }

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={checklists}
      pagination={false}
      scroll={{ x: 720 }}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onSelect: (record, selected) => onSelect?.(record.id, selected),
        onSelectAll: (selected) => {
          if (selected) onSelectAll?.()
          if (!selected) onClearSelection?.()
        },
      }}
      rowClassName={(checklist) => (
        selectedIds.includes(checklist.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''
      )}
    />
  )
}
