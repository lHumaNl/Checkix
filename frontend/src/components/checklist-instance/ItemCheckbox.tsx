import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
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
      <motion.button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation()
          if (!disabled) onToggle()
        }}
        whileTap={{ scale: 0.9 }}
        className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
          isChecked
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 dark:border-gray-600 group-hover:border-green-400'
        }`}
      >
        <AnimatePresence>
          {isChecked && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Check size={14} strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

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
            <span className="text-xs text-red-500">*</span>
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
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowNotes(!showNotes)
            }}
            className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {notes ? t('checklistInstance.editNotes') : t('checklistInstance.addNotes')}
          </button>
        )}

        <AnimatePresence>
          {showNotes && onNotesChange && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <textarea
                value={notes || ''}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder={t('checklistInstance.notesPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
