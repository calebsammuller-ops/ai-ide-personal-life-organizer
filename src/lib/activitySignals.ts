/**
 * Activity Signals — Short-Term Memory Layer
 *
 * Tracks behavioral signals with a 14-day rolling window.
 * Used by the AI to detect patterns without long-term storage.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type SignalType =
  | 'habit_completed'
  | 'habit_skipped'
  | 'task_completed'
  | 'task_rescheduled'
  | 'task_created'
  | 'event_cancelled'
  | 'event_created'
  | 'focus_block_used'
  | 'late_night_activity'
  | 'ai_suggestion_accepted'
  | 'ai_suggestion_ignored'
  | 'mood_logged'
  | 'burnout_signal'

export interface ActivitySignal {
  id: string
  userId: string
  signalType: SignalType
  signalData: Record<string, unknown>
  createdAt: string
  expiresAt: string
}

/**
 * Record a behavioral signal
 */
export async function recordSignal(
  userId: string,
  signalType: SignalType,
  signalData: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<void> {
  try {
    await supabase.from('user_activity_signals').insert({
      user_id: userId,
      signal_type: signalType,
      signal_data: signalData,
    })
  } catch (error) {
    console.error('[ActivitySignals] Failed to record signal:', error)
  }
}

/**
 * Get recent signals for a user (last N days)
 */
export async function getRecentSignals(
  userId: string,
  supabase: SupabaseClient,
  days: number = 14,
  signalType?: SignalType
): Promise<ActivitySignal[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('user_activity_signals')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (signalType) {
    query = query.eq('signal_type', signalType)
  }

  const { data, error } = await query.limit(200)

  if (error) {
    console.error('[ActivitySignals] Failed to fetch signals:', error)
    return []
  }

  return (data || []).map(s => ({
    id: s.id,
    userId: s.user_id,
    signalType: s.signal_type as SignalType,
    signalData: s.signal_data || {},
    createdAt: s.created_at,
    expiresAt: s.expires_at,
  }))
}

/**
 * Get signal counts grouped by type (for pattern analysis)
 */
export async function getSignalSummary(
  userId: string,
  supabase: SupabaseClient,
  days: number = 14
): Promise<Record<string, number>> {
  const signals = await getRecentSignals(userId, supabase, days)
  const summary: Record<string, number> = {}

  for (const signal of signals) {
    summary[signal.signalType] = (summary[signal.signalType] || 0) + 1
  }

  return summary
}

/**
 * Detect burnout signals from recent activity
 */
export async function detectBurnoutSignals(
  userId: string,
  supabase: SupabaseClient
): Promise<{ signals: string[]; severity: 'none' | 'mild' | 'moderate' | 'high' }> {
  const summary = await getSignalSummary(userId, supabase, 7)
  const signals: string[] = []

  // Check for task overload
  if ((summary['task_created'] || 0) > 40) {
    signals.push('High task creation rate (>40 tasks in 7 days)')
  }

  // Check for frequent rescheduling
  if ((summary['task_rescheduled'] || 0) > 10) {
    signals.push('Frequent task rescheduling (>10 times in 7 days)')
  }

  // Check for habit decay
  const habitsCompleted = summary['habit_completed'] || 0
  const habitsSkipped = summary['habit_skipped'] || 0
  if (habitsSkipped > habitsCompleted && habitsSkipped > 5) {
    signals.push('Habit completion declining — more skips than completions')
  }

  // Check for late-night activity
  if ((summary['late_night_activity'] || 0) > 3) {
    signals.push('Frequent late-night activity (>3 times in 7 days)')
  }

  // Check for event cancellations
  if ((summary['event_cancelled'] || 0) > 5) {
    signals.push('Frequent event cancellations')
  }

  const severity = signals.length === 0
    ? 'none'
    : signals.length <= 1
    ? 'mild'
    : signals.length <= 2
    ? 'moderate'
    : 'high'

  return { signals, severity }
}

/**
 * Clean up expired signals (call periodically)
 */
export async function cleanExpiredSignals(
  supabase: SupabaseClient
): Promise<number> {
  const { data, error } = await supabase
    .from('user_activity_signals')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('[ActivitySignals] Failed to clean expired signals:', error)
    return 0
  }

  return data?.length || 0
}
