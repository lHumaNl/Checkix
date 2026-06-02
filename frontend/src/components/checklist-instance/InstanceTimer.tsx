import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
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
            <button
              onClick={onResume}
              className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
              title={t('checklistInstance.resume')}
            >
              <Play size={18} />
            </button>
          ) : (
            <button
              onClick={onPause}
              className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900 transition-colors"
              title={t('status.paused')}
            >
              <Pause size={18} />
            </button>
          )}
        </div>
      )}

      {isPaused && !completedAt && (
        <span className="text-sm text-yellow-600 dark:text-yellow-400 animate-pulse">
          {t('status.paused')}
        </span>
      )}

      {completedAt && (
        <span className="text-sm text-green-600 dark:text-green-400">
          {t('status.completed')}
        </span>
      )}
    </div>
  )
}
