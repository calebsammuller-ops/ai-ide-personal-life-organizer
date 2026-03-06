'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown } from 'lucide-react'
import type { Task, TaskStatus } from '@/types/scheduling'

interface TableViewProps {
  tasks: Task[]
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
}

type SortKey = 'title' | 'status' | 'priority' | 'deadline'
type SortDir = 'asc' | 'desc'

const statusColors: Record<string, string> = {
  pending: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  deferred: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Critical', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  2: { label: 'High', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  3: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  4: { label: 'Low', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  5: { label: 'Minimal', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '--'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TableView({ tasks, onTaskUpdate }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('priority')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
        case 'priority':
          cmp = a.priority - b.priority
          break
        case 'deadline': {
          const aDate = a.deadline ? new Date(a.deadline).getTime() : Infinity
          const bDate = b.deadline ? new Date(b.deadline).getTime() : Infinity
          cmp = aDate - bDate
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [tasks, sortKey, sortDir])

  const headers: { key: SortKey; label: string }[] = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'deadline', label: 'Due Date' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-purple-500/20 bg-black/40 backdrop-blur-sm overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-500/20">
              {headers.map((header) => (
                <th
                  key={header.key}
                  onClick={() => handleSort(header.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                    'text-purple-300 cursor-pointer select-none',
                    'hover:bg-purple-500/10 transition-colors'
                  )}
                >
                  <div className="flex items-center gap-1">
                    {header.label}
                    <ArrowUpDown
                      className={cn(
                        'h-3 w-3 transition-colors',
                        sortKey === header.key
                          ? 'text-purple-400'
                          : 'text-muted-foreground/40'
                      )}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task, index) => (
              <motion.tr
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={cn(
                  'border-b border-purple-500/10 transition-colors',
                  'hover:bg-purple-500/5'
                )}
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-purple-50">
                    {task.title}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] capitalize',
                      statusColors[task.status] ?? statusColors.pending
                    )}
                  >
                    {task.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      priorityLabels[task.priority]?.color ?? ''
                    )}
                  >
                    {priorityLabels[task.priority]?.label ?? `P${task.priority}`}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(task.deadline)}
                  </span>
                </td>
              </motion.tr>
            ))}
            {sortedTasks.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No tasks to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
