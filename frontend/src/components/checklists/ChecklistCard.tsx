import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button, Card, Checkbox, Dropdown, Space, Tag, Tooltip, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { 
  CheckSquare, 
  MoreVertical, 
  Folder, 
  Clock,
  Copy,
  Trash2,
  Edit,
  GripVertical
} from 'lucide-react'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { ChecklistTemplate } from '@/types'
import { TagPills } from './TagPills'

const { Text, Paragraph } = Typography

interface ChecklistCardProps {
  checklist: ChecklistTemplate
  onDuplicate?: (id: number) => void
  onDelete?: (id: number) => void
  selected?: boolean
  onSelect?: (id: number, selected: boolean) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
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

export function ChecklistCard({ 
  checklist, 
  onDuplicate, 
  onDelete,
  selected,
  onSelect,
  dragHandleProps,
  isDragging
}: ChecklistCardProps) {
  const { t } = useI18n()
  const totalItems = checklist.items_count ?? 0
  const status = checklist.status || 'draft'
  const menuItems: MenuProps['items'] = [
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      whileHover={{ y: isDragging ? 0 : -4, boxShadow: isDragging ? undefined : '0 12px 24px -8px rgba(0, 0, 0, 0.15)' }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden shadow-sm transition-shadow" styles={{ body: { padding: 16 } }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {dragHandleProps && (
              <Tooltip title={t('common.move')}>
                <div
                  {...dragHandleProps}
                  className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <GripVertical size={16} />
                </div>
              </Tooltip>
            )}
            <Checkbox
              checked={selected}
              onChange={(e) => {
                e.stopPropagation()
                onSelect?.(checklist.id, e.target.checked)
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <Link 
              to={`/checklists/${checklist.id}`}
              className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {checklist.title || checklist.name}
            </Link>
          </div>
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="text" icon={<MoreVertical size={16} />} aria-label={t('common.actions')} />
          </Dropdown>
        </div>

        {checklist.description && (
          <Paragraph type="secondary" className="mt-2 line-clamp-2" style={{ marginBottom: 0 }}>
            {checklist.description}
          </Paragraph>
        )}

        <Space className="mt-3" size={[4, 4]} wrap>
          <Tag color={statusColors[status]}>
            {t(statusLabelKeys[status])}
          </Tag>
          {checklist.tags?.length > 0 && (
            <TagPills tags={checklist.tags} maxVisible={3} size="sm" />
          )}
        </Space>

        <Space className="mt-4 w-full justify-between" size={8} wrap>
          <Text type="secondary" className="inline-flex items-center gap-1 text-xs">
            <CheckSquare size={14} />
            <span>{t('checklists.itemsCount', { count: totalItems })}</span>
          </Text>
          {checklist.folder_id && (
            <Text type="secondary" className="inline-flex items-center gap-1 text-xs">
              <Folder size={14} />
              <span>{t('checklists.inFolder')}</span>
            </Text>
          )}
          {checklist.execution_mode === 'sequential' && (
            <Text type="secondary" className="inline-flex items-center gap-1 text-xs">
              <Clock size={14} />
              <span>{t('checklists.sequential')}</span>
            </Text>
          )}
        </Space>
      </Card>
    </motion.div>
  )
}
