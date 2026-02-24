import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { PaginatedResponse } from '@/types'

export interface WebhookEvent {
  id: number
  webhook: number
  webhook_name: string
  checklist_instance: number | null
  checklist_instance_name: string | null
  event_type: string
  status: 'pending' | 'sent' | 'failed'
  status_display: string
  response_code: number | null
  retry_count: number
  sent_at: string | null
  created_at: string
}

export interface Webhook {
  id: number
  name: string
  event_type: 'instance_started' | 'instance_completed' | 'item_completed'
  event_type_display: string
  endpoint_url: string
  is_active: boolean
  headers: Record<string, string>
  events_count: number
  recent_events: WebhookEvent[]
  last_event_status: 'pending' | 'sent' | 'failed' | null
  created_at: string
  updated_at: string
}

export function useWebhooks(params: { search?: string } = {}) {
  return useQuery({
    queryKey: ['webhooks', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.search) searchParams.set('search', params.search)
      const query = searchParams.toString()
      const { data } = await client.get<PaginatedResponse<Webhook>>(
        `/webhooks/${query ? `?${query}` : ''}`
      )
      return data
    },
  })
}

export function useCreateWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      name: string
      event_type: string
      endpoint_url: string
      secret?: string
      is_active?: boolean
      headers?: Record<string, string>
    }) => {
      const { data } = await client.post<Webhook>('/webhooks/', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Webhook> & { secret?: string } }) => {
      const { data: response } = await client.patch<Webhook>(`/webhooks/${id}/`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/webhooks/${id}/`)
      return id
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

export function useToggleWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await client.post<Webhook>(`/webhooks/${id}/toggle_active/`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}
