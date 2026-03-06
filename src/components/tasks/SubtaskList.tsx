'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import type { Task } from '@/types/scheduling'
import { cn } from '@/lib/utils'

interface SubtaskListProps {
  parentTaskId: string
  subtasks: Task[]
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void
  onSubtaskCreated?: (subtask: Task) => void
}

const priorityDotColors: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-blue-500',
  5: 'bg-gray-400',
}

export function SubtaskList({
  parentTaskId,
  subtasks,
  onSubtaskToggle,
  onSubtaskCreated,
}: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showInput, setShowInput] = useState(false)

  const completedCount = subtasks.filter((s) => s.status === 'completed').length
  const totalCount = subtasks.length

  const handleAddSubtask = useCallback(async () => {
    if (!newTitle.trim() || isAdding) return

    setIsAdding(true)
    try {
      const response = await fetch(`/api/tasks/${parentTaskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      })

      if (!response.ok) throw new Error('Failed to create subtask')

      const data = await response.json()
      onSubtaskCreated?.(data.data)
      setNewTitle('')
    } catch (error) {
      console.error('Failed to add subtask:', error)
    } finally {
      setIsAdding(false)
    }
  }, [newTitle, isAdding, parentTaskId, onSubtaskCreated])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSubtask()
    }
    if (e.key === 'Escape') {
      setNewTitle('')
      setShowInput(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Subtasks
        </span>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} done
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalCount) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Subtask items */}
      <div className="space-y-1">
        <AnimatePresence>
          {subtasks.map((subtask, index) => {
            const isCompleted = subtask.status === 'completed'

            return (
              <motion.div
                key={subtask.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'flex items-center gap-2.5 p-2 rounded-md',
                  'hover:bg-accent/50 transition-colors group'
                )}
              >
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={(checked) =>
                    onSubtaskToggle?.(subtask.id, checked as boolean)
                  }
                />
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    priorityDotColors[subtask.priority] || 'bg-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'text-sm flex-1 truncate',
                    isCompleted && 'line-through text-muted-foreground'
                  )}
                >
                  {subtask.title}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Inline add form */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Subtask title..."
                className="h-8 text-sm"
                autoFocus
                disabled={isAdding}
              />
              {isAdding && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Press Enter to add, Escape to cancel
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!showInput && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInput(true)}
          className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add subtask
        </Button>
      )}
    </div>
  )
}
