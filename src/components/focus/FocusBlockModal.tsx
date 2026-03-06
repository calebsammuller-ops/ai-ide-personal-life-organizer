'use client'

import { useState, useEffect } from 'react'
import { useAppDispatch } from '@/state/hooks'
import { createFocusBlock, updateFocusBlock } from '@/state/slices/focusBlocksSlice'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Clock, Shield, Palette } from 'lucide-react'
import type { FocusBlock } from '@/types/scheduling'

interface FocusBlockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingBlock?: FocusBlock | null
}

const dayOptions = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const colorOptions = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
]

export function FocusBlockModal({
  open,
  onOpenChange,
  editingBlock,
}: FocusBlockModalProps) {
  const dispatch = useAppDispatch()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: 'Focus Time',
    startTime: '09:00',
    endTime: '11:00',
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    isProtected: true,
    allowHighPriorityOverride: false,
    bufferMinutes: 15,
    color: '#6366f1',
  })

  // Reset form when modal opens/closes or editing block changes
  useEffect(() => {
    if (editingBlock) {
      setFormData({
        title: editingBlock.title,
        startTime: editingBlock.startTime,
        endTime: editingBlock.endTime,
        daysOfWeek: editingBlock.daysOfWeek,
        isProtected: editingBlock.isProtected,
        allowHighPriorityOverride: editingBlock.allowHighPriorityOverride,
        bufferMinutes: editingBlock.bufferMinutes,
        color: editingBlock.color,
      })
    } else {
      setFormData({
        title: 'Focus Time',
        startTime: '09:00',
        endTime: '11:00',
        daysOfWeek: [1, 2, 3, 4, 5],
        isProtected: true,
        allowHighPriorityOverride: false,
        bufferMinutes: 15,
        color: '#6366f1',
      })
    }
  }, [editingBlock, open])

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.daysOfWeek.length === 0) return

    setIsSubmitting(true)

    try {
      if (editingBlock) {
        await dispatch(updateFocusBlock({
          id: editingBlock.id,
          updates: formData,
        })).unwrap()
      } else {
        await dispatch(createFocusBlock(formData)).unwrap()
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save focus block:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate duration
  const calculateDuration = () => {
    const [startH, startM] = formData.startTime.split(':').map(Number)
    const [endH, endM] = formData.endTime.split(':').map(Number)
    const duration = (endH * 60 + endM) - (startH * 60 + startM)

    if (duration <= 0) return 'Invalid time range'
    if (duration >= 60) {
      const hours = Math.floor(duration / 60)
      const mins = duration % 60
      return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
    }
    return `${duration}m`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {editingBlock ? 'Edit Focus Block' : 'Create Focus Block'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Block Name</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Morning Focus, Deep Work"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Start Time
              </Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Duration: {calculateDuration()}
          </p>

          {/* Days of week */}
          <div className="space-y-2">
            <Label>Active Days</Label>
            <div className="flex gap-1">
              {dayOptions.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant={formData.daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                  size="sm"
                  className="w-10 h-10 p-0"
                  onClick={() => handleDayToggle(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Color
            </Label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    formData.color === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
          </div>

          {/* Protection settings */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isProtected"
                checked={formData.isProtected}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isProtected: checked as boolean })
                }
              />
              <Label htmlFor="isProtected" className="flex items-center gap-1 cursor-pointer">
                <Shield className="h-3 w-3" />
                Protected time (no tasks scheduled)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowOverride"
                checked={formData.allowHighPriorityOverride}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allowHighPriorityOverride: checked as boolean })
                }
                disabled={!formData.isProtected}
              />
              <Label
                htmlFor="allowOverride"
                className={`cursor-pointer ${!formData.isProtected ? 'opacity-50' : ''}`}
              >
                Allow urgent tasks to override
              </Label>
            </div>
          </div>

          {/* Buffer minutes */}
          <div className="space-y-2">
            <Label htmlFor="buffer">Buffer Time (minutes)</Label>
            <Input
              id="buffer"
              type="number"
              min={0}
              max={60}
              value={formData.bufferMinutes}
              onChange={(e) => setFormData({ ...formData, bufferMinutes: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Time before and after the block to prepare and transition
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formData.daysOfWeek.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingBlock ? 'Save Changes' : 'Create Block'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
