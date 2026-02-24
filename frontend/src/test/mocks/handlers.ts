import { http, HttpResponse, delay } from 'msw'

const API_BASE = '/api/v1'

export const handlers = [
  http.post(`${API_BASE}/auth/token/`, async () => {
    return HttpResponse.json({
      access: 'mock-access-token',
      refresh: 'mock-refresh-token',
    })
  }),

  http.post(`${API_BASE}/auth/token/refresh/`, async () => {
    return HttpResponse.json({
      access: 'new-mock-access-token',
    })
  }),

  http.get(`${API_BASE}/users/me`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || authHeader === 'Bearer null') {
      return new HttpResponse(null, { status: 401 })
    }
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: null,
      bio: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.get(`${API_BASE}/checklists`, async ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const perPage = parseInt(url.searchParams.get('per_page') || '10')
    
    return HttpResponse.json({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          title: 'Test Checklist 1',
          description: 'Description 1',
          category: 'work',
          tags: ['tag1'],
          folder_id: null,
          execution_mode: 'sequential',
          status: 'active',
          items_count: 3,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Test Checklist 2',
          description: 'Description 2',
          category: 'personal',
          tags: ['tag2'],
          folder_id: null,
          execution_mode: 'free_order',
          status: 'draft',
          items_count: 5,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ],
    })
  }),

  http.get(`${API_BASE}/checklists/:id`, async ({ params }) => {
    const id = Number(params.id)
    return HttpResponse.json({
      id,
      title: `Test Checklist ${id}`,
      description: `Description for checklist ${id}`,
      category: 'work',
      tags: ['tag1'],
      folder_id: null,
      execution_mode: 'sequential',
      status: 'active',
      items_count: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    })
  }),

  http.post(`${API_BASE}/checklists`, async () => {
    await delay(100)
    return HttpResponse.json({
      id: 3,
      title: 'New Checklist',
      description: 'New description',
      category: 'work',
      tags: [],
      folder_id: null,
      execution_mode: 'sequential',
      status: 'draft',
      items_count: 0,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
    }, { status: 201 })
  }),

  http.put(`${API_BASE}/checklists/:id`, async ({ params }) => {
    const id = Number(params.id)
    return HttpResponse.json({
      id,
      title: 'Updated Checklist',
      description: 'Updated description',
      category: 'work',
      tags: [],
      folder_id: null,
      execution_mode: 'sequential',
      status: 'active',
      items_count: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-04T00:00:00Z',
    })
  }),

  http.delete(`${API_BASE}/checklists/:id`, async () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API_BASE}/checklists/bulk_delete/`, async () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API_BASE}/instances`, async () => {
    return HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          template_id: 1,
          user_id: 1,
          status: 'completed',
          started_at: '2024-01-01T00:00:00Z',
          completed_at: '2024-01-01T01:00:00Z',
          paused_at: null,
          total_pause_seconds: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
        },
      ],
    })
  }),
]
