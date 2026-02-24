import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { Folder, FolderCreate } from '@/types'

export function useFolders() {
  return useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data } = await client.get('/folders')
      return Array.isArray(data) ? data : (data.results ?? []) as Folder[]
    },
  })
}

export function useFolderTree() {
  return useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: async () => {
      const { data } = await client.get('/folders/tree')
      const folders = Array.isArray(data) ? data : (data.results ?? []) as Folder[]
      return buildTree(folders)
    },
  })
}

function buildTree(folders: Folder[]): Folder[] {
  const map = new Map<number, Folder>()
  const roots: Folder[] = []

  folders.forEach(folder => {
    map.set(folder.id, { ...folder, children: [] })
  })

  folders.forEach(folder => {
    const node = map.get(folder.id)!
    if (folder.parent_id === null) {
      roots.push(node)
    } else {
      const parent = map.get(folder.parent_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(node)
      }
    }
  })

  return roots
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: FolderCreate) => {
      const { data: response } = await client.post<Folder>('/folders', data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

export function useUpdateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FolderCreate> }) => {
      const { data: response } = await client.put<Folder>(`/folders/${id}`, data)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

export function useDeleteFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/folders/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}
