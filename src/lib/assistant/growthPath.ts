/**
 * Growth Path — Automatic user maturity detection.
 *
 * Determines the user's growth phase based on observable behavior:
 *   novice     → < 7 days active, learning the system
 *   builder    → 7+ days, forming habits, some streaks
 *   strategist → 30+ days, 50%+ habits, uses planning
 *   architect  → 90+ days, 70%+ habits, regular reflection + planning
 *
 * Phase detection is read-only — it observes, never gates features.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { GrowthPhase } from '@/types'

interface GrowthSignals {
  daysActive: number
  activeHabits: number
  habitCompletionRate: number
  longestStreak: number
  planningEventsUsed: boolean
  reflectionCount: number
  totalTasksCompleted: number
  focusBlocksUsed: number
}

/**
 * Detect the user's current growth phase from their activity data.
 */
export async function detectGrowthPhase(
  userId: string,
  supabase: SupabaseClient
): Promise<{ phase: GrowthPhase; signals: GrowthSignals }> {
  const signals = await gatherGrowthSignals(userId, supabase)
  const phase = classifyPhase(signals)
  return { phase, signals }
}

/**
 * Gather all signals needed for phase classification.
 */
async function gatherGrowthSignals(
  userId: string,
  supabase: SupabaseClient
): Promise<GrowthSignals> {
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    activityResult,
    habitsResult,
    completionsResult,
    tasksResult,
    focusBlocksResult,
    reflectionResult,
    planResult,
  ] = await Promise.all([
    // Days with any activity signal
    supabase
      .from('user_activity_signals')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', ninetyDaysAgo),
    // Active habits
    supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true),
    // Habit completions in last 30 days
    supabase
      .from('habit_completions')
      .select('habit_id, completed_date')
      .eq('user_id', userId)
      .gte('completed_date', thirtyDaysAgo),
    // Completed tasks
    supabase
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed'),
    // Focus blocks used
    supabase
      .from('focus_blocks')
      .select('id')
      .eq('user_id', userId),
    // Reflection usage (AI decisions from reflector agent)
    supabase
      .from('ai_decisions')
      .select('id')
      .eq('user_id', userId)
      .eq('agent', 'reflector'),
    // Daily plans generated
    supabase
      .from('daily_plans')
      .select('id')
      .eq('user_id', userId),
  ])

  // Calculate unique active days
  const uniqueDays = new Set<string>()
  for (const signal of (activityResult.data || [])) {
    const day = new Date(signal.created_at).toISOString().split('T')[0]
    uniqueDays.add(day)
  }

  // Calculate habit completion rate
  const activeHabits = (habitsResult.data || []).length
  const completions = (completionsResult.data || [])
  const expectedCompletions = activeHabits * 30
  const habitCompletionRate = expectedCompletions > 0
    ? Math.round((completions.length / expectedCompletions) * 100)
    : 0

  // Calculate longest streak from completions
  const longestStreak = calculateLongestStreak(completions)

  return {
    daysActive: uniqueDays.size,
    activeHabits,
    habitCompletionRate,
    longestStreak,
    planningEventsUsed: (planResult.data || []).length > 0 || (focusBlocksResult.data || []).length > 0,
    reflectionCount: (reflectionResult.data || []).length,
    totalTasksCompleted: (tasksResult.data || []).length,
    focusBlocksUsed: (focusBlocksResult.data || []).length,
  }
}

/**
 * Classify the growth phase based on gathered signals.
 */
function classifyPhase(signals: GrowthSignals): GrowthPhase {
  // Architect: 90+ active days, 70%+ habit rate, regular reflection + planning
  if (
    signals.daysActive >= 90 &&
    signals.habitCompletionRate >= 70 &&
    signals.reflectionCount >= 5 &&
    signals.planningEventsUsed
  ) {
    return 'architect'
  }

  // Strategist: 30+ active days, 50%+ habit rate, uses planning
  if (
    signals.daysActive >= 30 &&
    signals.habitCompletionRate >= 50 &&
    signals.planningEventsUsed
  ) {
    return 'strategist'
  }

  // Builder: 7+ active days, 3+ habits, some streaks forming
  if (
    signals.daysActive >= 7 &&
    signals.activeHabits >= 3 &&
    signals.longestStreak >= 3
  ) {
    return 'builder'
  }

  return 'novice'
}

/**
 * Calculate the longest consecutive-day streak from habit completions.
 */
function calculateLongestStreak(
  completions: { habit_id: string; completed_date: string }[]
): number {
  if (completions.length === 0) return 0

  // Group by habit, find longest streak per habit, return max
  const byHabit = new Map<string, Set<string>>()
  for (const c of completions) {
    if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, new Set())
    byHabit.get(c.habit_id)!.add(c.completed_date)
  }

  let maxStreak = 0

  for (const dates of byHabit.values()) {
    const sortedDates = [...dates].sort()
    let streak = 1

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1])
      const curr = new Date(sortedDates[i])
      const diffDays = (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)

      if (diffDays === 1) {
        streak++
      } else {
        maxStreak = Math.max(maxStreak, streak)
        streak = 1
      }
    }
    maxStreak = Math.max(maxStreak, streak)
  }

  return maxStreak
}
