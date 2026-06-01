import { useQuery, useMutation } from '@tanstack/react-query'
import client from './client'
import type { ChartDataPoint, HeatmapData } from '@/types/dashboard'

async function fetchCompletionChart(): Promise<ChartDataPoint[]> {
  const { data } = await client.get('/dashboard/chart/completion')
  return Array.isArray(data) ? data : (data.items ?? []) as ChartDataPoint[]
}

async function fetchHeatmapData(): Promise<HeatmapData[]> {
  const { data } = await client.get('/dashboard/heatmap')
  return Array.isArray(data) ? data : (data.items ?? []) as HeatmapData[]
}

export function useCompletionChart() {
  return useQuery({
    queryKey: ['dashboard', 'chart', 'completion'],
    queryFn: fetchCompletionChart,
    staleTime: 5 * 60 * 1000,
  })
}

export function useHeatmapData() {
  return useQuery({
    queryKey: ['dashboard', 'heatmap'],
    queryFn: fetchHeatmapData,
    staleTime: 30 * 60 * 1000,
  })
}

interface TrendData {
  date: string
  instances_created: number
  instances_completed: number
}

export function useStatsByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['stats', 'date-range', startDate, endDate],
    queryFn: async () => {
      try {
        const { data } = await client.get('/stats/by_date_range/', {
          params: { start_date: startDate, end_date: endDate },
        })
        const items = Array.isArray(data) ? data : (data.items ?? data)
        return (items as TrendData[]).reverse()
      } catch {
        // Fallback: return empty data when endpoint is not available
        return [] as TrendData[]
      }
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  })
}

export function useExportStatsCSV() {
  return useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      try {
        const response = await client.get('/stats/export_csv/', {
          params: { start_date: startDate, end_date: endDate },
          responseType: 'blob',
        })
        return { blob: response.data, startDate, endDate }
      } catch {
        // Fallback: generate CSV from available data
        const { data } = await client.get('/dashboard/chart/completion/')
        const chartData = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : [])
        const csvRows = ['Date,Count']
        chartData.forEach((row: { date?: string; count?: number }) => {
          csvRows.push(`${row.date || ''},${row.count || 0}`)
        })
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        return { blob, startDate, endDate }
      }
    },
    onSuccess: ({ blob, startDate, endDate }) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `checkix_stats_${startDate}_${endDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}
