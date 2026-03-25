'use client'

import { useEffect, useRef } from 'react'

const IDLE_THRESHOLD = 20000 // 20 seconds

export function IdleWatcher() {
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const goIdle = () => document.body.classList.add('ui-idle')

    const wake = () => {
      document.body.classList.remove('ui-idle')
      clearTimeout(timer.current)
      timer.current = setTimeout(goIdle, IDLE_THRESHOLD)
    }

    timer.current = setTimeout(goIdle, IDLE_THRESHOLD)
    window.addEventListener('mousemove', wake, { passive: true })
    window.addEventListener('keydown', wake, { passive: true })
    window.addEventListener('touchstart', wake, { passive: true })

    return () => {
      clearTimeout(timer.current)
      document.body.classList.remove('ui-idle')
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('keydown', wake)
      window.removeEventListener('touchstart', wake)
    }
  }, [])

  return null
}
