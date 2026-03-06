'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchTasks,
  completeTask,
  autoScheduleTask,
  setStatusFilter,
  selectFilteredTasks,
  selectTasksLoading,
  selectTasksError,
} from '@/state/slices/tasksSlice'
import { TaskCard } from './TaskCard'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ListTodo, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { Task, TaskStatus } from '@/types/scheduling'

interface TaskListProps {
  onTaskClick?: (task: Task) => void
  compact?: boolean
  showFilters?: boolean
  maxHeight?: string
}

export function TaskList({
  onTaskClick,
  compact = false,
  showFilters = true,
  maxHeight = '600px',
}: TaskListProps) {
  const dispatch = useAppDispatch()
  const tasks = useAppSelector(selectFilteredTasks)
  const isLoading = useAppSelector(selectTasksLoading)
  const error = useAppSelector(selectTasksError)

  useEffect(() => {
    dispatch(fetchTasks())
  }, [dispatch])

  const handleComplete = async (taskId: string) => {
    dispatch(completeTask(taskId))
  }

  const handleSchedule = async (taskId: string) => {
    dispatch(autoScheduleTask(taskId))
  }

  const handleFilterChange = (value: string) => {
    dispatch(setStatusFilter(value as TaskStatus | 'all'))
  }

  // Group tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const scheduledTasks = tasks.filter(t => t.status === 'scheduled')
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false
    if (!t.deadline) return false
    return new Date(t.deadline) < new Date()
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => dispatch(fetchTasks())}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ListTodo className="h-12 w-12 text-muted-foreground mb-2" />
        <h3 className="font-medium">No tasks yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first task to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex items-center justify-between">
          <Tabs defaultValue="all" onValueChange={handleFilterChange}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-2">
                All ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs px-2">
                <Clock className="h-3 w-3 mr-1" />
                Pending ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="text-xs px-2">
                <Calendar className="h-3 w-3 mr-1" />
                Scheduled ({scheduledTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs px-2">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Done ({completedTasks.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {overdueTasks.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="h-3 w-3" />
              <span>{overdueTasks.length} overdue</span>
            </div>
          )}
        </div>
      )}

      <ScrollArea style={{ maxHeight }}>
        <div className="space-y-3 pr-4">
          {/* Overdue tasks first */}
          {overdueTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Overdue
              </h4>
              {overdueTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSchedule={handleSchedule}
                  onClick={onTaskClick}
                  compact={compact}
                />
              ))}
            </div>
          )}

          {/* Regular tasks */}
          {tasks
            .filter(t => !overdueTasks.includes(t))
            .map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onSchedule={handleSchedule}
                onClick={onTaskClick}
                compact={compact}
              />
            ))}
        </div>
      </ScrollArea>
    </div>
  )
}
