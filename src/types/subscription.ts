/**
 * Subscription Types for Commercial Features
 * Simplified 2-tier system: Free + LockIN (stored as 'pro')
 */

// Keep 'pro' for database compatibility, 'lockin' as alias
export type SubscriptionTier = 'free' | 'pro' | 'lockin'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
export type BillingPeriod = 'monthly' | 'yearly'

export interface UserSubscription {
  id: string
  userId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  billingPeriod?: BillingPeriod
  currentPeriodStart?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd: boolean
  trialStart?: string
  trialEnd?: string
  apiCallsThisMonth: number
  webSearchesThisMonth: number
  aiMessagesThisMonth: number
  createdAt: string
  updatedAt: string
}

export interface SubscriptionFeatures {
  tier: SubscriptionTier
  aiMessagesPerMonth: number // -1 = unlimited
  webSearchEnabled: boolean
  webSearchesPerMonth: number // -1 = unlimited
  advancedAiFeatures: boolean
  autoSchedulingEnabled: boolean
  focusBlocksLimit: number // -1 = unlimited
  historyRetentionDays: number
  fileAttachmentsEnabled: boolean
  prioritySupport: boolean
}

export interface UserSubscriptionWithFeatures {
  subscription: UserSubscription | null
  features: SubscriptionFeatures
  usage: {
    aiMessagesUsed: number
    aiMessagesLimit: number
    aiMessagesRemaining: number
    webSearchesUsed: number
    webSearchesLimit: number
    webSearchesRemaining: number
  }
  isTrial: boolean
  trialDaysRemaining: number
}

// Default features for each tier (simplified 2-tier)
export const TIER_FEATURES: Record<'free' | 'pro', SubscriptionFeatures> = {
  free: {
    tier: 'free',
    aiMessagesPerMonth: 50,
    webSearchEnabled: false,
    webSearchesPerMonth: 0,
    advancedAiFeatures: false,
    autoSchedulingEnabled: true,
    focusBlocksLimit: 3,
    historyRetentionDays: 30,
    fileAttachmentsEnabled: false,
    prioritySupport: false,
  },
  pro: {
    // LockIN tier (stored as 'pro' for DB compatibility)
    tier: 'pro',
    aiMessagesPerMonth: -1, // Unlimited
    webSearchEnabled: true,
    webSearchesPerMonth: -1, // Unlimited
    advancedAiFeatures: true,
    autoSchedulingEnabled: true,
    focusBlocksLimit: -1, // Unlimited
    historyRetentionDays: 365,
    fileAttachmentsEnabled: true,
    prioritySupport: true,
  },
}

// Pricing information (simplified 2-tier)
export interface PricingPlan {
  tier: SubscriptionTier
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  yearlyDiscount: number
  features: string[]
  highlighted?: boolean
  ctaText: string
  trialDays?: number
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    tier: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyDiscount: 0,
    features: [
      '50 AI messages per month',
      'Basic habit tracking',
      'Calendar management',
      'Up to 3 focus blocks',
      '30-day history',
    ],
    ctaText: 'Get Started',
  },
  {
    tier: 'pro',
    name: 'LockIN',
    description: 'Unlock your full potential',
    monthlyPrice: 2.99,
    yearlyPrice: 35.99,
    yearlyDiscount: 0,
    features: [
      'Unlimited AI messages',
      'Unlimited web searches',
      'Advanced AI features',
      'Unlimited focus blocks',
      '1-year history',
      'File attachments',
      'Priority support',
    ],
    highlighted: true,
    ctaText: 'Start 7-Day Free Trial',
    trialDays: 7,
  },
]

// Helper functions
export function canUseWebSearch(features: SubscriptionFeatures, used: number): boolean {
  if (!features.webSearchEnabled) return false
  if (features.webSearchesPerMonth === -1) return true
  return used < features.webSearchesPerMonth
}

export function canSendAiMessage(features: SubscriptionFeatures, used: number): boolean {
  if (features.aiMessagesPerMonth === -1) return true
  return used < features.aiMessagesPerMonth
}

export function getRemainingUsage(limit: number, used: number): number {
  if (limit === -1) return Infinity
  return Math.max(0, limit - used)
}

export function getUsagePercentage(limit: number, used: number): number {
  if (limit === -1) return 0
  if (limit === 0) return 100
  return Math.min(100, Math.round((used / limit) * 100))
}

// Get features for a tier (handles 'lockin' alias)
export function getFeaturesForTier(tier: SubscriptionTier): SubscriptionFeatures {
  if (tier === 'lockin') return TIER_FEATURES.pro
  return TIER_FEATURES[tier] || TIER_FEATURES.free
}
