/**
 * Stripe configuration and pricing plans
 * Simplified 2-tier system: Free + LockIN
 */

export const STRIPE_CONFIG = {
  // Product IDs
  products: {
    free: 'free',
    lockin: process.env.STRIPE_PRO_PRODUCT_ID || 'prod_lockin',
  },

  // Price IDs
  prices: {
    lockinMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_lockin_monthly',
    lockinYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_lockin_yearly',
  },

  // Trial configuration
  trial: {
    enabled: true,
    days: 7,
  },

  // Feature limits by plan
  limits: {
    free: {
      aiMessagesPerDay: 10,
      habitsMax: 5,
      eventsMax: 20,
      memoriesMax: 10,
      foodScansPerDay: 3,
    },
    lockin: {
      aiMessagesPerDay: -1, // unlimited
      habitsMax: -1,
      eventsMax: -1,
      memoriesMax: -1,
      foodScansPerDay: -1,
    },
  },
}

// Keep 'pro' as alias for backwards compatibility with database
export type PlanType = 'free' | 'pro' | 'lockin'
export type BillingInterval = 'monthly' | 'yearly'

export interface PricingPlan {
  id: PlanType
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  limits: typeof STRIPE_CONFIG.limits.free
  popular?: boolean
  trialDays?: number
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Up to 5 habits',
      '10 AI messages per day',
      '3 food scans per day',
      'Basic daily planning',
      'Email support',
    ],
    limits: STRIPE_CONFIG.limits.free,
  },
  {
    id: 'pro', // Keep as 'pro' for DB compatibility, display as LockIN
    name: 'LockIN',
    description: 'Unlock your full potential',
    monthlyPrice: 2.99,
    yearlyPrice: 35.99,
    features: [
      'Unlimited habits',
      'Unlimited AI messages',
      'Unlimited food scans',
      'Advanced daily planning',
      'AI-powered insights',
      'Priority support',
      'Custom reminders',
      'Advanced analytics',
    ],
    limits: STRIPE_CONFIG.limits.lockin,
    popular: true,
    trialDays: 7,
  },
]

export function getPlanById(planId: PlanType): PricingPlan | undefined {
  // Map 'lockin' to 'pro' for lookup
  const searchId = planId === 'lockin' ? 'pro' : planId
  return PRICING_PLANS.find(plan => plan.id === searchId)
}

export function getPriceId(planId: PlanType, interval: BillingInterval): string | null {
  if (planId === 'free') return null

  // Both 'pro' and 'lockin' map to the same prices
  if (planId === 'pro' || planId === 'lockin') {
    return interval === 'monthly'
      ? STRIPE_CONFIG.prices.lockinMonthly
      : STRIPE_CONFIG.prices.lockinYearly
  }

  return null
}

export function getTrialDays(): number {
  return STRIPE_CONFIG.trial.enabled ? STRIPE_CONFIG.trial.days : 0
}
