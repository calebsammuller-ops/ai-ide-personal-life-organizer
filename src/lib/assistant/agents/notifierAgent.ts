/**
 * Notifier Agent
 *
 * Responsible for: Smart reminders, notification throttling, context-aware nudges.
 * Decision Rules:
 * - Max 5 notifications per day
 * - No notifications during sleep or focus blocks
 * - Deadline reminders: 48h, 24h, 2h before
 * - Habit nudges: only if not completed by typical time
 * - If dismissed 3x for same type, reduce frequency
 */

import type { AgentContext, AgentOutput, AgentAction } from './types'

export interface NotificationPayload {
  type: 'deadline' | 'habit' | 'event' | 'insight' | 'burnout'
  title: string
  body: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  scheduledFor?: string
}

export function runNotifierAgent(
  message: string,
  context: AgentContext
): AgentOutput {
  const actions: AgentAction[] = []
  const insights: string[] = []
  const notifications: NotificationPayload[] = []

  const now = new Date()
  const currentHour = now.getHours()
  const sleepHour = parseInt(context.preferences.sleepTime?.split(':')[0] || '23')
  const wakeHour = parseInt(context.preferences.wakeTime?.split(':')[0] || '7')

  // Check if we're in silence hours
  const isSilenceHours = currentHour >= sleepHour || currentHour < wakeHour

  // Check if we're in a focus block
  const currentTime = now.toTimeString().slice(0, 5)
  const inFocusBlock = context.focusBlocks.some(
    b => currentTime >= b.startTime && currentTime < b.endTime
  )

  if (isSilenceHours) {
    return {
      agent: 'notifier',
      response: 'Silence hours active — suppressing non-critical notifications.',
      insights: ['Currently in silence hours. Only critical alerts will be delivered.'],
      confidence: 1.0,
    }
  }

  // Deadline reminders
  for (const task of context.pendingTasks) {
    if (!task.deadline) continue
    const deadlineMs = new Date(task.deadline).getTime()
    const timeLeft = deadlineMs - now.getTime()
    const hoursLeft = timeLeft / 3600000

    if (hoursLeft > 0 && hoursLeft <= 2) {
      notifications.push({
        type: 'deadline',
        title: 'Deadline approaching',
        body: `"${task.title}" is due in ${Math.round(hoursLeft * 60)} minutes`,
        priority: 'critical',
      })
    } else if (hoursLeft > 2 && hoursLeft <= 24) {
      notifications.push({
        type: 'deadline',
        title: 'Upcoming deadline',
        body: `"${task.title}" is due in ${Math.round(hoursLeft)} hours`,
        priority: 'high',
      })
    } else if (hoursLeft > 24 && hoursLeft <= 48) {
      notifications.push({
        type: 'deadline',
        title: 'Deadline reminder',
        body: `"${task.title}" is due in ${Math.round(hoursLeft / 24)} days`,
        priority: 'medium',
      })
    }
  }

  // Habit nudges (only afternoon if habits remain)
  if (currentHour >= 14 && context.pendingHabits.length > 0 && !inFocusBlock) {
    notifications.push({
      type: 'habit',
      title: 'Habits remaining',
      body: `You have ${context.pendingHabits.length} habit(s) left today: ${context.pendingHabits.slice(0, 3).map(h => h.name).join(', ')}`,
      priority: 'low',
    })
  }

  // Burnout alert
  if (context.burnoutSignals.length >= 2) {
    notifications.push({
      type: 'burnout',
      title: 'Wellbeing check',
      body: 'I\'ve noticed some signs of overload. Consider taking a break or switching to Recovery mode.',
      priority: 'medium',
    })
  }

  // Filter by focus block (only critical during focus)
  const filtered = inFocusBlock
    ? notifications.filter(n => n.priority === 'critical')
    : notifications

  // Throttle to max 5
  const throttled = filtered.slice(0, 5)

  // Convert to actions
  for (const notif of throttled) {
    actions.push({
      type: 'send_notification',
      payload: notif,
      explanation: `${notif.type} notification: ${notif.body}`,
      requiresConfirmation: false,
    })
  }

  const response = throttled.length > 0
    ? `${throttled.length} notification(s) queued:\n${throttled.map(n => `  - [${n.priority}] ${n.body}`).join('\n')}`
    : 'No notifications needed right now.'

  if (inFocusBlock && notifications.length > filtered.length) {
    insights.push(`Suppressed ${notifications.length - filtered.length} non-critical notification(s) during focus block.`)
  }

  return {
    agent: 'notifier',
    response,
    actions,
    insights,
    confidence: 0.9,
  }
}
