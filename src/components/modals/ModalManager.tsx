'use client'

import { useAppSelector, useAppDispatch } from '@/state/hooks'
import { selectActiveModal, selectModalData, closeModal } from '@/state/slices/uiSlice'
import { CreateEventModal } from './CreateEventModal'
import { CreateTaskModal } from './CreateTaskModal'
import { CreateHabitModal } from './CreateHabitModal'
import { CreateMealModal } from './CreateMealModal'
import { ViewMealModal } from './ViewMealModal'
import { ShoppingListModal } from './ShoppingListModal'
import { FoodScanModal } from './FoodScanModal'
import { HabitPlanModal } from './HabitPlanModal'
import { EditHabitModal } from './EditHabitModal'
import { NotificationsModal } from './NotificationsModal'
import type { Habit } from '@/types'

export function ModalManager() {
  const dispatch = useAppDispatch()
  const activeModal = useAppSelector(selectActiveModal)
  const modalData = useAppSelector(selectModalData)

  const handleClose = () => {
    dispatch(closeModal())
  }

  return (
    <>
      <CreateEventModal
        open={activeModal === 'createEvent'}
        onClose={handleClose}
      />
      <CreateTaskModal
        open={activeModal === 'createTask'}
        onOpenChange={(open) => { if (!open) handleClose() }}
      />
      <CreateHabitModal
        open={activeModal === 'createHabit'}
        onClose={handleClose}
      />
      <CreateMealModal
        open={activeModal === 'createMeal'}
        onClose={handleClose}
      />
      <ViewMealModal
        open={activeModal === 'viewMeal'}
        onClose={handleClose}
        meal={modalData?.meal as any}
      />
      <ShoppingListModal
        open={activeModal === 'shoppingList'}
        onClose={handleClose}
      />
      <FoodScanModal
        open={activeModal === 'foodScan'}
        onClose={handleClose}
      />
      <HabitPlanModal
        open={activeModal === 'habitPlan'}
        onClose={handleClose}
        habit={modalData?.habit as Habit | null}
      />
      <EditHabitModal
        open={activeModal === 'editHabit'}
        onClose={handleClose}
        habit={modalData?.habit as Habit | null}
      />
      <NotificationsModal
        open={activeModal === 'notifications'}
        onClose={handleClose}
      />
    </>
  )
}
