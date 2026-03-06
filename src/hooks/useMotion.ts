'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveMotion, toFramerMotion, toFramerTransition } from '@/lib/motion'
import type { MotionEvent, MotionSpec, AvatarState } from '@/lib/motion'

/**
 * useMotion — React hook for the Motion Agent system.
 *
 * Emits system events and receives animation specifications.
 * Respects reduced-motion preferences.
 *
 * Usage:
 *   const { emit, activeSpec, avatarState, prefersReducedMotion } = useMotion()
 *   emit({ type: 'task_completed', affectedEntities: ['task_123'], severity: 'low', cognitiveLoad: 'low' })
 */
export function useMotion() {
  const [activeSpec, setActiveSpec] = useState<MotionSpec | null>(null)
  const [avatarState, setAvatarState] = useState<AvatarState>('neutral')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
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

  /**
   * Emit a system event. The Motion Agent resolves it into an animation spec.
   * Returns the spec (or null if suppressed).
   */
  const emit = useCallback((event: MotionEvent): MotionSpec | null => {
    // Respect reduced-motion preference — only allow stillness category
    if (prefersReducedMotion) {
      const spec = resolveMotion(event)
      if (spec) {
        setAvatarState(spec.avatar_state)
      }
      return null
    }

    const spec = resolveMotion(event)

    if (spec) {
      setActiveSpec(spec)
      setAvatarState(spec.avatar_state)

      // Clear active spec after animation completes
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setActiveSpec(null)
      }, spec.animation.duration_ms + spec.animation.delay_ms + 50)
    }

    return spec
  }, [prefersReducedMotion])

  /**
   * Get Framer Motion props for the active spec.
   * Returns null if no active animation.
   */
  const framerProps = activeSpec ? {
    ...toFramerMotion(activeSpec),
    transition: toFramerTransition(activeSpec.animation),
  } : null

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    emit,
    activeSpec,
    avatarState,
    framerProps,
    prefersReducedMotion,
  }
}
