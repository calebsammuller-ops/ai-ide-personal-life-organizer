/**
 * Stripe billing portal API
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createBillingPortalSession, isStripeConfigured } from '@/lib/stripe/client'
import { checkRateLimit, rateLimitConfigs, rateLimitResponse } from '@/lib/rateLimit'
import { captureError } from '@/lib/sentry'

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResult = await checkRateLimit(request, rateLimitConfigs.standard)
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
    // Get user's Stripe customer ID
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!userPrefs?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Create billing portal session
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL
    const portalSession = await createBillingPortalSession(
      userPrefs.stripe_customer_id,
      `${origin}/settings`
    )

    if (!portalSession) {
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    captureError(error, {
      userId: user.id,
      action: 'create_portal_session',
    })

    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
