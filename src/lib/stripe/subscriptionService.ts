/**
 * Subscription Service - Database operations for subscriptions
 */

import { createClient } from '@/lib/supabase/server'
import type {
  UserSubscription,
  SubscriptionFeatures,
  UserSubscriptionWithFeatures,
  SubscriptionTier,
  SubscriptionStatus,
  BillingPeriod,
  TIER_FEATURES,
} from '@/types/subscription'

// Get user's subscription with features
export async function getUserSubscription(
  userId: string
): Promise<UserSubscriptionWithFeatures> {
  const supabase = createClient()

  // Get subscription record
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Determine tier (default to free if no subscription)
  const tier: SubscriptionTier = subscription?.tier || 'free'

  // Get features for tier
  const { data: features } = await supabase
    .from('subscription_features')
    .select('*')
    .eq('tier', tier)
    .single()

  // Map database fields to our interfaces
  const mappedFeatures: SubscriptionFeatures = features
    ? {
        tier: features.tier,
        aiMessagesPerMonth: features.ai_messages_per_month,
        webSearchEnabled: features.web_search_enabled,
        webSearchesPerMonth: features.web_searches_per_month,
        advancedAiFeatures: features.advanced_ai_features,
        autoSchedulingEnabled: features.auto_scheduling_enabled,
        focusBlocksLimit: features.focus_blocks_limit,
        historyRetentionDays: features.history_retention_days,
        fileAttachmentsEnabled: features.file_attachments_enabled,
        prioritySupport: features.priority_support,
      }
    : {
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
      }

  const aiUsed = subscription?.ai_messages_this_month || 0
  const searchUsed = subscription?.web_searches_this_month || 0

  const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end) : null
  const isTrial = trialEnd !== null && trialEnd > new Date()
  const trialDaysRemaining = isTrial
    ? Math.ceil((trialEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    subscription: subscription
      ? {
          id: subscription.id,
          userId: subscription.user_id,
          tier: subscription.tier,
          status: subscription.status,
          stripeCustomerId: subscription.stripe_customer_id,
          stripeSubscriptionId: subscription.stripe_subscription_id,
          stripePriceId: subscription.stripe_price_id,
          billingPeriod: subscription.billing_period,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          trialStart: subscription.trial_start,
          trialEnd: subscription.trial_end,
          apiCallsThisMonth: subscription.api_calls_this_month,
          webSearchesThisMonth: subscription.web_searches_this_month,
          aiMessagesThisMonth: subscription.ai_messages_this_month,
          createdAt: subscription.created_at,
          updatedAt: subscription.updated_at,
        }
      : null,
    features: mappedFeatures,
    usage: {
      aiMessagesUsed: aiUsed,
      aiMessagesLimit: mappedFeatures.aiMessagesPerMonth,
      aiMessagesRemaining:
        mappedFeatures.aiMessagesPerMonth === -1
          ? Infinity
          : Math.max(0, mappedFeatures.aiMessagesPerMonth - aiUsed),
      webSearchesUsed: searchUsed,
      webSearchesLimit: mappedFeatures.webSearchesPerMonth,
      webSearchesRemaining:
        mappedFeatures.webSearchesPerMonth === -1
          ? Infinity
          : Math.max(0, mappedFeatures.webSearchesPerMonth - searchUsed),
    },
    isTrial,
    trialDaysRemaining,
  }
}

// Create or update subscription record
export async function upsertSubscription(
  userId: string,
  data: {
    tier: SubscriptionTier
    status: SubscriptionStatus
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    stripePriceId?: string
    billingPeriod?: BillingPeriod
    currentPeriodStart?: Date
    currentPeriodEnd?: Date
    cancelAtPeriodEnd?: boolean
    trialStart?: Date
    trialEnd?: Date
  }
): Promise<UserSubscription | null> {
  const supabase = createClient()

  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        tier: data.tier,
        status: data.status,
        stripe_customer_id: data.stripeCustomerId,
        stripe_subscription_id: data.stripeSubscriptionId,
        stripe_price_id: data.stripePriceId,
        billing_period: data.billingPeriod,
        current_period_start: data.currentPeriodStart?.toISOString(),
        current_period_end: data.currentPeriodEnd?.toISOString(),
        cancel_at_period_end: data.cancelAtPeriodEnd,
        trial_start: data.trialStart?.toISOString(),
        trial_end: data.trialEnd?.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error upserting subscription:', error)
    return null
  }

  return subscription
    ? {
        id: subscription.id,
        userId: subscription.user_id,
        tier: subscription.tier,
        status: subscription.status,
        stripeCustomerId: subscription.stripe_customer_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        stripePriceId: subscription.stripe_price_id,
        billingPeriod: subscription.billing_period,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialStart: subscription.trial_start,
        trialEnd: subscription.trial_end,
        apiCallsThisMonth: subscription.api_calls_this_month,
        webSearchesThisMonth: subscription.web_searches_this_month,
        aiMessagesThisMonth: subscription.ai_messages_this_month,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at,
      }
    : null
}

// Increment usage counter
export async function incrementUsage(
  userId: string,
  usageType: 'ai_message' | 'web_search' | 'api_call'
): Promise<boolean> {
  const supabase = createClient()

  // First, ensure the user has a subscription record
  await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId,
      tier: 'free',
      status: 'active',
    },
    { onConflict: 'user_id', ignoreDuplicates: true }
  )

  // Get current subscription and limits
  const subData = await getUserSubscription(userId)

  // Check if usage is allowed
  if (usageType === 'ai_message') {
    if (
      subData.features.aiMessagesPerMonth !== -1 &&
      subData.usage.aiMessagesUsed >= subData.features.aiMessagesPerMonth
    ) {
      return false
    }
  } else if (usageType === 'web_search') {
    if (!subData.features.webSearchEnabled) {
      return false
    }
    if (
      subData.features.webSearchesPerMonth !== -1 &&
      subData.usage.webSearchesUsed >= subData.features.webSearchesPerMonth
    ) {
      return false
    }
  }

  // Increment the counter
  const columnMap = {
    ai_message: 'ai_messages_this_month',
    web_search: 'web_searches_this_month',
    api_call: 'api_calls_this_month',
  }

  const column = columnMap[usageType]
  const currentValue =
    usageType === 'ai_message'
      ? subData.usage.aiMessagesUsed
      : usageType === 'web_search'
        ? subData.usage.webSearchesUsed
        : 0

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      [column]: currentValue + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return !error
}

// Check if user can use a specific feature
export async function canUseFeature(
  userId: string,
  feature: 'web_search' | 'ai_message' | 'advanced_ai' | 'file_attachment'
): Promise<{ allowed: boolean; reason?: string }> {
  const subData = await getUserSubscription(userId)

  // Paid members (any non-free tier with active/trialing status) have unlimited access
  const tier = subData.subscription?.tier ?? 'free'
  const status = subData.subscription?.status ?? 'active'
  const isPaidMember = tier !== 'free' && ['active', 'trialing'].includes(status)
  if (isPaidMember) return { allowed: true }

  // Free tier limits
  switch (feature) {
    case 'web_search':
      return { allowed: false, reason: 'Web search requires a membership.' }

    case 'ai_message':
      if (
        subData.features.aiMessagesPerMonth !== -1 &&
        subData.usage.aiMessagesUsed >= subData.features.aiMessagesPerMonth
      ) {
        return {
          allowed: false,
          reason: `You've used all ${subData.features.aiMessagesPerMonth} free messages this month.`,
        }
      }
      return { allowed: true }

    case 'advanced_ai':
      return { allowed: false, reason: 'Advanced AI requires a membership.' }

    case 'file_attachment':
      return { allowed: false, reason: 'File attachments require a membership.' }

    default:
      return { allowed: true }
  }
}

// Get user ID from Stripe customer ID
export async function getUserIdFromStripeCustomer(
  stripeCustomerId: string
): Promise<string | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()

  return data?.user_id || null
}
