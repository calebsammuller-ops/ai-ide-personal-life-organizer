'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Calendar, Clock, Zap } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useAppDispatch } from '@/state/hooks'
import { createHabit } from '@/state/slices/habitsSlice'
import { openModal } from '@/state/slices/uiSlice'
import { useToast } from '@/components/ui/toaster'
import { suggestHabitIcon, getIconsByCategory, getAllIcons } from '@/lib/habits/iconSuggestion'
import { cn } from '@/lib/utils'

interface CreateHabitModalProps {
  open: boolean
  onClose: () => void
}

const habitCategories = ['Health', 'Fitness', 'Learning', 'Mindfulness', 'Productivity', 'Social', 'Creative', 'Other']

export function CreateHabitModal({ open, onClose }: CreateHabitModalProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('⭐')
  const [suggestedIcon, setSuggestedIcon] = useState('⭐')
  const [isIconAutoSuggested, setIsIconAutoSuggested] = useState(true)
  const [showAllIcons, setShowAllIcons] = useState(false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily')
  const [category, setCategory] = useState('')
  const [suggestedCategory, setSuggestedCategory] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Scheduling options
  const [autoSchedule, setAutoSchedule] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(15)
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium')
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'anytime'>('anytime')

  // Auto-suggest icon and category when name changes
  const updateSuggestions = useCallback((habitName: string, habitDescription: string) => {
    if (habitName.trim()) {
      const suggestion = suggestHabitIcon(habitName, habitDescription)
      setSuggestedIcon(suggestion.icon)
      if (isIconAutoSuggested) {
        setIcon(suggestion.icon)
      }
      if (suggestion.category && !category) {
        setSuggestedCategory(suggestion.category.toLowerCase())
      }
    }
  }, [isIconAutoSuggested, category])

  useEffect(() => {
    const debounce = setTimeout(() => {
      updateSuggestions(name, description)
    }, 300)
    return () => clearTimeout(debounce)
  }, [name, description, updateSuggestions])

  const resetForm = () => {
    setName('')
    setDescription('')
    setIcon('⭐')
    setSuggestedIcon('⭐')
    setIsIconAutoSuggested(true)
    setShowAllIcons(false)
    setFrequency('daily' as 'daily' | 'weekly' | 'monthly' | 'custom')
    setCategory('')
    setSuggestedCategory('')
    setReminderTime('')
    // Reset scheduling options
    setAutoSchedule(false)
    setDurationMinutes(15)
    setEnergyLevel('medium')
    setPreferredTimeOfDay('anytime')
  }

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
    if (!name.trim()) return

    setIsSubmitting(true)

    // Use suggested category if no category manually selected
    const finalCategory = category || suggestedCategory

    try {
      const result = await dispatch(createHabit({
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color: '#6366f1',
        frequency,
        frequencyConfig: {},
        targetCount: 1,
        reminderTime: reminderTime || undefined,
        reminderEnabled: !!reminderTime,
        startDate: new Date().toISOString().split('T')[0],
        isActive: true,
        category: finalCategory || undefined,
        // Scheduling options
        autoSchedule,
        durationMinutes,
        energyLevel: autoSchedule ? energyLevel : undefined,
        preferredTimeOfDay: autoSchedule ? preferredTimeOfDay : undefined,
        schedulingPriority: 3,
      })).unwrap()

      toast({
        title: 'Habit created',
        description: `"${result.name}" has been added to your habits. Generating AI implementation plan...`,
        variant: 'success',
      })

      resetForm()
      onClose()

      // Open the habit plan modal with AI analysis
      dispatch(openModal({ modalName: 'habitPlan', data: { habit: result } }))
    } catch (error) {
      toast({
        title: 'Failed to create habit',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
      onClose()
    }
  }

  const iconsByCategory = getIconsByCategory()
  const allIcons = getAllIcons()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Habit</DialogTitle>
          <DialogDescription>
            Start building a new positive habit
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
                placeholder="e.g., Morning meditation, Run 5k, Read for 30 minutes"
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

            {/* Smart Icon Section */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                Icon
                {isIconAutoSuggested && name.trim() && (
                  <span className="flex items-center gap-1 text-xs text-primary font-normal">
                    <Sparkles className="w-3 h-3" />
                    Auto-suggested
                  </span>
                )}
              </Label>

              {/* Main Icon Display */}
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
                  {!isIconAutoSuggested && suggestedIcon !== icon && (
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
                  <p className="text-sm text-muted-foreground">
                    {name.trim()
                      ? 'Icon selected based on your habit'
                      : 'Start typing to get a suggested icon'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAllIcons(!showAllIcons)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                  >
                    {showAllIcons ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Hide icon picker
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Choose different icon
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
              <Select value={frequency} onValueChange={(v) => setFrequency(v as 'daily' | 'weekly' | 'monthly' | 'custom')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category" className="flex items-center gap-2">
                Category
                {suggestedCategory && !category && (
                  <span className="flex items-center gap-1 text-xs text-primary font-normal">
                    <Sparkles className="w-3 h-3" />
                    Suggested: {suggestedCategory}
                  </span>
                )}
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={suggestedCategory ? `Auto: ${suggestedCategory}` : 'Select category'} />
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
              <p className="text-xs text-muted-foreground">
                Set a time to be reminded about this habit
              </p>
            </div>

            {/* Scheduling Section */}
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoSchedule"
                  checked={autoSchedule}
                  onCheckedChange={(checked) => setAutoSchedule(checked as boolean)}
                />
                <Label htmlFor="autoSchedule" className="flex items-center gap-2 cursor-pointer">
                  <Calendar className="w-4 h-4 text-primary" />
                  Auto-schedule this habit as a task
                </Label>
              </div>

              {autoSchedule && (
                <div className="pl-6 space-y-4 animate-in slide-in-from-top-2">
                  <p className="text-xs text-muted-foreground">
                    Your habit will automatically appear as a scheduled task in your calendar
                  </p>

                  <div className="grid gap-2">
                    <Label htmlFor="duration" className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Duration (minutes)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min={5}
                      max={180}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 15)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="energyLevel" className="flex items-center gap-2">
                      <Zap className="w-3 h-3" />
                      Energy Level Required
                    </Label>
                    <Select value={energyLevel} onValueChange={(v) => setEnergyLevel(v as 'low' | 'medium' | 'high')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Easy to do anytime</SelectItem>
                        <SelectItem value="medium">Medium - Needs some focus</SelectItem>
                        <SelectItem value="high">High - Needs peak energy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="preferredTime">Preferred Time of Day</Label>
                    <Select value={preferredTimeOfDay} onValueChange={(v) => setPreferredTimeOfDay(v as 'morning' | 'afternoon' | 'evening' | 'anytime')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (7am - 12pm)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                        <SelectItem value="evening">Evening (5pm - 9pm)</SelectItem>
                        <SelectItem value="anytime">Anytime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Habit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
