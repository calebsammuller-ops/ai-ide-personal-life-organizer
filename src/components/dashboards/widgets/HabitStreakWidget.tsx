'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'

interface HabitItem {
  id: string
  name: string
  current_streak: number
}

export function HabitStreakWidget() {
  const [habits, setHabits] = useState<HabitItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadHabits() {
      try {
        const res = await fetch('/api/habits')
        if (res.ok) {
          const data = await res.json()
          const all: HabitItem[] = data.data ?? []
          const sorted = all
            .sort((a, b) => (b.current_streak ?? 0) - (a.current_streak ?? 0))
            .slice(0, 5)
          setHabits(sorted)
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }
    loadHabits()
  }, [])

  return (
    <Card
      className={cn(
        'border border-purple-500/15 bg-black/40 backdrop-blur-sm',
        'hover:border-purple-500/30 transition-all duration-200'
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-purple-100 flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          Habit Streaks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-6 rounded bg-purple-500/5 animate-pulse"
              />
            ))}
          </div>
        ) : habits.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No habits yet</p>
        ) : (
          <div className="space-y-1.5">
            {habits.map((habit, index) => (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-purple-500/5 transition-colors"
              >
                <span className="text-xs text-purple-50 truncate flex-1">
                  {habit.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Flame
                    className={cn(
                      'h-3 w-3',
                      habit.current_streak > 0
                        ? 'text-orange-400'
                        : 'text-muted-foreground/40'
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums',
                      habit.current_streak > 0
                        ? 'text-orange-300'
                        : 'text-muted-foreground'
                    )}
                  >
                    {habit.current_streak ?? 0}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
