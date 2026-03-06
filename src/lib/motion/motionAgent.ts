/**
 * Motion Agent — Event → Animation Specification Engine
 *
 * Sole responsibility: translate system events into precise animation specs.
 * Does not reason about goals, habits, or strategy.
 * Does not speak to the user.
 * Does not invent behavior.
 *
 * If an animation does not clarify what changed, why, or what it affects — it is omitted.
 */

import type {
  MotionEvent,
  MotionSpec,
  AnimationCategory,
  AvatarState,
  AnimationProperties,
  Easing,
  Severity,
} from './types'
import { DURATION } from './types'

/**
 * Core function: resolve a system event into an animation specification.
 * Returns null if the event does not warrant animation.
 */
export function resolveMotion(event: MotionEvent): MotionSpec | null {
  const handler = EVENT_HANDLERS[event.type]
  if (!handler) return null

  const spec = handler(event)

  // Validate: if animation adds cognitive load during high-load moments, suppress
  if (event.cognitiveLoad === 'high' && spec.category !== 'stillness') {
    return {
      ...spec,
      animation: {
        properties: { opacity: [1.0, 0.95] },
        duration_ms: DURATION.heavy.default,
        easing: 'linear',
        delay_ms: 0,
      },
      avatar_state: 'still',
      notes: 'Suppressed to reduce cognitive load',
    }
  }

  return spec
}

/**
 * Resolve duration based on severity.
 */
function durationForSeverity(severity: Severity): number {
  switch (severity) {
    case 'low': return DURATION.micro.default
    case 'medium': return DURATION.standard.default
    case 'high': return DURATION.heavy.default
  }
}

// ─── Event Handlers ──────────────────────────────────

type EventHandler = (event: MotionEvent) => MotionSpec

const EVENT_HANDLERS: Record<string, EventHandler> = {

  // ── Task Events ────────────────────────────────────

  task_completed: (event) => ({
    event: 'task_completed',
    category: 'state_change',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        scale: [1.0, 0.96],
        opacity: [1.0, 0.0],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'attentive',
  }),

  task_rescheduled: (event) => ({
    event: 'task_rescheduled',
    category: 'consequence',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        translateX: [0, 8],
        opacity: [1.0, 0.85],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: event.severity === 'high' ? 'concerned' : 'attentive',
    notes: 'Lateral shift communicates temporal displacement',
  }),

  task_created: (event) => ({
    event: 'task_created',
    category: 'structural',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        opacity: [0.0, 1.0],
        translateY: [8, 0],
        scale: [0.96, 1.0],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'attentive',
  }),

  // ── Planning Events ────────────────────────────────

  planning_start: (event) => ({
    event: 'planning_start',
    category: 'intent',
    ui_targets: event.affectedEntities.length > 0 ? event.affectedEntities : ['main_canvas'],
    animation: {
      properties: {
        opacity: [1.0, 0.92],
      },
      duration_ms: DURATION.heavy.default,
      easing: 'linear',
      delay_ms: 0,
    },
    avatar_state: 'focused',
    notes: 'Subtle dimming signals system is thinking. Linear easing for planning states.',
  }),

  planning_complete: (event) => ({
    event: 'planning_complete',
    category: 'state_change',
    ui_targets: event.affectedEntities.length > 0 ? event.affectedEntities : ['main_canvas'],
    animation: {
      properties: {
        opacity: [0.92, 1.0],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'attentive',
  }),

  // ── Truth & Reflection Events ──────────────────────

  truth_delivery: () => ({
    event: 'truth_delivery',
    category: 'stillness',
    ui_targets: ['main_canvas', 'sidebar'],
    animation: {
      properties: {
        opacity: [1.0, 0.9],
      },
      duration_ms: DURATION.heavy.default,
      easing: 'linear',
      delay_ms: 0,
    },
    avatar_state: 'still',
    notes: 'Stillness during truth. Reduced opacity creates focus. No distraction.',
  }),

  reflection_delivered: (event) => ({
    event: 'reflection_delivered',
    category: 'stillness',
    ui_targets: event.affectedEntities.length > 0 ? event.affectedEntities : ['assistant_panel'],
    animation: {
      properties: {
        opacity: [0.85, 1.0],
      },
      duration_ms: DURATION.heavy.default,
      easing: 'easeOutCubic',
      delay_ms: 200,
    },
    avatar_state: 'still',
    notes: 'Reflection appears slowly. Delay allows stillness before delivery.',
  }),

  // ── Habit Events ───────────────────────────────────

  habit_completed: (event) => ({
    event: 'habit_completed',
    category: 'state_change',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        scale: [1.0, 0.98],
        opacity: [1.0, 0.85],
      },
      duration_ms: DURATION.micro.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'attentive',
  }),

  habit_adjusted: (event) => ({
    event: 'habit_adjusted',
    category: 'consequence',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        translateY: [0, -4],
        opacity: [0.85, 1.0],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: event.severity === 'high' ? 'concerned' : 'attentive',
    notes: 'Upward shift signals adjustment/change in the habit',
  }),

  habit_skipped: (event) => ({
    event: 'habit_skipped',
    category: 'consequence',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        opacity: [1.0, 0.6],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: event.severity === 'high' ? 'concerned' : 'neutral',
    notes: 'Fade communicates disengagement without judgment',
  }),

  missed_goal: (event) => ({
    event: 'missed_goal',
    category: 'consequence',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        opacity: [1.0, 0.85],
        scale: [1.0, 0.98],
      },
      duration_ms: DURATION.heavy.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'concerned',
    notes: 'Slow, subtle contraction. No dramatic animation — this is a serious moment.',
  }),

  // ── Focus Block Events ─────────────────────────────

  focus_block_started: (event) => ({
    event: 'focus_block_started',
    category: 'state_change',
    ui_targets: event.affectedEntities.length > 0 ? event.affectedEntities : ['main_canvas'],
    animation: {
      properties: {
        opacity: [1.0, 0.95],
      },
      duration_ms: DURATION.heavy.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'focused',
    notes: 'Slight dimming of non-focus elements. System enters protected state.',
  }),

  focus_block_ended: (event) => ({
    event: 'focus_block_ended',
    category: 'state_change',
    ui_targets: event.affectedEntities.length > 0 ? event.affectedEntities : ['main_canvas'],
    animation: {
      properties: {
        opacity: [0.95, 1.0],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'neutral',
  }),

  // ── Calendar Events ────────────────────────────────

  event_created: (event) => ({
    event: 'event_created',
    category: 'structural',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        opacity: [0.0, 1.0],
        scale: [0.96, 1.0],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'attentive',
  }),

  event_cancelled: (event) => ({
    event: 'event_cancelled',
    category: 'state_change',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        opacity: [1.0, 0.0],
        scale: [1.0, 0.96],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'neutral',
  }),

  // ── System Mode Events ─────────────────────────────

  mode_changed: (event) => ({
    event: 'mode_changed',
    category: 'structural',
    ui_targets: ['main_canvas'],
    animation: {
      properties: {
        opacity: [0.85, 1.0],
      },
      duration_ms: DURATION.heavy.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'attentive',
    notes: `Mode transition: ${event.previousState} → ${event.newState}`,
  }),

  // ── Notification Events ────────────────────────────

  notification_received: (event) => ({
    event: 'notification_received',
    category: 'intent',
    ui_targets: event.affectedEntities.length > 0 ? event.affectedEntities : ['notification_badge'],
    animation: {
      properties: {
        scale: [0.96, 1.0],
        opacity: [0.0, 1.0],
      },
      duration_ms: durationForSeverity(event.severity),
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: event.severity === 'high' ? 'concerned' : 'attentive',
  }),

  // ── Thought Events ─────────────────────────────────

  thought_captured: (event) => ({
    event: 'thought_captured',
    category: 'structural',
    ui_targets: event.affectedEntities,
    animation: {
      properties: {
        opacity: [0.0, 1.0],
        translateY: [8, 0],
      },
      duration_ms: DURATION.micro.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'attentive',
  }),

  // ── Page / Navigation Events ───────────────────────

  page_transition: () => ({
    event: 'page_transition',
    category: 'structural',
    ui_targets: ['page_content'],
    animation: {
      properties: {
        opacity: [0.0, 1.0],
        translateY: [4, 0],
      },
      duration_ms: DURATION.micro.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'neutral',
  }),

  // ── Assistant Events ───────────────────────────────

  assistant_thinking: () => ({
    event: 'assistant_thinking',
    category: 'intent',
    ui_targets: ['assistant_panel', 'floating_bubble'],
    animation: {
      properties: {
        opacity: [1.0, 0.92],
      },
      duration_ms: DURATION.heavy.default,
      easing: 'linear',
      delay_ms: 0,
    },
    avatar_state: 'focused',
    notes: 'Linear easing for thinking states. Communicates active processing.',
  }),

  assistant_response: (event) => ({
    event: 'assistant_response',
    category: 'state_change',
    ui_targets: event.affectedEntities.length > 0 ? event.affectedEntities : ['assistant_panel'],
    animation: {
      properties: {
        opacity: [0.85, 1.0],
        translateY: [4, 0],
      },
      duration_ms: DURATION.standard.default,
      easing: 'easeOutCubic',
      delay_ms: 0,
    },
    avatar_state: 'attentive',
  }),
}
