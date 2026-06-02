import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'

export interface UserProfileNested {
  id: number
  timezone: string | null
  language: string | null
  notification_preferences: Record<string, unknown> | null
  ldap_dn: string | null
  employee_id: string | null
  department: string | null
  manager: number | null
  created_at: string
  updated_at: string
}

export interface UserMe {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  date_joined: string
  last_login: string | null
  profile: UserProfileNested | null
}

export interface UserMeUpdate {
  timezone?: string | null
  language?: string | null
  notification_preferences?: Record<string, unknown> | null
  employee_id?: string | null
  department?: string | null
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const { data } = await client.get<UserMe>('/users/me/')
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UserMeUpdate) => {
      const { data } = await client.put<UserMe>('/users/me/', payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'me'], data)
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
    },
  })
}
