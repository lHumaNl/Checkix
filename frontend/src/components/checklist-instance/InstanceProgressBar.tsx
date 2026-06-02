import { motion } from 'framer-motion'
import { Progress, Typography } from 'antd'
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

  const strokeWidthBySize = {
    sm: 4,
    md: 8,
    lg: 12,
  }

  const strokeColor = () => {
    if (percentage >= 100) return '#22c55e'
    if (percentage >= 75) return '#2563eb'
    if (percentage >= 50) return '#eab308'
    return '#9ca3af'
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <Typography.Text type="secondary" className="text-sm">
            {t('checklistInstance.progressCompleted', { completed, total })}
          </Typography.Text>
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
      <Progress
        percent={percentage}
        showInfo={false}
        status={percentage >= 100 ? 'success' : 'active'}
        strokeColor={strokeColor()}
        strokeWidth={strokeWidthBySize[size]}
      />
    </div>
  )
}
