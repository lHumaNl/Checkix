import { useQuery } from '@tanstack/react-query'
import client from './client'
import type { DashboardStats } from '@/types/dashboard'

async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await client.get('/dashboard/stats')
  // Map backend response fields to frontend expectations
  return {
    total_templates: data.total_templates ?? 0,
    active_instances: data.active_instances ?? 0,
    completed_today: data.completed_today ?? 0,
    overdue_instances: data.overdue_instances ?? 0,
    avg_completion_rate: data.avg_completion_rate ?? null,
    // Map to frontend field names
    total_checklists: data.total_templates ?? 0,
    completed_checklists: data.completed_today ?? 0,
    total_todos: data.total_todos ?? 0,
    completed_todos: data.completed_todos ?? 0,
    upcoming_events: data.upcoming_events ?? 0,
    streak_days: data.active_instances ?? 0,
    completion_rate: data.avg_completion_rate ?? 0,
    weekly_change: 0,
  }
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000,
  })
}
