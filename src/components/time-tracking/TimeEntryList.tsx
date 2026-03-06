'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Calendar, ListTodo, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch } from '@/state/hooks'
import { deleteTimeEntry } from '@/state/slices/timeTrackingSlice'
import type { TimeEntry } from '@/types/timeTracking'

interface TimeEntryListProps {
  entries: TimeEntry[]
  className?: string
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('default', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateHeading(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return date.toLocaleDateString('default', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0]
}

interface GroupedEntries {
  date: string
  dateKey: string
  entries: TimeEntry[]
  totalSeconds: number
}

export function TimeEntryList({ entries, className }: TimeEntryListProps) {
  const dispatch = useAppDispatch()

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this time entry?')) return
    dispatch(deleteTimeEntry(id))
  }

  const grouped = useMemo<GroupedEntries[]>(() => {
    const groups: Record<string, TimeEntry[]> = {}

    for (const entry of entries) {
      const key = getDateKey(entry.startTime)
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, dateEntries]) => ({
        date: dateEntries[0].startTime,
        dateKey,
        entries: dateEntries.sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        ),
        totalSeconds: dateEntries.reduce(
          (sum, e) => sum + (e.durationSeconds ?? 0),
          0
        ),
      }))
  }, [entries])

  if (entries.length === 0) {
    return (
      <Card className={cn('border-border/50 bg-card/80 backdrop-blur-sm', className)}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No time entries yet. Start tracking to see your history.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {grouped.map((group, groupIndex) => (
        <motion.div
          key={group.dateKey}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.08 }}
        >
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            {/* Date header */}
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-400" />
                  {formatDateHeading(group.date)}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20"
                >
                  {formatDuration(group.totalSeconds)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0 pb-3">
              <div className="divide-y divide-border/30">
                {group.entries.map((entry, entryIndex) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: groupIndex * 0.08 + entryIndex * 0.03,
                    }}
                    className={cn(
                      'flex items-center justify-between py-2.5 px-1',
                      'hover:bg-muted/30 rounded-md transition-colors -mx-1'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          entry.isRunning
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <ListTodo className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {entry.taskTitle || 'Untitled Task'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTime(entry.startTime)}</span>
                          {entry.endTime && (
                            <>
                              <span>-</span>
                              <span>{formatTime(entry.endTime)}</span>
                            </>
                          )}
                          {entry.isRunning && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-400 border-green-500/20"
                            >
                              Running
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="text-sm font-mono tabular-nums font-medium">
                        {entry.durationSeconds
                          ? formatDuration(entry.durationSeconds)
                          : '--'}
                      </span>
                      {!entry.isRunning && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
