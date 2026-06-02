import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Badge, Button, Card, Empty, Space, Typography } from 'antd'
import { Plus } from 'lucide-react'
import { useI18n } from '@/i18n'

const { Title } = Typography

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  items: { id: number }[]
  children: ReactNode
  onAddChecklist?: () => void
}

export function KanbanColumn({ id, title, color, items, children, onAddChecklist }: KanbanColumnProps) {
  const { t } = useI18n()
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Card
      ref={setNodeRef}
      role="group"
      aria-label={`${title} column, ${items.length} items`}
      className={`min-w-[280px] max-w-[360px] flex-1 snap-start transition-colors ${
        isOver
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : ''
      }`}
      styles={{ body: { padding: 12 } }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <Space size={8}>
          <span className={`h-2 w-2 rounded-full ${color}`} />
          <Title level={5} style={{ margin: 0 }}>{title}</Title>
        </Space>
        <Badge count={items.length} showZero />
      </div>
      <div className="min-h-[200px] space-y-3" role="list">
        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('checklists.noneFound')} />
        ) : children}
      </div>
      {onAddChecklist && (
        <Button block className="mt-3" icon={<Plus size={16} />} onClick={onAddChecklist}>
          {t('checklists.new')}
        </Button>
      )}
    </Card>
  )
}
