'use client'

import { useEffect } from 'react'
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper'
import { useAppSelector } from '@/state/hooks'
import { selectIsWinterArcMode, selectIsFocusModeActive } from '@/state/slices/uiSlice'
import { selectLockInActive } from '@/state/slices/lockInSlice'
import { selectMomentumScore } from '@/state/slices/momentumSlice'
import { selectCognitiveState } from '@/state/slices/cognitiveStateSlice'
import { selectIdentityTitle } from '@/state/slices/identitySlice'

interface DashboardClientLayoutProps {
  children: React.ReactNode
}

export function DashboardClientLayout({ children }: DashboardClientLayoutProps) {
  const isWinterArcMode = useAppSelector(selectIsWinterArcMode)
  const lockInActive = useAppSelector(selectLockInActive)
  const momentumScore = useAppSelector(selectMomentumScore)
  const cognitiveState = useAppSelector(selectCognitiveState)
  const identityTitle = useAppSelector(selectIdentityTitle)
  const isFocusMode = useAppSelector(selectIsFocusModeActive)

  useEffect(() => {
    document.body.classList.toggle('winter-arc', isWinterArcMode)
    return () => { document.body.classList.remove('winter-arc') }
  }, [isWinterArcMode])

  useEffect(() => {
    const immersive = lockInActive && momentumScore > 60
    document.body.classList.toggle('lock-in-focused', immersive)
    return () => { document.body.classList.remove('lock-in-focused') }
  }, [lockInActive, momentumScore])

  useEffect(() => {
    document.body.classList.toggle('overwhelmed-mode', cognitiveState === 'overwhelmed')
    return () => { document.body.classList.remove('overwhelmed-mode') }
  }, [cognitiveState])

  // Identity class for visual theming
  useEffect(() => {
    const cls = `identity-${identityTitle.toLowerCase()}`
    document.body.className = document.body.className.replace(/identity-\w+/g, '').trim()
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [identityTitle])

  // Cognitive breathing class
  useEffect(() => {
    const cls = `cog-${cognitiveState}`
    document.body.className = document.body.className.replace(/cog-\w+/g, '').trim()
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [cognitiveState])

  // Time-based UI (morning feel)
  useEffect(() => {
    const h = new Date().getHours()
    document.body.classList.toggle('time-morning', h >= 6 && h < 11)
  }, [])

  // Focus mode
  useEffect(() => {
    document.body.classList.toggle('focus-mode', isFocusMode)
    return () => document.body.classList.remove('focus-mode')
  }, [isFocusMode])

  return <OnboardingWrapper>{children}</OnboardingWrapper>
}
