/**
 * Checkout API - Create Stripe checkout session
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getOrCreateCustomer,
  createCheckoutSession,
  getPriceId,
  isStripeConfigured,
} from '@/lib/stripe/stripe'
import { upsertSubscription } from '@/lib/stripe/subscriptionService'
import type { SubscriptionTier, BillingPeriod } from '@/types/subscription'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error: 'Payment system not configured',
          message: 'Stripe is not set up. Please configure STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.',
        },
        { status: 503 }
      )
    }

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tier, period, trialDays } = body as {
      tier: SubscriptionTier
      period: BillingPeriod
      trialDays?: number
    }

    if (!tier || !period) {
      return NextResponse.json(
        { error: 'Missing tier or period' },
        { status: 400 }
      )
    }

    if (tier === 'free') {
      return NextResponse.json(
        { error: 'Cannot checkout for free tier' },
        { status: 400 }
      )
    }

    const priceId = getPriceId(tier, period)
    if (!priceId) {
      return NextResponse.json(
        {
          error: 'Price not configured',
          message: `Please configure STRIPE_${tier.toUpperCase()}_${period.toUpperCase()}_PRICE_ID in environment variables.`,
        },
        { status: 503 }
      )
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(
      user.id,
      user.email || '',
      user.user_metadata?.full_name
    )

    // Persist customer mapping early (helps webhook map customer -> user reliably)
    await upsertSubscription(user.id, {
      tier: 'free',
      status: 'active',
      stripeCustomerId: customer.id,
    })

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const session = await createCheckoutSession(
      customer.id,
      priceId,
      `${appUrl}/settings/subscription?success=true`,
      `${appUrl}/settings/subscription?canceled=true`,
      trialDays
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
