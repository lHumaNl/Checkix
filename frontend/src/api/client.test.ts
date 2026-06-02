import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import client, { setAccessToken, getAccessToken } from '@/api/client'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'

describe('API Client', () => {
  beforeEach(() => {
    setAccessToken(null)
    vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null)
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('token management', () => {
    it('setAccessToken stores token in memory', () => {
      setAccessToken('test-token')
      expect(getAccessToken()).toBe('test-token')
    })

    it('setAccessToken(null) clears token', () => {
      setAccessToken('test-token')
      setAccessToken(null)
      expect(getAccessToken()).toBeNull()
    })
  })

  describe('request interceptor', () => {
    it('adds Authorization header when token exists', async () => {
      setAccessToken('my-token')
      
      let capturedAuth: string | null = null
      server.use(
        http.get('/api/users/me/', ({ request }) => {
          capturedAuth = request.headers.get('Authorization')
          return HttpResponse.json({ id: 1 })
        })
      )
      
      await client.get('/users/me/')
      expect(capturedAuth).toBe('Bearer my-token')
    })

    it('does not add Authorization header when no token', async () => {
      setAccessToken(null)
      
      let capturedAuth: string | null = 'present'
      server.use(
        http.get('/api/checklists/', ({ request }) => {
          capturedAuth = request.headers.get('Authorization')
          return HttpResponse.json({ results: [] })
        })
      )
      
      await client.get('/checklists/')
      expect(capturedAuth).toBeNull()
    })

    it('adds trailing slash to URLs without query params', async () => {
      server.use(
        http.get('/api/users/me/', () => {
          return HttpResponse.json({ id: 1 })
        })
      )
      
      const response = await client.get('/users/me')
      expect(response.config.url).toBe('/users/me/')
    })

    it('handles URLs with query params correctly', async () => {
      server.use(
        http.get('/api/checklists/', () => {
          return HttpResponse.json({ results: [] })
        })
      )
      
      const response = await client.get('/checklists?page=1')
      expect(response.config.url).toBe('/checklists/?page=1')
    })
  })

  describe('response interceptor - 401 handling', () => {
    it('refreshes token on 401 and retries request', async () => {
      let requestCount = 0
      
      server.use(
        http.get('/api/checklists/', ({ request }) => {
          requestCount++
          const auth = request.headers.get('Authorization')
          
          if (auth === 'Bearer valid-token') {
            return HttpResponse.json({ count: 0, results: [] })
          }
          return new HttpResponse(null, { status: 401 })
        }),
        http.post('/api/auth/token/refresh/', () => {
          return HttpResponse.json({ access: 'valid-token' })
        })
      )
      
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue('refresh-token')
      setAccessToken('expired-token')
      
      const response = await client.get('/checklists/')
      
      expect(requestCount).toBe(2)
      expect(response.data).toBeDefined()
    })
  })
})
