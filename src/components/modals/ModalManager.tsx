'use client'

import { useAppSelector } from '@/state/hooks'
import { selectActiveModal } from '@/state/slices/uiSlice'
import { LockInModal } from '@/components/lock-in/LockInModal'

export function ModalManager() {
  const activeModal = useAppSelector(selectActiveModal)

  if (activeModal === 'lockIn') return <LockInModal />

  return null
}
