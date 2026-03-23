'use client'

import { useAppSelector } from '@/state/hooks'
import { selectIdentityTitle } from '@/state/slices/identitySlice'
import { selectTrajectoryData } from '@/state/slices/trajectorySlice'
import { selectFutureProjection } from '@/state/slices/identitySlice'
import { Card, CardContent } from '@/components/ui/card'

export function FutureSelfCard() {
  const identityTitle = useAppSelector(selectIdentityTitle)
  const trajectoryData = useAppSelector(selectTrajectoryData)
  const futureProjection = useAppSelector(selectFutureProjection)

  if (!trajectoryData) return null

  const headline = trajectoryData.narrative?.headline
  const domain = trajectoryData.primaryDomain || trajectoryData.narrative?.headline?.split(' ').slice(0, 4).join(' ')

  return (
    <Card className="rounded-sm border-border/40">
      <CardContent className="pt-3 pb-2">
        <p className="text-[8px] font-mono text-muted-foreground/30 uppercase tracking-widest mb-1.5">Future You (if you continue)</p>
        <div className="space-y-1">
          <p className="text-[9px] font-mono text-foreground/70">
            → Becoming: <span className="text-primary font-bold uppercase">{identityTitle}</span>
          </p>
          {domain && (
            <p className="text-[9px] font-mono text-foreground/50">→ Domain: {domain}</p>
          )}
          {(futureProjection || headline) && (
            <p className="text-[9px] font-mono text-muted-foreground/50 italic leading-relaxed">
              {(futureProjection || headline || '').slice(0, 80)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
