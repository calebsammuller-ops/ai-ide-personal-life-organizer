'use client'

import { useEffect } from 'react'
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper'
import { useAppSelector } from '@/state/hooks'
import { selectIsWinterArcMode } from '@/state/slices/uiSlice'
import { selectLockInActive } from '@/state/slices/lockInSlice'
import { selectMomentumScore } from '@/state/slices/momentumSlice'
import { selectCognitiveState } from '@/state/slices/cognitiveStateSlice'

interface DashboardClientLayoutProps {
  children: React.ReactNode
}

export function DashboardClientLayout({ children }: DashboardClientLayoutProps) {
  const isWinterArcMode = useAppSelector(selectIsWinterArcMode)
  const lockInActive = useAppSelector(selectLockInActive)
  const momentumScore = useAppSelector(selectMomentumScore)
  const cognitiveState = useAppSelector(selectCognitiveState)

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

  return <OnboardingWrapper>{children}</OnboardingWrapper>
}
