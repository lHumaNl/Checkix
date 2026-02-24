import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  change?: number
  changeLabel?: string
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel = 'vs last week',
  color = 'blue',
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const colors = colorClasses[color]
  const numericValue = typeof value === 'number' ? value : parseInt(value) || 0

  useEffect(() => {
    const duration = 1000
    const steps = 30
    const stepValue = numericValue / steps
    let current = 0
    const timer = setInterval(() => {
      current += 1
      setDisplayValue(Math.min(Math.round(stepValue * current), numericValue))
      if (current >= steps) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [numericValue])

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'string' ? value : displayValue}
          </p>
        </div>
        <div className={`rounded-lg p-3 ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              change >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {change >= 0 ? '+' : ''}
            {change}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{changeLabel}</span>
        </div>
      )}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-gray-100 to-transparent opacity-50 transition-transform duration-300 group-hover:scale-150 dark:from-gray-700" />
    </div>
  )
}
