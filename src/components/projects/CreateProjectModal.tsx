'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppDispatch } from '@/state/hooks'
import { createProject } from '@/state/slices/projectsSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CreateProjectInput } from '@/types/projects'

const COLOR_SWATCHES = [
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Teal', value: '#14b8a6' },
]

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const dispatch = useAppDispatch()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#8b5cf6')
  const [status, setStatus] = useState<'active' | 'paused' | 'completed'>('active')

  const resetForm = () => {
    setName('')
    setDescription('')
    setColor('#8b5cf6')
    setStatus('active')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)

    const input: CreateProjectInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    }

    try {
      await dispatch(createProject(input)).unwrap()
      resetForm()
      onOpenChange(false)
    } catch {
      // Error handled by Redux slice
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-[480px]',
          'bg-background/95 backdrop-blur-xl',
          'border-purple-500/20',
          'shadow-xl shadow-purple-500/10'
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-purple-400" />
            </div>
            Create New Project
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm font-medium">
              Project Name
            </Label>
            <Input
              id="project-name"
              placeholder="Enter project name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                'bg-muted/50 border-border/50',
                'focus:border-purple-500/50 focus:ring-purple-500/20'
              )}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="project-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="project-description"
              placeholder="Describe your project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={cn(
                'bg-muted/50 border-border/50 resize-none',
                'focus:border-purple-500/50 focus:ring-purple-500/20'
              )}
            />
          </div>

          {/* Color Swatches */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <motion.button
                  key={swatch.value}
                  type="button"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setColor(swatch.value)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all duration-200 border-2',
                    color === swatch.value
                      ? 'border-white shadow-lg scale-110'
                      : 'border-transparent hover:border-white/30'
                  )}
                  style={{
                    backgroundColor: swatch.value,
                    boxShadow:
                      color === swatch.value
                        ? `0 0 12px ${swatch.value}80`
                        : undefined,
                  }}
                  title={swatch.label}
                />
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="project-status" className="text-sm font-medium">
              Status
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger
                className={cn(
                  'bg-muted/50 border-border/50',
                  'focus:border-purple-500/50 focus:ring-purple-500/20'
                )}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className={cn(
                'bg-purple-600 hover:bg-purple-700',
                'shadow-md shadow-purple-500/20',
                'transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30'
              )}
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
