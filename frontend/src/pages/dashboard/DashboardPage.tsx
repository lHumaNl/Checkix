import { useState } from 'react'
import {
  CheckCircle2,
  ListTodo,
  Calendar,
  Flame,
  TrendingUp,
  Download,
} from 'lucide-react'
import {
  StatsCard,
  ActivityFeed,
  CompletionChart,
  ActivityHeatmap,
  ProgressRing,
  QuickActions,
} from '@/components/dashboard'
import { CompletionTrendChart } from '@/components/dashboard/CompletionTrendChart'
import { useDashboardStats } from '@/api/useDashboardStats'
import { useStatsByDateRange, useExportStatsCSV } from '@/api/useCompletionData'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { toast } from '@/hooks/useToast'

function getDefaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats()
  const [startDate, setStartDate] = useState(() => getDefaultDateRange().start)
  const [endDate, setEndDate] = useState(() => getDefaultDateRange().end)

  const { data: trendData } = useStatsByDateRange(startDate, endDate)
  const exportCSV = useExportStatsCSV()

  const handleExport = () => {
    exportCSV.mutate(
      { startDate, endDate },
      {
        onSuccess: () => toast({ title: 'Stats exported', variant: 'default' }),
        onError: () => toast({ title: 'Export failed', variant: 'destructive' }),
      }
    )
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error || !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400">Unable to load dashboard</p>
          <p className="mt-2 text-sm text-gray-500">Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back! Here's your overview.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px]"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[44px]"
          />
          <button
            onClick={handleExport}
            disabled={exportCSV.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        <StatsCard
          title="Completed Checklists"
          value={stats.completed_checklists}
          icon={CheckCircle2}
          change={stats.weekly_change}
          color="green"
        />
        <StatsCard
          title="Total Todos"
          value={stats.total_todos}
          icon={ListTodo}
          change={8}
          color="blue"
        />
        <StatsCard
          title="Upcoming Events"
          value={stats.upcoming_events}
          icon={Calendar}
          color="purple"
        />
        <StatsCard
          title="Current Streak"
          value={`${stats.streak_days} days`}
          icon={Flame}
          change={5}
          color="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800 h-full flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Completion Trends
            </h2>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <CompletionChart />
        </div>

        <CompletionTrendChart data={trendData ?? []} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800 h-full flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Heatmap
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your activity over the last year
            </p>
          </div>
          <ActivityHeatmap />
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800 h-full flex flex-col">
          <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
            Progress Overview
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <ProgressRing
              value={stats.completed_checklists}
              max={stats.total_checklists}
              color="#22c55e"
              label="Checklists"
            />
            <ProgressRing
              value={stats.completed_todos}
              max={stats.total_todos}
              color="#3b82f6"
              label="Todos"
            />
            <ProgressRing
              value={stats.completion_rate}
              max={100}
              color="#8b5cf6"
              label="Overall"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h2>
        <ActivityFeed limit={8} />
      </div>

      <QuickActions />
    </div>
  )
}
