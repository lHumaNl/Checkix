import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { CalendarEvent, CalendarEventCreate, CalendarEventUpdate } from '@/types'

export function useCalendarEvents(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['calendar-events', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate.toISOString())
      if (endDate) params.append('end_date', endDate.toISOString())
      const { data } = await client.get(`/calendar-events?${params}`)
      const rawEvents = Array.isArray(data) ? data : (data.items ?? [])
      // Map backend field names to frontend CalendarEvent interface
      return rawEvents.map((event: Record<string, unknown>) => ({
        ...event,
        start_datetime: event.start_datetime || event.start_time,
        end_datetime: event.end_datetime || event.end_time,
      })) as CalendarEvent[]
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  })
}

export function useCalendarEvent(id: number) {
  return useQuery({
    queryKey: ['calendar-event', id],
    queryFn: async () => {
      const { data } = await client.get<CalendarEvent>(`/calendar-events/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (event: CalendarEventCreate) => {
      const { data } = await client.post<CalendarEvent>('/calendar-events', event)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...event }: CalendarEventUpdate & { id: number }) => {
      const { data } = await client.patch<CalendarEvent>(`/calendar-events/${id}`, event)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/calendar-events/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}
