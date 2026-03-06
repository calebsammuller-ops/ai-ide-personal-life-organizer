'use client'

import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectAllFocusBlocks,
  fetchFocusBlocks,
  createFocusBlock,
  updateFocusBlock,
  deleteFocusBlock,
} from '@/state/slices/focusBlocksSlice'
import { selectPreferences, updatePreferences } from '@/state/slices/preferencesSlice'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Zap,
  Clock,
  Calendar,
  Brain,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { FocusBlock } from '@/types/scheduling'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const PRODUCTIVITY_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
]

export default function SchedulingSettingsPage() {
  const dispatch = useAppDispatch()
  const focusBlocks = useAppSelector(selectAllFocusBlocks)
  const preferences = useAppSelector(selectPreferences)

  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(true)
  const [smartRescheduleEnabled, setSmartRescheduleEnabled] = useState(true)
  const [bufferMinutes, setBufferMinutes] = useState(5)
  const [peakHours, setPeakHours] = useState<string[]>(['09:00', '10:00', '11:00'])

  // Focus block form
  const [showFocusForm, setShowFocusForm] = useState(false)
  const [editingFocusBlock, setEditingFocusBlock] = useState<FocusBlock | null>(null)
  const [focusForm, setFocusForm] = useState({
    title: 'Focus Time',
    startTime: '09:00',
    endTime: '11:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    isProtected: true,
    allowHighPriorityOverride: false,
    color: '#6366f1',
  })

  useEffect(() => {
    dispatch(fetchFocusBlocks())
  }, [dispatch])

  // Load preferences
  useEffect(() => {
    if (preferences) {
      setAutoScheduleEnabled(preferences.autoScheduleEnabled ?? true)
      setSmartRescheduleEnabled(preferences.smartRescheduleEnabled ?? true)
      setBufferMinutes(preferences.bufferBetweenTasks ?? 5)
      if (preferences.peakProductivityHours) {
        setPeakHours(preferences.peakProductivityHours as string[])
      }
    }
  }, [preferences])

  const handleSavePreferences = async () => {
    await dispatch(updatePreferences({
      autoScheduleEnabled,
      smartRescheduleEnabled,
      bufferBetweenTasks: bufferMinutes,
      peakProductivityHours: peakHours,
    }))
  }

  const handleTogglePeakHour = (hour: string) => {
    setPeakHours(prev =>
      prev.includes(hour)
        ? prev.filter(h => h !== hour)
        : [...prev, hour].sort()
    )
  }

  const handleFocusBlockSubmit = async () => {
    if (editingFocusBlock) {
      await dispatch(updateFocusBlock({
        id: editingFocusBlock.id,
        updates: focusForm,
      }))
    } else {
      await dispatch(createFocusBlock(focusForm))
    }
    setShowFocusForm(false)
    setEditingFocusBlock(null)
    setFocusForm({
      title: 'Focus Time',
      startTime: '09:00',
      endTime: '11:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      isProtected: true,
      allowHighPriorityOverride: false,
      color: '#6366f1',
    })
  }

  const handleEditFocusBlock = (block: FocusBlock) => {
    setEditingFocusBlock(block)
    setFocusForm({
      title: block.title,
      startTime: block.startTime,
      endTime: block.endTime,
      daysOfWeek: block.daysOfWeek,
      isProtected: block.isProtected,
      allowHighPriorityOverride: block.allowHighPriorityOverride,
      color: block.color,
    })
    setShowFocusForm(true)
  }

  const handleDeleteFocusBlock = async (id: string) => {
    if (confirm('Are you sure you want to delete this focus block?')) {
      await dispatch(deleteFocusBlock(id))
    }
  }

  const toggleFocusDay = (day: number) => {
    setFocusForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }))
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" />
          AI Scheduling Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure how the AI schedules your tasks and protects your focus time
        </p>
      </div>

      <div className="space-y-6">
        {/* Auto-Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Auto-Scheduling
            </CardTitle>
            <CardDescription>
              Let AI automatically schedule your tasks based on priority and deadlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-schedule">Enable Auto-Scheduling</Label>
                <p className="text-sm text-muted-foreground">
                  Tasks will be automatically placed in optimal time slots
                </p>
              </div>
              <Switch
                id="auto-schedule"
                checked={autoScheduleEnabled}
                onCheckedChange={setAutoScheduleEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smart-reschedule">Smart Rescheduling</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically move incomplete tasks to the next available slot
                </p>
              </div>
              <Switch
                id="smart-reschedule"
                checked={smartRescheduleEnabled}
                onCheckedChange={setSmartRescheduleEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Buffer Between Tasks: {bufferMinutes} minutes</Label>
              <Slider
                value={[bufferMinutes]}
                onValueChange={([value]) => setBufferMinutes(value)}
                min={0}
                max={30}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Add breathing room between scheduled tasks
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Peak Productivity Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Peak Productivity Hours
            </CardTitle>
            <CardDescription>
              Select when you&apos;re most productive - high priority tasks will be scheduled here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {PRODUCTIVITY_HOURS.map(hour => (
                <button
                  key={hour}
                  onClick={() => handleTogglePeakHour(hour)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors',
                    peakHours.includes(hour)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent hover:bg-accent/80'
                  )}
                >
                  {hour}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Selected: {peakHours.length > 0 ? peakHours.join(', ') : 'None'}
            </p>
          </CardContent>
        </Card>

        {/* Focus Blocks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Focus Blocks
                </CardTitle>
                <CardDescription>
                  Protected time for deep work - tasks won&apos;t be scheduled here
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingFocusBlock(null)
                  setShowFocusForm(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Block
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showFocusForm && (
              <div className="border rounded-lg p-4 mb-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="focus-title">Title</Label>
                    <Input
                      id="focus-title"
                      value={focusForm.title}
                      onChange={(e) => setFocusForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Focus Time"
                    />
                  </div>
                  <div>
                    <Label htmlFor="focus-color">Color</Label>
                    <Input
                      id="focus-color"
                      type="color"
                      value={focusForm.color}
                      onChange={(e) => setFocusForm(prev => ({ ...prev, color: e.target.value }))}
                      className="h-10 p-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="focus-start">Start Time</Label>
                    <Input
                      id="focus-start"
                      type="time"
                      value={focusForm.startTime}
                      onChange={(e) => setFocusForm(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="focus-end">End Time</Label>
                    <Input
                      id="focus-end"
                      type="time"
                      value={focusForm.endTime}
                      onChange={(e) => setFocusForm(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Days of Week</Label>
                  <div className="flex gap-2 mt-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleFocusDay(day.value)}
                        className={cn(
                          'w-10 h-10 rounded-full text-sm font-medium transition-colors',
                          focusForm.daysOfWeek.includes(day.value)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent hover:bg-accent/80'
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="focus-protected">Strictly Protected</Label>
                    <p className="text-xs text-muted-foreground">
                      Never schedule anything during this time
                    </p>
                  </div>
                  <Switch
                    id="focus-protected"
                    checked={focusForm.isProtected}
                    onCheckedChange={(checked) => setFocusForm(prev => ({ ...prev, isProtected: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="focus-override">Allow High Priority Override</Label>
                    <p className="text-xs text-muted-foreground">
                      Urgent tasks can be scheduled here if needed
                    </p>
                  </div>
                  <Switch
                    id="focus-override"
                    checked={focusForm.allowHighPriorityOverride}
                    onCheckedChange={(checked) => setFocusForm(prev => ({ ...prev, allowHighPriorityOverride: checked }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFocusForm(false)
                      setEditingFocusBlock(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleFocusBlockSubmit}>
                    {editingFocusBlock ? 'Update' : 'Create'} Focus Block
                  </Button>
                </div>
              </div>
            )}

            {focusBlocks.length === 0 && !showFocusForm ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No focus blocks configured</p>
                <p className="text-sm">Add a focus block to protect your deep work time</p>
              </div>
            ) : (
              <div className="space-y-2">
                {focusBlocks.map(block => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    style={{ borderLeftColor: block.color, borderLeftWidth: 4 }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{block.title}</span>
                        {block.isProtected && (
                          <Badge variant="secondary" className="text-xs">Protected</Badge>
                        )}
                        {!block.isActive && (
                          <Badge variant="outline" className="text-xs">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span>{block.startTime} - {block.endTime}</span>
                        <span>
                          {block.daysOfWeek.map(d => DAYS_OF_WEEK[d]?.label).join(', ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditFocusBlock(block)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFocusBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSavePreferences} size="lg">
            Save Scheduling Preferences
          </Button>
        </div>
      </div>
    </div>
  )
}
