import { useQuery } from '@tanstack/react-query'
import client from './client'

export interface OverallStats {
  total_templates: number
  total_instances_created: number
  total_instances_completed: number
  total_todos: number
  avg_completion_rate: number
  top_templates: Array<{
    template__id: number
    template__name: string
    total_created: number
    total_completed: number
  }>
  recent_activity: Array<{
    date: string
    template__name: string
    instances_created: number
    instances_completed: number
  }>
}

interface PaginatedApiResponse<T> {
  items?: T[]
}

interface BackendOverallStats {
  total_checklists?: number
  total_instances?: number
  total_templates?: number
  total_todos?: number
}

interface BackendUsageStat {
  avg_completion_percentage?: number | null
  completed_runs?: number
  completion_rate?: number | null
  instances_completed?: number
  instances_created?: number
  date?: string
  template_id?: number
  template_name?: string
  total_runs?: number
}

export interface TopTemplate {
  template_id: number
  template_name: string
  total_instances: number
  completed_instances: number
  completion_rate: number
}

export interface CategoryStat {
  community_template__category: string | null
  total_instances: number | null
  total_completed: number | null
}

export interface RecentStat {
  date: string
  template__name: string
  instances_created: number
  instances_completed: number
}

export function useOverallStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['stats', 'overall', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const { data } = await client.get<BackendOverallStats>('/stats/overall/', { params })
      return normalizeOverallStats(data)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useTopTemplates(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['stats', 'top-templates', startDate, endDate],
    queryFn: async () => {
      const { data } = await client.get<TopTemplate[] | PaginatedApiResponse<BackendUsageStat>>('/stats/top_templates/', {
        params: { start_date: startDate, end_date: endDate },
      })
      const rows = Array.isArray(data) ? data : (data.items ?? [])
      return rows.map(normalizeTopTemplate)
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  })
}

export function useStatsByCategory(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['stats', 'by-category', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const { data } = await client.get<CategoryStat[] | PaginatedApiResponse<BackendUsageStat>>('/stats/by_category/', { params })
      const rows = Array.isArray(data) ? data : (data.items ?? [])
      return rows.map(normalizeCategoryStat)
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecentStats(days = 30) {
  return useQuery({
    queryKey: ['stats', 'recent', days],
    queryFn: async () => {
      const { data } = await client.get<RecentStat[] | PaginatedApiResponse<BackendUsageStat>>('/stats/recent/', { params: { days } })
      const rows = Array.isArray(data) ? data : (data.items ?? [])
      return rows.map(normalizeRecentStat)
    },
    staleTime: 5 * 60 * 1000,
  })
}

function normalizeOverallStats(data: BackendOverallStats): OverallStats {
  return {
    total_templates: data.total_templates ?? data.total_checklists ?? 0,
    total_instances_created: data.total_instances ?? 0,
    total_instances_completed: 0,
    avg_completion_rate: 0,
    top_templates: [],
    recent_activity: [],
    total_todos: data.total_todos ?? 0,
  }
}

function normalizeTopTemplate(row: TopTemplate | BackendUsageStat): TopTemplate {
  const completionRate = row.completion_rate ?? ('avg_completion_percentage' in row ? row.avg_completion_percentage : 0) ?? 0
  return {
    template_id: 'template_id' in row ? (row.template_id ?? 0) : 0,
    template_name: 'template_name' in row ? (row.template_name ?? 'Untitled') : 'Untitled',
    total_instances: 'total_instances' in row ? row.total_instances : (row.total_runs ?? 0),
    completed_instances: 'completed_instances' in row ? row.completed_instances : (row.completed_runs ?? 0),
    completion_rate: completionRate,
  }
}

function normalizeCategoryStat(row: CategoryStat | BackendUsageStat): CategoryStat {
  return {
    community_template__category: 'community_template__category' in row ? row.community_template__category : (row.template_name ?? null),
    total_instances: 'total_instances' in row ? row.total_instances : (row.total_runs ?? 0),
    total_completed: 'total_completed' in row ? row.total_completed : (row.completed_runs ?? 0),
  }
}

function normalizeRecentStat(row: RecentStat | BackendUsageStat): RecentStat {
  return {
    date: row.date ?? '',
    template__name: 'template__name' in row ? row.template__name : (row.template_name ?? ''),
    instances_created: row.instances_created ?? ('total_runs' in row ? row.total_runs : 0) ?? 0,
    instances_completed: row.instances_completed ?? ('completed_runs' in row ? row.completed_runs : 0) ?? 0,
  }
}
