/**
 * Stripe server-side client
 */

import Stripe from 'stripe'
import { captureError } from '@/lib/sentry'
import { logger } from '@/lib/logger'

// Initialize Stripe client
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

export function isStripeConfigured(): boolean {
  return !!stripe
}

/**
 * Create a Stripe customer for a user
 */
export async function createCustomer(
  email: string,
  userId: string,
  name?: string
): Promise<Stripe.Customer | null> {
  if (!stripe) {
    logger.warn('Stripe not configured, skipping customer creation')
    return null
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    })

    logger.info({ customerId: customer.id, userId }, 'Created Stripe customer')
    return customer
  } catch (error) {
    captureError(error, { userId, action: 'create_stripe_customer' })
    throw error
  }
}

/**
 * Get or create a Stripe customer
 */
export async function getOrCreateCustomer(
  email: string,
  userId: string,
  existingCustomerId?: string
): Promise<Stripe.Customer | null> {
  if (!stripe) return null

  // If we have an existing customer ID, retrieve it
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId)
      if (!customer.deleted) {
        return customer as Stripe.Customer
      }
    } catch (error) {
      // Customer not found, create new one
      logger.warn({ existingCustomerId, error }, 'Customer not found, creating new')
    }
  }

  // Search for existing customer by email
  try {
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (customers.data.length > 0) {
      return customers.data[0]
    }
  } catch (error) {
    logger.warn({ email, error }, 'Error searching for customer')
  }

  // Create new customer
  return createCustomer(email, userId)
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    logger.warn('Stripe not configured, cannot create checkout session')
    return null
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
      allow_promotion_codes: true,
    })

    logger.info({ sessionId: session.id, userId, priceId }, 'Created checkout session')
    return session
  } catch (error) {
    captureError(error, { userId, action: 'create_checkout_session', extra: { priceId } })
    throw error
  }
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session | null> {
  if (!stripe) {
    logger.warn('Stripe not configured, cannot create portal session')
    return null
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session
  } catch (error) {
    captureError(error, { action: 'create_portal_session', extra: { customerId } })
    throw error
  }
}

/**
 * Get subscription for a customer
 */
export async function getSubscription(
  customerId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) return null

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    })

    return subscriptions.data[0] || null
  } catch (error) {
    logger.error({ customerId, error }, 'Error fetching subscription')
    return null
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription | null> {
  if (!stripe) return null

  try {
    if (immediately) {
      return await stripe.subscriptions.cancel(subscriptionId)
    } else {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
    }
  } catch (error) {
    captureError(error, { action: 'cancel_subscription', extra: { subscriptionId } })
    throw error
  }
}

/**
 * Construct webhook event from payload
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    logger.warn('Stripe webhook not configured')
    return null
  }

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    logger.error({ error }, 'Webhook signature verification failed')
    return null
  }
}
