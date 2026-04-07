'use client'

import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppSelector } from '@/state/hooks'
import {
  selectTrajectoryData,
  selectTrajectoryLoading,
} from '@/state/slices/trajectorySlice'

export function LifeTrajectoryCard() {
  const data = useAppSelector(selectTrajectoryData)
  const loading = useAppSelector(selectTrajectoryLoading)

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Life Trajectory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Analyzing your trajectory...</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const maxMomentum = Math.max(...data.trends.map(t => Math.abs(t.momentum)), 1)

  return (
    <Card className="rounded-xl card-gradient-rose border-l-[3px] border-l-rose-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-green-500" />
          Life Trajectory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Narrative headline */}
        {data.narrative && (
          <div>
            <p className="text-2xl font-bold">{data.narrative.trajectory}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{data.narrative.headline}</p>
          </div>
        )}

        {/* Rising tags */}
        {data.risingTags.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">Rising Topics</p>
            <div className="space-y-1.5">
              {data.trends
                .filter(t => t.momentum > 0)
                .slice(0, 6)
                .map(t => (
                  <div key={t.tag}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-green-400">↑ {t.tag}</span>
                      <span className="text-muted-foreground">{Math.round((t.momentum / maxMomentum) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${(t.momentum / maxMomentum) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Possible futures */}
        {data.narrative?.possibleFutures && data.narrative.possibleFutures.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">Possible Futures</p>
            <ol className="space-y-1.5">
              {data.narrative.possibleFutures.map((f, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                  <span>{f}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Projections */}
        {data.narrative?.projection && (
          <div className="space-y-2">
            <div className="p-3 border border-border/50 rounded-lg">
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">3 months →</p>
              <p className="text-sm">{data.narrative.projection.threeMonths}</p>
            </div>
            <div className="p-3 border border-border/50 rounded-lg">
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">12 months →</p>
              <p className="text-sm">{data.narrative.projection.twelveMonths}</p>
            </div>
          </div>
        )}

        {/* No narrative fallback */}
        {!data.narrative && data.risingTags.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Add more notes to reveal your life trajectory.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
