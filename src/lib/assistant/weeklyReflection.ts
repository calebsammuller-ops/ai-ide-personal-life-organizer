/**
 * Weekly Strategic Reflection
 *
 * Non-optional weekly cycle that generates a structured reflection:
 * - What was planned vs what actually happened
 * - Patterns that emerged
 * - Contradictions between goals and actions
 * - System-level recommendations
 * - Growth phase assessment
 *
 * This runs server-side and stores results in the weekly_reflections table.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { detectGrowthPhase } from './growthPath'
import type { WeeklyReflection } from '@/types'

/**
 * Generate a weekly reflection for the given user.
 * Covers the 7-day window ending at the provided date (or today).
 */
export async function generateWeeklyReflection(
  userId: string,
  supabase: SupabaseClient,
  endDate?: string
): Promise<WeeklyReflection> {
  const end = endDate ? new Date(endDate) : new Date()
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekStart = start.toISOString().split('T')[0]
  const weekEnd = end.toISOString().split('T')[0]

  // Gather week data in parallel
  const [
    tasksResult,
    habitsResult,
    completionsResult,
    eventsResult,
    focusResult,
    signalsResult,
  ] = await Promise.all([
    // Tasks completed vs deferred this week
    supabase
      .from('tasks')
      .select('id, status, title')
      .eq('user_id', userId)
      .gte('updated_at', start.toISOString())
      .lte('updated_at', end.toISOString()),
    // Active habits
    supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true),
    // Habit completions this week
    supabase
      .from('habit_completions')
      .select('habit_id, completed_date')
      .eq('user_id', userId)
      .gte('completed_date', weekStart)
      .lte('completed_date', weekEnd),
    // Calendar events this week
    supabase
      .from('calendar_events')
      .select('id, title, status')
      .eq('user_id', userId)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString()),
    // Focus blocks used
    supabase
      .from('focus_blocks')
      .select('id')
      .eq('user_id', userId)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString()),
    // Activity signals for pattern detection
    supabase
      .from('user_activity_signals')
      .select('signal_type, metadata')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
  ])

  const tasks = tasksResult.data || []
  const tasksCompleted = tasks.filter(t => t.status === 'completed').length
  const tasksDeferred = tasks.filter(t => t.status === 'pending' || t.status === 'scheduled').length

  const activeHabits = habitsResult.data || []
  const completions = completionsResult.data || []
  const expectedCompletions = activeHabits.length * 7
  const habitsCompletionRate = expectedCompletions > 0
    ? Math.round((completions.length / expectedCompletions) * 100)
    : 0

  const events = eventsResult.data || []
  const eventsAttended = events.filter(e => e.status !== 'cancelled').length
  const eventsCancelled = events.filter(e => e.status === 'cancelled').length

  const focusBlocksUsed = (focusResult.data || []).length

  // Calculate top streaks
  const topStreaks = calculateWeekStreaks(activeHabits, completions)

  // Generate insights
  const insights = generateInsights({
    tasksCompleted,
    tasksDeferred,
    habitsCompletionRate,
    eventsAttended,
    eventsCancelled,
    focusBlocksUsed,
    signals: signalsResult.data || [],
  })

  // Detect contradictions
  const contradictions = detectContradictions({
    tasksCompleted,
    tasksDeferred,
    habitsCompletionRate,
    eventsCancelled,
    signals: signalsResult.data || [],
  })

  // Generate system recommendations
  const systemRecommendations = generateRecommendations({
    tasksCompleted,
    tasksDeferred,
    habitsCompletionRate,
    eventsCancelled,
    focusBlocksUsed,
  })

  // Get growth phase
  const { phase } = await detectGrowthPhase(userId, supabase)

  const reflection: WeeklyReflection = {
    id: crypto.randomUUID(),
    userId,
    weekStart,
    weekEnd,
    summary: {
      tasksCompleted,
      tasksDeferred,
      habitsCompletionRate,
      eventsAttended,
      eventsCancelled,
      focusBlocksUsed,
      topStreaks,
    },
    insights,
    contradictions,
    systemRecommendations,
    growthPhase: phase,
    createdAt: new Date().toISOString(),
  }

  // Store the reflection
  await supabase.from('weekly_reflections').insert({
    user_id: userId,
    week_start: weekStart,
    week_end: weekEnd,
    summary: reflection.summary,
    insights: reflection.insights,
    contradictions: reflection.contradictions,
    system_recommendations: reflection.systemRecommendations,
    growth_phase: reflection.growthPhase,
  })

  return reflection
}

/**
 * Get the most recent weekly reflection for a user.
 */
export async function getLatestReflection(
  userId: string,
  supabase: SupabaseClient
): Promise<WeeklyReflection | null> {
  const { data } = await supabase
    .from('weekly_reflections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return {
    id: data.id,
    userId: data.user_id,
    weekStart: data.week_start,
    weekEnd: data.week_end,
    summary: data.summary,
    insights: data.insights,
    contradictions: data.contradictions,
    systemRecommendations: data.system_recommendations,
    growthPhase: data.growth_phase,
    createdAt: data.created_at,
  }
}

function calculateWeekStreaks(
  habits: { id: string; name: string }[],
  completions: { habit_id: string; completed_date: string }[]
): { name: string; days: number }[] {
  const streaks: { name: string; days: number }[] = []

  for (const habit of habits) {
    const habitDates = new Set(
      completions
        .filter(c => c.habit_id === habit.id)
        .map(c => c.completed_date)
    )

    if (habitDates.size >= 3) {
      streaks.push({ name: habit.name, days: habitDates.size })
    }
  }

  return streaks.sort((a, b) => b.days - a.days).slice(0, 5)
}

function generateInsights(data: {
  tasksCompleted: number
  tasksDeferred: number
  habitsCompletionRate: number
  eventsAttended: number
  eventsCancelled: number
  focusBlocksUsed: number
  signals: { signal_type: string; metadata: unknown }[]
}): string[] {
  const insights: string[] = []

  // Task throughput
  const totalTasks = data.tasksCompleted + data.tasksDeferred
  if (totalTasks > 0) {
    const completionRate = Math.round((data.tasksCompleted / totalTasks) * 100)
    if (completionRate >= 80) {
      insights.push(`Strong task throughput: ${completionRate}% completion rate (${data.tasksCompleted}/${totalTasks}).`)
    } else if (completionRate < 50) {
      insights.push(`Low task completion: ${completionRate}% (${data.tasksCompleted}/${totalTasks}). This suggests overcommitment or unclear task scoping.`)
    }
  }

  // Habit consistency
  if (data.habitsCompletionRate >= 80) {
    insights.push(`Habit system operating well: ${data.habitsCompletionRate}% completion rate this week.`)
  } else if (data.habitsCompletionRate < 40 && data.habitsCompletionRate > 0) {
    insights.push(`Habit completion at ${data.habitsCompletionRate}%. Below 40% indicates system friction, not motivation failure. Consider reducing active habits or simplifying triggers.`)
  }

  // Focus block utilization
  if (data.focusBlocksUsed === 0) {
    insights.push('No focus blocks used this week. Protected deep work time consistently predicts higher task completion rates.')
  } else if (data.focusBlocksUsed >= 5) {
    insights.push(`${data.focusBlocksUsed} focus blocks used. Strong deep work discipline.`)
  }

  // Event cancellations
  if (data.eventsCancelled > 3) {
    insights.push(`${data.eventsCancelled} events cancelled. Possible over-scheduling pattern.`)
  }

  return insights
}

function detectContradictions(data: {
  tasksCompleted: number
  tasksDeferred: number
  habitsCompletionRate: number
  eventsCancelled: number
  signals: { signal_type: string; metadata: unknown }[]
}): string[] {
  const contradictions: string[] = []

  // High task completion but many event cancellations
  const totalTasks = data.tasksCompleted + data.tasksDeferred
  if (totalTasks > 0) {
    const taskRate = (data.tasksCompleted / totalTasks) * 100
    if (taskRate >= 80 && data.eventsCancelled >= 3) {
      contradictions.push(
        `High task completion (${Math.round(taskRate)}%) alongside ${data.eventsCancelled} cancelled events. Tasks may be prioritized at the cost of commitments to others.`
      )
    }
  }

  // High habits but low task completion
  if (data.habitsCompletionRate >= 70 && totalTasks > 0) {
    const taskRate = (data.tasksCompleted / totalTasks) * 100
    if (taskRate < 40) {
      contradictions.push(
        `Habits at ${data.habitsCompletionRate}% but tasks at ${Math.round(taskRate)}%. Routine maintenance is working, but project-level execution is not. This may indicate avoidance of harder, less structured work.`
      )
    }
  }

  return contradictions
}

function generateRecommendations(data: {
  tasksCompleted: number
  tasksDeferred: number
  habitsCompletionRate: number
  eventsCancelled: number
  focusBlocksUsed: number
}): string[] {
  const recommendations: string[] = []

  const totalTasks = data.tasksCompleted + data.tasksDeferred
  if (totalTasks > 0 && data.tasksDeferred > data.tasksCompleted) {
    recommendations.push('Reduce weekly task load by 30%. Current capacity is consistently below planned volume.')
  }

  if (data.habitsCompletionRate < 40 && data.habitsCompletionRate > 0) {
    recommendations.push('Deactivate 1-2 lowest-impact habits. Focus on the 2-3 that drive the most compounding value.')
  }

  if (data.focusBlocksUsed === 0) {
    recommendations.push('Schedule at least 2 focus blocks next week. Even 60-minute blocks significantly improve deep work output.')
  }

  if (data.eventsCancelled > 3) {
    recommendations.push('Add 15-minute buffers between events and cap commitments at realistic levels.')
  }

  return recommendations
}
