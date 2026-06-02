import { useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { getAccessToken } from '@/api/client'

interface UseWebSocketOptions {
  url: string
  onMessage?: (data: unknown) => void
  enabled?: boolean
  reconnectInterval?: number
  maxRetries?: number
}

export function useWebSocket({
  url,
  onMessage,
  enabled = true,
  reconnectInterval = 3000,
  maxRetries = 5,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(async () => {
    if (!enabled) return

    const token = getAccessToken()
    if (!token) return

    let wsUrl: string
    try {
      // Use a short-lived one-time ticket so the JWT never appears in the WS URL
      const { data } = await axios.get('/api/users/ws-ticket/', {
        headers: { Authorization: `Bearer ${token}` },
      })
      wsUrl = `${url}${url.includes('?') ? '&' : '?'}ticket=${data.ticket}`
    } catch {
      // Fall back to JWT token in URL if ticket fetch fails (e.g. network error)
      wsUrl = `${url}${url.includes('?') ? '&' : '?'}token=${token}`
    }

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      retriesRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessageRef.current?.(data)
      } catch {
        // ignore non-JSON messages
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (enabled && retriesRef.current < maxRetries) {
        retriesRef.current += 1
        reconnectTimerRef.current = setTimeout(() => { connect() }, reconnectInterval)
      }
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [url, enabled, reconnectInterval, maxRetries])

  useEffect(() => {
    connect()

    return () => {
      clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}
