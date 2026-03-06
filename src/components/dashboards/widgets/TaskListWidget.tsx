'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ListTodo } from 'lucide-react'

interface TaskItem {
  id: string
  title: string
  status: string
  priority: number
}

const statusDotColors: Record<string, string> = {
  pending: 'bg-gray-400',
  scheduled: 'bg-blue-400',
  in_progress: 'bg-yellow-400',
  completed: 'bg-green-400',
  cancelled: 'bg-red-400',
  deferred: 'bg-purple-400',
}

const priorityDotColors: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-blue-400',
  5: 'bg-gray-400',
}

export function TaskListWidget() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await fetch('/api/tasks?limit=5')
        if (res.ok) {
          const data = await res.json()
          setTasks(data.data ?? [])
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false)
      }
    }
    loadTasks()
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
          <ListTodo className="h-4 w-4 text-purple-400" />
          Recent Tasks
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
        ) : tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No tasks yet</p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-purple-500/5 transition-colors"
              >
                <div
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    statusDotColors[task.status] ?? 'bg-gray-400'
                  )}
                />
                <span className="text-xs text-purple-50 truncate flex-1">
                  {task.title}
                </span>
                <div
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    priorityDotColors[task.priority] ?? 'bg-gray-400'
                  )}
                />
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
