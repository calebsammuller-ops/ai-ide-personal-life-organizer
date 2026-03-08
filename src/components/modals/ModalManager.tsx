'use client'

import { useAppSelector, useAppDispatch } from '@/state/hooks'
import { selectActiveModal, closeModal } from '@/state/slices/uiSlice'

export function ModalManager() {
  const dispatch = useAppDispatch()
  const activeModal = useAppSelector(selectActiveModal)

  const handleClose = () => {
    dispatch(closeModal())
  }

  // Placeholder — add new modals here as the Thinking Partner features grow
  return null
}
