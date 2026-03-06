/**
 * Entitlement system for feature access based on subscription
 */

import { createClient } from '@/lib/supabase/server'
import { STRIPE_CONFIG, PlanType } from './config'

export interface UserEntitlements {
  plan: PlanType
  isActive: boolean
  limits: typeof STRIPE_CONFIG.limits.free
  periodEnd?: string
}

export interface UsageCheck {
  allowed: boolean
  remaining: number
  limit: number
  message?: string
}

/**
 * Get user's current entitlements
 */
export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const supabase = createClient()

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('subscription_plan, subscription_status, subscription_period_end')
    .eq('user_id', userId)
    .single()

  // Default to free plan
  if (!prefs) {
    return {
      plan: 'free',
      isActive: true,
      limits: STRIPE_CONFIG.limits.free,
    }
  }

  const plan = (prefs.subscription_plan as PlanType) || 'free'
  const isActive = prefs.subscription_status === 'active' ||
                   prefs.subscription_status === 'trialing' ||
                   plan === 'free'

  return {
    plan: isActive ? plan : 'free',
    isActive,
    limits: STRIPE_CONFIG.limits[isActive ? plan : 'free'],
    periodEnd: prefs.subscription_period_end,
  }
}

/**
 * Check if user can perform an action based on their entitlements
 */
export async function checkFeatureAccess(
  userId: string,
  feature: keyof typeof STRIPE_CONFIG.limits.free,
  currentCount: number
): Promise<UsageCheck> {
  const entitlements = await getUserEntitlements(userId)
  const limit = entitlements.limits[feature]

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      remaining: -1,
      limit: -1,
    }
  }

  const remaining = Math.max(0, limit - currentCount)
  const allowed = currentCount < limit

  return {
    allowed,
    remaining,
    limit,
    message: allowed
      ? undefined
      : `You've reached your ${feature} limit. Upgrade to get more.`,
  }
}

/**
 * Get daily AI message count for a user
 */
export async function getAiMessageCount(userId: string): Promise<number> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { count } = await supabase
    .from('assistant_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`)

  return count || 0
}

/**
 * Check if user can send AI message
 */
export async function canSendAiMessage(userId: string): Promise<UsageCheck> {
  const count = await getAiMessageCount(userId)
  return checkFeatureAccess(userId, 'aiMessagesPerDay', count)
}

/**
 * Get habit count for a user
 */
export async function getHabitCount(userId: string): Promise<number> {
  const supabase = createClient()

  const { count } = await supabase
    .from('habits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  return count || 0
}

/**
 * Check if user can create a habit
 */
export async function canCreateHabit(userId: string): Promise<UsageCheck> {
  const count = await getHabitCount(userId)
  return checkFeatureAccess(userId, 'habitsMax', count)
}

/**
 * Get daily food scan count
 */
export async function getFoodScanCount(userId: string): Promise<number> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { count } = await supabase
    .from('food_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`)

  return count || 0
}

/**
 * Check if user can scan food
 */
export async function canScanFood(userId: string): Promise<UsageCheck> {
  const count = await getFoodScanCount(userId)
  return checkFeatureAccess(userId, 'foodScansPerDay', count)
}

/**
 * Get all usage stats for a user
 */
export async function getUsageStats(userId: string): Promise<{
  entitlements: UserEntitlements
  usage: {
    aiMessages: { used: number; limit: number }
    habits: { used: number; limit: number }
    foodScans: { used: number; limit: number }
  }
}> {
  const entitlements = await getUserEntitlements(userId)

  const [aiCount, habitCount, foodScanCount] = await Promise.all([
    getAiMessageCount(userId),
    getHabitCount(userId),
    getFoodScanCount(userId),
  ])

  return {
    entitlements,
    usage: {
      aiMessages: {
        used: aiCount,
        limit: entitlements.limits.aiMessagesPerDay,
      },
      habits: {
        used: habitCount,
        limit: entitlements.limits.habitsMax,
      },
      foodScans: {
        used: foodScanCount,
        limit: entitlements.limits.foodScansPerDay,
      },
    },
  }
}
