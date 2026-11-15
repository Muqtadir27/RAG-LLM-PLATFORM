'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { checkHealth } from './api'

export type ServerStatus = 'checking' | 'waking' | 'online' | 'offline'

const SLOW_AFTER_MS = 2500          // a healthy server answers /health much faster than this
const GIVE_UP_AFTER_MS = 120_000    // free-tier cold starts usually take 30–60s
const RETRY_EVERY_MS = 3000

/**
 * Pings the backend and reports whether it is up. Hosts like Render's free tier put the server to sleep
 * when idle, so the first request after a break can take about a minute. While that happens we report
 * "waking" (instead of letting every request fail with a confusing error), and keep retrying.
 */
export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>('checking')
  const [model, setModel] = useState<string | undefined>()
  const [wokeUp, setWokeUp] = useState(false)
  const runId = useRef(0)

  const connect = useCallback(async () => {
    const id = ++runId.current
    const started = Date.now()
    let slowTimer: ReturnType<typeof setTimeout> | undefined
    let sawWaking = false
    setStatus('checking')

    slowTimer = setTimeout(() => {
      if (runId.current === id) {
        sawWaking = true
        setStatus('waking')
      }
    }, SLOW_AFTER_MS)

    while (runId.current === id) {
      try {
        const health = await checkHealth(10_000)
        if (runId.current !== id) return
        clearTimeout(slowTimer)
        setModel(health.model)
        setStatus('online')
        if (sawWaking) setWokeUp(true)
        return
      } catch {
        if (runId.current !== id) return
        sawWaking = true
        if (Date.now() - started > GIVE_UP_AFTER_MS) {
          clearTimeout(slowTimer)
          setStatus('offline')
          return
        }
        setStatus('waking')
        await new Promise(r => setTimeout(r, RETRY_EVERY_MS))
      }
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      runId.current++ // cancel the loop on unmount
    }
  }, [connect])

  const clearWokeUp = useCallback(() => setWokeUp(false), [])
  return { status, model, wokeUp, clearWokeUp, retry: connect }
}
