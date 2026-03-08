'use client'

import { Brain, RefreshCw, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchCognitiveMirror,
  selectCognitiveMirrorData,
  selectCognitiveMirrorLoading,
  selectCognitiveMirrorCached,
  selectCognitiveMirrorGeneratedAt,
} from '@/state/slices/cognitiveMirrorSlice'
import { cn } from '@/lib/utils'

const STYLE_COLORS: Record<string, string> = {
  Explorer: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  Builder: 'bg-green-500/15 text-green-400 border border-green-500/30',
  Connector: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  Synthesizer: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
}

const VALENCE_COLORS: Record<string, string> = {
  strength: 'bg-green-500',
  weakness: 'bg-red-500',
  neutral: 'bg-blue-500',
}

export function CognitiveMirrorCard() {
  const dispatch = useAppDispatch()
  const data = useAppSelector(selectCognitiveMirrorData)
  const loading = useAppSelector(selectCognitiveMirrorLoading)
  const cached = useAppSelector(selectCognitiveMirrorCached)
  const generatedAt = useAppSelector(selectCognitiveMirrorGeneratedAt)

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
            <Brain className="h-4 w-4 text-blue-500" />
            Cognitive Mirror
          </CardTitle>
          <div className="flex items-center gap-2">
            {cached && relativeTime && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Analyzed {relativeTime}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(fetchCognitiveMirror() as any)}
              disabled={loading}
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', loading && 'animate-spin')} />
              {loading ? 'Analyzing...' : data ? 'Re-analyze' : 'Analyze My Thinking'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {data && (
        <CardContent className="space-y-4">
          {/* Dominant Style */}
          <div className="flex items-center gap-3">
            <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', STYLE_COLORS[data.dominantStyle] || STYLE_COLORS['Explorer'])}>
              {data.dominantStyle}
            </span>
            <span className="text-sm text-muted-foreground">{data.learningStyle} Learner</span>
          </div>

          {/* Focus Score */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Focus Score</span>
              <span>{Math.round(data.focusScore * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${data.focusScore * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-0.5">
              <span>Broad</span>
              <span>Deep Focus</span>
            </div>
          </div>

          {/* Patterns */}
          {data.patterns.length > 0 && (
            <div className="space-y-2">
              {data.patterns.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-medium">{p.label}</span>
                    <span className="text-muted-foreground">{Math.round(p.score * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', VALENCE_COLORS[p.valence])}
                      style={{ width: `${p.score * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Thinking Biases */}
          {data.thinkingBiases.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5">Thinking Biases</p>
              <div className="flex flex-wrap gap-1.5">
                {data.thinkingBiases.map((bias, i) => (
                  <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    {bias}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Observation */}
          <p className="text-sm text-muted-foreground italic">{data.observation}</p>

          {/* Blind spot + recommendation */}
          <div className="space-y-2">
            <div className="p-3 border border-orange-500/20 bg-orange-500/5 rounded-lg">
              <p className="text-xs font-semibold text-orange-500 mb-0.5">Blind Spot</p>
              <p className="text-sm">{data.blindSpot}</p>
            </div>
            <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
              <p className="text-xs font-semibold text-primary mb-0.5">Recommendation</p>
              <p className="text-sm">{data.recommendation}</p>
            </div>
          </div>
        </CardContent>
      )}

      {!data && !loading && (
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "Analyze My Thinking" to reveal your cognitive patterns.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
