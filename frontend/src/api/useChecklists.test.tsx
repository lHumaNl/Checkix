import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useChecklists,
  useChecklist,
  useCreateChecklist,
  useUpdateChecklist,
  useDeleteChecklist,
} from '@/api/useChecklists'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import type { ReactNode } from 'react'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useChecklists', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('fetches checklists successfully', async () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useChecklists(), { wrapper })
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    expect(result.current.data?.items).toHaveLength(2)
    expect(result.current.data?.items[0].title).toBe('Test Checklist 1')
  })

  it('handles error state', async () => {
    server.use(
      http.get('/api/checklists', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )
    
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useChecklists(), { wrapper })
    
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useChecklist', () => {
  it('fetches single checklist by id', async () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useChecklist(1), { wrapper })
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    expect(result.current.data?.id).toBe(1)
    expect(result.current.data?.title).toBe('Test Checklist 1')
  })

  it('is disabled when id is undefined', () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useChecklist(undefined), { wrapper })
    
    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useCreateChecklist', () => {
  it('creates a checklist and invalidates query', async () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useCreateChecklist(), { wrapper })
    
    await act(async () => {
      result.current.mutate({
        name: 'New Checklist',
        description: 'Test description',
      })
    })
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    expect(result.current.data?.id).toBe(3)
    expect(result.current.data?.title).toBe('New Checklist')
  })
})

describe('useUpdateChecklist', () => {
  it('updates a checklist and invalidates queries', async () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useUpdateChecklist(), { wrapper })
    
    await act(async () => {
      result.current.mutate({
        id: 1,
        data: {
          name: 'Updated Checklist',
          description: 'Updated description',
        },
      })
    })
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    expect(result.current.data?.id).toBe(1)
    expect(result.current.data?.title).toBe('Updated Checklist')
  })
})

describe('useDeleteChecklist', () => {
  it('deletes a checklist and invalidates query', async () => {
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useDeleteChecklist(), { wrapper })
    
    await act(async () => {
      result.current.mutate(1)
    })
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    
    expect(result.current.data).toBe(1)
  })

  it('handles delete error', async () => {
    server.use(
      http.delete('/api/checklists/:id', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )
    
    const wrapper = createWrapper()
    
    const { result } = renderHook(() => useDeleteChecklist(), { wrapper })
    
    await act(async () => {
      result.current.mutate(1)
    })
    
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
