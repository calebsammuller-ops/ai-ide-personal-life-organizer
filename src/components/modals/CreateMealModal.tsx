'use client'

import { useState, useEffect } from 'react'
import { Camera, Calendar, Clock, UtensilsCrossed } from 'lucide-react'
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
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { createMealPlan, selectSelectedWeek } from '@/state/slices/mealPlanningSlice'
import { openModal, selectModalData } from '@/state/slices/uiSlice'
import { useToast } from '@/components/ui/toaster'

interface PrefillData {
  name?: string
  calories?: number
  nutritionalInfo?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    fiber?: number
  }
}

interface CreateMealModalProps {
  open: boolean
  onClose: () => void
}

const mealTypes = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

export function CreateMealModal({ open, onClose }: CreateMealModalProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const selectedWeek = useAppSelector(selectSelectedWeek)
  const modalData = useAppSelector(selectModalData)
  const prefill = (modalData?.prefill as PrefillData) || null

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch')
  const [date, setDate] = useState(selectedWeek.start)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Scheduling options
  const [autoSchedulePrep, setAutoSchedulePrep] = useState(false)
  const [autoScheduleMeal, setAutoScheduleMeal] = useState(false)
  const [mealTime, setMealTime] = useState('')

  // Apply prefill data when modal opens with data from food scan
  useEffect(() => {
    if (open && prefill) {
      if (prefill.name) setName(prefill.name)
      if (prefill.calories) setCalories(prefill.calories.toString())
      if (prefill.nutritionalInfo) {
        if (prefill.nutritionalInfo.protein) setProtein(prefill.nutritionalInfo.protein.toString())
        if (prefill.nutritionalInfo.carbs) setCarbs(prefill.nutritionalInfo.carbs.toString())
        if (prefill.nutritionalInfo.fat) setFat(prefill.nutritionalInfo.fat.toString())
      }
    }
  }, [open, prefill])

  const resetForm = () => {
    setName('')
    setDescription('')
    setMealType('lunch')
    setDate(selectedWeek.start)
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setPrepTime('')
    setCookTime('')
    // Reset scheduling options
    setAutoSchedulePrep(false)
    setAutoScheduleMeal(false)
    setMealTime('')
  }

  const handleScanFood = () => {
    onClose()
    dispatch(openModal({ modalName: 'foodScan' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)

    try {
      await dispatch(createMealPlan({
        name: name.trim(),
        description: description.trim() || undefined,
        mealType,
        date,
        calories: calories ? parseInt(calories) : undefined,
        prepTimeMinutes: prepTime ? parseInt(prepTime) : undefined,
        cookTimeMinutes: cookTime ? parseInt(cookTime) : undefined,
        servings: 1,
        ingredients: [],
        instructions: [],
        nutritionalInfo: {
          calories: calories ? parseInt(calories) : undefined,
          protein: protein ? parseInt(protein) : undefined,
          carbs: carbs ? parseInt(carbs) : undefined,
          fat: fat ? parseInt(fat) : undefined,
        },
        tags: [],
        isFavorite: false,
        // Scheduling options
        autoSchedulePrep,
        autoScheduleMeal,
        mealTime: mealTime || undefined,
      })).unwrap()

      toast({
        title: 'Meal added',
        description: `${name} has been added to your meal plan.`,
        variant: 'success',
      })

      resetForm()
      onClose()
    } catch (error) {
      toast({
        title: 'Failed to add meal',
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

  // Generate dates for the selected week
  const weekDates = []
  const startDate = new Date(selectedWeek.start)
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    weekDates.push({
      value: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Meal</DialogTitle>
          <DialogDescription>
            Plan a meal for your week
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Scan Food Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleScanFood}
            >
              <Camera className="h-4 w-4" />
              Scan Food to Auto-Fill
            </Button>

            <div className="grid gap-2">
              <Label htmlFor="name">Meal Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Grilled chicken salad"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this meal..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Select value={date} onValueChange={setDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekDates.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mealType">Meal Type</Label>
                <Select value={mealType} onValueChange={(v) => setMealType(v as 'breakfast' | 'lunch' | 'dinner' | 'snack')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g., 450"
                  min="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mealTimeInput" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Meal Time
                </Label>
                <Input
                  id="mealTimeInput"
                  type="time"
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prepTime">Prep Time (min)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="e.g., 15"
                  min="0"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cookTime">Cook Time (min)</Label>
                <Input
                  id="cookTime"
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="e.g., 30"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fat">Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Scheduling Section */}
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Schedule to Calendar
              </p>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoSchedulePrep"
                  checked={autoSchedulePrep}
                  onCheckedChange={(checked) => setAutoSchedulePrep(checked as boolean)}
                  disabled={!prepTime && !cookTime}
                />
                <Label
                  htmlFor="autoSchedulePrep"
                  className={`cursor-pointer ${!prepTime && !cookTime ? 'opacity-50' : ''}`}
                >
                  Schedule prep time as a task
                </Label>
              </div>
              {!prepTime && !cookTime && (
                <p className="text-xs text-muted-foreground pl-6">
                  Add prep or cook time to enable scheduling
                </p>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoScheduleMeal"
                  checked={autoScheduleMeal}
                  onCheckedChange={(checked) => setAutoScheduleMeal(checked as boolean)}
                />
                <Label htmlFor="autoScheduleMeal" className="cursor-pointer flex items-center gap-2">
                  <UtensilsCrossed className="w-3 h-3" />
                  Add meal time reminder to calendar
                </Label>
              </div>

              {(autoSchedulePrep || autoScheduleMeal) && (
                <p className="text-xs text-muted-foreground pl-6">
                  {autoSchedulePrep && autoScheduleMeal
                    ? 'Prep task and meal reminder will be added to your calendar'
                    : autoSchedulePrep
                    ? 'A prep task will be scheduled before your meal'
                    : 'A reminder will be added at your meal time'}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Meal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
