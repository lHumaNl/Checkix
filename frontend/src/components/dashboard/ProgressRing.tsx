import { useEffect, useState, useRef } from 'react'

interface ProgressRingProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  showValue?: boolean
}

export function ProgressRing({
  value,
  max,
  size = 80,
  strokeWidth = 8,
  color = '#3b82f6',
  label,
  showValue = true,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const animatedValueRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = max > 0 ? Math.min((animatedValue / max) * 100, 100) : 0
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  useEffect(() => {
    const duration = 1000
    const startTime = Date.now()
    const startValue = animatedValueRef.current
    const endValue = value

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const newValue = startValue + (endValue - startValue) * easeOut
      animatedValueRef.current = newValue
      setAnimatedValue(newValue)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [value])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className="transition-all duration-300"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke={color}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-center text-sm text-gray-600 dark:text-gray-400">{label}</span>
      )}
    </div>
  )
}
