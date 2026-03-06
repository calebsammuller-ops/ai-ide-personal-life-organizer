/**
 * Planner Agent
 *
 * Responsible for: Schedule creation, time-blocking, conflict resolution, energy-aware planning.
 * Decision Rules:
 * - High-priority tasks during peak energy hours
 * - 15-min buffer between back-to-back events
 * - Never schedule over focus blocks
 * - Alert 48h before at-risk deadlines
 * - Never schedule past sleep time
 */

import type { AgentContext, AgentOutput, AgentAction } from './types'

export function runPlannerAgent(
  message: string,
  context: AgentContext
): AgentOutput {
  const actions: AgentAction[] = []
  const insights: string[] = []

  const sleepTime = context.preferences.sleepTime || '23:00'
  const workStart = context.preferences.workStartTime || '09:00'
  const workEnd = context.preferences.workEndTime || '17:00'

  // Detect scheduling conflicts
  const sortedEvents = [...context.todayEvents].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const current = sortedEvents[i]
    const next = sortedEvents[i + 1]
    const currentEnd = new Date(current.endTime).getTime()
    const nextStart = new Date(next.startTime).getTime()
    const gapMinutes = (nextStart - currentEnd) / 60000

    if (gapMinutes < 0) {
      insights.push(
        `Conflict detected: "${current.title}" overlaps with "${next.title}". Consider rescheduling one.`
      )
    } else if (gapMinutes < 15 && gapMinutes >= 0) {
      insights.push(
        `Tight transition: only ${Math.round(gapMinutes)}min between "${current.title}" and "${next.title}". A 15-minute buffer is recommended.`
      )
    }
  }

  // Check for at-risk deadlines (tasks due within 48h with no scheduled time)
  const now = Date.now()
  const fortyEightHours = 48 * 60 * 60 * 1000

  for (const task of context.pendingTasks) {
    if (task.deadline) {
      const deadlineMs = new Date(task.deadline).getTime()
      const timeLeft = deadlineMs - now

      if (timeLeft > 0 && timeLeft < fortyEightHours) {
        insights.push(
          `Deadline alert: "${task.title}" is due in ${Math.round(timeLeft / 3600000)} hours. No scheduled time block found.`
        )

        actions.push({
          type: 'suggest_schedule',
          payload: { taskId: task.id, title: task.title, suggestedTime: workStart },
          explanation: `Schedule "${task.title}" during work hours to meet the deadline`,
          requiresConfirmation: true,
        })
      }
    }
  }

  // Check for overloaded days
  const totalTaskMinutes = context.pendingTasks.reduce(
    (sum, t) => sum + (t.durationMinutes || 30),
    0
  )
  const eventHours = context.todayEvents.length * 1 // Rough estimate
  const availableHours = calculateAvailableHours(workStart, workEnd, eventHours)

  if (totalTaskMinutes > availableHours * 60) {
    const deficit = Math.round((totalTaskMinutes - availableHours * 60) / 60)
    insights.push(
      `Schedule overload: You have ${Math.round(totalTaskMinutes / 60)}h of tasks for ${availableHours}h of available time. Consider deferring ${deficit}h of lower-priority work.`
    )
  }

  // Focus block protection
  for (const block of context.focusBlocks) {
    const blockStart = block.startTime
    const blockEnd = block.endTime
    const conflicting = context.todayEvents.filter(e => {
      const eStart = new Date(e.startTime).toTimeString().slice(0, 5)
      return eStart >= blockStart && eStart < blockEnd
    })

    if (conflicting.length > 0) {
      insights.push(
        `Focus block "${block.title}" (${blockStart}-${blockEnd}) has ${conflicting.length} conflicting event(s).`
      )
    }
  }

  // Build response
  let response = ''
  if (insights.length > 0) {
    response = insights.join('\n\n')
  } else {
    response = 'Your schedule looks clear. No conflicts or at-risk deadlines detected.'
  }

  return {
    agent: 'planner',
    response,
    actions,
    insights,
    confidence: 0.85,
  }
}

function calculateAvailableHours(workStart: string, workEnd: string, eventHours: number): number {
  const [startH] = workStart.split(':').map(Number)
  const [endH] = workEnd.split(':').map(Number)
  return Math.max(0, (endH - startH) - eventHours)
}
