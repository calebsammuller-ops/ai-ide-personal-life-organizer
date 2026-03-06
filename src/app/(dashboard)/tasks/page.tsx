'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchTasks,
  updateTask,
  batchScheduleTasks,
  selectAllTasks,
  selectPendingTasks,
  selectOverdueTasks,
  selectHighPriorityTasks,
  selectTasksLoading,
  selectTasksScheduling,
} from '@/state/slices/tasksSlice'
import { fetchFocusBlocks, selectAllFocusBlocks } from '@/state/slices/focusBlocksSlice'
import { TaskList } from '@/components/tasks/TaskList'
import { ViewSwitcher } from '@/components/tasks/views/ViewSwitcher'
import { KanbanBoard } from '@/components/tasks/views/KanbanBoard'
import { TimelineView } from '@/components/tasks/views/TimelineView'
import { TableView } from '@/components/tasks/views/TableView'
import { CreateTaskModal } from '@/components/modals/CreateTaskModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TacticalMascot } from '@/components/ui/TacticalMascot'
import { FadeIn, HoverCard } from '@/components/ui/animated'
import {
  Plus,
  Wand2,
  ListTodo,
  Clock,
  AlertCircle,
  Zap,
  Target,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Bookmark,
} from 'lucide-react'
import type { Task, TaskStatus, UpdateTaskInput } from '@/types/scheduling'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

type TaskViewType = 'list' | 'kanban' | 'timeline' | 'table'

// Mini Calendar component for task dates
function MiniTaskCalendar({ tasks }: { tasks: Task[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getTaskCountForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(t => {
      if (t.status === 'completed') return false
      if (t.deadline) {
        const dueStr = new Date(t.deadline).toISOString().split('T')[0]
        if (dueStr === dateStr) return true
      }
      if (t.scheduledStart) {
        const schedStr = new Date(t.scheduledStart).toISOString().split('T')[0]
        if (schedStr === dateStr) return true
      }
      return false
    }).length
  }

  const days = getDaysInMonth()
  const today = new Date().toISOString().split('T')[0]

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  return (
    <div className="space-y-2">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {currentMonth.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={() => navigateMonth('next')}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-[10px] text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const dateStr = date.toISOString().split('T')[0]
          const isToday = dateStr === today
          const taskCount = getTaskCountForDate(date)
          const hasTaskBookmark = taskCount > 0

          return (
            <div
              key={dateStr}
              className={cn(
                'aspect-square flex flex-col items-center justify-center rounded text-xs relative',
                isToday && 'bg-primary text-primary-foreground font-bold',
                !isToday && hasTaskBookmark && 'bg-orange-500/10',
                'hover:bg-muted/50 transition-colors cursor-default'
              )}
            >
              {/* Bookmark indicator */}
              {hasTaskBookmark && (
                <div className={cn(
                  'absolute -top-0.5 -right-0.5 w-0 h-0',
                  'border-l-[6px] border-l-transparent',
                  'border-t-[6px]',
                  isToday ? 'border-t-primary-foreground/50' : 'border-t-orange-500'
                )} />
              )}
              <span>{date.getDate()}</span>
              {hasTaskBookmark && !isToday && (
                <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-orange-500" />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 pt-2 border-t text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary" />
          Today
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          Has tasks
        </span>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const dispatch = useAppDispatch()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskView, setTaskView] = useState<TaskViewType>('list')

  const allTasks = useAppSelector(selectAllTasks)
  const pendingTasks = useAppSelector(selectPendingTasks)
  const overdueTasks = useAppSelector(selectOverdueTasks)
  const highPriorityTasks = useAppSelector(selectHighPriorityTasks)
  const focusBlocks = useAppSelector(selectAllFocusBlocks)
  const isLoading = useAppSelector(selectTasksLoading)
  const isScheduling = useAppSelector(selectTasksScheduling)

  useRegisterPageContext({
    pageTitle: 'Tasks',
    activeView: taskView,
    visibleContent: {
      type: 'tasks',
      totalCount: allTasks.length,
      pendingCount: pendingTasks.length,
      overdueCount: overdueTasks.length,
      highPriorityCount: highPriorityTasks.length,
    },
  })

  useEffect(() => {
    dispatch(fetchTasks())
    dispatch(fetchFocusBlocks())
  }, [dispatch])

  const handleBatchSchedule = () => {
    const taskIds = pendingTasks.map(t => t.id)
    if (taskIds.length > 0) {
      dispatch(batchScheduleTasks(taskIds))
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
  }

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    dispatch(updateTask({ id: taskId, updates: { status: newStatus } }))
  }

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    dispatch(updateTask({ id: taskId, updates: updates as UpdateTaskInput }))
  }

  // Calculate stats
  const completedToday = allTasks.filter(t => {
    if (t.status !== 'completed' || !t.completedAt) return false
    const completedDate = new Date(t.completedAt).toDateString()
    return completedDate === new Date().toDateString()
  }).length

  const scheduledToday = allTasks.filter(t => {
    if (t.status !== 'scheduled' || !t.scheduledStart) return false
    const scheduledDate = new Date(t.scheduledStart).toDateString()
    return scheduledDate === new Date().toDateString()
  }).length

  const totalFocusMinutes = focusBlocks
    .filter(fb => fb.isActive && fb.daysOfWeek.includes(new Date().getDay()))
    .reduce((sum, fb) => {
      const [startH, startM] = fb.startTime.split(':').map(Number)
      const [endH, endM] = fb.endTime.split(':').map(Number)
      return sum + ((endH * 60 + endM) - (startH * 60 + startM))
    }, 0)

  const getMascotMood = () => {
    if (overdueTasks.length > 0) return 'thinking' as const
    if (completedToday >= 5) return 'celebrating' as const
    if (completedToday >= 2) return 'encouraging' as const
    return 'greeting' as const
  }

  const getMascotMessage = () => {
    if (overdueTasks.length > 0) return `${overdueTasks.length} overdue - let's tackle them!`
    if (completedToday >= 5) return 'Incredible productivity!'
    if (completedToday >= 2) return 'Great progress today!'
    if (pendingTasks.length > 5) return 'Lots to do - one at a time!'
    return 'Ready to be productive?'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto py-6 px-4 max-w-6xl"
    >
      {/* Header with Mascot */}
      <FadeIn className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <TacticalMascot mood={getMascotMood()} size="sm" />
          <div>
            <h1 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              MISSION QUEUE
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
              {getMascotMessage()}
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2"
        >
          {pendingTasks.length > 0 && (
            <Button
              variant="outline"
              onClick={handleBatchSchedule}
              disabled={isScheduling}
              className="transition-transform hover:scale-105"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              {isScheduling ? 'Scheduling...' : `Auto-schedule ${pendingTasks.length} tasks`}
            </Button>
          )}
          <Button onClick={() => setShowCreateModal(true)} className="transition-transform hover:scale-105">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </motion.div>
      </FadeIn>

      {/* Stats Cards with Animation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            value: pendingTasks.length,
            label: 'Pending',
            icon: Clock,
            iconColor: 'text-muted-foreground',
            color: 'from-blue-500 to-cyan-500',
          },
          {
            value: scheduledToday,
            label: 'Scheduled Today',
            icon: Calendar,
            iconColor: 'text-primary',
            color: 'from-purple-500 to-pink-500',
          },
          {
            value: completedToday,
            label: 'Completed Today',
            icon: Target,
            iconColor: 'text-green-500',
            color: 'from-green-500 to-emerald-500',
          },
          {
            value: `${Math.round(totalFocusMinutes / 60)}h`,
            label: 'Focus Time',
            icon: Zap,
            iconColor: 'text-yellow-500',
            color: 'from-yellow-500 to-orange-500',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <HoverCard>
              <Card className="relative overflow-hidden group">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <motion.p
                        key={String(stat.value)}
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold"
                      >
                        {stat.value}
                      </motion.p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                    <motion.div whileHover={{ rotate: 15, scale: 1.2 }}>
                      <stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </HoverCard>
          </motion.div>
        ))}
      </div>

      {/* Alerts with Animation */}
      <AnimatePresence>
        {overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </motion.div>
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
                  </span>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:scale-105 transition-transform">
                    View Overdue
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {highPriorityTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Zap className="h-4 w-4 text-orange-500" />
                  </motion.div>
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                    {highPriorityTasks.length} high priority task{highPriorityTasks.length > 1 ? 's' : ''} need attention
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Switcher */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-6"
      >
        <ViewSwitcher currentView={taskView} onChange={setTaskView} />
      </motion.div>

      {/* Main Content */}
      <div className={cn(
        'grid gap-6',
        taskView === 'list' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'
      )}>
        {/* Task Views */}
        <motion.div
          className={taskView === 'list' ? 'lg:col-span-2' : ''}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          {taskView === 'list' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">All Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList onTaskClick={handleTaskClick} />
              </CardContent>
            </Card>
          )}

          {taskView === 'kanban' && (
            <KanbanBoard
              tasks={allTasks}
              onStatusChange={handleStatusChange}
            />
          )}

          {taskView === 'timeline' && (
            <TimelineView tasks={allTasks} />
          )}

          {taskView === 'table' && (
            <TableView
              tasks={allTasks}
              onTaskUpdate={handleTaskUpdate}
            />
          )}
        </motion.div>

        {/* Sidebar - only show in list view */}
        {taskView === 'list' && (
          <div className="space-y-6">
            {/* Mini Calendar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
            >
              <HoverCard>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Task Calendar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MiniTaskCalendar tasks={allTasks} />
                  </CardContent>
                </Card>
              </HoverCard>
            </motion.div>

            {/* Quick Add */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <HoverCard>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Add</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-muted-foreground hover:scale-[1.02] transition-transform"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add a new task...
                    </Button>
                  </CardContent>
                </Card>
              </HoverCard>
            </motion.div>

            {/* Focus Blocks Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <HoverCard>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                      >
                        <Zap className="h-4 w-4 text-yellow-500" />
                      </motion.div>
                      Today&apos;s Focus Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {focusBlocks.filter(fb =>
                      fb.isActive && fb.daysOfWeek.includes(new Date().getDay())
                    ).length > 0 ? (
                      <div className="space-y-2">
                        {focusBlocks
                          .filter(fb => fb.isActive && fb.daysOfWeek.includes(new Date().getDay()))
                          .map((fb, index) => (
                            <motion.div
                              key={fb.id}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.7 + index * 0.1 }}
                              className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50 transition-colors"
                              style={{ borderLeftColor: fb.color, borderLeftWidth: 3 }}
                            >
                              <span className="text-sm font-medium">{fb.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {fb.startTime} - {fb.endTime}
                              </span>
                            </motion.div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No focus blocks scheduled for today
                      </p>
                    )}
                  </CardContent>
                </Card>
              </HoverCard>
            </motion.div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </motion.div>
  )
}
