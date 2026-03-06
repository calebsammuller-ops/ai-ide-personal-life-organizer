'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PricingPlan, BillingPeriod } from '@/types/subscription'

interface PricingCardProps {
  plan: PricingPlan
  billingPeriod: BillingPeriod
  currentTier?: string
  onSelect: (tier: string, period: BillingPeriod) => Promise<void>
  isLoading?: boolean
}

export function PricingCard({
  plan,
  billingPeriod,
  currentTier,
  onSelect,
  isLoading,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false)
  const isCurrentPlan = currentTier === plan.tier
  const price = billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
  const monthlyEquivalent = billingPeriod === 'yearly' ? (plan.yearlyPrice / 12).toFixed(2) : null

  const handleSelect = async () => {
    if (isCurrentPlan || plan.tier === 'free') return
    setLoading(true)
    try {
      await onSelect(plan.tier, billingPeriod)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        plan.highlighted && 'border-primary shadow-lg scale-105',
        isCurrentPlan && 'border-green-500'
      )}
    >
      {plan.highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          Most Popular
        </Badge>
      )}
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500">
          Current Plan
        </Badge>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">
              ${price === 0 ? '0' : price.toFixed(2)}
            </span>
            {price > 0 && (
              <span className="text-muted-foreground">
                /{billingPeriod === 'yearly' ? 'year' : 'month'}
              </span>
            )}
          </div>
          {monthlyEquivalent && price > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              ${monthlyEquivalent}/month billed annually
            </p>
          )}
          {billingPeriod === 'yearly' && plan.yearlyDiscount > 0 && (
            <Badge variant="secondary" className="mt-2">
              Save {plan.yearlyDiscount}%
            </Badge>
          )}
        </div>

        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={plan.highlighted ? 'default' : 'outline'}
          disabled={isCurrentPlan || loading || isLoading}
          onClick={handleSelect}
        >
          {loading || isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : (
            plan.ctaText
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
