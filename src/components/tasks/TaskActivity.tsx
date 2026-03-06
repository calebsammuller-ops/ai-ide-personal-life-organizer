'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  CheckCircle2,
  Edit3,
  Trash2,
  Plus,
  ArrowRightLeft,
  Clock,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskActivity as TaskActivityType } from '@/types/taskExtended'

interface TaskActivityProps {
  taskId: string
}

const ACTION_CONFIG: Record<
  string,
  { icon: typeof Activity; color: string; bgColor: string }
> = {
  created: { icon: Plus, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  updated: { icon: Edit3, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  completed: {
    icon: CheckCircle2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  deleted: { icon: Trash2, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  status_changed: {
    icon: ArrowRightLeft,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  commented: {
    icon: MessageSquare,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  scheduled: {
    icon: Clock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
}

const DEFAULT_ACTION_CONFIG = {
  icon: Activity,
  color: 'text-muted-foreground',
  bgColor: 'bg-muted',
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
  })
}

function renderChanges(details: Record<string, unknown>): string | null {
  if (!details || Object.keys(details).length === 0) return null

  const parts: string[] = []
  for (const [key, value] of Object.entries(details)) {
    if (key === 'from' && details.to) {
      return `Changed from "${details.from}" to "${details.to}"`
    }
    if (key === 'field') {
      continue
    }
    parts.push(`${key}: ${JSON.stringify(value)}`)
  }
  return parts.length > 0 ? parts.join(', ') : null
}

export function TaskActivity({ taskId }: TaskActivityProps) {
  const [activities, setActivities] = useState<TaskActivityType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/tasks/${taskId}/activity`)
        if (!response.ok) throw new Error('Failed to fetch activity')
        const data = await response.json()
        setActivities(data.data ?? [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load activity'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivity()
  }, [taskId])

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <p className="text-sm text-muted-foreground">
              Loading activity...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-6">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-400" />
          Activity
          <Badge
            variant="outline"
            className="ml-auto text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20"
          >
            {activities.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <Activity className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/50" />

            <div className="space-y-4">
              {activities.map((activity, index) => {
                const config =
                  ACTION_CONFIG[activity.action] ?? DEFAULT_ACTION_CONFIG
                const IconComponent = config.icon
                const changesText = renderChanges(activity.details)

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex items-start gap-3 pl-0"
                  >
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0',
                        config.bgColor
                      )}
                    >
                      <IconComponent
                        className={cn('h-3.5 w-3.5', config.color)}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium capitalize">
                          {activity.action.replace(/_/g, ' ')}
                        </p>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                      </div>
                      {changesText && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {changesText}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
