'use client'

import { useEffect } from 'react'
import { OnboardingWrapper } from '@/components/onboarding/OnboardingWrapper'
import { useAppSelector } from '@/state/hooks'
import { selectIsWinterArcMode } from '@/state/slices/uiSlice'

interface DashboardClientLayoutProps {
  children: React.ReactNode
}

export function DashboardClientLayout({ children }: DashboardClientLayoutProps) {
  const isWinterArcMode = useAppSelector(selectIsWinterArcMode)

  useEffect(() => {
    document.body.classList.toggle('winter-arc', isWinterArcMode)
    return () => { document.body.classList.remove('winter-arc') }
  }, [isWinterArcMode])

  return <OnboardingWrapper>{children}</OnboardingWrapper>
}
