'use client'

import { useMemo } from 'react'
import { useAppSelector } from '@/state/hooks'
import { selectActiveHabits, selectTodayCompletions } from '@/state/slices/habitsSlice'
import type { Habit } from '@/types'

interface HabitReminder {
  habit: Habit
  isDue: boolean
  isOverdue: boolean
  isCompleted: boolean
  minutesUntilDue: number | null
  formattedTime: string | null
}

export function useHabitReminders() {
  const habits = useAppSelector(selectActiveHabits)
  const todayCompletions = useAppSelector(selectTodayCompletions)

  const reminders = useMemo(() => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinute

    const result: HabitReminder[] = habits
      .filter(habit => habit.reminderEnabled && habit.reminderTime)
      .map(habit => {
        const isCompleted = todayCompletions.includes(habit.id)
        const [hours, minutes] = (habit.reminderTime || '09:00').split(':').map(Number)
        const reminderTimeMinutes = hours * 60 + minutes

        const minutesDiff = reminderTimeMinutes - currentTimeMinutes

        // Format the reminder time for display
        const formattedTime = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })

        return {
          habit,
          isCompleted,
          isDue: !isCompleted && Math.abs(minutesDiff) <= 30, // Within 30 minutes of reminder time
          isOverdue: !isCompleted && minutesDiff < -30, // More than 30 minutes past
          minutesUntilDue: isCompleted ? null : minutesDiff,
          formattedTime,
        }
      })
      .sort((a, b) => {
        // Sort: overdue first, then due, then by time
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        if (a.isDue && !b.isDue) return -1
        if (!a.isDue && b.isDue) return 1
        return (a.minutesUntilDue || 0) - (b.minutesUntilDue || 0)
      })

    return result
  }, [habits, todayCompletions])

  const dueReminders = reminders.filter(r => r.isDue && !r.isCompleted)
  const overdueReminders = reminders.filter(r => r.isOverdue && !r.isCompleted)
  const upcomingReminders = reminders.filter(
    r => !r.isDue && !r.isOverdue && !r.isCompleted && (r.minutesUntilDue || 0) > 0
  ).slice(0, 3) // Only show next 3 upcoming

  return {
    reminders,
    dueReminders,
    overdueReminders,
    upcomingReminders,
    hasDueOrOverdue: dueReminders.length > 0 || overdueReminders.length > 0,
  }
}
