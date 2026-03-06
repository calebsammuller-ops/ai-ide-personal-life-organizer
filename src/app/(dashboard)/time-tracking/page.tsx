'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchTimeEntries,
  fetchTimeReports,
  selectTimeEntries,
  selectActiveTimer,
  selectTimeReports,
  selectTimeTrackingLoading,
  selectTimeTrackingError,
} from '@/state/slices/timeTrackingSlice'
import { fetchTasks, selectAllTasks } from '@/state/slices/tasksSlice'
import { TimeTracker } from '@/components/time-tracking/TimeTracker'
import { TimeEntryList } from '@/components/time-tracking/TimeEntryList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FadeIn } from '@/components/ui/animated'
import { Clock, Timer, CalendarDays, TrendingUp, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function TimeTrackingPage() {
  const dispatch = useAppDispatch()
  const entries = useAppSelector(selectTimeEntries)
  const activeTimer = useAppSelector(selectActiveTimer)
  const reports = useAppSelector(selectTimeReports)
  const isLoading = useAppSelector(selectTimeTrackingLoading)
  const error = useAppSelector(selectTimeTrackingError)
  const tasks = useAppSelector(selectAllTasks)
  const [taskSearch, setTaskSearch] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined)
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const filteredTasks = tasks.filter(t =>
    t.status !== 'completed' &&
    t.title.toLowerCase().includes(taskSearch.toLowerCase())
  ).slice(0, 8)

  useRegisterPageContext({
    pageTitle: 'Time Tracking',
    visibleContent: {
      type: 'time_tracking',
      entryCount: entries.length,
      hasActiveTimer: !!activeTimer,
      activeTimerTaskTitle: activeTimer?.taskTitle ?? null,
    },
  })

  useEffect(() => {
    dispatch(fetchTimeEntries())
    dispatch(fetchTimeReports())
    dispatch(fetchTasks())
  }, [dispatch])

  // Compute summary stats
  const todayStats = useMemo(() => {
    const todayKey = new Date().toISOString().split('T')[0]
    const todayEntries = entries.filter(
      (e) => e.startTime && e.startTime.startsWith(todayKey)
    )
    const totalSeconds = todayEntries.reduce(
      (sum, e) => sum + (e.durationSeconds ?? 0),
      0
    )
    return { count: todayEntries.length, totalSeconds }
  }, [entries])

  const weekStats = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const weekEntries = entries.filter(
      (e) => new Date(e.startTime) >= startOfWeek
    )
    const totalSeconds = weekEntries.reduce(
      (sum, e) => sum + (e.durationSeconds ?? 0),
      0
    )
    return { count: weekEntries.length, totalSeconds }
  }, [entries])

  const avgDailySeconds = useMemo(() => {
    if (entries.length === 0) return 0
    const uniqueDays = new Set(
      entries.map((e) => e.startTime.split('T')[0])
    )
    const totalSeconds = entries.reduce(
      (sum, e) => sum + (e.durationSeconds ?? 0),
      0
    )
    return Math.round(totalSeconds / Math.max(uniqueDays.size, 1))
  }, [entries])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto py-6 px-4 max-w-5xl"
    >
      {/* Header */}
      <FadeIn className="mb-4">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-primary" />
          <h1 className="text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-4 w-4" />
            TIME TRACKING
          </h1>
        </div>
      </FadeIn>

      {/* Task Picker + Timer */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 space-y-2"
      >
        {/* Task selector (only shown when no active timer) */}
        {!activeTimer && (
          <div className="relative">
            <div
              className="flex items-center gap-2 px-3 py-2 border border-border/50 bg-card cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setShowTaskPicker(v => !v)}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className={cn('text-xs font-mono flex-1', selectedTask ? 'text-foreground' : 'text-muted-foreground')}>
                {selectedTask ? selectedTask.title : 'SELECT MISSION TO TRACK...'}
              </span>
            </div>
            {showTaskPicker && (
              <div className="absolute top-full left-0 right-0 z-20 bg-card border border-border/50 border-t-0 max-h-48 overflow-y-auto">
                <div className="p-2 border-b border-border/30">
                  <input
                    autoFocus
                    value={taskSearch}
                    onChange={e => setTaskSearch(e.target.value)}
                    placeholder="Search missions..."
                    className="w-full text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground font-mono"
                  />
                </div>
                {filteredTasks.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3 font-mono">No missions found</p>
                ) : (
                  filteredTasks.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTaskId(t.id); setTaskSearch(''); setShowTaskPicker(false) }}
                      className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-primary/5 hover:text-primary transition-colors border-b border-border/20 last:border-0"
                    >
                      {t.title}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <TimeTracker
          taskId={activeTimer?.taskId ?? selectedTaskId}
          taskTitle={activeTimer?.taskTitle ?? selectedTask?.title}
        />
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Today',
            value: formatHours(todayStats.totalSeconds),
            subtext: `${todayStats.count} entries`,
            icon: Timer,
            color: 'text-primary',
            bg: 'bg-primary/10',
            gradient: 'from-orange-500 to-red-700',
          },
          {
            label: 'This Week',
            value: formatHours(weekStats.totalSeconds),
            subtext: `${weekStats.count} entries`,
            icon: CalendarDays,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            gradient: 'from-blue-500 to-cyan-500',
          },
          {
            label: 'Daily Avg',
            value: formatHours(avgDailySeconds),
            subtext: 'across all days',
            icon: TrendingUp,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            gradient: 'from-green-500 to-emerald-500',
          },
          {
            label: 'Total Entries',
            value: entries.length.toString(),
            subtext: 'all time',
            icon: Clock,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            gradient: 'from-orange-500 to-yellow-500',
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.08 }}
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm relative overflow-hidden group">
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity',
                  stat.gradient
                )}
              />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {stat.subtext}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      stat.bg
                    )}
                  >
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-500/20 bg-red-950/10 mb-6">
          <CardContent className="py-4">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Time Entry History */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">History</h2>
        </div>

        {isLoading && entries.length === 0 ? (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                <p className="text-sm text-muted-foreground">
                  Loading time entries...
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <TimeEntryList entries={entries} />
        )}
      </motion.div>
    </motion.div>
  )
}
