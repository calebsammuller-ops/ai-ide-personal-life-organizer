'use client'

import { useState } from 'react'
import { Bell, X, Check, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useHabitReminders } from '@/hooks/useHabitReminders'
import { useAppDispatch } from '@/state/hooks'
import { completeHabit } from '@/state/slices/habitsSlice'
import { cn } from '@/lib/utils'

export function ReminderBanner() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { dueReminders, overdueReminders, hasDueOrOverdue } = useHabitReminders()
  const [dismissed, setDismissed] = useState(false)

  if (!hasDueOrOverdue || dismissed) {
    return null
  }

  const allReminders = [...overdueReminders, ...dueReminders]
  const today = new Date().toISOString().split('T')[0]

  const handleComplete = async (habitId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await dispatch(completeHabit({ habitId, date: today }))
  }

  const handleGoToHabits = () => {
    router.push('/habits')
  }

  return (
    <div className={cn(
      'bg-gradient-to-r px-4 py-3',
      overdueReminders.length > 0
        ? 'from-orange-500/10 to-red-500/10 border-b border-orange-500/20'
        : 'from-primary/10 to-blue-500/10 border-b border-primary/20'
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            'p-2 rounded-full shrink-0',
            overdueReminders.length > 0 ? 'bg-orange-500/20' : 'bg-primary/20'
          )}>
            <Bell className={cn(
              'h-4 w-4',
              overdueReminders.length > 0 ? 'text-orange-500' : 'text-primary'
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {overdueReminders.length > 0 ? (
                <>
                  {overdueReminders.length} overdue habit{overdueReminders.length !== 1 ? 's' : ''}
                  {dueReminders.length > 0 && `, ${dueReminders.length} due now`}
                </>
              ) : (
                <>{dueReminders.length} habit{dueReminders.length !== 1 ? 's' : ''} due now</>
              )}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {allReminders.slice(0, 3).map((reminder) => (
                <div
                  key={reminder.habit.id}
                  className="inline-flex items-center gap-1 text-xs bg-background/50 px-2 py-1 rounded-full"
                >
                  <span>{reminder.habit.icon}</span>
                  <span className="truncate max-w-[100px]">{reminder.habit.name}</span>
                  {reminder.isOverdue && (
                    <Clock className="h-3 w-3 text-orange-500" />
                  )}
                  <button
                    onClick={(e) => handleComplete(reminder.habit.id, e)}
                    className="ml-1 p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                    title="Mark complete"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {allReminders.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{allReminders.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoToHabits}
          >
            View All
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
