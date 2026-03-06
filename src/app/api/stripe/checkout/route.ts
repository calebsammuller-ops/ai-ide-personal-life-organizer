/**
 * Stripe checkout session API
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  getOrCreateCustomer,
  createCheckoutSession,
  isStripeConfigured,
} from '@/lib/stripe/client'
import { getPriceId, PlanType, BillingInterval } from '@/lib/stripe/config'
import { checkRateLimit, rateLimitConfigs, rateLimitResponse } from '@/lib/rateLimit'
import { captureError } from '@/lib/sentry'

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResult = await checkRateLimit(request, rateLimitConfigs.strict)
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  // Check Stripe configuration
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Payment processing not configured' },
      { status: 503 }
    )
  }

  // Authenticate user
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { planId, interval } = body as {
      planId: PlanType
      interval: BillingInterval
    }

    // Validate plan
    const priceId = getPriceId(planId, interval)
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan or interval' },
        { status: 400 }
      )
    }

    // Get user's email
    const email = user.email
    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    const customer = await getOrCreateCustomer(
      email,
      user.id,
      userPrefs?.stripe_customer_id
    )

    if (!customer) {
      return NextResponse.json(
        { error: 'Failed to create customer' },
        { status: 500 }
      )
    }

    // Save customer ID if new
    if (!userPrefs?.stripe_customer_id) {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
    }

    // Create checkout session
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL
    const checkoutSession = await createCheckoutSession(
      customer.id,
      priceId,
      user.id,
      `${origin}/settings?checkout=success`,
      `${origin}/settings?checkout=cancelled`
    )

    if (!checkoutSession) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    captureError(error, {
      userId: user.id,
      action: 'create_checkout',
    })

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
