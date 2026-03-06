/**
 * Scheduling Engine - Core AI scheduling logic
 *
 * Finds optimal time slots for tasks based on priority, deadlines,
 * energy levels, and user preferences.
 */

import type {
  Task,
  FocusBlock,
  SchedulingContext,
  ScheduleSlot,
  SchedulingSuggestion,
  SchedulingFactor,
  AlternativeSlot,
  BatchScheduleResult,
  BatchScheduleOptions,
  ConflictInfo,
  DayBoundaries,
  SchedulingPreferences,
  ScheduleItem,
} from '@/types/scheduling'
import {
  buildDaySlotMap,
  findGaps,
  parseTime,
  timeToString,
  timeToDate,
  dateToTime,
  timeDiffMinutes,
  getEnergyLevelForTime,
  findBestSlot,
} from './slotAnalyzer'
import {
  getFocusBlocksForDate,
  canOverrideFocusBlock,
  doesRangeOverlapFocusBlock,
} from './focusBlockManager'

// Scoring weights for slot evaluation
const SCORING_WEIGHTS = {
  energyMatch: 20,
  productiveHour: 15,
  deadlineProximity: 25,
  priorityBonus: 15,
  slotFit: 10,
  timePreference: 10,
  avoidFragmentation: 5,
}

/**
 * Find optimal time slots for a task
 * Returns scored slots sorted by suitability
 */
export function findOptimalSlots(
  task: Task,
  context: SchedulingContext,
  maxSlots: number = 5
): ScheduleSlot[] {
  const slots = buildDaySlotMap(context)
  const availableSlots = findGaps(slots, task.durationMinutes)

  if (availableSlots.length === 0) {
    return []
  }

  // Score each slot
  const scoredSlots = availableSlots.map(slot => {
    const score = calculateSlotScore(slot, task, context)
    return { ...slot, score }
  })

  // Sort by score descending
  scoredSlots.sort((a, b) => (b.score || 0) - (a.score || 0))

  return scoredSlots.slice(0, maxSlots)
}

/**
 * Calculate suitability score for a slot
 * Higher score = better fit for the task
 */
export function calculateSlotScore(
  slot: ScheduleSlot,
  task: Task,
  context: SchedulingContext
): number {
  let score = 50 // Base score
  const factors: SchedulingFactor[] = []

  // 1. Energy level match
  if (task.energyLevel && slot.energyLevel) {
    if (task.energyLevel === slot.energyLevel) {
      score += SCORING_WEIGHTS.energyMatch
      factors.push({
        name: 'Energy Match',
        score: SCORING_WEIGHTS.energyMatch,
        weight: 1,
        description: `${task.energyLevel} energy task matches ${slot.energyLevel} energy time slot`,
      })
    } else if (
      (task.energyLevel === 'high' && slot.energyLevel === 'medium') ||
      (task.energyLevel === 'medium' && slot.energyLevel === 'high')
    ) {
      score += SCORING_WEIGHTS.energyMatch * 0.5
    } else if (task.energyLevel === 'high' && slot.energyLevel === 'low') {
      score -= SCORING_WEIGHTS.energyMatch * 0.5 // Penalize scheduling high-energy tasks in low-energy slots
    }
  }

  // 2. Productive hours bonus
  const slotHour = slot.start.getHours()
  const hourStr = `${slotHour.toString().padStart(2, '0')}:00`
  if (context.preferences.peakProductivityHours.includes(hourStr)) {
    // High priority tasks get bonus for productive hours
    if (task.priority <= 2) {
      score += SCORING_WEIGHTS.productiveHour
      factors.push({
        name: 'Productive Hour',
        score: SCORING_WEIGHTS.productiveHour,
        weight: 1,
        description: 'High priority task scheduled during peak productive hours',
      })
    }
  }

  // 3. Deadline proximity
  if (task.deadline) {
    const deadlineDate = new Date(task.deadline)
    const now = new Date()
    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilDeadline <= 4) {
      score += SCORING_WEIGHTS.deadlineProximity * 1.5 // Urgent
    } else if (hoursUntilDeadline <= 24) {
      score += SCORING_WEIGHTS.deadlineProximity
    } else if (hoursUntilDeadline <= 48) {
      score += SCORING_WEIGHTS.deadlineProximity * 0.5
    }
  }

  // 4. Priority bonus (higher priority = earlier scheduling preferred)
  const priorityMultiplier = (6 - task.priority) / 5 // 1 = 1.0, 5 = 0.2
  score += SCORING_WEIGHTS.priorityBonus * priorityMultiplier

  // 5. Slot fit (prefer slots that fit well, not too much wasted time)
  const wastedMinutes = slot.durationMinutes - task.durationMinutes
  if (wastedMinutes < 15) {
    score += SCORING_WEIGHTS.slotFit
  } else if (wastedMinutes < 30) {
    score += SCORING_WEIGHTS.slotFit * 0.5
  }

  // 6. Time preference (slightly prefer morning for most tasks)
  if (slotHour >= 9 && slotHour <= 12) {
    score += SCORING_WEIGHTS.timePreference
  } else if (slotHour >= 14 && slotHour <= 16) {
    score += SCORING_WEIGHTS.timePreference * 0.7
  }

  // 7. Avoid fragmentation (prefer larger contiguous blocks)
  if (slot.durationMinutes >= 60) {
    score += SCORING_WEIGHTS.avoidFragmentation
  }

  return Math.round(score)
}

/**
 * Auto-schedule a single task
 * Returns a scheduling suggestion with the best slot
 */
export function autoScheduleTask(
  task: Task,
  context: SchedulingContext
): SchedulingSuggestion | null {
  const optimalSlots = findOptimalSlots(task, context)

  if (optimalSlots.length === 0) {
    return null
  }

  const bestSlot = optimalSlots[0]
  const taskEndTime = new Date(bestSlot.start.getTime() + task.durationMinutes * 60000)

  // Check focus block conflicts
  const focusBlockConflict = doesRangeOverlapFocusBlock(
    dateToTime(bestSlot.start),
    dateToTime(taskEndTime),
    getFocusBlocksForDate(context.focusBlocks, context.date)
  )

  // If there's a conflict, check if we can override
  if (focusBlockConflict && !canOverrideFocusBlock(task, focusBlockConflict)) {
    // Try to find a slot outside focus blocks
    const nonFocusSlots = optimalSlots.filter(slot => {
      const endTime = new Date(slot.start.getTime() + task.durationMinutes * 60000)
      return !doesRangeOverlapFocusBlock(
        dateToTime(slot.start),
        dateToTime(endTime),
        getFocusBlocksForDate(context.focusBlocks, context.date)
      )
    })

    if (nonFocusSlots.length === 0) {
      return null
    }

    const alternativeSlot = nonFocusSlots[0]
    const altEndTime = new Date(alternativeSlot.start.getTime() + task.durationMinutes * 60000)

    return {
      taskId: task.id,
      task,
      proposedStart: alternativeSlot.start,
      proposedEnd: altEndTime,
      confidence: 0.7,
      reason: 'Scheduled outside focus block time',
      factors: buildSchedulingFactors(alternativeSlot, task, context),
      alternativeSlots: buildAlternativeSlots(optimalSlots.slice(1, 4), task),
    }
  }

  return {
    taskId: task.id,
    task,
    proposedStart: bestSlot.start,
    proposedEnd: taskEndTime,
    confidence: calculateConfidence(bestSlot, task, context),
    reason: buildSchedulingReason(bestSlot, task, context),
    factors: buildSchedulingFactors(bestSlot, task, context),
    alternativeSlots: buildAlternativeSlots(optimalSlots.slice(1, 4), task),
  }
}

/**
 * Batch schedule multiple tasks
 * Schedules in priority order, updating context after each
 */
export function batchScheduleTasks(
  tasks: Task[],
  context: SchedulingContext,
  options?: BatchScheduleOptions
): BatchScheduleResult {
  const results: SchedulingSuggestion[] = []
  const failed: { taskId: string; reason: string }[] = []
  const warnings: string[] = []

  // Sort tasks by priority if requested
  let sortedTasks = [...tasks]
  if (options?.respectPriority) {
    sortedTasks.sort((a, b) => a.priority - b.priority)
  }

  // If optimizing for deadlines, sort by deadline (closest first)
  if (options?.optimizeForDeadlines) {
    sortedTasks.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    })
  }

  // Create a mutable context for tracking scheduled items
  const mutableContext: SchedulingContext = {
    ...context,
    events: [...context.events],
  }

  for (const task of sortedTasks) {
    // Skip already scheduled tasks
    if (task.status === 'scheduled' || task.scheduledStart) {
      continue
    }

    const suggestion = autoScheduleTask(task, mutableContext)

    if (suggestion) {
      results.push(suggestion)

      // Add scheduled task to events to prevent double-booking
      mutableContext.events.push({
        id: task.id,
        type: 'task',
        title: task.title,
        startTime: dateToTime(suggestion.proposedStart),
        endTime: dateToTime(suggestion.proposedEnd),
        priority: task.priority,
        energyLevel: task.energyLevel,
      })
    } else {
      failed.push({
        taskId: task.id,
        reason: `No available slot found for ${task.durationMinutes} minute task`,
      })
    }
  }

  // Add warnings for deadline issues
  for (const suggestion of results) {
    if (suggestion.task.deadline) {
      const deadlineDate = new Date(suggestion.task.deadline)
      if (suggestion.proposedEnd > deadlineDate) {
        warnings.push(
          `Task "${suggestion.task.title}" is scheduled to end after its deadline`
        )
      }
    }
  }

  return {
    success: failed.length === 0,
    scheduled: results,
    failed,
    warnings,
  }
}

/**
 * Calculate confidence score for a suggestion
 */
function calculateConfidence(
  slot: ScheduleSlot,
  task: Task,
  context: SchedulingContext
): number {
  let confidence = 0.8 // Base confidence

  // Higher confidence for energy-matched slots
  if (task.energyLevel === slot.energyLevel) {
    confidence += 0.1
  }

  // Lower confidence if slot is suboptimal
  if (slot.score && slot.score < 60) {
    confidence -= 0.1
  }

  // Higher confidence during productive hours
  const hour = slot.start.getHours()
  if (hour >= 9 && hour <= 11) {
    confidence += 0.05
  }

  return Math.min(0.95, Math.max(0.5, confidence))
}

/**
 * Build human-readable scheduling reason
 */
function buildSchedulingReason(
  slot: ScheduleSlot,
  task: Task,
  context: SchedulingContext
): string {
  const reasons: string[] = []
  const hour = slot.start.getHours()
  const hourStr = `${hour.toString().padStart(2, '0')}:00`

  if (context.preferences.peakProductivityHours.includes(hourStr)) {
    reasons.push('scheduled during your peak productive hours')
  }

  if (task.energyLevel === slot.energyLevel) {
    reasons.push(`matches your ${slot.energyLevel} energy level at this time`)
  }

  if (task.deadline) {
    const hoursUntil = (new Date(task.deadline).getTime() - slot.start.getTime()) / (1000 * 60 * 60)
    if (hoursUntil < 24) {
      reasons.push('prioritized due to upcoming deadline')
    }
  }

  if (task.priority <= 2) {
    reasons.push('given priority as a high-importance task')
  }

  if (reasons.length === 0) {
    reasons.push('fits well in your available time')
  }

  return reasons.join(', ').replace(/^./, c => c.toUpperCase())
}

/**
 * Build scheduling factors for explanation
 */
function buildSchedulingFactors(
  slot: ScheduleSlot,
  task: Task,
  context: SchedulingContext
): SchedulingFactor[] {
  const factors: SchedulingFactor[] = []
  const hour = slot.start.getHours()
  const hourStr = `${hour.toString().padStart(2, '0')}:00`

  // Energy match
  if (task.energyLevel && slot.energyLevel) {
    factors.push({
      name: 'Energy Match',
      score: task.energyLevel === slot.energyLevel ? 1 : 0.5,
      weight: SCORING_WEIGHTS.energyMatch,
      description: `Task energy: ${task.energyLevel}, Slot energy: ${slot.energyLevel}`,
    })
  }

  // Productive hours
  if (context.preferences.peakProductivityHours.includes(hourStr)) {
    factors.push({
      name: 'Peak Productivity',
      score: 1,
      weight: SCORING_WEIGHTS.productiveHour,
      description: 'Scheduled during peak productive hours',
    })
  }

  // Priority
  factors.push({
    name: 'Priority',
    score: (6 - task.priority) / 5,
    weight: SCORING_WEIGHTS.priorityBonus,
    description: `Task priority: ${task.priority}/5`,
  })

  // Deadline
  if (task.deadline) {
    const hoursUntil = (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)
    factors.push({
      name: 'Deadline Urgency',
      score: Math.min(1, 48 / Math.max(1, hoursUntil)),
      weight: SCORING_WEIGHTS.deadlineProximity,
      description: `${Math.round(hoursUntil)} hours until deadline`,
    })
  }

  return factors
}

/**
 * Build alternative slot suggestions
 */
function buildAlternativeSlots(
  slots: ScheduleSlot[],
  task: Task
): AlternativeSlot[] {
  return slots.map(slot => ({
    start: slot.start,
    end: new Date(slot.start.getTime() + task.durationMinutes * 60000),
    score: slot.score || 0,
    reason: `Alternative at ${slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
  }))
}

/**
 * Check if scheduling would create conflicts
 */
export function detectSchedulingConflicts(
  task: Task,
  proposedStart: Date,
  proposedEnd: Date,
  context: SchedulingContext
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = []
  const startTime = dateToTime(proposedStart)
  const endTime = dateToTime(proposedEnd)

  // Check event overlaps
  for (const event of context.events) {
    const eventStart = parseTime(event.startTime)
    const eventEnd = parseTime(event.endTime)
    const taskStart = parseTime(startTime)
    const taskEnd = parseTime(endTime)

    if (taskStart < eventEnd && taskEnd > eventStart) {
      conflicts.push({
        type: 'overlap',
        severity: 'high',
        affectedItems: [task.id, event.id],
        description: `Conflicts with "${event.title}"`,
        suggestedResolution: 'Find alternative time slot or reschedule existing event',
      })
    }
  }

  // Check focus block violations
  const focusConflict = doesRangeOverlapFocusBlock(
    startTime,
    endTime,
    getFocusBlocksForDate(context.focusBlocks, context.date)
  )

  if (focusConflict && focusConflict.isProtected) {
    conflicts.push({
      type: 'focus_block_violation',
      severity: canOverrideFocusBlock(task, focusConflict) ? 'low' : 'medium',
      affectedItems: [task.id, focusConflict.id],
      description: `Would interrupt focus time "${focusConflict.title}"`,
      suggestedResolution: 'Schedule before or after focus block',
    })
  }

  // Check deadline violation
  if (task.deadline && proposedEnd > new Date(task.deadline)) {
    conflicts.push({
      type: 'deadline_violation',
      severity: 'high',
      affectedItems: [task.id],
      description: 'Task would complete after deadline',
      suggestedResolution: 'Reduce task duration or find earlier slot',
    })
  }

  // Check boundary violations
  const dayEnd = parseTime(context.dayBoundaries.dayEnd)
  const dayStart = parseTime(context.dayBoundaries.dayStart)
  const taskStartMinutes = parseTime(startTime)
  const taskEndMinutes = parseTime(endTime)

  if (taskStartMinutes < dayStart || taskEndMinutes > dayEnd) {
    conflicts.push({
      type: 'boundary_violation',
      severity: 'medium',
      affectedItems: [task.id],
      description: 'Task falls outside your active hours',
      suggestedResolution: 'Move task within your work day boundaries',
    })
  }

  return conflicts
}

/**
 * Get scheduling summary for a day
 */
export function getSchedulingSummary(context: SchedulingContext): {
  totalAvailableMinutes: number
  totalScheduledMinutes: number
  totalFocusMinutes: number
  utilization: number
  pendingTasks: number
  scheduledTasks: number
} {
  const slots = buildDaySlotMap(context)

  const totalAvailable = slots
    .filter(s => s.type === 'available')
    .reduce((sum, s) => sum + s.durationMinutes, 0)

  const totalScheduled = context.events
    .filter(e => e.type === 'task')
    .reduce((sum, e) => sum + timeDiffMinutes(e.startTime, e.endTime), 0)

  const totalFocus = slots
    .filter(s => s.type === 'focus')
    .reduce((sum, s) => sum + s.durationMinutes, 0)

  const pendingTasks = context.tasks.filter(t => t.status === 'pending').length
  const scheduledTasks = context.tasks.filter(t => t.status === 'scheduled').length

  return {
    totalAvailableMinutes: totalAvailable,
    totalScheduledMinutes: totalScheduled,
    totalFocusMinutes: totalFocus,
    utilization: totalScheduled > 0 ? (totalScheduled / (totalAvailable + totalScheduled)) * 100 : 0,
    pendingTasks,
    scheduledTasks,
  }
}

/**
 * Suggest best day for scheduling a task
 */
export function suggestBestDay(
  task: Task,
  contexts: SchedulingContext[],
  maxDaysAhead: number = 7
): { date: string; confidence: number; reason: string } | null {
  let bestDay: { date: string; confidence: number; reason: string } | null = null
  let highestScore = 0

  for (const context of contexts.slice(0, maxDaysAhead)) {
    const slots = findOptimalSlots(task, context, 1)

    if (slots.length > 0 && slots[0].score) {
      const score = slots[0].score

      // Bonus for earlier days
      const daysFromNow = Math.floor(
        (new Date(context.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      const adjustedScore = score - (daysFromNow * 2)

      if (adjustedScore > highestScore) {
        highestScore = adjustedScore
        bestDay = {
          date: context.date,
          confidence: Math.min(0.95, 0.6 + (adjustedScore / 100) * 0.35),
          reason: daysFromNow === 0
            ? 'Best slot available today'
            : `Better availability on ${new Date(context.date).toLocaleDateString('en-US', { weekday: 'long' })}`,
        }
      }
    }
  }

  return bestDay
}
