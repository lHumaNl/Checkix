import { useQuery } from '@tanstack/react-query'
import client from './client'

export interface SearchResults {
  tags: Array<{ id: number; name: string }>
  folders: Array<{ id: number; name: string }>
  checklists: Array<{ id: number; name: string; description: string | null }>
  todos: Array<{ id: number; name: string; status: string }>
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim()) return { tags: [], folders: [], checklists: [], todos: [] } as SearchResults
      const { data } = await client.get('/search/', {
        params: { q: query },
      })
      return data.results ?? data.items ?? { tags: [], folders: [], checklists: [], todos: [] }
    },
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
    placeholderData: { tags: [], folders: [], checklists: [], todos: [] },
  })
}
