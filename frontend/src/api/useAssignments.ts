import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { PaginatedResponse } from '@/types'

export interface Assignment {
  id: number
  assignment_type: 'template' | 'item' | 'runtime'
  checklist_template: number | null
  checklist_template_name: string | null
  checklist_item: number | null
  checklist_item_title: string | null
  checklist_instance: number | null
  checklist_instance_name: string | null
  assignee_type: 'user' | 'group' | 'parameter' | 'manager'
  assignee_user: number | null
  assignee_user_name: string | null
  assignee_group: number | null
  assignee_group_name: string | null
  assignee_parameter: string
  assignee_display: string
  target_display: string
  is_exclusive: boolean
  auto_notify: boolean
  created_at: string
  updated_at: string
}

export function useAssignments(
  params: { search?: string; assignment_type?: string; assignee_type?: string } = {}
) {
  return useQuery({
    queryKey: ['assignments', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.search) searchParams.set('search', params.search)
      if (params.assignment_type) searchParams.set('assignment_type', params.assignment_type)
      if (params.assignee_type) searchParams.set('assignee_type', params.assignee_type)
      const query = searchParams.toString()
      const { data } = await client.get<PaginatedResponse<Assignment>>(
        `/assignments/${query ? `?${query}` : ''}`
      )
      return data
    },
  })
}

export function useCreateAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      assignment_type: string
      assignee_type: string
      assignee_user?: number
      assignee_group?: number
      assignee_parameter?: string
      checklist_template?: number
      checklist_item?: number
      checklist_instance?: number
      is_exclusive?: boolean
      auto_notify?: boolean
    }) => {
      const { data } = await client.post<Assignment>('/assignments/', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/assignments/${id}/`)
      return id
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })
}

export function useBulkDeleteAssignments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: number[]) => {
      await client.post('/assignments/bulk_delete/', { ids })
      return ids
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })
}
