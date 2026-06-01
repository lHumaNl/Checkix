import { useQuery } from '@tanstack/react-query'
import client from './client'
import type { ActivityItem, PaginatedResponse } from '@/types'

async function fetchActivityFeed(page = 1, limit = 20): Promise<PaginatedResponse<ActivityItem>> {
  const { data } = await client.get('/dashboard/activities', {
    params: { page, page_size: limit },
  })
  // Backend returns {items, total, page, page_size, total_pages} from paginate()
  // Items are CompletionLog objects - map to ActivityItem
  const rawItems = data.items ?? data.results ?? []
  const mappedItems: ActivityItem[] = rawItems.map((item: Record<string, unknown>) => ({
    id: item.id as number,
    type: (item.action as string)?.includes('todo') ? 'todo' as const :
          (item.action as string)?.includes('checklist') ? 'checklist' as const :
          'checklist' as const,
    action: ((item.action as string)?.includes('completed') ? 'completed' :
             (item.action as string)?.includes('created') ? 'created' :
             (item.action as string)?.includes('deleted') ? 'deleted' : 'updated') as ActivityItem['action'],
    title: (item.instance as Record<string, unknown>)?.name as string || 'Activity',
    description: (item.notes as string) || null,
    timestamp: item.timestamp as string || item.created_at as string,
  }))
  return {
    total: data.total ?? rawItems.length,
    page: data.page ?? page,
    page_size: data.page_size ?? limit,
    total_pages: data.total_pages ?? 1,
    items: mappedItems,
  }
}

export function useActivityFeed(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['dashboard', 'activities', page, limit],
    queryFn: () => fetchActivityFeed(page, limit),
    staleTime: 60 * 1000,
  })
}
