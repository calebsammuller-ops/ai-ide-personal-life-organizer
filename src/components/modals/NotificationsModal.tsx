'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Target,
  CheckSquare,
  Calendar,
  Flame,
  X,
  Check,
  Trash2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useAppSelector, useAppDispatch } from '@/state/hooks'
import { selectActiveHabits, selectTodayCompletions } from '@/state/slices/habitsSlice'
import { selectAllTasks } from '@/state/slices/tasksSlice'
import { selectAllEvents } from '@/state/slices/calendarSlice'
import { openModal, closeModal } from '@/state/slices/uiSlice'
import { cn } from '@/lib/utils'

interface NotificationsModalProps {
  open: boolean
  onClose: () => void
}

interface Notification {
  id: string
  type: 'habit' | 'task' | 'event' | 'streak' | 'reminder'
  title: string
  description: string
  time: string
  icon: React.ReactNode
  color: string
  action?: () => void
  actionLabel?: string
}

export function NotificationsModal({ open, onClose }: NotificationsModalProps) {
  const dispatch = useAppDispatch()
  const habits = useAppSelector(selectActiveHabits)
  const todayCompletions = useAppSelector(selectTodayCompletions)
  const tasks = useAppSelector(selectAllTasks)
  const events = useAppSelector(selectAllEvents)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Generate notifications based on current data
  const notifications: Notification[] = []

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Incomplete habits for today
  habits.forEach((habit) => {
    if (!todayCompletions.includes(habit.id)) {
      notifications.push({
        id: `habit-${habit.id}`,
        type: 'habit',
        title: habit.name,
        description: `Don't forget to complete your ${habit.frequency} habit!`,
        time: habit.reminderTime || 'Today',
        icon: <Target className="h-4 w-4" />,
        color: 'text-blue-500 bg-blue-500/10',
        action: () => {
          onClose()
          dispatch(openModal({ modalName: 'habitPlan', data: { habit } }))
        },
        actionLabel: 'View Plan',
      })
    }
  })

  // Tasks due today or overdue
  tasks.forEach((task) => {
    if (task.status === 'completed') return
    if (!task.deadline) return

    const dueDate = new Date(task.deadline)
    const dueDateStr = dueDate.toISOString().split('T')[0]
    const isOverdue = dueDateStr < todayStr
    const isDueToday = dueDateStr === todayStr

    if (isOverdue || isDueToday) {
      notifications.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        description: isOverdue ? 'This task is overdue!' : 'Due today',
        time: isOverdue ? 'Overdue' : 'Today',
        icon: <CheckSquare className="h-4 w-4" />,
        color: isOverdue ? 'text-red-500 bg-red-500/10' : 'text-orange-500 bg-orange-500/10',
      })
    }
  })

  // Upcoming events today
  events.forEach((event) => {
    const eventDate = new Date(event.startTime)
    const eventDateStr = eventDate.toISOString().split('T')[0]

    if (eventDateStr === todayStr && eventDate > today) {
      notifications.push({
        id: `event-${event.id}`,
        type: 'event',
        title: event.title || 'Event',
        description: event.location || 'Upcoming event',
        time: eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        icon: <Calendar className="h-4 w-4" />,
        color: 'text-green-500 bg-green-500/10',
      })
    }
  })

  // Streak notifications (if all habits completed)
  const completedToday = todayCompletions.length
  const totalHabits = habits.length
  if (totalHabits > 0 && completedToday === totalHabits) {
    notifications.unshift({
      id: 'streak-complete',
      type: 'streak',
      title: 'Perfect Day!',
      description: `You've completed all ${totalHabits} habits today!`,
      time: 'Now',
      icon: <Flame className="h-4 w-4" />,
      color: 'text-amber-500 bg-amber-500/10',
    })
  } else if (totalHabits > 0 && completedToday > 0) {
    notifications.unshift({
      id: 'streak-progress',
      type: 'streak',
      title: 'Keep Going!',
      description: `${completedToday}/${totalHabits} habits completed`,
      time: 'Now',
      icon: <Flame className="h-4 w-4" />,
      color: 'text-amber-500 bg-amber-500/10',
    })
  }

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id))

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]))
  }

  const handleClearAll = () => {
    setDismissedIds(new Set(notifications.map(n => n.id)))
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px] max-h-[80vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {visibleNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {visibleNotifications.length}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Your habits, tasks, and reminders
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground/70">No notifications at the moment</p>
            </div>
          ) : (
            <div className="p-2">
              <AnimatePresence>
                {visibleNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group"
                  >
                    <div
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg mb-2 transition-colors',
                        notification.color,
                        notification.action && 'cursor-pointer hover:opacity-80'
                      )}
                      onClick={notification.action}
                    >
                      <div className="p-2 rounded-full bg-background/50">
                        {notification.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {notification.time}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notification.description}
                        </p>
                        {notification.actionLabel && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs mt-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              notification.action?.()
                            }}
                          >
                            {notification.actionLabel} →
                          </Button>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismiss(notification.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background/50 rounded transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {visibleNotifications.length > 0 && (
          <div className="p-3 border-t flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-xs text-muted-foreground"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
