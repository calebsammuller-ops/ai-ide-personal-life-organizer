'use client'

import { useState, useEffect } from 'react'
import {
  Eye,
  Sparkles,
  Zap,
  Target,
  Trophy,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Clock,
  CheckCircle2,
  Loader2,
  Pencil,
  Save,
  RefreshCw,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import { useAppDispatch } from '@/state/hooks'
import { openModal } from '@/state/slices/uiSlice'
import type { Habit, HabitPlan } from '@/types'

interface HabitPlanModalProps {
  open: boolean
  onClose: () => void
  habit: Habit | null
}

export function HabitPlanModal({ open, onClose, habit }: HabitPlanModalProps) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [analysis, setAnalysis] = useState<HabitPlan | null>(null)
  const [isScheduling, setIsScheduling] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedPlan, setEditedPlan] = useState<HabitPlan | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCached, setIsCached] = useState(false)

  useEffect(() => {
    if (open && habit) {
      // Check if habit already has a saved plan
      if (habit.plan) {
        setAnalysis(habit.plan)
        setEditedPlan(habit.plan)
        setIsCached(true)
      } else {
        setAnalysis(null)
        setEditedPlan(null)
        setIsCached(false)
        analyzeHabit()
      }
    }
  }, [open, habit])

  const analyzeHabit = async (forceRegenerate = false) => {
    if (!habit) return

    setIsLoading(true)
    setIsCached(false)
    try {
      const response = await fetch(`/api/habits/${habit.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze habit')
      }

      setAnalysis(data.data)
      setEditedPlan(data.data)
      setIsCached(data.cached === true)
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Could not analyze habit',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleScheduleHabit = async () => {
    if (!habit) return

    setIsScheduling(true)
    try {
      const response = await fetch(`/api/habits/${habit.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysAhead: 14 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule habit')
      }

      toast({
        title: 'Habit scheduled',
        description: `Created ${data.data.created} calendar events for the next 2 weeks`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Scheduling failed',
        description: error instanceof Error ? error.message : 'Could not schedule habit',
        variant: 'destructive',
      })
    } finally {
      setIsScheduling(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!habit || !editedPlan) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/habits/${habit.id}/analyze`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: editedPlan }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes')
      }

      setAnalysis(data.data)
      setIsEditing(false)
      toast({
        title: 'Plan saved',
        description: 'Your customized plan has been saved',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save changes',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleWeeklyPlanChange = (index: number, field: 'action' | 'time', value: string) => {
    if (!editedPlan) return
    const newWeeklyPlan = [...editedPlan.weeklyPlan]
    newWeeklyPlan[index] = { ...newWeeklyPlan[index], [field]: value }
    setEditedPlan({ ...editedPlan, weeklyPlan: newWeeklyPlan })
  }

  const handleCancelEdit = () => {
    setEditedPlan(analysis)
    setIsEditing(false)
  }

  const handleClose = () => {
    setAnalysis(null)
    setEditedPlan(null)
    setIsEditing(false)
    onClose()
  }

  if (!habit) return null

  const displayPlan = isEditing ? editedPlan : analysis

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{habit.icon}</span>
            {habit.name} - Implementation Plan
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>AI-powered habit strategy based on Atomic Habits by James Clear</span>
            {isCached && !isLoading && (
              <Badge variant="secondary" className="ml-2">
                <Clock className="h-3 w-3 mr-1" />
                Saved Plan
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing your habit and creating a personalized plan...</p>
          </div>
        ) : displayPlan ? (
          <ScrollArea className="max-h-[60vh] px-6">
            <div className="space-y-6 pb-6">
              {/* Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{displayPlan.summary}</p>
                  <p className="text-sm text-muted-foreground mt-2">{displayPlan.whyItMatters}</p>
                </CardContent>
              </Card>

              {/* The 4 Laws of Behavior Change */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Make It Obvious */}
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      1. Make It Obvious
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div>
                      <Badge variant="outline" className="mb-1">Cue</Badge>
                      <p>{displayPlan.atomicHabitsStrategy.makeItObvious.cue}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1">Implementation Intention</Badge>
                      <p className="italic">"{displayPlan.atomicHabitsStrategy.makeItObvious.implementationIntention}"</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1">Habit Stacking</Badge>
                      <p className="italic">"{displayPlan.atomicHabitsStrategy.makeItObvious.habitStacking}"</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Make It Attractive */}
                <Card className="border-pink-500/20 bg-pink-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-pink-500" />
                      2. Make It Attractive
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div>
                      <Badge variant="outline" className="mb-1">Temptation Bundling</Badge>
                      <p>{displayPlan.atomicHabitsStrategy.makeItAttractive.temptationBundling}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1">Motivation</Badge>
                      <p>{displayPlan.atomicHabitsStrategy.makeItAttractive.motivation}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Make It Easy */}
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-green-500" />
                      3. Make It Easy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div>
                      <Badge variant="outline" className="mb-1">2-Minute Rule</Badge>
                      <p>{displayPlan.atomicHabitsStrategy.makeItEasy.twoMinuteRule}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1">Environment Design</Badge>
                      <p>{displayPlan.atomicHabitsStrategy.makeItEasy.environmentDesign}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1">Reduce Friction</Badge>
                      <p>{displayPlan.atomicHabitsStrategy.makeItEasy.reducesFriction}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Make It Satisfying */}
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      4. Make It Satisfying
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div>
                      <Badge variant="outline" className="mb-1">Immediate Reward</Badge>
                      <p>{displayPlan.atomicHabitsStrategy.makeItSatisfying.immediateReward}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1">Habit Tracking</Badge>
                      <p>{displayPlan.atomicHabitsStrategy.makeItSatisfying.habitTracking}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly Plan - Editable */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Your Weekly Plan
                    </div>
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="h-7 text-xs"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit Schedule
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {displayPlan.weeklyPlan.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                      >
                        <Badge variant="secondary" className="w-20 justify-center shrink-0">
                          {item.day}
                        </Badge>
                        {isEditing ? (
                          <>
                            <Input
                              value={item.action}
                              onChange={(e) => handleWeeklyPlanChange(index, 'action', e.target.value)}
                              className="flex-1 h-8 text-sm"
                              placeholder="Action"
                            />
                            <Input
                              value={item.time}
                              onChange={(e) => handleWeeklyPlanChange(index, 'time', e.target.value)}
                              className="w-24 h-8 text-sm"
                              placeholder="Time"
                            />
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{item.action}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.time}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  {isEditing && (
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Obstacles & Tips */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Potential Obstacles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {displayPlan.potentialObstacles.map((obstacle, index) => (
                        <li key={index} className="text-xs flex items-start gap-2">
                          <span className="text-orange-500">•</span>
                          {obstacle}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Tips for Success
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {displayPlan.tipsForSuccess.map((tip, index) => (
                        <li key={index} className="text-xs flex items-start gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Suggested Reminder & Last Modified */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Suggested reminder time: <strong>{displayPlan.suggestedReminderTime}</strong>
                  </span>
                </div>
                {displayPlan.lastModified && (
                  <span className="text-xs text-muted-foreground">
                    Last updated: {new Date(displayPlan.lastModified).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : null}

        <DialogFooter className="p-6 pt-0 flex-wrap gap-2">
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                dispatch(openModal({ modalName: 'editHabit', data: { habit } }))
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Habit
            </Button>
            {analysis && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => analyzeHabit(true)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerate Plan
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            {analysis && !isEditing && (
              <Button onClick={handleScheduleHabit} disabled={isScheduling}>
                {isScheduling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
