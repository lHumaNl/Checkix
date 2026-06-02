import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button, Tag } from 'antd'
import { Play, Pause } from 'lucide-react'
import { useI18n } from '@/i18n'

interface InstanceTimerProps {
  startedAt: string | null
  pausedAt: string | null
  totalPauseSeconds: number
  completedAt?: string | null
  isPaused: boolean
  onResume?: () => void
  onPause?: () => void
}

function calculateElapsedTime(
  startedAt: string | null,
  pausedAt: string | null,
  totalPauseSeconds: number,
  completedAt?: string | null
): number {
  if (!startedAt) return 0

  const start = new Date(startedAt).getTime()
  let end = Date.now()

  if (completedAt) {
    end = new Date(completedAt).getTime()
  } else if (pausedAt) {
    end = new Date(pausedAt).getTime()
  }

  const totalMs = end - start - totalPauseSeconds * 1000
  return Math.max(0, Math.floor(totalMs / 1000))
}

export function InstanceTimer({
  startedAt,
  pausedAt,
  totalPauseSeconds,
  completedAt,
  isPaused,
  onResume,
  onPause,
}: InstanceTimerProps) {
  const { t } = useI18n()
  const initialElapsed = useMemo(
    () => calculateElapsedTime(startedAt, pausedAt, totalPauseSeconds, completedAt),
    [startedAt, pausedAt, totalPauseSeconds, completedAt]
  )
  
  const [elapsed, setElapsed] = useState(initialElapsed)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!startedAt) return

    const tick = () => {
      setElapsed(calculateElapsedTime(startedAt, pausedAt, totalPauseSeconds, completedAt))
    }

    if (!completedAt && !isPaused) {
      intervalRef.current = setInterval(tick, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [startedAt, pausedAt, totalPauseSeconds, completedAt, isPaused])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3">
      <motion.div
        key={elapsed}
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        className="font-mono text-2xl font-bold text-gray-900 dark:text-white"
      >
        {formatTime(elapsed)}
      </motion.div>

      {!completedAt && (
        <div className="flex items-center gap-1">
          {isPaused ? (
            <Button
              onClick={onResume}
              icon={<Play size={18} />}
              type="text"
              className="text-green-600 dark:text-green-400"
              title={t('checklistInstance.resume')}
            />
          ) : (
            <Button
              onClick={onPause}
              icon={<Pause size={18} />}
              type="text"
              className="text-yellow-600 dark:text-yellow-400"
              title={t('status.paused')}
            />
          )}
        </div>
      )}

      {isPaused && !completedAt && (
        <Tag color="gold" className="animate-pulse">
          {t('status.paused')}
        </Tag>
      )}

      {completedAt && (
        <Tag color="green">
          {t('status.completed')}
        </Tag>
      )}
    </div>
  )
}
