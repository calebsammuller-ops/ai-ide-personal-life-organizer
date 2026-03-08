'use client'

import { Target, RefreshCw, Clock, ArrowUp, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchStrategy,
  generateStrategy,
  selectStrategyData,
  selectStrategyLoading,
  selectStrategyCached,
  selectStrategyGeneratedAt,
} from '@/state/slices/strategySlice'
import { cn } from '@/lib/utils'

export function StrategyEngineCard() {
  const dispatch = useAppDispatch()
  const data = useAppSelector(selectStrategyData)
  const loading = useAppSelector(selectStrategyLoading)
  const cached = useAppSelector(selectStrategyCached)
  const generatedAt = useAppSelector(selectStrategyGeneratedAt)

  const relativeTime = generatedAt
    ? (() => {
        const diffMs = Date.now() - new Date(generatedAt).getTime()
        const h = Math.floor(diffMs / 3600000)
        if (h < 1) return 'just now'
        return `${h}h ago`
      })()
    : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-amber-500" />
            Strategy Engine
          </CardTitle>
          <div className="flex items-center gap-2">
            {cached && relativeTime && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {relativeTime}
              </span>
            )}
            {!data ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(fetchStrategy() as any)}
                disabled={loading}
              >
                <RefreshCw className={cn('h-3 w-3 mr-1', loading && 'animate-spin')} />
                {loading ? 'Generating...' : 'Generate Strategy'}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(generateStrategy() as any)}
                disabled={loading}
              >
                <RefreshCw className={cn('h-3 w-3 mr-1', loading && 'animate-spin')} />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {data && (
        <CardContent className="space-y-4">
          {/* Strategic Focus */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-xs font-semibold text-amber-500 mb-1">Strategic Focus</p>
            <p className="text-sm font-medium">{data.strategicFocus}</p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {data.steps.map((step, i) => (
              <div key={i} className="p-3 border border-border/50 rounded-lg">
                <div className="flex items-start gap-2 mb-1.5">
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    #{step.priority}
                  </Badge>
                  <p className="font-medium text-sm leading-tight">{step.action}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{step.rationale}</p>

                {/* Impact / Effort */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <ArrowUp className="h-3 w-3" />
                    Impact: {Math.round(step.impactScore * 100)}%
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-blue-500">
                    <Zap className="h-3 w-3" />
                    Effort: {Math.round(step.effortScore * 100)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {step.timeEstimate}
                  </span>
                </div>

                {/* Related Notes */}
                {step.relatedNotes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {step.relatedNotes.slice(0, 3).map((note, j) => (
                      <span key={j} className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">
                        {note}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {data.momentumArea && (
              <span className="px-2 py-1 text-[10px] rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                ↑ Momentum: {data.momentumArea}
              </span>
            )}
            {data.underexploredArea && (
              <span className="px-2 py-1 text-[10px] rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                ↗ Underexplored: {data.underexploredArea}
              </span>
            )}
          </div>
          {data.weeklyChallenge && (
            <div className="p-2 border border-primary/20 rounded-lg">
              <p className="text-[10px] font-semibold text-primary mb-0.5">Weekly Challenge</p>
              <p className="text-xs">{data.weeklyChallenge}</p>
            </div>
          )}
        </CardContent>
      )}

      {!data && !loading && (
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Generate a personalized strategy based on your knowledge graph.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
