'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  startTimer,
  stopTimer,
  selectActiveTimer,
} from '@/state/slices/timeTrackingSlice'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Play, Square, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeTrackerProps {
  taskId?: string
  taskTitle?: string
  compact?: boolean
  className?: string
}

export function TimeTracker({
  taskId,
  taskTitle,
  compact = false,
  className,
}: TimeTrackerProps) {
  const dispatch = useAppDispatch()
  const activeTimer = useAppSelector(selectActiveTimer)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const isRunning = activeTimer !== null && activeTimer.isRunning
  const isThisTask = taskId ? activeTimer?.taskId === taskId : isRunning

  // Calculate elapsed time from the active timer's start
  useEffect(() => {
    if (isRunning && activeTimer) {
      const startTime = new Date(activeTimer.startTime).getTime()

      const tick = () => {
        const now = Date.now()
        setElapsed(Math.floor((now - startTime) / 1000))
      }

      tick() // immediate first tick
      intervalRef.current = setInterval(tick, 1000)

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    } else {
      setElapsed(0)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, activeTimer])

  const formatElapsed = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    dispatch(startTimer({ taskId }))
  }

  const handleStop = () => {
    dispatch(stopTimer(activeTimer?.id))
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-mono tabular-nums text-foreground">
              {formatElapsed(elapsed)}
            </span>
          </motion.div>
        )}
        {taskId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={isThisTask && isRunning ? handleStop : handleStart}
            disabled={isRunning && !isThisTask}
          >
            {isThisTask && isRunning ? (
              <Square className="h-3.5 w-3.5 text-red-400" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border-border/50',
        isRunning && 'border-purple-500/30 shadow-md shadow-purple-500/5',
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isRunning
                  ? 'bg-purple-500/10 text-purple-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              {isRunning && activeTimer?.taskTitle ? (
                <p className="text-sm font-medium truncate">
                  {activeTimer.taskTitle}
                </p>
              ) : taskTitle ? (
                <p className="text-sm font-medium truncate">{taskTitle}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{isRunning ? 'Free timer' : 'No task selected'}</p>
              )}

              <AnimatePresence mode="wait">
                {isRunning ? (
                  <motion.p
                    key="running"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-mono font-bold tabular-nums tracking-wider text-foreground"
                  >
                    {formatElapsed(elapsed)}
                  </motion.p>
                ) : (
                  <motion.p
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-2xl font-mono font-bold tabular-nums tracking-wider text-muted-foreground"
                  >
                    00:00:00
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}

            {isRunning ? (
              <Button
                onClick={handleStop}
                variant="destructive"
                size="sm"
                className="h-9 gap-1.5"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                size="sm"
                className="h-9 gap-1.5 bg-purple-600 hover:bg-purple-700"
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
