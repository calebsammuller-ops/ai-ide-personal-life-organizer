/**
 * Reflector Agent (formerly Analyzer)
 *
 * Responsible for: Pattern detection, outcome evaluation, assumption tracking.
 * Strict role: Evaluates what happened. Never plans or executes.
 *
 * Decision Rules:
 * - Only surface insights with >= 70% confidence (min 7 data points)
 * - Habit fatigue: completion rate < 40% over 7 days
 * - Never extrapolate from < 5 data points
 * - Identify what worked, what failed, and which assumptions were wrong
 * - Detect contradictions between stated goals and actual behavior
 */

import type { AgentContext, AgentOutput, ReflectionOutput } from './types'

export function runReflectorAgent(
  message: string,
  context: AgentContext
): AgentOutput {
  const insights: string[] = []
  const { activitySummary, burnoutSignals } = context

  const reflection: ReflectionOutput = {
    whatWorked: [],
    whatFailed: [],
    wrongAssumptions: [],
    confidenceAdjustments: [],
    contradictionsDetected: [],
  }

  const totalSignals = Object.values(activitySummary).reduce((a, b) => a + b, 0)

  // Only analyze if we have sufficient data
  if (totalSignals < 5) {
    return {
      agent: 'reflector',
      response: 'Insufficient data for reflection. Need at least 5 activity signals to detect patterns. Current count: ' + totalSignals + '.',
      insights: [],
      confidence: 0.5,
    }
  }

  // Habit fatigue detection
  const habitsCompleted = activitySummary['habit_completed'] || 0
  const habitsSkipped = activitySummary['habit_skipped'] || 0
  const totalHabitSignals = habitsCompleted + habitsSkipped

  if (totalHabitSignals >= 7) {
    const completionRate = Math.round((habitsCompleted / totalHabitSignals) * 100)

    if (completionRate < 40) {
      insights.push(
        `Habit completion rate: ${completionRate}% (${totalHabitSignals} data points). This is below the 40% threshold, indicating system failure — not willpower failure. The habit design likely has too much friction or too many active habits.`
      )
      reflection.whatFailed.push(`Habit system: ${completionRate}% completion rate across ${totalHabitSignals} signals`)
    } else if (completionRate >= 80) {
      insights.push(
        `Habit completion: ${completionRate}% over ${totalHabitSignals} data points. The current habit system is producing consistent results.`
      )
      reflection.whatWorked.push(`Habit system: ${completionRate}% completion sustained`)
    }
  }

  // Task productivity pattern
  const tasksCompleted = activitySummary['task_completed'] || 0
  const tasksRescheduled = activitySummary['task_rescheduled'] || 0
  const totalTaskSignals = tasksCompleted + tasksRescheduled

  if (totalTaskSignals >= 7) {
    const completionRate = Math.round((tasksCompleted / totalTaskSignals) * 100)
    const rescheduleRate = Math.round((tasksRescheduled / totalTaskSignals) * 100)

    if (completionRate >= 70) {
      reflection.whatWorked.push(`Task completion: ${completionRate}% rate — current planning approach is effective`)
    }

    if (rescheduleRate > 50) {
      insights.push(
        `${rescheduleRate}% of tasks rescheduled (${tasksRescheduled}/${totalTaskSignals}). Likely causes: overestimated available time, or task scope was unclear at creation. This is a planning system problem, not an effort problem.`
      )
      reflection.whatFailed.push(`Task scheduling: ${rescheduleRate}% reschedule rate suggests systematic overcommitment`)
    }

    if (tasksRescheduled > 3) {
      reflection.whatFailed.push(`${tasksRescheduled} tasks rescheduled — consistent gap between planned and actual capacity`)
    }
  }

  // Burnout signal forwarding
  if (burnoutSignals.length >= 2) {
    insights.push(
      `${burnoutSignals.length} burnout indicators detected:\n${burnoutSignals.map(s => `  - ${s}`).join('\n')}\n\nThis warrants switching to Recovery or Low Energy mode. Continuing at current intensity has a measurable cost.`
    )
  }

  // Contradiction detection: high completion + burnout = unsustainable push-through
  if (burnoutSignals.length >= 2 && totalHabitSignals >= 7) {
    const habitRate = Math.round((habitsCompleted / totalHabitSignals) * 100)
    if (habitRate >= 80) {
      insights.push(
        `CONTRADICTION: High habit completion (${habitRate}%) alongside ${burnoutSignals.length} burnout signals. This pattern suggests pushing through fatigue rather than sustainable practice. The completion rate alone is misleading — the cost is hidden in the burnout data.`
      )
      reflection.contradictionsDetected.push({
        memoryA: `habit_completion_${habitRate}`,
        memoryB: `burnout_signals_${burnoutSignals.length}`,
        description: 'High completion rate masking unsustainable effort',
      })
    }
  }

  // Event cancellation pattern
  const eventsCancelled = activitySummary['event_cancelled'] || 0
  if (eventsCancelled >= 5) {
    insights.push(
      `${eventsCancelled} events cancelled in 2 weeks. Pattern indicates over-scheduling. The scheduling system is creating commitments faster than they can be honored.`
    )
    reflection.whatFailed.push(`Event scheduling: ${eventsCancelled} cancellations indicates overcommitment`)
  }

  // AI suggestion acceptance — wrong assumption detection
  const suggestionsAccepted = activitySummary['ai_suggestion_accepted'] || 0
  const suggestionsIgnored = activitySummary['ai_suggestion_ignored'] || 0
  const totalSuggestions = suggestionsAccepted + suggestionsIgnored

  if (totalSuggestions >= 10) {
    const acceptRate = Math.round((suggestionsAccepted / totalSuggestions) * 100)
    if (acceptRate < 30) {
      insights.push(
        `WRONG ASSUMPTION: AI suggestion acceptance rate is ${acceptRate}% (${totalSuggestions} samples). The system's pattern inference is misaligned with actual priorities. Adjusting recommendation strategy.`
      )
      reflection.wrongAssumptions.push(`AI suggestions misaligned: ${acceptRate}% acceptance across ${totalSuggestions} suggestions`)
    }
  }

  const response = insights.length > 0
    ? insights.join('\n\n')
    : 'No significant patterns detected. Activity levels appear balanced based on available data.'

  return {
    agent: 'reflector',
    response,
    insights,
    confidence: totalSignals >= 20 ? 0.85 : 0.7,
    reflection,
  }
}

// Backwards compatibility alias
export const runAnalyzerAgent = runReflectorAgent
