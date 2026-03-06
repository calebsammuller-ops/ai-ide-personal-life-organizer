'use client'

import { AlertTriangle, Clock, X, MoveRight, Scissors } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  selectConflictInfo,
  selectShowConflictModal,
  selectPendingEvent,
  setShowConflictModal,
  createEvent,
  clearConflict,
} from '@/state/slices/calendarSlice'
import type { ResolutionSuggestion } from '@/lib/calendar/conflictDetection'
import { cn } from '@/lib/utils'

export function ConflictResolutionModal() {
  const dispatch = useAppDispatch()
  const conflictInfo = useAppSelector(selectConflictInfo)
  const showModal = useAppSelector(selectShowConflictModal)
  const pendingEvent = useAppSelector(selectPendingEvent)

  const handleResolution = async (suggestion: ResolutionSuggestion) => {
    if (!pendingEvent) return

    if (suggestion.type === 'override') {
      // Create with skipConflictCheck
      await dispatch(createEvent({ ...pendingEvent, skipConflictCheck: true }))
    } else {
      // Apply the suggestion and create
      const updatedEvent = {
        ...pendingEvent,
        startTime: suggestion.newStartTime || pendingEvent.startTime,
        endTime: suggestion.newEndTime || pendingEvent.endTime,
        skipConflictCheck: true,
      }
      await dispatch(createEvent(updatedEvent))
    }
  }

  const handleCancel = () => {
    dispatch(clearConflict())
  }

  if (!conflictInfo || !showModal) return null

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getResolutionIcon = (type: string) => {
    switch (type) {
      case 'reschedule':
        return <MoveRight className="h-4 w-4 text-green-600" />
      case 'shorten':
        return <Scissors className="h-4 w-4 text-blue-600" />
      case 'override':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Scheduling Conflict Detected
          </DialogTitle>
          <DialogDescription>
            The event you&apos;re creating overlaps with existing events. Choose how to resolve this conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pending event info */}
          {pendingEvent && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">{pendingEvent.title || 'New Event'}</p>
              <p className="text-sm text-muted-foreground">
                {pendingEvent.startTime && formatTime(pendingEvent.startTime as string)} -
                {pendingEvent.endTime && formatTime(pendingEvent.endTime as string)}
              </p>
            </div>
          )}

          {/* Conflict details */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Conflicts with:</h4>
            {conflictInfo.conflicts.map((conflict, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200"
              >
                <Clock className="h-4 w-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{conflict.eventTitle}</p>
                  <p className="text-xs text-red-600">
                    {conflict.overlapMinutes} minutes overlap
                    {conflict.conflictType === 'full' && ' (completely overlaps)'}
                    {conflict.conflictType === 'contained' && ' (within existing event)'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution suggestions */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Suggested Resolutions:</h4>
            {conflictInfo.suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className={cn(
                  "w-full justify-start text-left h-auto py-3",
                  suggestion.type === 'reschedule' && "border-green-300 hover:bg-green-50",
                  suggestion.type === 'shorten' && "border-blue-300 hover:bg-blue-50",
                  suggestion.type === 'override' && "border-amber-300 hover:bg-amber-50"
                )}
                onClick={() => handleResolution(suggestion)}
              >
                <div className="flex items-center gap-3">
                  {getResolutionIcon(suggestion.type)}
                  <div>
                    <span className="font-medium">{suggestion.description}</span>
                    {suggestion.type === 'override' && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Events will overlap in your calendar
                      </p>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
