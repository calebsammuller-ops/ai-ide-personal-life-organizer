/**
 * Feature Flags + Kill Switch System
 *
 * Server-side feature flag checks with 5-minute cache.
 * Kill switches can be activated from Supabase dashboard.
 */

import { createClient } from '@/lib/supabase/server'

interface FeatureFlag {
  name: string
  enabled: boolean
  rolloutPercentage: number
  planRequired: string | null
  killSwitch: boolean
}

// In-memory cache with 5-minute TTL
let flagCache: Map<string, FeatureFlag> = new Map()
let cacheTimestamp = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function loadFlags(): Promise<Map<string, FeatureFlag>> {
  const now = Date.now()
  if (flagCache.size > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return flagCache
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')

    if (error || !data) {
      console.error('[FeatureFlags] Failed to load flags:', error?.message)
      return flagCache // Return stale cache on error
    }

    const newCache = new Map<string, FeatureFlag>()
    for (const flag of data) {
      newCache.set(flag.name, {
        name: flag.name,
        enabled: flag.enabled,
        rolloutPercentage: flag.rollout_percentage,
        planRequired: flag.plan_required,
        killSwitch: flag.kill_switch,
      })
    }

    flagCache = newCache
    cacheTimestamp = now
    return flagCache
  } catch {
    console.error('[FeatureFlags] Exception loading flags')
    return flagCache
  }
}

/**
 * Check if a feature is enabled for a given user.
 * Returns false if kill switch is active or feature is disabled.
 */
export async function checkFeatureFlag(
  featureName: string,
  userId?: string,
  userPlan?: string
): Promise<{ enabled: boolean; reason?: string }> {
  const flags = await loadFlags()
  const flag = flags.get(featureName)

  // Unknown flag = enabled by default (fail open for unregistered features)
  if (!flag) {
    return { enabled: true }
  }

  // Kill switch overrides everything
  if (flag.killSwitch) {
    return { enabled: false, reason: `${featureName} is temporarily unavailable` }
  }

  // Global disable
  if (!flag.enabled) {
    return { enabled: false, reason: `${featureName} is currently disabled` }
  }

  // Plan requirement check
  if (flag.planRequired && userPlan) {
    const planHierarchy: Record<string, number> = { free: 0, pro: 1, premium: 2 }
    const userLevel = planHierarchy[userPlan] ?? 0
    const requiredLevel = planHierarchy[flag.planRequired] ?? 0

    if (userLevel < requiredLevel) {
      return {
        enabled: false,
        reason: `${featureName} requires a ${flag.planRequired} plan`,
      }
    }
  }

  // Rollout percentage (deterministic based on userId hash)
  if (flag.rolloutPercentage < 100 && userId) {
    const hash = simpleHash(userId + featureName)
    const bucket = hash % 100
    if (bucket >= flag.rolloutPercentage) {
      return { enabled: false, reason: 'Feature not yet available for your account' }
    }
  }

  return { enabled: true }
}

/**
 * Get all feature flags (for admin/debug purposes)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const flags = await loadFlags()
  return Array.from(flags.values())
}

/**
 * Invalidate the flag cache (call after flag updates)
 */
export function invalidateFlagCache(): void {
  cacheTimestamp = 0
}

// Simple deterministic hash for rollout bucketing
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}
