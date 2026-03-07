'use client'

import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Clock,
  Calendar,
  Zap,
  AlertCircle,
  CheckCircle2,
  Play,
  MoreHorizontal,
} from 'lucide-react'
import type { Task } from '@/types/scheduling'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: Task
  onComplete?: (taskId: string) => void
  onSchedule?: (taskId: string) => void
  onClick?: (task: Task) => void
  compact?: boolean
}

const priorityColors: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-blue-500',
  5: 'bg-gray-400',
}

const priorityLabels: Record<number, string> = {
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
  5: 'Lowest',
}

const energyIcons: Record<string, React.ReactNode> = {
  high: <Zap className="h-3 w-3 text-yellow-500" />,
  medium: <Zap className="h-3 w-3 text-blue-500" />,
  low: <Zap className="h-3 w-3 text-gray-400" />,
}

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  deferred: 'bg-purple-100 text-purple-700',
}

export const TaskCard = memo(function TaskCard({
  task,
  onComplete,
  onSchedule,
  onClick,
  compact = false,
}: TaskCardProps) {
  const isCompleted = task.status === 'completed'
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !isCompleted

  const formatTime = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getDeadlineText = () => {
    if (!task.deadline) return null
    const deadline = new Date(task.deadline)
    const now = new Date()
    const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (diffHours < 0) return 'Overdue'
    if (diffHours < 1) return 'Due soon'
    if (diffHours < 24) return `Due in ${Math.round(diffHours)}h`
    return `Due ${formatDate(deadline)}`
  }

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors',
          isCompleted && 'opacity-60'
        )}
        onClick={() => onClick?.(task)}
      >
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onComplete?.(task.id)}
          onClick={(e) => e.stopPropagation()}
        />
        <div className={cn('w-2 h-2 rounded-full', priorityColors[task.priority])} />
        <span className={cn('flex-1 text-sm', isCompleted && 'line-through')}>
          {task.title}
        </span>
        {task.scheduledStart && (
          <span className="text-xs text-muted-foreground">
            {formatTime(task.scheduledStart)}
          </span>
        )}
        {task.energyLevel && energyIcons[task.energyLevel]}
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        isCompleted && 'opacity-60',
        isOverdue && 'border-red-300'
      )}
      onClick={() => onClick?.(task)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onComplete?.(task.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityColors[task.priority])} />
              <h3 className={cn('font-medium text-sm truncate', isCompleted && 'line-through')}>
                {task.title}
              </h3>
            </div>

            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {/* Duration */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{task.durationMinutes}m</span>
              </div>

              {/* Scheduled time */}
              {task.scheduledStart && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatTime(task.scheduledStart)}</span>
                </div>
              )}

              {/* Energy level */}
              {task.energyLevel && (
                <div className="flex items-center gap-1">
                  {energyIcons[task.energyLevel]}
                  <span className="text-xs text-muted-foreground capitalize">
                    {task.energyLevel}
                  </span>
                </div>
              )}

              {/* Deadline */}
              {task.deadline && (
                <div className={cn(
                  'flex items-center gap-1 text-xs',
                  isOverdue ? 'text-red-500' : 'text-muted-foreground'
                )}>
                  {isOverdue ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <Calendar className="h-3 w-3" />
                  )}
                  <span>{getDeadlineText()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1">
                <Badge variant="outline" className={cn('text-xs', statusColors[task.status])}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.category && (
                  <Badge variant="secondary" className="text-xs">
                    {task.category}
                  </Badge>
                )}
              </div>

              <div className="flex gap-1">
                {task.status === 'pending' && onSchedule && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSchedule(task.id)
                    }}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Schedule
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
