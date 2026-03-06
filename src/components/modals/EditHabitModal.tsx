'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppDispatch } from '@/state/hooks'
import { updateHabit, generateHabitPlan } from '@/state/slices/habitsSlice'
import { useToast } from '@/components/ui/toaster'
import { suggestHabitIcon, getIconsByCategory, getAllIcons } from '@/lib/habits/iconSuggestion'
import { cn } from '@/lib/utils'
import type { Habit } from '@/types'

interface EditHabitModalProps {
  open: boolean
  onClose: () => void
  habit: Habit | null
  onPlanRegenerated?: () => void
}

const habitCategories = ['Health', 'Fitness', 'Learning', 'Mindfulness', 'Productivity', 'Social', 'Creative', 'Other']

export function EditHabitModal({ open, onClose, habit, onPlanRegenerated }: EditHabitModalProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('⭐')
  const [suggestedIcon, setSuggestedIcon] = useState('⭐')
  const [isIconAutoSuggested, setIsIconAutoSuggested] = useState(false)
  const [showAllIcons, setShowAllIcons] = useState(false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily')
  const [category, setCategory] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [regeneratePlan, setRegeneratePlan] = useState(false)

  // Initialize form with habit data
  useEffect(() => {
    if (habit && open) {
      setName(habit.name)
      setDescription(habit.description || '')
      setIcon(habit.icon)
      setFrequency(habit.frequency)
      setCategory(habit.category || '')
      setReminderTime(habit.reminderTime || '')
      setIsIconAutoSuggested(false)
      setShowAllIcons(false)
      setRegeneratePlan(false)
    }
  }, [habit, open])

  // Auto-suggest icon when name changes
  const updateSuggestions = useCallback((habitName: string, habitDescription: string) => {
    if (habitName.trim()) {
      const suggestion = suggestHabitIcon(habitName, habitDescription)
      setSuggestedIcon(suggestion.icon)
      if (isIconAutoSuggested) {
        setIcon(suggestion.icon)
      }
    }
  }, [isIconAutoSuggested])

  useEffect(() => {
    if (name !== habit?.name || description !== habit?.description) {
      const debounce = setTimeout(() => {
        updateSuggestions(name, description)
      }, 300)
      return () => clearTimeout(debounce)
    }
  }, [name, description, habit, updateSuggestions])

  const handleIconSelect = (selectedIcon: string) => {
    setIcon(selectedIcon)
    setIsIconAutoSuggested(false)
  }

  const handleUseSuggestedIcon = () => {
    setIcon(suggestedIcon)
    setIsIconAutoSuggested(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !habit) return

    setIsSubmitting(true)

    try {
      // Update the habit
      await dispatch(updateHabit({
        id: habit.id,
        updates: {
          name: name.trim(),
          description: description.trim() || undefined,
          icon,
          frequency,
          reminderTime: reminderTime || undefined,
          reminderEnabled: !!reminderTime,
          category: category || undefined,
        },
      })).unwrap()

      // Regenerate plan if requested
      if (regeneratePlan) {
        await dispatch(generateHabitPlan(habit.id)).unwrap()
        toast({
          title: 'Habit updated',
          description: 'Your habit and plan have been updated successfully.',
          variant: 'success',
        })
        onPlanRegenerated?.()
      } else {
        toast({
          title: 'Habit updated',
          description: 'Your habit has been updated successfully.',
          variant: 'success',
        })
      }

      onClose()
    } catch (error) {
      toast({
        title: 'Failed to update habit',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  const iconsByCategory = getIconsByCategory()
  const allIcons = getAllIcons()

  if (!habit) return null

  const hasChanges =
    name !== habit.name ||
    description !== (habit.description || '') ||
    icon !== habit.icon ||
    frequency !== habit.frequency ||
    category !== (habit.category || '') ||
    reminderTime !== (habit.reminderTime || '')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Habit</DialogTitle>
          <DialogDescription>
            Update your habit details and optionally regenerate the implementation plan
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Habit Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning meditation"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about your habit..."
                rows={2}
              />
            </div>

            {/* Icon Section */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                Icon
                {suggestedIcon !== icon && name !== habit.name && (
                  <span className="flex items-center gap-1 text-xs text-primary font-normal">
                    <Sparkles className="w-3 h-3" />
                    New suggestion available
                  </span>
                )}
              </Label>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-16 h-16 text-3xl rounded-xl border-2 flex items-center justify-center transition-all',
                      'bg-gradient-to-br from-primary/10 to-primary/5 border-primary shadow-lg'
                    )}
                  >
                    {icon}
                  </div>
                  {suggestedIcon !== icon && name !== habit.name && (
                    <button
                      type="button"
                      onClick={handleUseSuggestedIcon}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Use {suggestedIcon}
                    </button>
                  )}
                </div>

                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => setShowAllIcons(!showAllIcons)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {showAllIcons ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Hide icon picker
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Change icon
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Icon Picker */}
              {showAllIcons && (
                <div className="mt-2 p-3 rounded-lg border bg-muted/30 space-y-3 max-h-[200px] overflow-y-auto">
                  {Object.entries(iconsByCategory).map(([categoryName, icons]) => (
                    <div key={categoryName}>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{categoryName}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {icons.map((emoji) => (
                          <button
                            key={`${categoryName}-${emoji}`}
                            type="button"
                            onClick={() => handleIconSelect(emoji)}
                            className={cn(
                              'w-9 h-9 text-lg rounded-lg border transition-all hover:scale-110',
                              icon === emoji
                                ? 'border-primary bg-primary/20 shadow-sm'
                                : 'border-transparent hover:border-primary/50 hover:bg-primary/10'
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">More</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allIcons.filter(i => !Object.values(iconsByCategory).flat().includes(i)).slice(0, 12).map((emoji) => (
                        <button
                          key={`extra-${emoji}`}
                          type="button"
                          onClick={() => handleIconSelect(emoji)}
                          className={cn(
                            'w-9 h-9 text-lg rounded-lg border transition-all hover:scale-110',
                            icon === emoji
                              ? 'border-primary bg-primary/20 shadow-sm'
                              : 'border-transparent hover:border-primary/50 hover:bg-primary/10'
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as 'daily' | 'weekly' | 'custom')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {habitCategories.map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reminderTime">Reminder Time (optional)</Label>
              <Input
                id="reminderTime"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>

            {/* Regenerate Plan Option */}
            {hasChanges && (
              <div className="pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setRegeneratePlan(!regeneratePlan)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all',
                    regeneratePlan
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary'
                  )}
                >
                  <RefreshCw className={cn('w-4 h-4', regeneratePlan && 'text-primary')} />
                  <span className="font-medium">
                    {regeneratePlan ? 'Will regenerate Atomic Habits plan' : 'Regenerate Atomic Habits plan?'}
                  </span>
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {regeneratePlan
                    ? 'A new AI-generated implementation plan will be created based on your changes'
                    : 'Your current plan will be kept'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting || (!hasChanges && !regeneratePlan)}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {regeneratePlan ? 'Updating & Regenerating...' : 'Updating...'}
                </>
              ) : (
                <>
                  {regeneratePlan ? 'Save & Regenerate Plan' : 'Save Changes'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
