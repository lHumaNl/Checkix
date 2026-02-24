import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { CommunityTemplate, CommunityReview, ChecklistTemplate } from '@/types'

export function useCommunityTemplates(category?: string, search?: string) {
  return useQuery({
    queryKey: ['community-templates', category, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (category && category !== 'all') params.append('category', category)
      if (search) params.append('search', search)
      const { data } = await client.get(`/community/templates?${params}`)
      return Array.isArray(data) ? data : (data.results ?? []) as CommunityTemplate[]
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  })
}

export function useFeaturedTemplates() {
  return useQuery({
    queryKey: ['featured-templates'],
    queryFn: async () => {
      const { data } = await client.get('/community/templates/featured')
      return Array.isArray(data) ? data : (data.results ?? []) as CommunityTemplate[]
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  })
}

export function useCommunityTemplate(id: number) {
  return useQuery({
    queryKey: ['community-template', id],
    queryFn: async () => {
      const { data } = await client.get<CommunityTemplate>(`/community/templates/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useTemplateReviews(templateId: number) {
  return useQuery({
    queryKey: ['template-reviews', templateId],
    queryFn: async () => {
      const { data } = await client.get(`/community/templates/${templateId}/reviews`)
      return Array.isArray(data) ? data : (data.results ?? []) as CommunityReview[]
    },
    enabled: !!templateId,
  })
}

export function useDownloadTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: number) => {
      const { data } = await client.post<ChecklistTemplate>(`/community/templates/${templateId}/download`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
    },
  })
}

export function useSubmitReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ templateId, rating, comment }: { templateId: number; rating: number; comment: string }) => {
      const { data } = await client.post<CommunityReview>(`/community/templates/${templateId}/reviews`, {
        rating,
        comment,
      })
      return data
    },
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template-reviews', templateId] })
      queryClient.invalidateQueries({ queryKey: ['community-template', templateId] })
    },
  })
}
