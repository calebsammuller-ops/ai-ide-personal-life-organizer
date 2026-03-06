'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WidgetContainer } from './WidgetContainer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus, LayoutGrid } from 'lucide-react'
import type { DashboardWidget } from '@/state/slices/dashboardSlice'

interface DashboardBuilderProps {
  widgets: DashboardWidget[]
  onAddWidget: () => void
  onRemoveWidget: (widgetId: string) => void
}

function getWidgetTitle(widgetType: string): string {
  const titles: Record<string, string> = {
    task_list: 'Recent Tasks',
    habit_streak: 'Habit Streaks',
    quick_actions: 'Quick Actions',
    calendar: 'Calendar',
    stats: 'Statistics',
  }
  return titles[widgetType] ?? widgetType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function DashboardBuilder({
  widgets,
  onAddWidget,
  onRemoveWidget,
}: DashboardBuilderProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {widgets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {widgets.map((widget) => (
              <WidgetContainer
                key={widget.id}
                title={getWidgetTitle(widget.widgetType)}
                onRemove={() => onRemoveWidget(widget.id)}
              >
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  <div className="text-center">
                    <LayoutGrid className="h-6 w-6 mx-auto mb-1 text-purple-500/40" />
                    <p>{widget.widgetType}</p>
                  </div>
                </div>
              </WidgetContainer>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-purple-500/20"
        >
          <LayoutGrid className="h-10 w-10 text-purple-500/30 mb-3" />
          <p className="text-sm text-muted-foreground">No widgets added yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add widgets to customize your dashboard
          </p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          onClick={onAddWidget}
          variant="outline"
          className={cn(
            'w-full border-dashed border-purple-500/30 text-purple-300',
            'hover:border-purple-500/50 hover:bg-purple-500/5',
            'hover:shadow-[0_0_15px_rgba(168,85,247,0.1)]',
            'transition-all duration-200'
          )}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Widget
        </Button>
      </motion.div>
    </motion.div>
  )
}
