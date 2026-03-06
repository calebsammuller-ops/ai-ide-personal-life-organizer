'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CalendarDays, Clock, Zap } from 'lucide-react'
import type { Task } from '@/types/scheduling'

interface KanbanCardProps {
  task: Task
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  pending:    { label: 'Not Started', dot: 'bg-zinc-500',   text: 'text-zinc-400' },
  scheduled:  { label: 'Scheduled',   dot: 'bg-blue-400',   text: 'text-blue-400' },
  in_progress:{ label: 'In Progress', dot: 'bg-yellow-400', text: 'text-yellow-400' },
  completed:  { label: 'Done',        dot: 'bg-green-400',  text: 'text-green-400' },
  cancelled:  { label: 'Cancelled',   dot: 'bg-zinc-600',   text: 'text-zinc-500' },
  deferred:   { label: 'Blocked',     dot: 'bg-red-500',    text: 'text-red-400' },
}

const ENERGY_CONFIG: Record<string, { color: string; label: string }> = {
  low:    { color: 'bg-blue-400',   label: 'Low' },
  medium: { color: 'bg-yellow-400', label: 'Med' },
  high:   { color: 'bg-red-400',    label: 'High' },
}

// Tag colors — cycle through a palette
const TAG_COLORS = [
  'bg-purple-900/50 text-purple-300 border-purple-700/40',
  'bg-blue-900/50 text-blue-300 border-blue-700/40',
  'bg-cyan-900/50 text-cyan-300 border-cyan-700/40',
  'bg-indigo-900/50 text-indigo-300 border-indigo-700/40',
  'bg-violet-900/50 text-violet-300 border-violet-700/40',
]

function getOverdueDays(deadline: Date | string | undefined): number | null {
  if (!deadline) return null
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : null
}

function formatDueDate(date: Date | string | undefined): string | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function KanbanCard({ task }: KanbanCardProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending
  const energy = task.energyLevel ? ENERGY_CONFIG[task.energyLevel] : null
  const overdueDays = getOverdueDays(task.deadline)
  const dueLabel = formatDueDate(task.deadline)
  const isOverdue = overdueDays !== null
  const isCompleted = task.status === 'completed'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -1, boxShadow: '0 4px 20px rgba(168,85,247,0.12)' }}
      draggable="true"
      onDragStart={handleDragStart}
      className={cn(
        'cursor-grab active:cursor-grabbing rounded-lg border bg-[#0d1117] p-3 space-y-2.5',
        'border-[#1e2433] hover:border-purple-500/30 transition-all duration-150',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Top row: status badge + overdue badge */}
      <div className="flex items-center justify-between gap-2">
        <div className={cn('flex items-center gap-1.5', status.text)}>
          <span className={cn('h-2 w-2 rounded-full shrink-0', status.dot)} />
          <span className="text-[10px] font-medium">{status.label}</span>
        </div>
        {isOverdue && (
          <span className="text-[10px] font-semibold text-red-400 bg-red-950/50 border border-red-800/40 rounded px-1.5 py-0.5">
            -{overdueDays}D
          </span>
        )}
      </div>

      {/* Title */}
      <p className={cn(
        'text-sm font-medium leading-snug line-clamp-2',
        isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-100'
      )}>
        {task.title}
      </p>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag, i) => (
            <span
              key={tag}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded border font-medium',
                TAG_COLORS[i % TAG_COLORS.length]
              )}
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-zinc-500">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Bottom row: due date + energy + duration */}
      <div className="flex items-center gap-2 flex-wrap">
        {dueLabel && (
          <div className={cn(
            'flex items-center gap-1 text-[10px] font-medium',
            isOverdue ? 'text-red-400' : 'text-zinc-500'
          )}>
            <CalendarDays className="h-3 w-3" />
            {dueLabel}
          </div>
        )}
        {task.durationMinutes > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Clock className="h-3 w-3" />
            {task.durationMinutes}m
          </div>
        )}
        {energy && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 ml-auto">
            <Zap className="h-3 w-3" />
            <span className={cn('h-1.5 w-1.5 rounded-full', energy.color)} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
