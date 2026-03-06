'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch } from '@/state/hooks'
import { createRule } from '@/state/slices/automationsSlice'
import type { AutomationTemplate, CreateRuleInput } from '@/state/slices/automationsSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Save, Zap } from 'lucide-react'

interface AutomationBuilderProps {
  onClose: () => void
  template?: AutomationTemplate
}

const triggerTypes = [
  { value: 'task_completed', label: 'Task Completed' },
  { value: 'habit_completed', label: 'Habit Completed' },
  { value: 'habit_streak', label: 'Habit Streak' },
  { value: 'task_created', label: 'Task Created' },
]

const actionTypes = [
  { value: 'award_xp', label: 'Award XP' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'notify', label: 'Notify' },
  { value: 'add_tag', label: 'Add Tag' },
]

export function AutomationBuilder({ onClose, template }: AutomationBuilderProps) {
  const dispatch = useAppDispatch()

  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState('')
  const [actionType, setActionType] = useState('')
  const [conditions, setConditions] = useState('{}')
  const [actionConfig, setActionConfig] = useState('{}')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (template) {
      setName(template.name)
      setTriggerType(template.triggerType)
      setActionType(template.actionType)
      setConditions(JSON.stringify(template.conditions, null, 2))
      setActionConfig(JSON.stringify(template.actionConfig, null, 2))
    }
  }, [template])

  const handleSave = async () => {
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!triggerType) {
      setError('Trigger type is required')
      return
    }
    if (!actionType) {
      setError('Action type is required')
      return
    }

    let parsedConditions: Record<string, unknown> = {}
    let parsedActionConfig: Record<string, unknown> = {}

    try {
      parsedConditions = JSON.parse(conditions)
    } catch {
      setError('Conditions must be valid JSON')
      return
    }

    try {
      parsedActionConfig = JSON.parse(actionConfig)
    } catch {
      setError('Action config must be valid JSON')
      return
    }

    const rule: CreateRuleInput = {
      name: name.trim(),
      triggerType,
      actionType,
      conditions: parsedConditions,
      actionConfig: parsedActionConfig,
      isActive: true,
    }

    setIsSaving(true)
    try {
      await dispatch(createRule(rule)).unwrap()
      onClose()
    } catch (err) {
      setError('Failed to create automation rule')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Zap className="h-4 w-4 text-purple-400" />
        </div>
        <h3 className="text-sm font-semibold text-purple-100">
          {template ? 'Create from Template' : 'New Automation'}
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rule-name" className="text-xs text-purple-300">
            Name
          </Label>
          <Input
            id="rule-name"
            placeholder="e.g., Award XP on task completion"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              'bg-black/40 border-purple-500/20 text-purple-50',
              'focus:border-purple-500/50 focus:ring-purple-500/20'
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-purple-300">Trigger</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger
                className={cn(
                  'bg-black/40 border-purple-500/20 text-purple-50',
                  'focus:border-purple-500/50 focus:ring-purple-500/20'
                )}
              >
                <SelectValue placeholder="Select trigger..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-purple-500/30">
                {triggerTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-purple-300">Action</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger
                className={cn(
                  'bg-black/40 border-purple-500/20 text-purple-50',
                  'focus:border-purple-500/50 focus:ring-purple-500/20'
                )}
              >
                <SelectValue placeholder="Select action..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-purple-500/30">
                {actionTypes.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="conditions" className="text-xs text-purple-300">
            Conditions (JSON)
          </Label>
          <Textarea
            id="conditions"
            placeholder='{"minStreak": 7}'
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={3}
            className={cn(
              'font-mono text-xs bg-black/40 border-purple-500/20 text-purple-50',
              'focus:border-purple-500/50 focus:ring-purple-500/20'
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="action-config" className="text-xs text-purple-300">
            Action Config (JSON)
          </Label>
          <Textarea
            id="action-config"
            placeholder='{"xpAmount": 50}'
            value={actionConfig}
            onChange={(e) => setActionConfig(e.target.value)}
            rows={3}
            className={cn(
              'font-mono text-xs bg-black/40 border-purple-500/20 text-purple-50',
              'focus:border-purple-500/50 focus:ring-purple-500/20'
            )}
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'flex-1 bg-purple-600 hover:bg-purple-500 text-white',
              'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
              'transition-all duration-200 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]'
            )}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Automation'}
          </Button>
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            Cancel
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
