'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/scheduling'

interface TimelineViewProps {
  tasks: Task[]
}

const priorityBarColors: Record<number, string> = {
  1: 'bg-red-500/80 border-red-400/50',
  2: 'bg-orange-500/80 border-orange-400/50',
  3: 'bg-yellow-500/80 border-yellow-400/50',
  4: 'bg-green-500/80 border-green-400/50',
  5: 'bg-green-600/80 border-green-500/50',
}

export function TimelineView({ tasks }: TimelineViewProps) {
  const { sortedTasks, minDate, maxDate, totalDays } = useMemo(() => {
    const now = new Date()
    const tasksWithDates = tasks.filter(
      (t) => t.deadline || t.scheduledStart
    )

    if (tasksWithDates.length === 0) {
      return { sortedTasks: [], minDate: now, maxDate: now, totalDays: 1 }
    }

    const getStartDate = (t: Task): Date => {
      if (t.scheduledStart) return new Date(t.scheduledStart)
      if (t.deadline) {
        const d = new Date(t.deadline)
        d.setDate(d.getDate() - Math.max(1, Math.ceil(t.durationMinutes / 480)))
        return d
      }
      return now
    }

    const getEndDate = (t: Task): Date => {
      if (t.scheduledEnd) return new Date(t.scheduledEnd)
      if (t.deadline) return new Date(t.deadline)
      const start = getStartDate(t)
      const end = new Date(start)
      end.setDate(end.getDate() + Math.max(1, Math.ceil(t.durationMinutes / 480)))
      return end
    }

    const enriched = tasksWithDates.map((t) => ({
      task: t,
      start: getStartDate(t),
      end: getEndDate(t),
    }))

    enriched.sort((a, b) => a.start.getTime() - b.start.getTime())

    const allStarts = enriched.map((e) => e.start.getTime())
    const allEnds = enriched.map((e) => e.end.getTime())
    const min = new Date(Math.min(...allStarts))
    const max = new Date(Math.max(...allEnds))

    // Add padding
    min.setDate(min.getDate() - 1)
    max.setDate(max.getDate() + 1)

    const days = Math.max(1, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)))

    return { sortedTasks: enriched, minDate: min, maxDate: max, totalDays: days }
  }, [tasks])

  const getPositionPercent = (date: Date): number => {
    const diff = date.getTime() - minDate.getTime()
    const total = maxDate.getTime() - minDate.getTime()
    if (total === 0) return 0
    return Math.max(0, Math.min(100, (diff / total) * 100))
  }

  const formatLabel = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Generate date labels for the axis
  const dateLabels = useMemo(() => {
    const labels: { date: Date; percent: number }[] = []
    const step = Math.max(1, Math.floor(totalDays / 7))
    const current = new Date(minDate)
    while (current <= maxDate) {
      labels.push({ date: new Date(current), percent: getPositionPercent(current) })
      current.setDate(current.getDate() + step)
    }
    return labels
  }, [minDate, maxDate, totalDays])

  if (sortedTasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-48 rounded-xl border border-purple-500/20 bg-black/40 text-muted-foreground text-sm"
      >
        No tasks with dates to display on the timeline
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-purple-500/20 bg-black/40 backdrop-blur-sm p-4 overflow-x-auto"
    >
      {/* Date axis */}
      <div className="relative h-8 mb-2 min-w-[600px]">
        {dateLabels.map((label, i) => (
          <div
            key={i}
            className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
            style={{ left: `${label.percent}%` }}
          >
            {formatLabel(label.date)}
          </div>
        ))}
      </div>

      {/* Gridlines */}
      <div className="relative min-w-[600px]">
        <div className="absolute inset-0">
          {dateLabels.map((label, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-purple-500/10"
              style={{ left: `${label.percent}%` }}
            />
          ))}
        </div>

        {/* Task bars */}
        <div className="relative space-y-2">
          {sortedTasks.map(({ task, start, end }, index) => {
            const leftPct = getPositionPercent(start)
            const rightPct = getPositionPercent(end)
            const widthPct = Math.max(2, rightPct - leftPct)

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative h-8"
              >
                <div
                  className={cn(
                    'absolute h-full rounded-md border flex items-center px-2 overflow-hidden',
                    'shadow-[0_0_8px_rgba(168,85,247,0.1)]',
                    'transition-all duration-200 hover:shadow-[0_0_12px_rgba(168,85,247,0.25)]',
                    priorityBarColors[task.priority] ?? priorityBarColors[3]
                  )}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                  }}
                >
                  <span className="text-xs font-medium text-white truncate drop-shadow-sm">
                    {task.title}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-purple-500/10 min-w-[600px]">
        {[
          { label: 'Critical', color: 'bg-red-500' },
          { label: 'High', color: 'bg-orange-500' },
          { label: 'Medium', color: 'bg-yellow-500' },
          { label: 'Low', color: 'bg-green-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn('h-2.5 w-2.5 rounded-sm', item.color)} />
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
