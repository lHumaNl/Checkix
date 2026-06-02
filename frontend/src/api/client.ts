import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { toast } from '@/hooks/useToast'
import { messages, type MessageLanguage } from '@/i18n/messages'

const baseURL = '/api'
const fallbackLanguage: MessageLanguage = 'en'

// SECURITY: Access token is stored in memory (not localStorage) to reduce XSS risk.
// Only the refresh token is persisted in localStorage for session continuity.
let inMemoryToken: string | null = null

export function setAccessToken(token: string | null) {
  inMemoryToken = token
}

export function getAccessToken(): string | null {
  return inMemoryToken
}

const client = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

function getCurrentLanguage(): MessageLanguage {
  if (typeof localStorage === 'undefined') return fallbackLanguage
  const language = localStorage.getItem('language')?.split('-')[0]
  return language && language in messages ? (language as MessageLanguage) : fallbackLanguage
}

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Keep trailing slashes because backend routes are declared with them.
    if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
      config.url += '/'
    } else if (config.url && config.url.includes('?') && !config.url.split('?')[0].endsWith('/')) {
      const [path, query] = config.url.split('?')
      config.url = `${path}/?${query}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    const isAuthEndpoint = originalRequest.url?.includes('/auth/token')
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        setAccessToken(null)
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${baseURL}/auth/token/refresh/`, {
          refresh: refreshToken,
        })
        setAccessToken(data.access)
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh)
        }
        processQueue(null, data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return client(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        setAccessToken(null)
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (error.response?.status && error.response.status >= 500) {
      toast({ title: messages[getCurrentLanguage()]['common.serverError'], variant: 'destructive' })
    }

    return Promise.reject(error)
  }
)

export default client
