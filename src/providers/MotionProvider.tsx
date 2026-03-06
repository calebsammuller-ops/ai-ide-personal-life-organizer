'use client'

import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react'
import { resolveMotion, toFramerMotion, toFramerTransition } from '@/lib/motion'
import type { MotionEvent, MotionSpec, AvatarState } from '@/lib/motion'

interface MotionContextValue {
  /** Emit a system event to the motion agent */
  emit: (event: MotionEvent) => MotionSpec | null
  /** Currently active animation spec (null when idle) */
  activeSpec: MotionSpec | null
  /** Current avatar state derived from last event */
  avatarState: AvatarState
  /** Whether the user prefers reduced motion */
  prefersReducedMotion: boolean
  /** Event history (last 10 events for debugging) */
  recentEvents: MotionEvent[]
}

const MotionContext = createContext<MotionContextValue>({
  emit: () => null,
  activeSpec: null,
  avatarState: 'neutral',
  prefersReducedMotion: false,
  recentEvents: [],
})

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [activeSpec, setActiveSpec] = useState<MotionSpec | null>(null)
  const [avatarState, setAvatarState] = useState<AvatarState>('neutral')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [recentEvents, setRecentEvents] = useState<MotionEvent[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detect reduced-motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const emit = useCallback((event: MotionEvent): MotionSpec | null => {
    // Track recent events
    setRecentEvents(prev => [...prev.slice(-9), event])

    const spec = resolveMotion(event)

    if (spec) {
      setAvatarState(spec.avatar_state)

      // Respect reduced-motion — still update avatar state but skip animation
      if (prefersReducedMotion && spec.category !== 'stillness') {
        return spec
      }

      setActiveSpec(spec)

      // Clear after animation completes
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setActiveSpec(null)
      }, spec.animation.duration_ms + spec.animation.delay_ms + 50)
    }

    return spec
  }, [prefersReducedMotion])

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <MotionContext.Provider value={{
      emit,
      activeSpec,
      avatarState,
      prefersReducedMotion,
      recentEvents,
    }}>
      {children}
    </MotionContext.Provider>
  )
}

export function useMotionContext() {
  return useContext(MotionContext)
}

/**
 * Helper: get Framer Motion animation props from a MotionSpec.
 */
export function specToFramerProps(spec: MotionSpec | null) {
  if (!spec) return null
  return {
    ...toFramerMotion(spec),
    transition: toFramerTransition(spec.animation),
  }
}
