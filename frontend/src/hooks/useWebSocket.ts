import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_URL } from '../config'
import type { MarketData } from '../types/market'

export type WebSocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error'

const MAX_RETRY_DELAY = 30_000
const INITIAL_RETRY_DELAY = 1_000

export function useWebSocket() {
  const [marketData, setMarketData] = useState<MarketData>({})
  const [tickers, setTickers] = useState<string[]>([])
  const [status, setStatus] = useState<WebSocketStatus>('connecting')
  const [retryCount, setRetryCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  const connect = useCallback(() => {
    if (unmountedRef.current) return

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return }
        setStatus('connected')
        setRetryCount(0)
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { type?: string; data?: MarketData }
          if (msg.type !== 'UPDATE' || !msg.data) return
          const data = msg.data
          setMarketData(data)
          setTickers((prev) => {
            const keys = Object.keys(data)
            if (keys.length && !prev.length) return keys.sort()
            return prev
          })
        } catch {}
      }

      ws.onclose = () => {
        if (unmountedRef.current) return
        setRetryCount((prev) => {
          const next = prev + 1
          const delay = Math.min(INITIAL_RETRY_DELAY * 2 ** prev, MAX_RETRY_DELAY)
          setStatus('reconnecting')
          retryTimerRef.current = setTimeout(connect, delay)
          return next
        })
      }

      ws.onerror = () => {
        // onclose will fire after onerror, reconnection handled there
      }
    } catch {
      if (!unmountedRef.current) {
        setStatus('error')
        const delay = Math.min(INITIAL_RETRY_DELAY * 2 ** retryCount, MAX_RETRY_DELAY)
        retryTimerRef.current = setTimeout(connect, delay)
      }
    }
  }, [retryCount])

  useEffect(() => {
    unmountedRef.current = false
    connect()

    return () => {
      unmountedRef.current = true
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { marketData, tickers, status, retryCount }
}
