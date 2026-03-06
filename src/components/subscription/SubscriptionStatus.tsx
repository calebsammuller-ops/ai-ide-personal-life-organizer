'use client'

import { useState } from 'react'
import { Crown, AlertCircle, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { UserSubscriptionWithFeatures } from '@/types/subscription'

interface SubscriptionStatusProps {
  subscriptionData: UserSubscriptionWithFeatures
  onManageSubscription: () => Promise<void>
  onUpgrade: () => void
}

export function SubscriptionStatus({
  subscriptionData,
  onManageSubscription,
  onUpgrade,
}: SubscriptionStatusProps) {
  const [loading, setLoading] = useState(false)
  const { subscription, features, usage, isTrial, trialDaysRemaining } = subscriptionData

  const tierColors = {
    free: 'bg-gray-100 text-gray-800',
    pro: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-yellow-100 text-yellow-800',
    past_due: 'bg-red-100 text-red-800',
    canceled: 'bg-gray-100 text-gray-800',
    paused: 'bg-orange-100 text-orange-800',
  }

  const handleManage = async () => {
    setLoading(true)
    try {
      await onManageSubscription()
    } finally {
      setLoading(false)
    }
  }

  const aiUsagePercent = usage.aiMessagesLimit === -1
    ? 0
    : Math.min(100, Math.round((usage.aiMessagesUsed / usage.aiMessagesLimit) * 100))

  const searchUsagePercent = usage.webSearchesLimit === -1
    ? 0
    : Math.min(100, Math.round((usage.webSearchesUsed / usage.webSearchesLimit) * 100))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <CardTitle>Subscription</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(tierColors[features.tier])}>
              {features.tier.charAt(0).toUpperCase() + features.tier.slice(1)}
            </Badge>
            {subscription && (
              <Badge className={cn(statusColors[subscription.status])}>
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {isTrial ? (
            <span className="flex items-center gap-1 text-yellow-600">
              <Clock className="h-4 w-4" />
              Trial ends in {trialDaysRemaining} days
            </span>
          ) : subscription?.cancelAtPeriodEnd ? (
            <span className="flex items-center gap-1 text-orange-600">
              <AlertCircle className="h-4 w-4" />
              Cancels at end of billing period
            </span>
          ) : (
            'Your current plan and usage'
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Usage Stats */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>AI Messages</span>
              <span className="text-muted-foreground">
                {usage.aiMessagesUsed} / {usage.aiMessagesLimit === -1 ? 'Unlimited' : usage.aiMessagesLimit}
              </span>
            </div>
            {usage.aiMessagesLimit !== -1 && (
              <Progress
                value={aiUsagePercent}
                className={cn(aiUsagePercent > 80 && 'bg-red-100')}
              />
            )}
          </div>

          {features.webSearchEnabled && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Web Searches</span>
                <span className="text-muted-foreground">
                  {usage.webSearchesUsed} / {usage.webSearchesLimit === -1 ? 'Unlimited' : usage.webSearchesLimit}
                </span>
              </div>
              {usage.webSearchesLimit !== -1 && (
                <Progress
                  value={searchUsagePercent}
                  className={cn(searchUsagePercent > 80 && 'bg-red-100')}
                />
              )}
            </div>
          )}
        </div>

        {/* Features Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              features.webSearchEnabled ? 'bg-green-500' : 'bg-gray-300'
            )} />
            <span className={cn(!features.webSearchEnabled && 'text-muted-foreground')}>
              Web Search
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              features.advancedAiFeatures ? 'bg-green-500' : 'bg-gray-300'
            )} />
            <span className={cn(!features.advancedAiFeatures && 'text-muted-foreground')}>
              Advanced AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              features.fileAttachmentsEnabled ? 'bg-green-500' : 'bg-gray-300'
            )} />
            <span className={cn(!features.fileAttachmentsEnabled && 'text-muted-foreground')}>
              File Attachments
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              features.prioritySupport ? 'bg-green-500' : 'bg-gray-300'
            )} />
            <span className={cn(!features.prioritySupport && 'text-muted-foreground')}>
              Priority Support
            </span>
          </div>
        </div>

        {/* Billing Info */}
        {subscription?.currentPeriodEnd && (
          <div className="text-sm text-muted-foreground border-t pt-4">
            {subscription.cancelAtPeriodEnd ? 'Access until' : 'Next billing date'}:{' '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {features.tier === 'free' ? (
            <Button className="flex-1" onClick={onUpgrade}>
              Upgrade Plan
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleManage}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </Button>
              {features.tier !== 'premium' && (
                <Button className="flex-1" onClick={onUpgrade}>
                  Upgrade
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
