'use client'

import { useOnboarding } from '@/hooks/useOnboarding'
import { Onboarding } from './Onboarding'
import { PageLoading } from '@/components/ui/loading'

interface OnboardingWrapperProps {
  children: React.ReactNode
  userName?: string
}

export function OnboardingWrapper({ children, userName }: OnboardingWrapperProps) {
  const { hasSeenOnboarding, isLoading, completeOnboarding } = useOnboarding()

  if (isLoading) {
    return <PageLoading message="Loading your dashboard..." />
  }

  if (!hasSeenOnboarding) {
    return <Onboarding onComplete={completeOnboarding} userName={userName} />
  }

  return <>{children}</>
}
