'use client'

import { Sparkles, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

interface UpgradePromptProps {
  title?: string
  message: string
  feature?: string
  onDismiss?: () => void
  compact?: boolean
}

export function UpgradePrompt({
  title = 'Upgrade to unlock more',
  message,
  feature,
  onDismiss,
  compact = false,
}: UpgradePromptProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm">{message}</span>
        </div>
        <Link href="/settings/subscription">
          <Button size="sm" variant="outline" className="shrink-0">
            Upgrade
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-purple-900">{title}</h3>
            </div>
            <p className="text-sm text-purple-700 mb-4">{message}</p>

            {feature && (
              <div className="mb-4 p-3 bg-white/60 rounded-lg">
                <p className="text-xs text-purple-600 uppercase tracking-wide mb-1">
                  Unlock with Pro or Premium
                </p>
                <p className="text-sm font-medium text-purple-900">{feature}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Link href="/settings/subscription">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  View Plans
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              {onDismiss && (
                <Button variant="ghost" onClick={onDismiss}>
                  Maybe Later
                </Button>
              )}
            </div>
          </div>

          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 -mt-2 -mr-2"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function UpgradeBanner({ message }: { message: string }) {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 px-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">{message}</span>
        </div>
        <Link href="/settings/subscription">
          <Button size="sm" variant="secondary">
            Upgrade Now
          </Button>
        </Link>
      </div>
    </div>
  )
}
