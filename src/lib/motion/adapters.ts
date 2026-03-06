/**
 * Motion Adapters — Convert MotionSpec to framework-specific animation props.
 * Currently supports Framer Motion.
 */

import type { MotionSpec, AnimationSpec } from './types'
import { EASING_CURVES } from './types'

/**
 * Convert a MotionSpec's animation properties to Framer Motion `animate` props.
 */
export function toFramerMotion(spec: MotionSpec): {
  initial: Record<string, number>
  animate: Record<string, number>
} {
  const initial: Record<string, number> = {}
  const animate: Record<string, number> = {}
  const props = spec.animation.properties

  if (props.opacity) {
    initial.opacity = props.opacity[0]
    animate.opacity = props.opacity[1]
  }
  if (props.scale) {
    initial.scale = props.scale[0]
    animate.scale = props.scale[1]
  }
  if (props.translateX) {
    initial.x = props.translateX[0]
    animate.x = props.translateX[1]
  }
  if (props.translateY) {
    initial.y = props.translateY[0]
    animate.y = props.translateY[1]
  }

  return { initial, animate }
}

/**
 * Convert a MotionSpec's timing to Framer Motion `transition` props.
 */
export function toFramerTransition(spec: AnimationSpec): {
  duration: number
  ease: [number, number, number, number]
  delay: number
} {
  return {
    duration: spec.duration_ms / 1000,
    ease: EASING_CURVES[spec.easing],
    delay: spec.delay_ms / 1000,
  }
}
