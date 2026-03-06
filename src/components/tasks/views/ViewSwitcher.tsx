'use client'

import { motion } from 'framer-motion'
import { List, Columns, Calendar, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type TaskViewType = 'list' | 'kanban' | 'timeline' | 'table'

interface ViewSwitcherProps {
  currentView: TaskViewType
  onChange: (view: TaskViewType) => void
}

const views: { id: TaskViewType; label: string; icon: React.ElementType }[] = [
  { id: 'list', label: 'List', icon: List },
  { id: 'kanban', label: 'Kanban', icon: Columns },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'table', label: 'Table', icon: Table2 },
]

export function ViewSwitcher({ currentView, onChange }: ViewSwitcherProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 rounded-lg border border-purple-500/20 bg-black/40 p-1 backdrop-blur-sm"
    >
      {views.map((view) => {
        const Icon = view.icon
        const isActive = currentView === view.id

        return (
          <Button
            key={view.id}
            variant="ghost"
            size="sm"
            onClick={() => onChange(view.id)}
            className={cn(
              'relative gap-2 px-3 py-1.5 text-sm transition-all duration-200',
              isActive
                ? 'text-purple-100'
                : 'text-muted-foreground hover:text-purple-300'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeViewIndicator"
                className="absolute inset-0 rounded-md bg-purple-600/30 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon className="relative z-10 h-4 w-4" />
            <span className="relative z-10 hidden sm:inline">{view.label}</span>
          </Button>
        )
      })}
    </motion.div>
  )
}
