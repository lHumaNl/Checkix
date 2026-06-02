import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, MessageSquare, Paperclip, Clock } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { ChecklistItem, ChecklistResponse } from '@/types'

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

  if (!item) return null

  const handleNotesSave = () => {
    onNotesChange(notes)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-4 overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('checklistInstance.itemDetails')}</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {item.content}
          </h4>
          {item.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {item.description}
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          {item.is_required && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded text-xs">
                {t('checklists.required')}
              </span>
            </div>
          )}
          {item.estimated_time_seconds && (
            <div className="flex items-center gap-2">
              <Clock size={14} />
              <span>{t('checklistInstance.estimatedMinutes', { minutes: Math.ceil(item.estimated_time_seconds / 60) })}</span>
            </div>
          )}
          {response?.checked_at && (
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">
                {t('checklistInstance.completedAt', { date: new Date(response.checked_at).toLocaleString() })}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('checklistInstance.notes')}</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesSave}
            placeholder={t('checklistInstance.notesPlaceholder')}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Paperclip size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('checklistInstance.attachments')}</span>
          </div>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('checklistInstance.dropFiles')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('checklistInstance.comingSoon')}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function ItemDetailPanel(props: ItemDetailPanelProps) {
  return <ItemDetailPanelContent key={props.item?.id || 'none'} {...props} />
}
