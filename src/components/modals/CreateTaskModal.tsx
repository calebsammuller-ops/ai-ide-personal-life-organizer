'use client'

import { useState } from 'react'
import { useAppDispatch } from '@/state/hooks'
import { createTask, autoScheduleTask } from '@/state/slices/tasksSlice'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Calendar, Clock, Zap, Flag, Tags } from 'lucide-react'

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialProjectId?: string
  projectName?: string
}

export function CreateTaskModal({ open, onOpenChange, initialProjectId, projectName }: CreateTaskModalProps) {
  const dispatch = useAppDispatch()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    deadlineTime: '',
    durationMinutes: 30,
    priority: 3 as 1 | 2 | 3 | 4 | 5,
    energyLevel: '' as '' | 'low' | 'medium' | 'high',
    category: '',
    isAutoScheduled: true,
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      deadline: '',
      deadlineTime: '',
      durationMinutes: 30,
      priority: 3,
      energyLevel: '',
      category: '',
      isAutoScheduled: true,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)

    try {
      // Combine date and time for deadline
      let deadline: string | undefined
      if (formData.deadline) {
        if (formData.deadlineTime) {
          deadline = `${formData.deadline}T${formData.deadlineTime}:00`
        } else {
          deadline = `${formData.deadline}T23:59:59`
        }
      }

      const result = await dispatch(createTask({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        deadline,
        durationMinutes: formData.durationMinutes,
        priority: formData.priority,
        energyLevel: formData.energyLevel || undefined,
        category: formData.category.trim() || undefined,
        isAutoScheduled: formData.isAutoScheduled,
        projectId: initialProjectId || undefined,
      })).unwrap()

      // Auto-schedule if enabled
      if (formData.isAutoScheduled && result.id) {
        dispatch(autoScheduleTask(result.id))
      }

      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const durationOptions = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
  ]

  const priorityOptions = [
    { value: 1, label: 'Urgent', color: 'text-red-500' },
    { value: 2, label: 'High', color: 'text-orange-500' },
    { value: 3, label: 'Medium', color: 'text-yellow-500' },
    { value: 4, label: 'Low', color: 'text-blue-500' },
    { value: 5, label: 'Lowest', color: 'text-gray-400' },
  ]

  const categoryOptions = [
    'Work',
    'Personal',
    'Health',
    'Learning',
    'Finance',
    'Home',
    'Social',
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          {projectName && (
            <p className="text-xs text-muted-foreground mt-1">
              Adding to project: <span className="text-purple-400 font-medium">{projectName}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              placeholder="What do you need to do?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add more details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Duration and Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Duration
              </Label>
              <Select
                value={formData.durationMinutes.toString()}
                onValueChange={(v) => setFormData({ ...formData, durationMinutes: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Flag className="h-3 w-3" />
                Priority
              </Label>
              <Select
                value={formData.priority.toString()}
                onValueChange={(v) => setFormData({ ...formData, priority: parseInt(v) as 1 | 2 | 3 | 4 | 5 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deadline row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Deadline Date
              </Label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>Deadline Time</Label>
              <Input
                type="time"
                value={formData.deadlineTime}
                onChange={(e) => setFormData({ ...formData, deadlineTime: e.target.value })}
                disabled={!formData.deadline}
              />
            </div>
          </div>

          {/* Energy and Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Energy Level
              </Label>
              <Select
                value={formData.energyLevel}
                onValueChange={(v) => setFormData({ ...formData, energyLevel: v as '' | 'low' | 'medium' | 'high' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High (Deep work)</SelectItem>
                  <SelectItem value="medium">Medium (Regular)</SelectItem>
                  <SelectItem value="low">Low (Simple tasks)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Tags className="h-3 w-3" />
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-schedule checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoSchedule"
              checked={formData.isAutoScheduled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isAutoScheduled: checked as boolean })
              }
            />
            <Label htmlFor="autoSchedule" className="text-sm font-normal cursor-pointer">
              Auto-schedule this task to an optimal time slot
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
