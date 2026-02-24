import { useQuery } from '@tanstack/react-query'
import client from './client'
import type { ActivityItem, PaginatedResponse } from '@/types'

async function fetchActivityFeed(page = 1, limit = 20): Promise<PaginatedResponse<ActivityItem>> {
  const { data } = await client.get<PaginatedResponse<ActivityItem>>('/dashboard/activities', {
    params: { page, limit },
  })
  return data
}

export function useActivityFeed(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['dashboard', 'activities', page, limit],
    queryFn: () => fetchActivityFeed(page, limit),
    staleTime: 60 * 1000,
  })
}
