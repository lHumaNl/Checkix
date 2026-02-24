import { useMemo } from 'react'
import { subDays } from 'date-fns'
import CalendarHeatmap from 'react-calendar-heatmap'
import { useHeatmapData } from '@/api/useCompletionData'
import 'react-calendar-heatmap/dist/styles.css'

export function ActivityHeatmap() {
  const { data, isLoading, error } = useHeatmapData()

  const values = useMemo(() => {
    if (!data) return []
    return data.map((d) => ({
      date: d.date,
      count: d.count,
    }))
  }, [data])

  const dates = useMemo(
    () => ({
      start: subDays(new Date(), 365),
      end: new Date(),
    }),
    []
  )

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-32 items-center justify-center text-gray-500 dark:text-gray-400">
        Unable to load heatmap data
      </div>
    )
  }

  return (
    <div className="activity-heatmap overflow-x-auto">
      <CalendarHeatmap
        startDate={dates.start}
        endDate={dates.end}
        values={values}
        classForValue={(value) => {
          if (!value || value.count === 0) return 'color-empty'
          if (value.count <= 2) return 'color-scale-1'
          if (value.count <= 4) return 'color-scale-2'
          if (value.count <= 6) return 'color-scale-3'
          if (value.count <= 8) return 'color-scale-4'
          return 'color-scale-5'
        }}
        titleForValue={(value) => {
          if (!value || !value.date) return ''
          return `${value.date}: ${value.count || 0} activities`
        }}
        showWeekdayLabels
      />
      <style>{`
        .activity-heatmap .react-calendar-heatmap {
          font-size: 10px;
        }
        .activity-heatmap .react-calendar-heatmap text {
          fill: #9ca3af;
        }
        .activity-heatmap .color-empty {
          fill: #f3f4f6;
        }
        .dark .activity-heatmap .color-empty {
          fill: #374151;
        }
        .activity-heatmap .color-scale-1 {
          fill: #bfdbfe;
        }
        .activity-heatmap .color-scale-2 {
          fill: #93c5fd;
        }
        .activity-heatmap .color-scale-3 {
          fill: #60a5fa;
        }
        .activity-heatmap .color-scale-4 {
          fill: #3b82f6;
        }
        .activity-heatmap .color-scale-5 {
          fill: #1d4ed8;
        }
        .activity-heatmap rect:hover {
          stroke: #1f2937;
          stroke-width: 1px;
        }
        .dark .activity-heatmap rect:hover {
          stroke: #f9fafb;
        }
      `}</style>
    </div>
  )
}
