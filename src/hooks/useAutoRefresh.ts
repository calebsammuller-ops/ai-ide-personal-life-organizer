'use client'

import { useEffect, useRef } from 'react'

/**
 * Runs callback on an interval, pausing when the tab is hidden and resuming on focus.
 */
export function useAutoRefresh(callback: () => void, intervalMs = 3 * 60 * 1000) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    function start() {
      if (intervalId) return
      intervalId = setInterval(() => {
        if (!document.hidden) {
          callbackRef.current()
        }
      }, intervalMs)
    }

    function stop() {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        stop()
      } else {
        callbackRef.current()
        start()
      }
    }

    start()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [intervalMs])
}
