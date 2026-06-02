import { useState } from 'react'
import { BarChart3, TrendingUp, CheckSquare, Clock, Award, Layers } from 'lucide-react'
import { useOverallStats, useTopTemplates, useStatsByCategory, useRecentStats } from '@/api/useStats'
import { useExportStatsCSV } from '@/api/useCompletionData'
import { useI18n } from '@/i18n'

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDefaultRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return { start: formatDate(start), end: formatDate(end) }
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

interface CompletionBarProps {
  value: number
  color?: string
}

function CompletionBar({ value, color = 'bg-blue-500' }: CompletionBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

export function StatsPage() {
  const { t } = useI18n()
  const defaultRange = getDefaultRange()
  const [startDate, setStartDate] = useState(defaultRange.start)
  const [endDate, setEndDate] = useState(defaultRange.end)
  const [appliedStart, setAppliedStart] = useState(defaultRange.start)
  const [appliedEnd, setAppliedEnd] = useState(defaultRange.end)

  const { data: overall, isLoading: overallLoading } = useOverallStats(appliedStart, appliedEnd)
  const { data: categoryStats, isLoading: categoryLoading } = useStatsByCategory(appliedStart, appliedEnd)
  const { data: recentStats, isLoading: recentLoading } = useRecentStats(30)
  const { data: topTemplatesData, isLoading: topLoading } = useTopTemplates(appliedStart, appliedEnd)
  const exportMutation = useExportStatsCSV()

  function applyRange() {
    if (startDate > endDate) return
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
  }

  function setPreset(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    const s = formatDate(start)
    const e = formatDate(end)
    setStartDate(s)
    setEndDate(e)
    setAppliedStart(s)
    setAppliedEnd(e)
  }

  const topTemplates = topTemplatesData ?? []

  const categoryData = (categoryStats ?? [])
    .filter(c => c.total_instances && c.total_instances > 0)
    .sort((a, b) => (b.total_instances ?? 0) - (a.total_instances ?? 0))

  const recentByDay = (recentStats ?? []).reduce<Record<string, { created: number; completed: number }>>(
    (acc, s) => {
      const key = s.date
      if (!acc[key]) acc[key] = { created: 0, completed: 0 }
      acc[key].created += s.instances_created
      acc[key].completed += s.instances_completed
      return acc
    },
    {}
  )
  const recentDays = Object.entries(recentByDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('stats.title')}</h1>
        <button
          onClick={() => exportMutation.mutate({ startDate: appliedStart, endDate: appliedEnd })}
          disabled={exportMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {exportMutation.isPending ? t('stats.exporting') : t('dashboard.exportCsv')}
        </button>
      </div>

      {/* Date range filter */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('common.startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('common.endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={applyRange}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            {t('common.apply')}
          </button>
          <div className="flex gap-2 ml-2">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setPreset(d)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overall stats cards */}
      {overallLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          <StatCard
            icon={<Layers size={18} />}
            label={t('stats.templatesUsed')}
            value={overall?.total_templates ?? 0}
          />
          <StatCard
            icon={<CheckSquare size={18} />}
            label={t('stats.instancesCreated')}
            value={overall?.total_instances_created ?? 0}
            sub={t('stats.inSelectedPeriod')}
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label={t('stats.completed')}
            value={overall?.total_instances_completed ?? 0}
          />
          <StatCard
            icon={<BarChart3 size={18} />}
            label={t('stats.completionRate')}
            value={`${overall?.avg_completion_rate ?? 0}%`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Top Templates */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-yellow-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('stats.topTemplates')}</h2>
          </div>
          {topLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : topTemplates.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              {t('stats.noPeriodData')}
            </p>
          ) : (
            <div className="space-y-3">
              {topTemplates.map((t, i) => (
                <div key={t.template_id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5 shrink-0">
                        #{i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {t.template_name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">
                      {t.total_instances} runs
                    </span>
                  </div>
                  <CompletionBar
                    value={t.completion_rate}
                    color={i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-blue-400'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Category */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5 h-full flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-purple-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('stats.byCategory')}</h2>
          </div>
          {categoryLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : categoryData.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              {t('stats.noCategoryData')}
            </p>
          ) : (
            <div className="space-y-3">
              {categoryData.map(c => {
                const total = c.total_instances ?? 0
                const completed = c.total_completed ?? 0
                const rate = total > 0 ? (completed / total) * 100 : 0
                const label = c.community_template__category ?? 'Uncategorized'
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">
                        {label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {completed}/{total}
                      </span>
                    </div>
                    <CompletionBar value={rate} color="bg-purple-500" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-green-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('stats.recentActivity')}
          </h2>
        </div>
        {recentLoading ? (
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        ) : recentDays.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            {t('stats.noRecentActivity')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t('stats.date')}</th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t('stats.created')}</th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t('stats.completed')}</th>
                  <th className="text-right pb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t('stats.rate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentDays.map(([date, vals]) => {
                  const rate = vals.created > 0 ? ((vals.completed / vals.created) * 100).toFixed(0) : '—'
                  return (
                    <tr key={date}>
                      <td className="py-2 text-gray-700 dark:text-gray-300">{date}</td>
                      <td className="py-2 text-right text-gray-700 dark:text-gray-300">{vals.created}</td>
                      <td className="py-2 text-right text-gray-700 dark:text-gray-300">{vals.completed}</td>
                      <td className="py-2 text-right">
                        <span className={`font-medium ${rate !== '—' && parseInt(rate) >= 80
                          ? 'text-green-600 dark:text-green-400'
                          : rate !== '—' && parseInt(rate) >= 50
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {rate !== '—' ? `${rate}%` : rate}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
