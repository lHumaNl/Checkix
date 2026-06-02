import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'

interface InstanceProgressBarProps {
  completed: number
  total: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function InstanceProgressBar({
  completed,
  total,
  showLabel = true,
  size = 'md',
}: InstanceProgressBarProps) {
  const { t } = useI18n()
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const getColor = () => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('checklistInstance.progressCompleted', { completed, total })}
          </span>
          <motion.span
            key={percentage}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-sm font-medium text-gray-900 dark:text-white"
          >
            {percentage}%
          </motion.span>
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${getColor()} rounded-full`}
        />
      </div>
    </div>
  )
}
