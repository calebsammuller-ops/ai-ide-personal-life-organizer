'use client'

import { useState, useEffect, useCallback } from 'react'

const ONBOARDING_KEY = 'lockin_onboarding_completed'
const ONBOARDING_VERSION = '2.0' // Increment to show onboarding again after major updates

interface OnboardingState {
  hasSeenOnboarding: boolean
  isLoading: boolean
  completeOnboarding: () => void
  resetOnboarding: () => void
}

export function useOnboarding(): OnboardingState {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true) // Default to true to prevent flash
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check localStorage on mount
    const stored = localStorage.getItem(ONBOARDING_KEY)
    if (stored) {
      try {
        const data = JSON.parse(stored)
        // Check if version matches
        if (data.version === ONBOARDING_VERSION) {
          setHasSeenOnboarding(true)
        } else {
          setHasSeenOnboarding(false)
        }
      } catch {
        setHasSeenOnboarding(false)
      }
    } else {
      setHasSeenOnboarding(false)
    }
    setIsLoading(false)
  }, [])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify({
        version: ONBOARDING_VERSION,
        completedAt: new Date().toISOString(),
      })
    )
    setHasSeenOnboarding(true)
  }, [])

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY)
    setHasSeenOnboarding(false)
  }, [])

  return {
    hasSeenOnboarding,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  }
}
