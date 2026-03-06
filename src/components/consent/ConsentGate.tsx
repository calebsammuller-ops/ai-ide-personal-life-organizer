'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchConsents,
  requestConsent,
  selectConsents,
  selectConsentHasFetched,
} from '@/state/slices/consentSlice'
import { ConsentModal } from './ConsentModal'

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const consents = useAppSelector(selectConsents)
  const hasFetched = useAppSelector(selectConsentHasFetched)

  useEffect(() => {
    if (!hasFetched) {
      dispatch(fetchConsents())
    }
  }, [dispatch, hasFetched])

  // Show consent for AI data access on first use
  useEffect(() => {
    if (hasFetched && !consents.ai_data_access) {
      dispatch(requestConsent('ai_data_access'))
    }
  }, [hasFetched, consents, dispatch])

  return (
    <>
      {children}
      <ConsentModal />
    </>
  )
}
