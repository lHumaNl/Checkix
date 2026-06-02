import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { ChecklistTemplate, ChecklistTemplateCreate, ChecklistTemplateUpdate, PaginatedResponse } from '@/types'

interface UseChecklistsParams {
  folder_id?: number | null
  status?: string
  search?: string
  tags?: string[]
  page?: number
  per_page?: number
}

export function useChecklists(params: UseChecklistsParams = {}) {
  return useQuery({
    queryKey: ['checklists', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.folder_id) searchParams.append('folder_id', String(params.folder_id))
      if (params.status && params.status !== 'all') searchParams.append('status', params.status)
      if (params.search) searchParams.append('search', params.search)
      if (params.tags?.length) searchParams.append('tags', params.tags.join(','))
      if (params.page) searchParams.append('page', String(params.page))
      if (params.per_page) searchParams.append('per_page', String(params.per_page))
      const { data } = await client.get<PaginatedResponse<ChecklistTemplate>>(`/checklists?${searchParams}`)
      return data
    },
  })
}

export function useChecklist(id: number | undefined) {
  return useQuery({
    queryKey: ['checklist', id],
    queryFn: async () => {
      const { data } = await client.get<ChecklistTemplate>(`/checklists/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ChecklistTemplateCreate) => {
      const { data: response } = await client.post<ChecklistTemplate>('/checklists', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
    },
  })
}

export function useUpdateChecklist() {

  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ChecklistTemplateUpdate }) => {
      const { data: response } = await client.put<ChecklistTemplate>(`/checklists/${id}`, data)
      return response
    },
    onSuccess: (updatedData, { id }) => {
      const numericId = typeof id === 'string' ? parseInt(id, 10) : id
      queryClient.setQueryData(['checklist', numericId], updatedData)
      queryClient.setQueryData(['checklist', id], updatedData)
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
    },
  })
}

export function useDeleteChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/checklists/${id}`)
      return id
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
    },
  })
}

export function useBulkDeleteChecklists() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => client.delete(`/checklists/${id}`)))
      return ids
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['checklists'] })
      const previousData = queryClient.getQueryData<PaginatedResponse<ChecklistTemplate>>(['checklists'])
      
      if (previousData) {
        queryClient.setQueryData<PaginatedResponse<ChecklistTemplate>>(
          ['checklists'],
          { ...previousData, items: previousData.items.filter(item => !ids.includes(item.id)) }
        )
      }
      
      return { previousData }
    },
    onError: (_err, _ids, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['checklists'], context.previousData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
    },
  })
}

export function useMoveChecklistsToFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, folder_id }: { ids: number[]; folder_id: number | null }) => {
      await Promise.all(ids.map((id) => client.put(`/checklists/${id}`, { folder_id })))
      return { ids, folder_id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
    },
  })
}

export function useDuplicateChecklist() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await client.post<ChecklistTemplate>(`/checklists/${id}/duplicate`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
    },
  })
}
