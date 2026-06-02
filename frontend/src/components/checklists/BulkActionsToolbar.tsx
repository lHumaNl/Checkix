import { motion } from 'framer-motion'
import { Button, Card, Popconfirm, Space, Tag } from 'antd'
import {
  Trash2,
  X,
} from 'lucide-react'
import { useI18n } from '@/i18n'

interface BulkActionsToolbarProps {
  selectedCount: number
  totalCount: number
  onDelete: () => void
  onSelectAll: () => void
  onClearSelection: () => void
}

export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onDelete,
  onSelectAll,
  onClearSelection,
}: BulkActionsToolbarProps) {
  const { t } = useI18n()

  if (selectedCount === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
    >
      <Card className="shadow-2xl" styles={{ body: { padding: '10px 12px' } }}>
        <Space wrap size={8} align="center">
          <Tag color="processing">{t('checklists.selectedCount', { count: selectedCount })}</Tag>

          <Button type="link" size="small" onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}>
            {selectedCount === totalCount ? t('common.clear') : t('common.selectAll')}
          </Button>

          <Popconfirm
            title={t('checklists.deleteManyTitle')}
            description={t('checklists.deleteManyConfirm', { count: selectedCount })}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={onDelete}
          >
            <Button danger icon={<Trash2 size={16} />}>
              {t('common.delete')}
            </Button>
          </Popconfirm>

          <Button type="text" icon={<X size={16} />} onClick={onClearSelection} aria-label={t('common.clear')} />
        </Space>
      </Card>
    </motion.div>
  )
}
