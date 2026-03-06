/**
 * Stripe webhook handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe/client'
import { stripe as stripeClient } from '@/lib/stripe/client'
import { getBillingPeriodFromPrice, getTierFromPriceId, mapStripeStatus } from '@/lib/stripe/stripe'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { captureError } from '@/lib/sentry'
import { logger, logBusinessEvent } from '@/lib/logger'
import type Stripe from 'stripe'
import { getUserIdFromStripeCustomer, upsertSubscription } from '@/lib/stripe/subscriptionService'

// Lazy initialization for Supabase client (avoids build-time errors)
let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing')
    }
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  }
  return _supabaseAdmin
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const event = constructWebhookEvent(body, signature)

  if (!event) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  logger.info({ eventType: event.type, eventId: event.id }, 'Stripe webhook received')

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        logger.info({ eventType: event.type }, 'Unhandled webhook event type')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    captureError(error, {
      action: 'stripe_webhook',
      extra: { eventType: event.type, eventId: event.id },
    })

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const customerId = session.customer as string

  if (!userId) {
    logger.error({ sessionId: session.id }, 'No userId in checkout session metadata')
    return
  }

  // Update user preferences with customer ID and subscription info
  await getSupabaseAdmin()
    .from('user_preferences')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  logBusinessEvent('subscription_created', {
    userId,
    customerId,
    sessionId: session.id,
  })

  // Also persist to canonical subscription table if possible
  if (stripeClient && session.subscription) {
    try {
      const subscription = await stripeClient.subscriptions.retrieve(
        session.subscription as string,
        { expand: ['items.data.price'] }
      )
      await upsertFromStripeSubscription(subscription)
    } catch (error) {
      logger.warn({ error, sessionId: session.id }, 'Failed to sync subscription after checkout completion')
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const customerId = subscription.customer as string

  if (!userId) {
    // Try to find user by customer ID
    const db = getSupabaseAdmin()
    const { data: userPref } = await db
      .from('user_preferences')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!userPref) {
      logger.error({ customerId }, 'No user found for customer')
      return
    }
  }

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id
  const plan = getTierFromPriceId(priceId)

  // Update subscription status
  const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end
  await getSupabaseAdmin()
    .from('user_preferences')
    .update({
      subscription_status: subscription.status,
      subscription_plan: plan,
      subscription_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  logBusinessEvent('subscription_updated', {
    customerId,
    status: subscription.status,
    plan,
  })

  // Also persist to canonical subscription table
  await upsertFromStripeSubscription(subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Downgrade to free plan
  await getSupabaseAdmin()
    .from('user_preferences')
    .update({
      subscription_status: 'canceled',
      subscription_plan: 'free',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  logBusinessEvent('subscription_canceled', {
    customerId,
    subscriptionId: subscription.id,
  })

  // Also persist to canonical subscription table
  await upsertFromStripeSubscription(subscription)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  logBusinessEvent('payment_succeeded', {
    customerId,
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Update subscription status
  await getSupabaseAdmin()
    .from('user_preferences')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)

  logBusinessEvent('payment_failed', {
    customerId,
    invoiceId: invoice.id,
    amount: invoice.amount_due,
  })
}

async function upsertFromStripeSubscription(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Try to find user by canonical mapping first
  let userId = await getUserIdFromStripeCustomer(customerId)

  // Fallback: read user_id from Stripe customer metadata
  if (!userId && stripeClient) {
    const customer = await stripeClient.customers.retrieve(customerId)
    if (!customer.deleted) {
      const metadata = (customer as Stripe.Customer).metadata
      const metadataUserId = metadata?.user_id || metadata?.userId
      if (metadataUserId) {
        userId = metadataUserId
      }
    }
  }

  if (!userId) {
    logger.error({ customerId, subscriptionId: subscription.id }, 'Could not map Stripe customer to user')
    return
  }

  const price = subscription.items.data[0]?.price as Stripe.Price | undefined
  const priceId = price?.id

  const periodStart = (subscription as unknown as { current_period_start: number }).current_period_start
  const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end

  await upsertSubscription(userId, {
    tier: priceId ? getTierFromPriceId(priceId) : 'free',
    status: mapStripeStatus(subscription.status),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    billingPeriod: price ? getBillingPeriodFromPrice(price) : 'monthly',
    currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialStart: subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : undefined,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : undefined,
  })
}
