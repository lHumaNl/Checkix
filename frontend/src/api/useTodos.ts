import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { PaginatedResponse } from '@/types'

export interface TodoItem {
  id: number
  todo_list_id: number
  title: string
  description: string | null
  status: 'pending' | 'completed' | 'cancelled'
  order: number
  due_date: string | null
  completed_at: string | null
  priority: 'low' | 'medium' | 'high'
  parent_id: number | null
  is_completed: boolean
  children: TodoItem[]
  created_at: string
  updated_at: string
}

export interface TodoList {
  id: number
  name: string
  description: string | null
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  icon: string
  is_favorite: boolean
  items_count: number
  completed_items_count: number
  progress_percentage: number
  items: TodoItem[]
  created_at: string
  updated_at: string
}

export function useTodoLists(params: { search?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['todos', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params.search) searchParams.set('search', params.search)
      if (params.status) searchParams.set('status', params.status)
      const query = searchParams.toString()
      const { data } = await client.get<PaginatedResponse<TodoList>>(
        `/todos/${query ? `?${query}` : ''}`
      )
      return data
    },
  })
}

export function useCreateTodoList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; priority?: string }) => {
      const { data } = await client.post<TodoList>('/todos/', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

export function useUpdateTodoList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TodoList> }) => {
      const { data: response } = await client.patch<TodoList>(`/todos/${id}/`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

export function useDeleteTodoList() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/todos/${id}/`)
      return id
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

export function useCreateTodoItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, payload }: { listId: number; payload: { title: string; priority?: string } }) => {
      const { data } = await client.post<TodoItem>(`/todos/${listId}/items/`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'], refetchType: 'all' })
    },
  })
}

export function useUpdateTodoItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, itemId, data }: { listId: number; itemId: number; data: Partial<TodoItem> }) => {
      const { data: response } = await client.patch<TodoItem>(`/todos/${listId}/items/${itemId}/`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

export function useDeleteTodoItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, itemId }: { listId: number; itemId: number }) => {
      await client.delete(`/todos/${listId}/items/${itemId}/`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
