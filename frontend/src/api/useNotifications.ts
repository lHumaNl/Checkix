import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { PaginatedResponse } from '@/types'

export interface NotificationSequence {
  id: number
  notification_rule: number
  sequence_order: number
  trigger_offset_minutes: number
  recipient_type: 'assignee' | 'group' | 'custom'
  recipient_group: number | null
  recipient_group_name: string | null
  custom_email: string
  email_subject: string
  email_body: string
}

export interface NotificationRule {
  id: number
  checklist_template: number | null
  checklist_template_name: string | null
  checklist_item: number | null
  checklist_item_title: string | null
  event_type: 'task_due_in' | 'task_overdue_by' | 'task_completed' | 'task_status_changed' | 'checklist_completed' | 'task_assigned'
  event_type_display: string
  is_active: boolean
  sequences: NotificationSequence[]
  created_at: string
  updated_at: string
}

export interface NotificationLog {
  id: number
  notification_sequence: number
  checklist_instance: number | null
  checklist_instance_name: string | null
  recipient_email: string
  status: 'pending' | 'sent' | 'failed'
  status_display: string
  sent_at: string | null
  error_message: string
  created_at: string
}

export function useNotificationRules(params: { search?: string; event_type?: string; is_active?: boolean } = {}) {
  return useQuery({
    queryKey: ['notifications', 'rules', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.event_type) searchParams.set('event_type', params.event_type)
      if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active))
      const query = searchParams.toString()
      const { data } = await client.get<PaginatedResponse<NotificationRule>>(
        `/notifications/rules/${query ? `?${query}` : ''}`
      )
      return data
    },
  })
}

export function useCreateNotificationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      event_type: string
      checklist_template?: number | null
      is_active?: boolean
    }) => {
      const { data } = await client.post<NotificationRule>('/notifications/rules/', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'rules'] })
    },
  })
}

export function useDeleteNotificationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/notifications/rules/${id}/`)
      return id
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'rules'] })
    },
  })
}

export function useToggleNotificationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await client.post<NotificationRule>(`/notifications/rules/${id}/toggle_active/`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'rules'] })
    },
  })
}

export function useNotificationLogs(params: { status?: string } = {}) {
  return useQuery({
    queryKey: ['notifications', 'logs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.status) searchParams.set('status', params.status)
      const query = searchParams.toString()
      const { data } = await client.get<PaginatedResponse<NotificationLog>>(
        `/notifications/logs/${query ? `?${query}` : ''}`
      )
      return data
    },
  })
}
