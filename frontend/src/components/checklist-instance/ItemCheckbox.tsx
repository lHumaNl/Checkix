import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Checkbox, Input, Tag } from 'antd'
import { useI18n } from '@/i18n'

interface ItemCheckboxProps {
  content: string
  description?: string | null
  isChecked: boolean
  isRequired?: boolean
  checkedAt?: string | null
  notes?: string | null
  onToggle: () => void
  onNotesChange?: (notes: string) => void
  disabled?: boolean
}

export function ItemCheckbox({
  content,
  description,
  isChecked,
  isRequired,
  checkedAt,
  notes,
  onToggle,
  onNotesChange,
  disabled,
}: ItemCheckboxProps) {
  const { t } = useI18n()
  const [showNotes, setShowNotes] = useState(false)

  return (
    <motion.div
      layout
      className={`group flex items-start gap-3 p-3 rounded-lg transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'
      }`}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (!disabled) onToggle()
      }}
    >
      <motion.div
        onPointerDown={(e) => {
          e.stopPropagation()
          if (!disabled) onToggle()
        }}
        whileTap={{ scale: 0.9 }}
        className="flex-shrink-0 pt-0.5"
      >
        <Checkbox checked={isChecked} disabled={disabled} onChange={() => undefined} />
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <motion.p
            onPointerDown={(e) => {
              e.stopPropagation()
              if (!disabled) onToggle()
            }}
            animate={{
              color: isChecked ? '#9ca3af' : undefined,
            }}
            className={`text-sm font-medium ${
              isChecked
                ? 'line-through text-gray-400 dark:text-gray-500'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {content}
          </motion.p>
          {isRequired && (
            <Tag color="red" className="m-0 text-xs">{t('checklists.required')}</Tag>
          )}
        </div>

        {description && (
          <p className={`mt-1 text-xs ${
            isChecked
              ? 'text-gray-400 dark:text-gray-600'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {description}
          </p>
        )}

        <AnimatePresence>
          {isChecked && checkedAt && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1 text-xs text-gray-400 dark:text-gray-500"
            >
              {t('checklistInstance.completedAt', { date: new Date(checkedAt).toLocaleString() })}
            </motion.p>
          )}
        </AnimatePresence>

        {onNotesChange && (
          <Button
            onClick={(e) => {
              e.stopPropagation()
              setShowNotes(!showNotes)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            size="small"
            type="link"
            className="mt-1 h-auto p-0 text-xs"
          >
            {notes ? t('checklistInstance.editNotes') : t('checklistInstance.addNotes')}
          </Button>
        )}

        <AnimatePresence>
          {showNotes && onNotesChange && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Input.TextArea
                value={notes || ''}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder={t('checklistInstance.notesPlaceholder')}
                rows={2}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
