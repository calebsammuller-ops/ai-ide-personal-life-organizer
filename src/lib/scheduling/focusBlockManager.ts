/**
 * Focus Block Manager - Manages protected deep work time
 *
 * Handles CRUD operations and validation for focus blocks.
 * Integrates with the scheduling engine to protect focus time.
 */

import type {
  FocusBlock,
  Task,
  ScheduleSlot,
  CreateFocusBlockInput,
  UpdateFocusBlockInput,
} from '@/types/scheduling'
import {
  parseTime,
  timeToString,
  timeDiffMinutes,
  timeToDate,
  dateToTime,
} from './slotAnalyzer'

/**
 * Get focus blocks applicable for a specific date
 */
export function getFocusBlocksForDate(
  focusBlocks: FocusBlock[],
  date: string
): FocusBlock[] {
  const dayOfWeek = new Date(date).getDay()

  return focusBlocks.filter(
    fb => fb.isActive && fb.daysOfWeek.includes(dayOfWeek)
  )
}

/**
 * Check if a specific time falls within any focus block
 */
export function isTimeInFocusBlock(
  time: string,
  focusBlocks: FocusBlock[]
): FocusBlock | null {
  const timeMinutes = parseTime(time)

  for (const fb of focusBlocks) {
    if (!fb.isActive) continue

    const startMinutes = parseTime(fb.startTime)
    const endMinutes = parseTime(fb.endTime)

    if (timeMinutes >= startMinutes && timeMinutes < endMinutes) {
      return fb
    }
  }

  return null
}

/**
 * Check if a time range overlaps with any focus block
 */
export function doesRangeOverlapFocusBlock(
  startTime: string,
  endTime: string,
  focusBlocks: FocusBlock[]
): FocusBlock | null {
  const rangeStart = parseTime(startTime)
  const rangeEnd = parseTime(endTime)

  for (const fb of focusBlocks) {
    if (!fb.isActive) continue

    const fbStart = parseTime(fb.startTime)
    const fbEnd = parseTime(fb.endTime)

    // Check for overlap
    if (rangeStart < fbEnd && rangeEnd > fbStart) {
      return fb
    }
  }

  return null
}

/**
 * Check if a task can override a focus block
 * High priority tasks with urgent deadlines may be allowed
 */
export function canOverrideFocusBlock(
  task: Task,
  focusBlock: FocusBlock
): boolean {
  // If not protected, always allow
  if (!focusBlock.isProtected) {
    return true
  }

  // If override for high priority is allowed
  if (focusBlock.allowHighPriorityOverride && task.priority <= 2) {
    // Also check if deadline is urgent (within 24 hours)
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline)
      const now = new Date()
      const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursUntilDeadline <= 24) {
        return true
      }
    }
  }

  // Check if task category is not in blocked categories
  if (task.category && focusBlock.blockedCategories.includes(task.category)) {
    return false
  }

  // Check if task category is in preferred types (can be scheduled during focus)
  if (task.category && focusBlock.preferredTaskTypes.includes(task.category)) {
    return true
  }

  return false
}

/**
 * Get available focus slots for a date
 * Returns the focus block time ranges as schedule slots
 */
export function getAvailableFocusSlots(
  date: string,
  focusBlocks: FocusBlock[]
): ScheduleSlot[] {
  const applicableBlocks = getFocusBlocksForDate(focusBlocks, date)

  return applicableBlocks.map(fb => ({
    start: timeToDate(date, fb.startTime),
    end: timeToDate(date, fb.endTime),
    durationMinutes: timeDiffMinutes(fb.startTime, fb.endTime),
    type: 'focus' as const,
    isProtected: fb.isProtected,
  }))
}

/**
 * Calculate total focus time for a day
 */
export function getTotalFocusTimeForDate(
  date: string,
  focusBlocks: FocusBlock[]
): number {
  const applicableBlocks = getFocusBlocksForDate(focusBlocks, date)

  return applicableBlocks.reduce((total, fb) => {
    return total + timeDiffMinutes(fb.startTime, fb.endTime)
  }, 0)
}

/**
 * Get weekly focus time schedule
 */
export function getWeeklyFocusSchedule(
  focusBlocks: FocusBlock[]
): Map<number, FocusBlock[]> {
  const schedule = new Map<number, FocusBlock[]>()

  // Initialize all days
  for (let day = 0; day < 7; day++) {
    schedule.set(day, [])
  }

  // Populate with active focus blocks
  for (const fb of focusBlocks) {
    if (!fb.isActive) continue

    for (const day of fb.daysOfWeek) {
      const dayBlocks = schedule.get(day) || []
      dayBlocks.push(fb)
      schedule.set(day, dayBlocks)
    }
  }

  return schedule
}

/**
 * Validate focus block times
 */
export function validateFocusBlockTimes(
  startTime: string,
  endTime: string
): { valid: boolean; error?: string } {
  const startMinutes = parseTime(startTime)
  const endMinutes = parseTime(endTime)

  if (startMinutes >= endMinutes) {
    return {
      valid: false,
      error: 'End time must be after start time',
    }
  }

  const duration = endMinutes - startMinutes
  if (duration < 30) {
    return {
      valid: false,
      error: 'Focus block must be at least 30 minutes',
    }
  }

  if (duration > 480) {
    return {
      valid: false,
      error: 'Focus block cannot exceed 8 hours',
    }
  }

  return { valid: true }
}

/**
 * Check for overlapping focus blocks
 */
export function findOverlappingFocusBlocks(
  newBlock: CreateFocusBlockInput | FocusBlock,
  existingBlocks: FocusBlock[],
  excludeId?: string
): FocusBlock[] {
  const newStart = parseTime(newBlock.startTime)
  const newEnd = parseTime(newBlock.endTime)
  const newDays = new Set(newBlock.daysOfWeek || [1, 2, 3, 4, 5])

  return existingBlocks.filter(fb => {
    if (excludeId && fb.id === excludeId) return false
    if (!fb.isActive) return false

    // Check day overlap
    const hasCommonDay = fb.daysOfWeek.some(day => newDays.has(day))
    if (!hasCommonDay) return false

    // Check time overlap
    const existingStart = parseTime(fb.startTime)
    const existingEnd = parseTime(fb.endTime)

    return newStart < existingEnd && newEnd > existingStart
  })
}

/**
 * Suggest optimal focus block times based on existing schedule
 */
export function suggestFocusBlockTimes(
  existingBlocks: FocusBlock[],
  dayOfWeek: number,
  preferredDuration: number = 90
): { startTime: string; endTime: string }[] {
  const suggestions: { startTime: string; endTime: string }[] = []

  // Common productive time slots
  const idealSlots = [
    { start: '09:00', end: '11:00' }, // Morning focus
    { start: '14:00', end: '16:00' }, // Afternoon focus
    { start: '10:00', end: '12:00' }, // Late morning
  ]

  // Filter out slots that overlap with existing blocks
  for (const slot of idealSlots) {
    const overlapping = existingBlocks.filter(fb => {
      if (!fb.isActive || !fb.daysOfWeek.includes(dayOfWeek)) return false

      const slotStart = parseTime(slot.start)
      const slotEnd = parseTime(slot.end)
      const fbStart = parseTime(fb.startTime)
      const fbEnd = parseTime(fb.endTime)

      return slotStart < fbEnd && slotEnd > fbStart
    })

    if (overlapping.length === 0) {
      suggestions.push(slot)
    }
  }

  // If no ideal slots available, suggest adjusted times
  if (suggestions.length === 0) {
    // Try finding gaps between existing blocks
    const dayBlocks = existingBlocks
      .filter(fb => fb.isActive && fb.daysOfWeek.includes(dayOfWeek))
      .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime))

    // Start of work day
    if (dayBlocks.length === 0 || parseTime(dayBlocks[0].startTime) > parseTime('09:00')) {
      const end = dayBlocks.length > 0
        ? dayBlocks[0].startTime
        : timeToString(parseTime('09:00') + preferredDuration)

      suggestions.push({
        startTime: '09:00',
        endTime: end,
      })
    }

    // Gaps between blocks
    for (let i = 0; i < dayBlocks.length - 1; i++) {
      const gap = parseTime(dayBlocks[i + 1].startTime) - parseTime(dayBlocks[i].endTime)
      if (gap >= preferredDuration) {
        suggestions.push({
          startTime: dayBlocks[i].endTime,
          endTime: timeToString(parseTime(dayBlocks[i].endTime) + preferredDuration),
        })
      }
    }
  }

  return suggestions.slice(0, 3) // Return top 3 suggestions
}

/**
 * Calculate focus efficiency score
 * Based on how well focus blocks are utilized
 */
export function calculateFocusEfficiency(
  focusBlocks: FocusBlock[],
  completedTasksDuringFocus: number,
  totalFocusMinutes: number
): number {
  if (totalFocusMinutes === 0) return 0

  // Base score on tasks completed per focus hour
  const tasksPerHour = completedTasksDuringFocus / (totalFocusMinutes / 60)

  // Normalize to 0-100 scale (assuming 2 tasks per hour is optimal)
  const efficiency = Math.min(100, (tasksPerHour / 2) * 100)

  return Math.round(efficiency)
}

/**
 * Get focus block with buffer times
 */
export function getFocusBlockWithBuffers(
  focusBlock: FocusBlock
): { actualStart: string; actualEnd: string; bufferedStart: string; bufferedEnd: string } {
  return {
    actualStart: focusBlock.startTime,
    actualEnd: focusBlock.endTime,
    bufferedStart: timeToString(parseTime(focusBlock.startTime) - focusBlock.bufferMinutes),
    bufferedEnd: timeToString(parseTime(focusBlock.endTime) + focusBlock.bufferMinutes),
  }
}

/**
 * Format focus block for display
 */
export function formatFocusBlockTime(focusBlock: FocusBlock): string {
  const formatTime12 = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return minutes === 0
      ? `${displayHours}${period}`
      : `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`
  }

  return `${formatTime12(focusBlock.startTime)} - ${formatTime12(focusBlock.endTime)}`
}

/**
 * Get day names for focus block
 */
export function formatFocusBlockDays(focusBlock: FocusBlock): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const days = focusBlock.daysOfWeek.sort((a, b) => a - b)

  // Check for common patterns
  if (days.length === 7) return 'Every day'
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'

  return days.map(d => dayNames[d]).join(', ')
}
