'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PricingCard } from '@/components/subscription/PricingCard'
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PRICING_PLANS, type BillingPeriod, type UserSubscriptionWithFeatures } from '@/types/subscription'

function SubscriptionContent() {
  const searchParams = useSearchParams()
  const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionWithFeatures | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription')
      if (!response.ok) throw new Error('Failed to fetch subscription')
      const data = await response.json()
      setSubscriptionData(data)
    } catch (err) {
      setError('Failed to load subscription data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (tier: string, period: BillingPeriod) => {
    setCheckoutLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, period, trialDays: 7 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open subscription portal')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open subscription portal')
    }
  }

  const scrollToPricing = () => {
    document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing settings
        </p>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Welcome to your new plan!</AlertTitle>
          <AlertDescription className="text-green-700">
            Your subscription has been activated. Enjoy your new features!
          </AlertDescription>
        </Alert>
      )}

      {canceled && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Checkout canceled</AlertTitle>
          <AlertDescription className="text-yellow-700">
            No worries! You can upgrade anytime when you're ready.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Subscription Status */}
      {subscriptionData && (
        <SubscriptionStatus
          subscriptionData={subscriptionData}
          onManageSubscription={handleManageSubscription}
          onUpgrade={scrollToPricing}
        />
      )}

      {/* Pricing Section */}
      <div id="pricing-section" className="pt-8">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold mb-2">Choose Your Plan</h2>
          <p className="text-muted-foreground mb-6">
            Start with a 7-day free trial on any paid plan
          </p>

          <Tabs
            value={billingPeriod}
            onValueChange={(v) => setBillingPeriod(v as BillingPeriod)}
            className="inline-flex"
          >
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                <span className="ml-1.5 text-xs text-green-600 font-medium">Save 17%</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <PricingCard
              key={plan.tier}
              plan={plan}
              billingPeriod={billingPeriod}
              currentTier={subscriptionData?.features.tier}
              onSelect={handleSelectPlan}
              isLoading={checkoutLoading}
            />
          ))}
        </div>
      </div>

      {/* FAQ or Additional Info */}
      <div className="border-t pt-8 mt-8">
        <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium mb-1">Can I cancel anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">What happens to my data if I downgrade?</h4>
            <p className="text-sm text-muted-foreground">
              Your data is always safe. If you downgrade, you'll retain access based on the free tier limits.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">Do you offer refunds?</h4>
            <p className="text-sm text-muted-foreground">
              We offer a 7-day free trial so you can try before you buy. Contact support for refund requests.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">How does the AI message limit work?</h4>
            <p className="text-sm text-muted-foreground">
              Each message you send to the AI assistant counts toward your monthly limit. Limits reset on the 1st of each month.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <PageContainer>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <SubscriptionContent />
      </Suspense>
    </PageContainer>
  )
}
