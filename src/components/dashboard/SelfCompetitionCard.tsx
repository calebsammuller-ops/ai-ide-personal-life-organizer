'use client'

import { useAppSelector } from '@/state/hooks'
import { selectThisWeekMetrics, selectLastWeekMetrics, selectVelocityDelta } from '@/state/slices/selfCompetitionSlice'
import { Card, CardContent } from '@/components/ui/card'

function DeltaTag({ value }: { value: number }) {
  if (value === 0) return <span className="text-[8px] font-mono text-muted-foreground/30">→ same</span>
  const isUp = value > 0
  return (
    <span className={`text-[8px] font-mono ${isUp ? 'text-primary/60' : 'text-destructive/60'}`}>
      {isUp ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  )
}

export function SelfCompetitionCard() {
  const tw = useAppSelector(selectThisWeekMetrics)
  const lw = useAppSelector(selectLastWeekMetrics)
  const delta = useAppSelector(selectVelocityDelta)

  const hasLastWeek = lw.notesCreated > 0 || lw.linksCreated > 0

  return (
    <Card className="rounded-sm border-border/40">
      <CardContent className="pt-3 pb-2">
        <p className="text-[8px] font-mono text-muted-foreground/30 uppercase tracking-widest mb-2">You vs You</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-muted-foreground/50">This week</span>
            <span className="text-[9px] font-mono text-foreground/70">
              {tw.notesCreated} ideas · {tw.linksCreated} connections
              {tw.actionsCompleted > 0 && ` · ${tw.actionsCompleted} actions`}
            </span>
          </div>
          {hasLastWeek && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted-foreground/30">Last week</span>
              <span className="text-[9px] font-mono text-muted-foreground/40">
                {lw.notesCreated} ideas · {lw.linksCreated} connections
              </span>
            </div>
          )}
          {hasLastWeek && (
            <div className="flex items-center gap-3 pt-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-mono text-muted-foreground/30">ideas</span>
                <DeltaTag value={delta.notes} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-mono text-muted-foreground/30">connections</span>
                <DeltaTag value={delta.links} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
