import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { Tag, TagCreate } from '@/types'

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await client.get('/tags')
      return Array.isArray(data) ? data : (data.results ?? []) as Tag[]
    },
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: TagCreate) => {
      const { data: response } = await client.post<Tag>('/tags', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TagCreate> }) => {
      const { data: response } = await client.put<Tag>(`/tags/${id}`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/tags/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}
