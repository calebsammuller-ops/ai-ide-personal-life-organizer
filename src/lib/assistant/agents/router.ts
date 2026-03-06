/**
 * Agent Router — Intent Classification + Multi-Agent Orchestration
 *
 * Routes user messages to the appropriate sub-agent:
 * - Actionable (schedule, create, complete) → Executor Agent (intentHandler.ts)
 * - Reflective (why, how, pattern, what worked) → Reflector Agent
 * - Planning (optimize, reschedule, plan my day) → Planner Agent
 * - Notifications (remind, alert, upcoming) → Notifier Agent
 * - General conversation → Direct Claude response
 *
 * The router also logs decisions to the Decision Journal.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { runPlannerAgent } from './plannerAgent'
import { runReflectorAgent } from './analyzerAgent'
import { runNotifierAgent } from './notifierAgent'
import { getRecentSignals, getSignalSummary, detectBurnoutSignals } from '@/lib/activitySignals'
import type { AgentContext, AgentOutput, AgentType, DecisionLogEntry } from './types'

export type RouteResult =
  | { route: 'executor'; intent: string }
  | { route: 'planner' | 'analyzer' | 'notifier'; output: AgentOutput }
  | { route: 'direct' }

/**
 * Classify the user's intent and route to the appropriate agent.
 * Returns routing decision + any agent output.
 */
export function classifyIntent(message: string): {
  route: AgentType | 'direct'
  confidence: number
} {
  const lower = message.toLowerCase()

  // Planner patterns
  const plannerKeywords = [
    'plan my day', 'optimize schedule', 'reschedule', 'time block',
    'when should i', 'best time for', 'schedule conflict', 'free time',
    'reorganize', 'rebalance', 'plan my week', 'schedule overview',
  ]
  if (plannerKeywords.some(k => lower.includes(k))) {
    return { route: 'planner', confidence: 0.85 }
  }

  // Reflector patterns (evaluation, pattern analysis, outcome review)
  const reflectorKeywords = [
    'why am i', 'how am i doing', 'pattern', 'insight', 'trend',
    'productivity', 'progress', 'analyze', 'review my', 'statistics',
    'what are my', 'how have i been', 'performance', 'burnout',
    'what worked', 'what failed', 'reflect', 'what went wrong',
    'contradiction', 'assumption', 'weekly reflection', 'weekly review',
    'how was my week', 'week summary', 'growth phase',
  ]
  if (reflectorKeywords.some(k => lower.includes(k))) {
    return { route: 'reflector', confidence: 0.85 }
  }

  // Notifier patterns
  const notifierKeywords = [
    'remind me', 'notification', 'alert me', 'nudge', 'upcoming deadline',
    'what should i focus on', 'what\'s coming up', 'pending reminders',
  ]
  if (notifierKeywords.some(k => lower.includes(k))) {
    return { route: 'notifier', confidence: 0.8 }
  }

  // Executor patterns (existing intent handler handles these)
  const executorKeywords = [
    'schedule', 'create', 'complete', 'add', 'log', 'track',
    'remember', 'cancel', 'delete', 'generate', 'export', 'start timer',
    'stop timer', 'make a', 'set up',
  ]
  if (executorKeywords.some(k => lower.includes(k))) {
    return { route: 'executor', confidence: 0.8 }
  }

  return { route: 'direct', confidence: 0.6 }
}

/**
 * Build the agent context from user data and activity signals.
 */
export async function buildAgentContext(
  userId: string,
  supabase: SupabaseClient,
  userContext: {
    todayEvents: { title: string; startTime: string; endTime: string }[]
    pendingHabits: { id: string; name: string }[]
    preferences: Record<string, unknown>
  }
): Promise<AgentContext> {
  // Fetch activity signals and burnout data in parallel
  const [activitySummary, burnoutResult, focusBlocksResult, tasksResult] = await Promise.all([
    getSignalSummary(userId, supabase, 14),
    detectBurnoutSignals(userId, supabase),
    supabase
      .from('focus_blocks')
      .select('start_time, end_time, title')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('tasks')
      .select('id, title, priority, deadline, duration_minutes')
      .eq('user_id', userId)
      .in('status', ['pending', 'scheduled', 'in_progress'])
      .order('priority', { ascending: true })
      .limit(20),
  ])

  return {
    todayEvents: userContext.todayEvents.map(e => ({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
    })),
    pendingTasks: (tasksResult.data || []).map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      deadline: t.deadline,
      durationMinutes: t.duration_minutes,
    })),
    pendingHabits: userContext.pendingHabits.map(h => ({
      id: h.id,
      name: h.name,
    })),
    focusBlocks: (focusBlocksResult.data || []).map(f => ({
      startTime: f.start_time,
      endTime: f.end_time,
      title: f.title,
    })),
    preferences: {
      wakeTime: userContext.preferences.wakeTime as string,
      workStartTime: userContext.preferences.workStartTime as string,
      workEndTime: userContext.preferences.workEndTime as string,
      sleepTime: userContext.preferences.sleepTime as string,
      lifeMode: (userContext.preferences as Record<string, unknown>).lifeMode as string,
      autonomyLevel: (userContext.preferences as Record<string, unknown>).autonomyLevel as number,
      truthMode: (userContext.preferences as Record<string, unknown>).truthMode as string,
      activePersona: (userContext.preferences as Record<string, unknown>).activePersona as string,
      growthPhase: (userContext.preferences as Record<string, unknown>).growthPhase as string,
    },
    activitySummary,
    burnoutSignals: burnoutResult.signals,
  }
}

/**
 * Run the appropriate agent and return its output.
 */
export function runAgent(
  agentType: AgentType,
  message: string,
  context: AgentContext
): AgentOutput | null {
  switch (agentType) {
    case 'planner':
      return runPlannerAgent(message, context)
    case 'reflector':
    case 'analyzer': // backwards compat
      return runReflectorAgent(message, context)
    case 'notifier':
      return runNotifierAgent(message, context)
    case 'executor':
      // Executor is handled by intentHandler.ts in the main route
      return null
    default:
      return null
  }
}

/**
 * Log an AI decision to the decision journal.
 */
export async function logDecision(
  userId: string,
  entry: DecisionLogEntry,
  supabase: SupabaseClient
): Promise<void> {
  try {
    await supabase.from('ai_decisions').insert({
      user_id: userId,
      action: entry.action,
      reason: entry.reason,
      agent: entry.agent,
      data_used: entry.dataUsed,
      confidence: entry.confidence,
      undo_instructions: entry.undoInstructions,
    })
  } catch (error) {
    console.error('[Router] Failed to log decision:', error)
  }
}
