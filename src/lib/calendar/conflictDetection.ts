import type { CalendarEvent } from '@/types'

export interface ConflictDetail {
  eventId: string
  eventTitle: string
  overlapStart: string
  overlapEnd: string
  overlapMinutes: number
  conflictType: 'full' | 'partial_start' | 'partial_end' | 'contained'
}

export interface ResolutionSuggestion {
  type: 'reschedule' | 'shorten' | 'override'
  description: string
  newStartTime?: string
  newEndTime?: string
  priority: number
}

export interface ConflictInfo {
  hasConflict: boolean
  conflicts: ConflictDetail[]
  suggestions: ResolutionSuggestion[]
}

export function detectConflicts(
  newEvent: { startTime: string; endTime: string; title: string },
  existingEvents: CalendarEvent[]
): ConflictInfo {
  const conflicts: ConflictDetail[] = []
  const newStart = new Date(newEvent.startTime).getTime()
  const newEnd = new Date(newEvent.endTime).getTime()

  for (const event of existingEvents) {
    if (event.status === 'cancelled') continue

    const existingStart = new Date(event.startTime as string).getTime()
    const existingEnd = new Date(event.endTime as string).getTime()

    // Check for overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      const overlapStart = Math.max(newStart, existingStart)
      const overlapEnd = Math.min(newEnd, existingEnd)
      const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60000)

      let conflictType: ConflictDetail['conflictType'] = 'partial_start'
      if (newStart >= existingStart && newEnd <= existingEnd) {
        conflictType = 'contained'
      } else if (newStart <= existingStart && newEnd >= existingEnd) {
        conflictType = 'full'
      } else if (newStart < existingStart) {
        conflictType = 'partial_end'
      }

      conflicts.push({
        eventId: event.id,
        eventTitle: event.title,
        overlapStart: new Date(overlapStart).toISOString(),
        overlapEnd: new Date(overlapEnd).toISOString(),
        overlapMinutes,
        conflictType,
      })
    }
  }

  const suggestions = conflicts.length > 0
    ? generateSuggestions(newEvent, conflicts, existingEvents)
    : []

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    suggestions,
  }
}

function generateSuggestions(
  newEvent: { startTime: string; endTime: string; title: string },
  conflicts: ConflictDetail[],
  existingEvents: CalendarEvent[]
): ResolutionSuggestion[] {
  const suggestions: ResolutionSuggestion[] = []
  const eventDuration =
    (new Date(newEvent.endTime).getTime() - new Date(newEvent.startTime).getTime()) / 60000

  // Find next available slot
  const nextSlot = findNextAvailableSlot(
    new Date(newEvent.startTime),
    eventDuration,
    existingEvents
  )

  if (nextSlot) {
    suggestions.push({
      type: 'reschedule',
      description: `Move to ${formatTime(nextSlot.start)} - ${formatTime(nextSlot.end)}`,
      newStartTime: nextSlot.start.toISOString(),
      newEndTime: nextSlot.end.toISOString(),
      priority: 1,
    })
  }

  // Suggest shortening if minor overlap
  const maxOverlap = Math.max(...conflicts.map(c => c.overlapMinutes))
  if (maxOverlap <= 30 && eventDuration > 30) {
    const shortenedEnd = new Date(
      new Date(newEvent.endTime).getTime() - maxOverlap * 60000
    )
    suggestions.push({
      type: 'shorten',
      description: `Shorten event by ${maxOverlap} minutes`,
      newEndTime: shortenedEnd.toISOString(),
      priority: 2,
    })
  }

  // Always offer override option
  suggestions.push({
    type: 'override',
    description: 'Create anyway (events will overlap)',
    priority: 3,
  })

  return suggestions.sort((a, b) => a.priority - b.priority)
}

function findNextAvailableSlot(
  preferredStart: Date,
  durationMinutes: number,
  existingEvents: CalendarEvent[]
): { start: Date; end: Date } | null {
  const dayEnd = new Date(preferredStart)
  dayEnd.setHours(23, 59, 59, 999)

  // Sort events by start time
  const sortedEvents = existingEvents
    .filter(e => e.status !== 'cancelled')
    .sort((a, b) =>
      new Date(a.startTime as string).getTime() - new Date(b.startTime as string).getTime()
    )

  let searchStart = preferredStart

  for (const event of sortedEvents) {
    const eventStart = new Date(event.startTime as string)
    const eventEnd = new Date(event.endTime as string)

    if (eventStart.getTime() >= searchStart.getTime()) {
      // Check if there's room before this event
      const gapMinutes = (eventStart.getTime() - searchStart.getTime()) / 60000
      if (gapMinutes >= durationMinutes) {
        return {
          start: searchStart,
          end: new Date(searchStart.getTime() + durationMinutes * 60000),
        }
      }
    }

    // Move search start to after this event
    if (eventEnd.getTime() > searchStart.getTime()) {
      searchStart = eventEnd
    }
  }

  // Check if there's room after all events
  if (searchStart.getTime() < dayEnd.getTime()) {
    const remainingMinutes = (dayEnd.getTime() - searchStart.getTime()) / 60000
    if (remainingMinutes >= durationMinutes) {
      return {
        start: searchStart,
        end: new Date(searchStart.getTime() + durationMinutes * 60000),
      }
    }
  }

  return null
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function getStartOfDay(dateStr: string): string {
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

export function getEndOfDay(dateStr: string): string {
  const date = new Date(dateStr)
  date.setHours(23, 59, 59, 999)
  return date.toISOString()
}
