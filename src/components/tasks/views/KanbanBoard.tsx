'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'
import type { Task, TaskStatus } from '@/types/scheduling'

interface KanbanBoardProps {
  tasks: Task[]
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

// Priority-based columns (Linear-inspired)
const PRIORITY_COLUMNS = [
  {
    key: 'urgent',
    label: 'Urgent',
    flag: '🚩',
    header: 'border-red-500/50 bg-red-950/10',
    drop: 'border-red-400/60',
    badge: 'bg-red-950/60 text-red-300',
    match: (p: number) => p >= 5,
  },
  {
    key: 'high',
    label: 'High',
    flag: '🏴',
    header: 'border-orange-500/40 bg-orange-950/10',
    drop: 'border-orange-400/60',
    badge: 'bg-orange-950/60 text-orange-300',
    match: (p: number) => p === 4,
  },
  {
    key: 'medium',
    label: 'Medium',
    flag: '▲',
    header: 'border-yellow-500/30 bg-yellow-950/10',
    drop: 'border-yellow-400/60',
    badge: 'bg-yellow-950/60 text-yellow-300',
    match: (p: number) => p === 3,
  },
  {
    key: 'low',
    label: 'Low',
    flag: '▼',
    header: 'border-zinc-600/30 bg-zinc-900/20',
    drop: 'border-zinc-500/60',
    badge: 'bg-zinc-800/60 text-zinc-400',
    match: (p: number) => p <= 2,
  },
]

export function KanbanBoard({ tasks, onStatusChange }: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)

  // Exclude completed/cancelled from kanban (they clutter priority view)
  const activeTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'cancelled'
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, colKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(colKey)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, colKey: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    // Dragging between priority columns means changing status to in_progress as a signal
    // For now we just move between columns — status stays, priority would need updating
    // We keep onStatusChange for compatibility (tasks page uses it)
    if (taskId) {
      // Map the priority column back to a representative status
      const colToStatus: Record<string, TaskStatus> = {
        urgent: 'in_progress',
        high: 'pending',
        medium: 'scheduled',
        low: 'deferred',
      }
      onStatusChange(taskId, colToStatus[colKey] ?? 'pending')
    }
    setDragOverColumn(null)
    setDragTaskId(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"
    >
      {PRIORITY_COLUMNS.map((col, colIdx) => {
        const colTasks = activeTasks.filter((t) => col.match(t.priority ?? 3))
        const isDragOver = dragOverColumn === col.key

        return (
          <motion.div
            key={col.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: colIdx * 0.06 }}
            className={cn(
              'flex flex-col rounded-xl border min-h-[400px] transition-all duration-150',
              col.header,
              isDragOver && cn('shadow-[0_0_20px_rgba(168,85,247,0.18)]', col.drop)
            )}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-sm">{col.flag}</span>
                <span className="text-sm font-semibold text-zinc-200">{col.label}</span>
              </div>
              <span className={cn('text-[11px] font-semibold rounded-full px-2 py-0.5', col.badge)}>
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {colTasks.map((task) => (
                  <KanbanCard key={task.id} task={task} />
                ))}
              </AnimatePresence>

              {colTasks.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'flex items-center justify-center h-24 rounded-lg border border-dashed',
                    'border-white/10 text-zinc-600 text-xs',
                    isDragOver && 'border-purple-400/40 bg-purple-500/5 text-purple-400'
                  )}
                >
                  {isDragOver ? 'Drop here' : 'No tasks'}
                </motion.div>
              )}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
