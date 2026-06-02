import { useState } from 'react'
import { Card, Drawer, Input, Tag, Typography } from 'antd'
import { MessageSquare, Paperclip, Clock } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { ChecklistItem, ChecklistResponse } from '@/types'

const { Text, Title } = Typography

interface ItemDetailPanelProps {
  item: ChecklistItem | null
  response: ChecklistResponse | null
  onClose: () => void
  onNotesChange: (notes: string) => void
}

function ItemDetailPanelContent({
  item,
  response,
  onClose,
  onNotesChange,
}: ItemDetailPanelProps) {
  const { t } = useI18n()
  const [notes, setNotes] = useState(response?.notes || '')

  const handleNotesSave = () => {
    onNotesChange(notes)
  }

  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      title={t('checklistInstance.itemDetails')}
      width={320}
    >
      {!item ? null : (
        <div className="space-y-4">
          <div>
            <Title level={4} className="!mb-2 !text-base">
              {item.content}
            </Title>
            {item.description && <Text type="secondary">{item.description}</Text>}
          </div>

          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            {item.is_required && <Tag color="red">{t('checklists.required')}</Tag>}
            {item.estimated_time_seconds && (
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <Text type="secondary">
                  {t('checklistInstance.estimatedMinutes', { minutes: Math.ceil(item.estimated_time_seconds / 60) })}
                </Text>
              </div>
            )}
            {response?.checked_at && (
              <Text className="block" type="success">
                {t('checklistInstance.completedAt', { date: new Date(response.checked_at).toLocaleString() })}
              </Text>
            )}
          </div>

          <Card size="small">
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare size={16} className="text-gray-400" />
              <Text strong>{t('checklistInstance.notes')}</Text>
            </div>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesSave}
              placeholder={t('checklistInstance.notesPlaceholder')}
              rows={4}
            />
          </Card>

          <Card size="small">
            <div className="mb-2 flex items-center gap-2">
              <Paperclip size={16} className="text-gray-400" />
              <Text strong>{t('checklistInstance.attachments')}</Text>
            </div>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
              <Text type="secondary">{t('checklistInstance.dropFiles')}</Text>
              <Text className="mt-1 block text-xs" type="secondary">
                {t('checklistInstance.comingSoon')}
              </Text>
            </div>
          </Card>
        </div>
      )}
    </Drawer>
  )
}

export function ItemDetailPanel(props: ItemDetailPanelProps) {
  return <ItemDetailPanelContent key={props.item?.id || 'none'} {...props} />
}
