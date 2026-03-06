/**
 * Motion Agent Type Definitions
 *
 * Strict types for the event → animation specification pipeline.
 * Motion exists to communicate system state, intent, and consequence.
 * If an animation does not clarify what changed, why, or what it affects — it must not exist.
 */

// ─── System Events ───────────────────────────────────

export type MotionEventType =
  | 'task_completed'
  | 'task_rescheduled'
  | 'task_created'
  | 'planning_start'
  | 'planning_complete'
  | 'truth_delivery'
  | 'habit_completed'
  | 'habit_adjusted'
  | 'habit_skipped'
  | 'missed_goal'
  | 'focus_block_started'
  | 'focus_block_ended'
  | 'event_created'
  | 'event_cancelled'
  | 'mode_changed'
  | 'notification_received'
  | 'reflection_delivered'
  | 'thought_captured'
  | 'page_transition'
  | 'assistant_thinking'
  | 'assistant_response'

export type Severity = 'low' | 'medium' | 'high'

export interface MotionEvent {
  type: MotionEventType
  affectedEntities: string[]
  previousState?: string
  newState?: string
  severity: Severity
  cognitiveLoad: 'low' | 'medium' | 'high'
  metadata?: Record<string, unknown>
}

// ─── Animation Specs ─────────────────────────────────

export type AnimationCategory =
  | 'structural'
  | 'state_change'
  | 'intent'
  | 'consequence'
  | 'stillness'

export type Easing = 'easeOutCubic' | 'linear'

export type AvatarState = 'neutral' | 'attentive' | 'focused' | 'concerned' | 'still'

export interface AnimationProperties {
  opacity?: [number, number]
  scale?: [number, number]
  translateX?: [number, number]
  translateY?: [number, number]
}

export interface AnimationSpec {
  properties: AnimationProperties
  duration_ms: number
  easing: Easing
  delay_ms: number
}

export interface MotionSpec {
  event: MotionEventType
  category: AnimationCategory
  ui_targets: string[]
  animation: AnimationSpec
  avatar_state: AvatarState
  notes?: string
}

// ─── Duration Constraints ────────────────────────────

export const DURATION = {
  micro: { min: 120, max: 180, default: 150 },
  standard: { min: 240, max: 320, default: 280 },
  heavy: { min: 400, max: 600, default: 500 },
} as const

// ─── Easing curves for Framer Motion ─────────────────

export const EASING_CURVES = {
  easeOutCubic: [0.33, 1, 0.68, 1] as [number, number, number, number],
  linear: [0, 0, 1, 1] as [number, number, number, number],
} as const
