import { useQuery } from '@tanstack/react-query'
import client from './client'
import type { DashboardStats } from '@/types/dashboard'

async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await client.get<DashboardStats>('/dashboard/stats')
  return data
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000,
  })
}
