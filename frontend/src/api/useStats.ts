import { useQuery } from '@tanstack/react-query'
import client from './client'

export interface OverallStats {
  total_templates: number
  total_instances_created: number
  total_instances_completed: number
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
      const { data } = await client.get<OverallStats>('/stats/overall/', { params })
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useTopTemplates(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['stats', 'top-templates', startDate, endDate],
    queryFn: async () => {
      const { data } = await client.get<TopTemplate[]>('/stats/top_templates/', {
        params: { start_date: startDate, end_date: endDate },
      })
      return Array.isArray(data) ? data : []
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
      const { data } = await client.get<CategoryStat[]>('/stats/by_category/', { params })
      return Array.isArray(data) ? data : []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecentStats(days = 30) {
  return useQuery({
    queryKey: ['stats', 'recent', days],
    queryFn: async () => {
      const { data } = await client.get<RecentStat[]>('/stats/recent/', { params: { days } })
      return Array.isArray(data) ? data : []
    },
    staleTime: 5 * 60 * 1000,
  })
}
