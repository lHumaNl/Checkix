export interface DashboardStats {
  total_checklists: number
  completed_checklists: number
  total_todos: number
  completed_todos: number
  upcoming_events: number
  streak_days: number
  completion_rate: number
  weekly_change: number
}

export interface ActivityItem {
  id: number
  type: 'checklist' | 'todo' | 'event' | 'achievement'
  action: 'created' | 'completed' | 'updated' | 'deleted'
  title: string
  description: string | null
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface HeatmapData {
  date: string
  count: number
}

export interface ProgressMetric {
  label: string
  value: number
  max: number
  color: string
}
