import { useQuery } from '@tanstack/react-query'
import client from './client'

export interface SearchResults {
  tags: Array<{ id: number; name: string }>
  folders: Array<{ id: number; name: string }>
  checklists: Array<{ id: number; name: string; description: string | null }>
  todos: Array<{ id: number; name: string; status: string }>
}

interface PaginatedSearchGroup<T> {
  items?: T[]
}

interface BackendSearchResults {
  checklists?: SearchResults['checklists']
  folders?: SearchResults['folders']
  instances?: unknown
  tags?: SearchResults['tags']
  templates?: PaginatedSearchGroup<SearchResults['checklists'][number]>
  todos?: SearchResults['todos'] | PaginatedSearchGroup<SearchResults['todos'][number]>
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim()) return { tags: [], folders: [], checklists: [], todos: [] } as SearchResults
      const { data } = await client.get<{ items?: SearchResults } | BackendSearchResults>('/search/', {
        params: { q: query },
      })
      return normalizeSearchResults(data)
    },
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
    placeholderData: { tags: [], folders: [], checklists: [], todos: [] },
  })
}

function normalizeSearchResults(data: { items?: SearchResults } | BackendSearchResults): SearchResults {
  if ('items' in data && data.items) return data.items
  const backend = data as BackendSearchResults
  const todos = Array.isArray(backend.todos) ? backend.todos : (backend.todos?.items ?? [])
  return {
    tags: backend.tags ?? [],
    folders: backend.folders ?? [],
    checklists: backend.checklists ?? backend.templates?.items ?? [],
    todos,
  }
}
