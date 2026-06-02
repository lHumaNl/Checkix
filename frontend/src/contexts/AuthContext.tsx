/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import axios from 'axios'
import type { User } from '@/types'
import client, { setAccessToken, getAccessToken } from '@/api/client'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initialize = async () => {
      // If already have an in-memory token (e.g. HMR), just fetch user
      if (getAccessToken()) {
        try {
          const response = await client.get<User>('/users/me')
          setUser(response.data)
        } catch {
          setAccessToken(null)
        }
        setLoading(false)
        return
      }

      // Restore session using refresh token from localStorage
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/token/refresh/', {
            refresh: refreshToken,
          })
          setAccessToken(data.access)
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh)
          }
          const userRes = await client.get<User>('/users/me')
          setUser(userRes.data)
        } catch {
          localStorage.removeItem('refresh_token')
        }
      }

      setLoading(false)
    }

    initialize()
  }, [])

  const login = async (username: string, password: string) => {
    const response = await client.post<{ access: string; refresh: string }>('/auth/token/', {
      username,
      password,
    })
    const { access, refresh } = response.data
    setAccessToken(access)
    localStorage.setItem('refresh_token', refresh)

    const userResponse = await client.get<User>('/users/me')
    setUser(userResponse.data)
  }

  const logout = () => {
    setAccessToken(null)
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token: getAccessToken(),
        loading,
        login,
        logout,
        isAuthenticated: !!user && !!getAccessToken(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
