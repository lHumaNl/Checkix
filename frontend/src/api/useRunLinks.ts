import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { PaginatedResponse } from '@/types'

// Bare axios instance for unauthenticated public requests
const publicClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export interface RunLink {
  id: number
  checklist_template: number
  checklist_template_name: string
  unique_id: string
  name: string
  access_type: 'public' | 'restricted'
  access_type_display: string
  expires_at: string | null
  max_uses: number | null
  usage_count: number
  is_expired: boolean
  is_max_uses_reached: boolean
  is_valid: boolean
  created_by: number
  created_by_email: string
  created_at: string
  updated_at: string
}

export function useRunLinks(params: { search?: string; access_type?: string } = {}) {
  return useQuery({
    queryKey: ['run-links', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.search) searchParams.set('search', params.search)
      if (params.access_type) searchParams.set('access_type', params.access_type)
      const query = searchParams.toString()
      const { data } = await client.get<PaginatedResponse<RunLink>>(
        `/run-links/${query ? `?${query}` : ''}`
      )
      return data
    },
  })
}

export function useCreateRunLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      name: string
      checklist_template: number
      access_type: 'public' | 'restricted'
      expires_at?: string
      max_uses?: number
    }) => {
      const { data } = await client.post<RunLink>('/run-links/', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['run-links'] })
    },
  })
}

export function useDeleteRunLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/run-links/${id}/`)
      return id
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['run-links'] })
    },
  })
}

export interface RunLinkPublicInfo {
  name: string
  checklist_template_name: string
  expires_at: string | null
  max_uses: number | null
  usage_count: number
  is_valid: boolean
  is_expired: boolean
  is_max_uses_reached: boolean
}

export function useRunLinkPublicInfo(uniqueId: string) {
  return useQuery({
    queryKey: ['run-link', 'public', uniqueId],
    queryFn: async () => {
      const { data } = await publicClient.get<RunLinkPublicInfo>(
        `/run-links/execute/${uniqueId}/`
      )
      return data
    },
    enabled: !!uniqueId,
    retry: false,
  })
}

export interface ExecuteRunLinkResult {
  message: string
  instance_id: string
}

export function useExecuteRunLink() {
  return useMutation({
    mutationFn: async (uniqueId: string) => {
      const { data } = await publicClient.post<ExecuteRunLinkResult>(
        `/run-links/execute/${uniqueId}/`,
        {}
      )
      return data
    },
  })
}
