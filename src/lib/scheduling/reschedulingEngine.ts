/**
 * Rescheduling Engine - Smart rescheduling for Motion AI
 *
 * Handles rescheduling of incomplete tasks, conflict resolution,
 * and cascading schedule changes.
 */

import type {
  Task,
  SchedulingContext,
  RescheduleResult,
  RescheduledItem,
  ConflictInfo,
  SchedulingSuggestion,
} from '@/types/scheduling'
import {
  autoScheduleTask,
  detectSchedulingConflicts,
  batchScheduleTasks,
} from './schedulingEngine'
import {
  buildDaySlotMap,
  findGaps,
  parseTime,
  timeToString,
  timeToDate,
  dateToTime,
  timeDiffMinutes,
} from './slotAnalyzer'

// Maximum cascade depth to prevent infinite loops
const MAX_CASCADE_DEPTH = 3

/**
 * Reschedule an incomplete task to the next available slot
 */
export function rescheduleIncompleteTask(
  task: Task,
  context: SchedulingContext,
  options?: {
    preferSameDay?: boolean
    respectDeadline?: boolean
    searchDaysAhead?: number
  }
): RescheduleResult {
  const { preferSameDay = true, respectDeadline = true, searchDaysAhead = 7 } = options || {}

  const rescheduledItems: RescheduledItem[] = []
  const warnings: string[] = []
  const conflicts: ConflictInfo[] = []

  // Store original times
  const oldStart = task.scheduledStart ? new Date(task.scheduledStart) : null
  const oldEnd = task.scheduledEnd ? new Date(task.scheduledEnd) : null

  // Check deadline constraints
  if (respectDeadline && task.deadline) {
    const deadlineDate = new Date(task.deadline)
    const now = new Date()

    if (deadlineDate < now) {
      warnings.push(`Task "${task.title}" is past its deadline`)
    }
  }

  // Try to find a new slot
  let suggestion: SchedulingSuggestion | null = null

  if (preferSameDay) {
    // First try same day
    suggestion = autoScheduleTask(task, context)
  }

  if (!suggestion) {
    // Try future days
    // Note: In real implementation, we would fetch future day contexts
    // For now, return failure if same day doesn't work
    return {
      success: false,
      rescheduledItems: [],
      conflicts: [],
      warnings: [...warnings, `No available slot found for task "${task.title}"`],
      totalItemsAffected: 0,
    }
  }

  // Check for conflicts with the new time
  const newConflicts = detectSchedulingConflicts(
    task,
    suggestion.proposedStart,
    suggestion.proposedEnd,
    context
  )

  if (newConflicts.length > 0) {
    conflicts.push(...newConflicts)

    // Check if conflicts are resolvable
    const hasHighSeverity = newConflicts.some(c => c.severity === 'high')
    if (hasHighSeverity) {
      return {
        success: false,
        rescheduledItems: [],
        conflicts,
        warnings: [...warnings, 'Could not reschedule due to conflicts'],
        totalItemsAffected: 0,
      }
    }
  }

  // Record the reschedule
  rescheduledItems.push({
    id: task.id,
    type: 'task',
    title: task.title,
    oldStart: oldStart || new Date(),
    oldEnd: oldEnd || new Date(),
    newStart: suggestion.proposedStart,
    newEnd: suggestion.proposedEnd,
    reason: 'Rescheduled incomplete task',
  })

  return {
    success: true,
    rescheduledItems,
    conflicts,
    warnings,
    totalItemsAffected: rescheduledItems.length,
  }
}

/**
 * Handle cascading reschedules when a conflict occurs
 */
export function handleConflictCascade(
  conflictingTasks: Task[],
  context: SchedulingContext,
  depth: number = 0
): RescheduleResult {
  if (depth >= MAX_CASCADE_DEPTH) {
    return {
      success: false,
      rescheduledItems: [],
      conflicts: [],
      warnings: ['Maximum cascade depth reached - manual intervention required'],
      totalItemsAffected: 0,
    }
  }

  const allRescheduled: RescheduledItem[] = []
  const allConflicts: ConflictInfo[] = []
  const allWarnings: string[] = []

  // Sort by priority - lower priority tasks get rescheduled first
  const sortedTasks = [...conflictingTasks].sort((a, b) => b.priority - a.priority)

  for (const task of sortedTasks) {
    const result = rescheduleIncompleteTask(task, context, {
      preferSameDay: true,
      respectDeadline: true,
    })

    allRescheduled.push(...result.rescheduledItems)
    if (result.conflicts) allConflicts.push(...result.conflicts)
    allWarnings.push(...result.warnings)

    // Update context with the new schedule
    if (result.success && result.rescheduledItems.length > 0) {
      const rescheduled = result.rescheduledItems[0]
      context.events.push({
        id: task.id,
        type: 'task',
        title: task.title,
        startTime: dateToTime(rescheduled.newStart),
        endTime: dateToTime(rescheduled.newEnd),
        priority: task.priority,
        energyLevel: task.energyLevel,
      })
    }
  }

  return {
    success: allRescheduled.length === sortedTasks.length,
    rescheduledItems: allRescheduled,
    conflicts: allConflicts,
    warnings: allWarnings,
    totalItemsAffected: allRescheduled.length,
  }
}

/**
 * Find the next available slot for a task, searching forward in time
 */
export function findNextAvailableSlot(
  task: Task,
  fromDate: Date,
  context: SchedulingContext
): { start: Date; end: Date } | null {
  const slots = buildDaySlotMap(context)
  const availableSlots = findGaps(slots, task.durationMinutes)

  // Filter to slots after fromDate
  const futureSlots = availableSlots.filter(slot => slot.start >= fromDate)

  if (futureSlots.length === 0) {
    return null
  }

  const bestSlot = futureSlots[0]
  return {
    start: bestSlot.start,
    end: new Date(bestSlot.start.getTime() + task.durationMinutes * 60000),
  }
}

/**
 * Reschedule all incomplete tasks from a given date
 * Called at end of day to move unfinished work forward
 */
export function rescheduleIncompleteTasks(
  incompleteTasks: Task[],
  todayContext: SchedulingContext,
  tomorrowContext: SchedulingContext
): RescheduleResult {
  const rescheduledItems: RescheduledItem[] = []
  const conflicts: ConflictInfo[] = []
  const warnings: string[] = []

  // Sort by priority and deadline
  const sortedTasks = [...incompleteTasks].sort((a, b) => {
    // First by deadline (closest first)
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    if (a.deadline) return -1
    if (b.deadline) return 1

    // Then by priority
    return a.priority - b.priority
  })

  // Mutable tomorrow context for tracking scheduled items
  const mutableTomorrowContext = { ...tomorrowContext, events: [...tomorrowContext.events] }

  for (const task of sortedTasks) {
    const oldStart = task.scheduledStart ? new Date(task.scheduledStart) : null
    const oldEnd = task.scheduledEnd ? new Date(task.scheduledEnd) : null

    // Increment reschedule count
    const updatedTask = {
      ...task,
      rescheduleCount: task.rescheduleCount + 1,
    }

    // Try to schedule for tomorrow
    const suggestion = autoScheduleTask(updatedTask, mutableTomorrowContext)

    if (suggestion) {
      rescheduledItems.push({
        id: task.id,
        type: 'task',
        title: task.title,
        oldStart: oldStart || new Date(),
        oldEnd: oldEnd || new Date(),
        newStart: suggestion.proposedStart,
        newEnd: suggestion.proposedEnd,
        reason: `Moved from ${todayContext.date} to ${tomorrowContext.date}`,
      })

      // Add to tomorrow's events
      mutableTomorrowContext.events.push({
        id: task.id,
        type: 'task',
        title: task.title,
        startTime: dateToTime(suggestion.proposedStart),
        endTime: dateToTime(suggestion.proposedEnd),
        priority: task.priority,
        energyLevel: task.energyLevel,
      })

      // Check for deadline warnings
      if (task.deadline) {
        const deadlineDate = new Date(task.deadline)
        if (suggestion.proposedEnd > deadlineDate) {
          warnings.push(
            `Task "${task.title}" rescheduled past deadline - consider prioritizing`
          )
        }
      }

      // Warn about frequently rescheduled tasks
      if (updatedTask.rescheduleCount >= 3) {
        warnings.push(
          `Task "${task.title}" has been rescheduled ${updatedTask.rescheduleCount} times`
        )
      }
    } else {
      warnings.push(`Could not reschedule "${task.title}" - no available slot found`)
    }
  }

  return {
    success: rescheduledItems.length === sortedTasks.length,
    rescheduledItems,
    conflicts,
    warnings,
    totalItemsAffected: rescheduledItems.length,
  }
}

/**
 * Validate a proposed reschedule
 */
export function validateReschedule(
  task: Task,
  newStart: Date,
  newEnd: Date,
  context: SchedulingContext
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check duration
  const proposedDuration = (newEnd.getTime() - newStart.getTime()) / 60000
  if (proposedDuration < task.durationMinutes) {
    errors.push('New time slot is shorter than required task duration')
  }

  // Check deadline
  if (task.deadline) {
    const deadlineDate = new Date(task.deadline)
    if (newEnd > deadlineDate) {
      errors.push('New schedule would complete after deadline')
    }
  }

  // Check day boundaries
  const startMinutes = newStart.getHours() * 60 + newStart.getMinutes()
  const endMinutes = newEnd.getHours() * 60 + newEnd.getMinutes()
  const dayStart = parseTime(context.dayBoundaries.dayStart)
  const dayEnd = parseTime(context.dayBoundaries.dayEnd)

  if (startMinutes < dayStart || endMinutes > dayEnd) {
    errors.push('New schedule falls outside active hours')
  }

  // Check conflicts
  const conflicts = detectSchedulingConflicts(task, newStart, newEnd, context)
  const criticalConflicts = conflicts.filter(c => c.severity === 'high')

  if (criticalConflicts.length > 0) {
    errors.push(...criticalConflicts.map(c => c.description))
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get tasks that need rescheduling
 */
export function getTasksNeedingReschedule(
  tasks: Task[],
  cutoffTime: Date
): Task[] {
  return tasks.filter(task => {
    // Check if task was scheduled but not completed
    if (task.status === 'scheduled' && task.scheduledEnd) {
      const scheduledEnd = new Date(task.scheduledEnd)
      return scheduledEnd < cutoffTime
    }

    // Check for overdue tasks
    if (task.status === 'pending' && task.deadline) {
      const deadline = new Date(task.deadline)
      return deadline < cutoffTime
    }

    return false
  })
}

/**
 * Defer a task to a specific date
 */
export function deferTask(
  task: Task,
  targetDate: string,
  targetContext: SchedulingContext
): RescheduleResult {
  const oldStart = task.scheduledStart ? new Date(task.scheduledStart) : null
  const oldEnd = task.scheduledEnd ? new Date(task.scheduledEnd) : null

  const suggestion = autoScheduleTask(task, targetContext)

  if (!suggestion) {
    return {
      success: false,
      rescheduledItems: [],
      conflicts: [],
      warnings: [`No available slot on ${targetDate} for "${task.title}"`],
      totalItemsAffected: 0,
    }
  }

  const warnings: string[] = []

  // Check deadline
  if (task.deadline) {
    const deadlineDate = new Date(task.deadline)
    if (suggestion.proposedEnd > deadlineDate) {
      warnings.push('Deferred task will complete after deadline')
    }
  }

  return {
    success: true,
    rescheduledItems: [{
      id: task.id,
      type: 'task',
      title: task.title,
      oldStart: oldStart || new Date(),
      oldEnd: oldEnd || new Date(),
      newStart: suggestion.proposedStart,
      newEnd: suggestion.proposedEnd,
      reason: `Deferred to ${targetDate}`,
    }],
    conflicts: [],
    warnings,
    totalItemsAffected: 1,
  }
}

/**
 * Calculate optimal reschedule strategy
 */
export function calculateRescheduleStrategy(
  tasks: Task[],
  availableMinutes: number
): {
  canFit: Task[]
  mustDefer: Task[]
  strategy: string
} {
  // Sort by priority and deadline
  const sorted = [...tasks].sort((a, b) => {
    // Urgent deadlines first
    if (a.deadline && b.deadline) {
      const aHours = (new Date(a.deadline).getTime() - Date.now()) / (1000 * 60 * 60)
      const bHours = (new Date(b.deadline).getTime() - Date.now()) / (1000 * 60 * 60)
      if (aHours < 24 && bHours >= 24) return -1
      if (bHours < 24 && aHours >= 24) return 1
    }
    return a.priority - b.priority
  })

  const canFit: Task[] = []
  const mustDefer: Task[] = []
  let remainingMinutes = availableMinutes

  for (const task of sorted) {
    if (task.durationMinutes <= remainingMinutes) {
      canFit.push(task)
      remainingMinutes -= task.durationMinutes
    } else {
      mustDefer.push(task)
    }
  }

  let strategy: string
  if (mustDefer.length === 0) {
    strategy = 'All tasks can be rescheduled today'
  } else if (canFit.length === 0) {
    strategy = 'No room today - all tasks will be deferred'
  } else {
    strategy = `${canFit.length} tasks can fit today, ${mustDefer.length} will be deferred`
  }

  return { canFit, mustDefer, strategy }
}
