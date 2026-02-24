import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { 
  ChecklistInstance, 
  ChecklistInstanceCreate, 
  ChecklistResponseUpdate,
  PaginatedResponse 
} from '@/types'

interface UseChecklistInstancesParams {
  template_id?: number
  status?: string
  page?: number
  per_page?: number
}

export function useChecklistInstances(params: UseChecklistInstancesParams = {}) {
  return useQuery({
    queryKey: ['checklist-instances', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.template_id) searchParams.append('template_id', String(params.template_id))
      if (params.status && params.status !== 'all') searchParams.append('status', params.status)
      if (params.page) searchParams.append('page', String(params.page))
      if (params.per_page) searchParams.append('per_page', String(params.per_page))
      const { data } = await client.get<PaginatedResponse<ChecklistInstance>>(`/checklist-instances?${searchParams}`)
      return data
    },
  })
}

export function useChecklistInstance(id: number | undefined) {
  return useQuery({
    queryKey: ['checklist-instance', id],
    queryFn: async () => {
      const { data } = await client.get<ChecklistInstance>(`/checklist-instances/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateChecklistInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ChecklistInstanceCreate) => {
      const { data: response } = await client.post<ChecklistInstance>('/checklist-instances', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instances'] })
    },
  })
}

export function useStartInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await client.post<ChecklistInstance>(`/checklist-instances/${id}/start`)
      return data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-instances'] })
    },
  })
}

export function usePauseInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await client.post<ChecklistInstance>(`/checklist-instances/${id}/pause`)
      return data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-instances'] })
    },
  })
}

export function useResumeInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await client.post<ChecklistInstance>(`/checklist-instances/${id}/resume`)
      return data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-instances'] })
    },
  })
}

export function useCompleteInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await client.post<ChecklistInstance>(`/checklist-instances/${id}/complete`)
      return data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-instances'] })
    },
  })
}

export function useCancelInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await client.post<ChecklistInstance>(`/checklist-instances/${id}/cancel`)
      return data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', id] })
      queryClient.invalidateQueries({ queryKey: ['checklist-instances'] })
    },
  })
}

export function useUpdateResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ instanceId, itemId, data }: {
      instanceId: number
      itemId: number
      data: ChecklistResponseUpdate
    }) => {
      const { data: response } = await client.post(
        `/checklist-instances/items/${itemId}/toggle/`,
        { is_completed: data.is_checked }
      )
      return response
    },
    onMutate: async ({ instanceId, itemId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['checklist-instance', instanceId] })
      const previousInstance = queryClient.getQueryData<ChecklistInstance>(['checklist-instance', instanceId])

      if (previousInstance) {
        const updatedItems = previousInstance.item_instances.map(ii =>
          ii.id === itemId
            ? { ...ii, is_completed: !!data.is_checked, completed_at: data.is_checked ? new Date().toISOString() : null }
            : ii
        )
        queryClient.setQueryData<ChecklistInstance>(
          ['checklist-instance', instanceId],
          { ...previousInstance, item_instances: updatedItems }
        )
      }

      return { previousInstance }
    },
    onError: (_err, { instanceId }, context) => {
      if (context?.previousInstance) {
        queryClient.setQueryData(['checklist-instance', instanceId], context.previousInstance)
      }
    },
    onSettled: (_, __, { instanceId }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', instanceId] })
    },
  })
}

export function useSetPlaceholder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ instanceId, placeholderKey, value }: { instanceId: number; placeholderKey: string; value: string }) => {
      const { data } = await client.post(`/checklist-instances/${instanceId}/set_placeholder/`, {
        placeholder_key: placeholderKey,
        value,
      })
      return data
    },
    onSuccess: (_, { instanceId }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instance', instanceId] })
    },
  })
}

export function useDeleteInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/checklist-instances/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-instances'] })
    },
  })
}
