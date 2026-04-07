/**
 * Stripe Webhook Handler
 * Handles subscription lifecycle events from Stripe
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  constructWebhookEvent,
  mapStripeStatus,
  getTierFromPriceId,
  getBillingPeriodFromPrice,
  stripe,
} from '@/lib/stripe/stripe'
import { upsertSubscription, getUserIdFromStripeCustomer } from '@/lib/stripe/subscriptionService'
import {
  sendPaymentFailedEmail,
  sendTrialEndingEmail,
  sendSubscriptionCanceledEmail,
} from '@/lib/email/emailService'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          await handleSubscriptionChange(subscription)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          await handlePaymentFailed(subscription)
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        await handleTrialEnding(subscription)
        break
      }

      default:
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromStripeCustomer(customerId)

  // If we can't find the user, try to get it from customer metadata
  let finalUserId = userId
  if (!finalUserId) {
    const customer = await stripe.customers.retrieve(customerId)
    if (!customer.deleted && customer.metadata?.user_id) {
      finalUserId = customer.metadata.user_id
    }
  }

  if (!finalUserId) {
    console.error('Could not find user for customer:', customerId)
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const price = subscription.items.data[0]?.price

  await upsertSubscription(finalUserId, {
    tier: getTierFromPriceId(priceId),
    status: mapStripeStatus(subscription.status),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    billingPeriod: price ? getBillingPeriodFromPrice(price) : 'monthly',
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialStart: subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : undefined,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : undefined,
  })
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromStripeCustomer(customerId)

  if (!userId) {
    console.error('Could not find user for canceled subscription:', customerId)
    return
  }

  await upsertSubscription(userId, {
    tier: 'free',
    status: 'canceled',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    cancelAtPeriodEnd: false,
  })

  // Send cancellation email
  const customer = await stripe.customers.retrieve(customerId)
  if (!customer.deleted && customer.email) {
    await sendSubscriptionCanceledEmail(customer.email, customer.name || undefined)
  }

}

async function handlePaymentFailed(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromStripeCustomer(customerId)

  if (!userId) {
    console.error('Could not find user for failed payment:', customerId)
    return
  }

  const priceId = subscription.items.data[0]?.price.id

  await upsertSubscription(userId, {
    tier: getTierFromPriceId(priceId),
    status: 'past_due',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  })

  // Send payment failed email
  const customer = await stripe.customers.retrieve(customerId)
  if (!customer.deleted && customer.email) {
    await sendPaymentFailedEmail(customer.email, customer.name || undefined)
  }

}

async function handleTrialEnding(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const userId = await getUserIdFromStripeCustomer(customerId)

  if (!userId) {
    console.error('Could not find user for trial ending:', customerId)
    return
  }

  // Calculate days remaining
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null
  const daysRemaining = trialEnd
    ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 3

  // Send trial ending email
  const customer = await stripe.customers.retrieve(customerId)
  if (!customer.deleted && customer.email) {
    await sendTrialEndingEmail(customer.email, customer.name || undefined, daysRemaining)
  }

}
