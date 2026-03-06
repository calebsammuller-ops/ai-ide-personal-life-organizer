'use client'

import { useEffect } from 'react'
import {
  RefreshCw,
  Calendar,
  Coffee,
  Dumbbell,
  Utensils,
  Clock,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchDailyPlan,
  generateDailyPlan,
  updateDailyPlan,
  selectCurrentPlan,
  selectDailyPlanGenerating,
  selectDailyPlanLoading,
  selectDailyPlanError,
  selectPlanBlocks,
} from '@/state/slices/dailyPlanSlice'
import type { TimeBlock } from '@/types'
import { cn } from '@/lib/utils'

const typeIcons = {
  event: Calendar,
  habit: Dumbbell,
  meal: Utensils,
  free: Clock,
  break: Coffee,
  task: CheckSquare,
  focus: Zap,
}

const typeColors = {
  event: 'bg-blue-50 border-blue-200 text-blue-800',
  habit: 'bg-purple-50 border-purple-200 text-purple-800',
  meal: 'bg-amber-50 border-amber-200 text-amber-800',
  free: 'bg-gray-50 border-gray-200 text-gray-600',
  break: 'bg-green-50 border-green-200 text-green-800',
  task: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  focus: 'bg-orange-50 border-orange-200 text-orange-800',
}

const typeBadgeColors = {
  event: 'bg-blue-100 text-blue-700',
  habit: 'bg-purple-100 text-purple-700',
  meal: 'bg-amber-100 text-amber-700',
  free: 'bg-gray-100 text-gray-600',
  break: 'bg-green-100 text-green-700',
  task: 'bg-indigo-100 text-indigo-700',
  focus: 'bg-orange-100 text-orange-700',
}

interface DailyPlanViewProps {
  date: string
  onDateChange?: (date: string) => void
}

export function DailyPlanView({ date, onDateChange }: DailyPlanViewProps) {
  const dispatch = useAppDispatch()
  const plan = useAppSelector(selectCurrentPlan)
  const blocks = useAppSelector(selectPlanBlocks)
  const isGenerating = useAppSelector(selectDailyPlanGenerating)
  const isLoading = useAppSelector(selectDailyPlanLoading)
  const error = useAppSelector(selectDailyPlanError)

  useEffect(() => {
    dispatch(fetchDailyPlan(date))
  }, [dispatch, date])

  const handleGenerate = () => {
    dispatch(generateDailyPlan(date))
  }

  const handleToggleLock = () => {
    if (plan) {
      dispatch(updateDailyPlan({
        date,
        isLocked: !plan.isLocked,
      }))
    }
  }

  const handlePrevDay = () => {
    const prevDate = new Date(date)
    prevDate.setDate(prevDate.getDate() - 1)
    onDateChange?.(prevDate.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    onDateChange?.(nextDate.toISOString().split('T')[0])
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateObj = new Date(dateStr)
    dateObj.setHours(0, 0, 0, 0)

    const diffDays = Math.round((dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'

    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }

  const calculateDuration = (block: TimeBlock) => {
    const [startHours, startMins] = block.startTime.split(':').map(Number)
    const [endHours, endMins] = block.endTime.split(':').map(Number)
    const totalMins = (endHours * 60 + endMins) - (startHours * 60 + startMins)
    if (totalMins < 60) return `${totalMins}m`
    const hours = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const getTimelinePosition = (time: string) => {
    const [hours, mins] = time.split(':').map(Number)
    // Assuming day starts at 6am and ends at 11pm (17 hour span)
    const startHour = 6
    const totalHours = 17
    const position = ((hours - startHour) * 60 + mins) / (totalHours * 60) * 100
    return Math.max(0, Math.min(100, position))
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">{formatDate(date)}</CardTitle>
            <Button variant="ghost" size="icon" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {plan && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleLock}
                title={plan.isLocked ? 'Unlock plan' : 'Lock plan'}
              >
                {plan.isLocked ? (
                  <Lock className="h-4 w-4 text-amber-500" />
                ) : (
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || isLoading || plan?.isLocked}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
              {plan ? 'Regenerate' : 'Generate Plan'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !plan || blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No plan for {formatDate(date)}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Generate a plan to see your optimized schedule based on your events, habits, and meals.
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              <Calendar className="h-4 w-4 mr-2" />
              Generate Plan
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-full px-4 pb-4">
            <div className="space-y-2">
              {blocks.map((block, index) => {
                const Icon = typeIcons[block.type]
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm",
                      typeColors[block.type]
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{block.title}</span>
                        <Badge variant="secondary" className={cn("text-xs", typeBadgeColors[block.type])}>
                          {block.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {block.startTime} - {block.endTime}
                        <span className="mx-1">-</span>
                        {calculateDuration(block)}
                      </p>
                    </div>
                    {block.color && (
                      <div
                        className="w-2 h-full rounded-full flex-shrink-0"
                        style={{ backgroundColor: block.color }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Day Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span>{blocks.filter(b => b.type === 'event').length} events</span>
                </div>
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-purple-500" />
                  <span>{blocks.filter(b => b.type === 'habit').length} habits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-amber-500" />
                  <span>{blocks.filter(b => b.type === 'meal').length} meals</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{blocks.filter(b => b.type === 'free').length} free blocks</span>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
