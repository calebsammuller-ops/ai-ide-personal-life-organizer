/**
 * Slot Analyzer - Analyzes time slots for scheduling
 *
 * Core utility for the Motion AI scheduling engine.
 * Builds day slot maps, identifies gaps, and assigns energy levels.
 */

import type {
  ScheduleSlot,
  SchedulingContext,
  ScheduleItem,
  FocusBlock,
  DayBoundaries,
  EnergyMapping,
  SchedulingPreferences,
} from '@/types/scheduling'

// Time utilities
export function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

export function timeToString(minutes: number): string {
  const normalizedMinutes = ((minutes % 1440) + 1440) % 1440 // Handle negative and overflow
  const hours = Math.floor(normalizedMinutes / 60)
  const mins = normalizedMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function addMinutesToTime(time: string, minutes: number): string {
  return timeToString(parseTime(time) + minutes)
}

export function timeDiffMinutes(start: string, end: string): number {
  return parseTime(end) - parseTime(start)
}

export function timeToDate(date: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  return d
}

export function dateToTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

/**
 * Build a complete slot map for a day
 * Returns all slots categorized by type (available, busy, focus, buffer)
 */
export function buildDaySlotMap(context: SchedulingContext): ScheduleSlot[] {
  const { date, events, focusBlocks, preferences, dayBoundaries } = context
  const slots: ScheduleSlot[] = []
  const dayOfWeek = new Date(date).getDay()

  // Get all busy periods from events
  const busyPeriods: { start: string; end: string; type: 'busy' | 'focus' }[] = []

  // Add events as busy periods
  for (const event of events) {
    busyPeriods.push({
      start: event.startTime,
      end: event.endTime,
      type: 'busy',
    })
  }

  // Add active focus blocks for this day of week
  const applicableFocusBlocks = focusBlocks.filter(
    fb => fb.isActive && fb.daysOfWeek.includes(dayOfWeek)
  )

  for (const fb of applicableFocusBlocks) {
    busyPeriods.push({
      start: fb.startTime,
      end: fb.endTime,
      type: 'focus',
    })
  }

  // Sort by start time
  busyPeriods.sort((a, b) => parseTime(a.start) - parseTime(b.start))

  // Build slots by walking through the day
  let currentTime = dayBoundaries.dayStart
  const dayEnd = dayBoundaries.dayEnd

  for (const period of busyPeriods) {
    // Skip if period is before current time
    if (parseTime(period.end) <= parseTime(currentTime)) continue

    // Skip if period starts after day end
    if (parseTime(period.start) >= parseTime(dayEnd)) continue

    // Add available slot before this period
    if (parseTime(period.start) > parseTime(currentTime)) {
      const slotStart = currentTime
      const slotEnd = period.start
      const durationMinutes = timeDiffMinutes(slotStart, slotEnd)

      if (durationMinutes >= 5) {
        slots.push({
          start: timeToDate(date, slotStart),
          end: timeToDate(date, slotEnd),
          durationMinutes,
          type: 'available',
          energyLevel: getEnergyLevelForTime(slotStart, preferences),
        })
      }
    }

    // Add the busy/focus period
    const periodStart = parseTime(period.start) < parseTime(currentTime)
      ? currentTime
      : period.start
    const periodEnd = parseTime(period.end) > parseTime(dayEnd)
      ? dayEnd
      : period.end

    slots.push({
      start: timeToDate(date, periodStart),
      end: timeToDate(date, periodEnd),
      durationMinutes: timeDiffMinutes(periodStart, periodEnd),
      type: period.type,
      isProtected: period.type === 'focus',
    })

    // Update current time
    if (parseTime(period.end) > parseTime(currentTime)) {
      currentTime = period.end
    }
  }

  // Add final available slot until end of day
  if (parseTime(currentTime) < parseTime(dayEnd)) {
    const durationMinutes = timeDiffMinutes(currentTime, dayEnd)
    if (durationMinutes >= 5) {
      slots.push({
        start: timeToDate(date, currentTime),
        end: timeToDate(date, dayEnd),
        durationMinutes,
        type: 'available',
        energyLevel: getEnergyLevelForTime(currentTime, preferences),
      })
    }
  }

  return slots
}

/**
 * Find gaps (available slots) with minimum duration
 */
export function findGaps(slots: ScheduleSlot[], minDurationMinutes: number): ScheduleSlot[] {
  return slots.filter(
    slot => slot.type === 'available' && slot.durationMinutes >= minDurationMinutes
  )
}

/**
 * Find all available slots within a time range
 */
export function findAvailableSlotsInRange(
  slots: ScheduleSlot[],
  rangeStart: string,
  rangeEnd: string,
  minDurationMinutes: number
): ScheduleSlot[] {
  const rangeStartMinutes = parseTime(rangeStart)
  const rangeEndMinutes = parseTime(rangeEnd)

  return slots.filter(slot => {
    if (slot.type !== 'available') return false
    if (slot.durationMinutes < minDurationMinutes) return false

    const slotStartMinutes = parseTime(dateToTime(slot.start))
    const slotEndMinutes = parseTime(dateToTime(slot.end))

    // Slot must overlap with range
    return slotStartMinutes < rangeEndMinutes && slotEndMinutes > rangeStartMinutes
  })
}

/**
 * Get energy level for a specific time based on preferences
 */
export function getEnergyLevelForTime(
  time: string,
  preferences: SchedulingPreferences
): 'low' | 'medium' | 'high' {
  const hour = Math.floor(parseTime(time) / 60)
  const hourStr = `${hour.toString().padStart(2, '0')}:00`

  if (preferences.peakProductivityHours.includes(hourStr)) {
    return 'high'
  }
  if (preferences.lowEnergyHours.includes(hourStr)) {
    return 'low'
  }
  return 'medium'
}

/**
 * Build energy mapping for entire day
 */
export function buildEnergyMapping(preferences: SchedulingPreferences): EnergyMapping[] {
  const mapping: EnergyMapping[] = []

  for (let hour = 0; hour < 24; hour++) {
    const hourStr = `${hour.toString().padStart(2, '0')}:00`
    const isProductive = preferences.peakProductivityHours.includes(hourStr)

    let energyLevel: 'low' | 'medium' | 'high' = 'medium'
    if (isProductive) {
      energyLevel = 'high'
    } else if (preferences.lowEnergyHours.includes(hourStr)) {
      energyLevel = 'low'
    }

    mapping.push({
      hour,
      energyLevel,
      isProductiveHour: isProductive,
    })
  }

  return mapping
}

/**
 * Assign energy levels to slots based on preferences
 */
export function assignEnergyLevels(
  slots: ScheduleSlot[],
  preferences: SchedulingPreferences
): ScheduleSlot[] {
  return slots.map(slot => ({
    ...slot,
    energyLevel: getEnergyLevelForTime(dateToTime(slot.start), preferences),
  }))
}

/**
 * Apply buffer time between scheduled items
 */
export function applyBuffers(
  slots: ScheduleSlot[],
  bufferMinutes: number
): ScheduleSlot[] {
  if (bufferMinutes <= 0) return slots

  const result: ScheduleSlot[] = []
  let previousWasBusy = false

  for (const slot of slots) {
    if (slot.type === 'available' && previousWasBusy && slot.durationMinutes > bufferMinutes) {
      // Add buffer at start of available slot
      const bufferEnd = new Date(slot.start.getTime() + bufferMinutes * 60000)

      result.push({
        start: slot.start,
        end: bufferEnd,
        durationMinutes: bufferMinutes,
        type: 'buffer',
      })

      result.push({
        ...slot,
        start: bufferEnd,
        durationMinutes: slot.durationMinutes - bufferMinutes,
      })
    } else {
      result.push(slot)
    }

    previousWasBusy = slot.type === 'busy' || slot.type === 'focus'
  }

  return result
}

/**
 * Check if a specific time range is available
 */
export function isTimeRangeAvailable(
  slots: ScheduleSlot[],
  start: Date,
  end: Date
): boolean {
  for (const slot of slots) {
    if (slot.type === 'available') continue

    // Check for overlap
    if (start < slot.end && end > slot.start) {
      return false
    }
  }
  return true
}

/**
 * Get total available minutes in a day
 */
export function getTotalAvailableMinutes(slots: ScheduleSlot[]): number {
  return slots
    .filter(slot => slot.type === 'available')
    .reduce((sum, slot) => sum + slot.durationMinutes, 0)
}

/**
 * Get total focus time minutes in a day
 */
export function getTotalFocusMinutes(slots: ScheduleSlot[]): number {
  return slots
    .filter(slot => slot.type === 'focus')
    .reduce((sum, slot) => sum + slot.durationMinutes, 0)
}

/**
 * Split a slot at a specific time
 */
export function splitSlotAt(
  slot: ScheduleSlot,
  splitTime: Date
): [ScheduleSlot | null, ScheduleSlot | null] {
  if (splitTime <= slot.start || splitTime >= slot.end) {
    return [slot, null]
  }

  const firstPart: ScheduleSlot = {
    ...slot,
    end: splitTime,
    durationMinutes: Math.floor((splitTime.getTime() - slot.start.getTime()) / 60000),
  }

  const secondPart: ScheduleSlot = {
    ...slot,
    start: splitTime,
    durationMinutes: Math.floor((slot.end.getTime() - splitTime.getTime()) / 60000),
  }

  return [
    firstPart.durationMinutes > 0 ? firstPart : null,
    secondPart.durationMinutes > 0 ? secondPart : null,
  ]
}

/**
 * Find the best slot for a task based on scoring
 */
export function findBestSlot(
  slots: ScheduleSlot[],
  durationMinutes: number,
  preferredEnergyLevel?: 'low' | 'medium' | 'high',
  preferredTimeRange?: { start: string; end: string }
): ScheduleSlot | null {
  const availableSlots = findGaps(slots, durationMinutes)

  if (availableSlots.length === 0) return null

  // Score each slot
  const scoredSlots = availableSlots.map(slot => {
    let score = 0

    // Prefer earlier slots slightly
    const slotHour = slot.start.getHours()
    score -= slotHour * 0.1

    // Energy level match
    if (preferredEnergyLevel && slot.energyLevel === preferredEnergyLevel) {
      score += 10
    } else if (preferredEnergyLevel === 'high' && slot.energyLevel === 'medium') {
      score += 5
    }

    // Time range preference
    if (preferredTimeRange) {
      const slotTime = dateToTime(slot.start)
      const rangeStart = parseTime(preferredTimeRange.start)
      const rangeEnd = parseTime(preferredTimeRange.end)
      const slotMinutes = parseTime(slotTime)

      if (slotMinutes >= rangeStart && slotMinutes <= rangeEnd) {
        score += 15
      }
    }

    // Prefer slots that fit exactly (less wasted time)
    const wastedMinutes = slot.durationMinutes - durationMinutes
    if (wastedMinutes < 15) {
      score += 5
    } else if (wastedMinutes < 30) {
      score += 2
    }

    return { slot, score }
  })

  // Sort by score descending
  scoredSlots.sort((a, b) => b.score - a.score)

  return scoredSlots[0]?.slot || null
}

/**
 * Merge overlapping or adjacent slots of the same type
 */
export function mergeAdjacentSlots(slots: ScheduleSlot[]): ScheduleSlot[] {
  if (slots.length <= 1) return slots

  const sorted = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: ScheduleSlot[] = []

  let current = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]

    // Check if same type and adjacent/overlapping
    if (
      current.type === next.type &&
      current.end.getTime() >= next.start.getTime()
    ) {
      // Merge
      current = {
        ...current,
        end: new Date(Math.max(current.end.getTime(), next.end.getTime())),
        durationMinutes: Math.floor(
          (Math.max(current.end.getTime(), next.end.getTime()) - current.start.getTime()) / 60000
        ),
      }
    } else {
      merged.push(current)
      current = next
    }
  }

  merged.push(current)
  return merged
}
