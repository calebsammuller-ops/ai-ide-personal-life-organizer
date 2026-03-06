'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchRules,
  selectAllRules,
  selectAutomationsLoading,
  updateRule,
  deleteRule,
} from '@/state/slices/automationsSlice'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Trash2, Zap, BellRing, Tag, ListPlus } from 'lucide-react'

const triggerIcons: Record<string, React.ElementType> = {
  task_completed: Zap,
  habit_completed: Zap,
  habit_streak: Zap,
  task_created: ListPlus,
}

const actionBadgeColors: Record<string, string> = {
  award_xp: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  create_task: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  notify: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  add_tag: 'bg-green-500/20 text-green-300 border-green-500/30',
}

const triggerBadgeColors: Record<string, string> = {
  task_completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  habit_completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  habit_streak: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  task_created: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
}

export function AutomationList() {
  const dispatch = useAppDispatch()
  const rules = useAppSelector(selectAllRules)
  const isLoading = useAppSelector(selectAutomationsLoading)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchRules())
  }, [dispatch])

  const handleToggleActive = (ruleId: string, currentActive: boolean) => {
    dispatch(updateRule({ id: ruleId, updates: { isActive: !currentActive } }))
  }

  const handleDelete = (ruleId: string) => {
    if (confirmDeleteId === ruleId) {
      dispatch(deleteRule(ruleId))
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(ruleId)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-purple-500/5 border border-purple-500/10 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <Zap className="h-10 w-10 text-purple-500/40 mb-3" />
        <p className="text-muted-foreground text-sm">No automation rules yet</p>
        <p className="text-muted-foreground text-xs mt-1">
          Create one to automate repetitive actions
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {rules.map((rule, index) => {
          const TriggerIcon = triggerIcons[rule.triggerType] ?? Zap

          return (
            <motion.div
              key={rule.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  'border border-purple-500/15 bg-black/40 backdrop-blur-sm',
                  'transition-all duration-200',
                  'hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)]',
                  !rule.isActive && 'opacity-60'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <TriggerIcon className="h-4 w-4 text-purple-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-purple-50 truncate">
                        {rule.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            triggerBadgeColors[rule.triggerType] ?? 'border-purple-500/30 text-purple-300'
                          )}
                        >
                          {rule.triggerType.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-muted-foreground text-[10px]">then</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            actionBadgeColors[rule.actionType] ?? 'border-purple-500/30 text-purple-300'
                          )}
                        >
                          {rule.actionType.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => handleToggleActive(rule.id, rule.isActive)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        className={cn(
                          'h-8 w-8 p-0 transition-colors',
                          confirmDeleteId === rule.id
                            ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                            : 'text-muted-foreground hover:text-red-400'
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {confirmDeleteId === rule.id && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-red-400 mt-2 pl-13"
                    >
                      Click delete again to confirm removal
                    </motion.p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
