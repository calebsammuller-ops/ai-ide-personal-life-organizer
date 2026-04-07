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
  Explorer: 'bg-primary/10 text-primary border border-primary/30',
  Builder: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  Connector: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  Synthesizer: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
}

const VALENCE_COLORS: Record<string, string> = {
  strength: 'bg-primary/70',
  weakness: 'bg-destructive/60',
  neutral: 'bg-muted-foreground/40',
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
    <Card className="rounded-xl card-gradient-cyan border-l-[3px] border-l-cyan-500">
      <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-primary/20">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold text-primary/80">COGNITIVE MIRROR</span>
          {cached && relativeTime && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/30">
              <Clock className="h-2.5 w-2.5" />
              {relativeTime}
            </span>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch(fetchCognitiveMirror() as any)}
          disabled={loading}
          className="h-6 px-2 text-[10px] text-primary/60 hover:bg-primary/10 hover:text-primary"
        >
          <RefreshCw className={cn('h-3 w-3 mr-1', loading && 'animate-spin')} />
          {loading ? '...' : data ? 'Re-analyze' : 'Analyze'}
        </Button>
      </CardHeader>

      {data && (
        <CardContent className="p-3 space-y-3">
          {/* Dominant Style */}
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-semibold', STYLE_COLORS[data.dominantStyle] || STYLE_COLORS['Explorer'])}>
              {data.dominantStyle}
            </span>
            <span className="text-[10px] text-muted-foreground/50">{data.learningStyle} Learner</span>
          </div>

          {/* Focus Score */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground/50 mb-1">
              <span>FOCUS SCORE</span>
              <span>{Math.round(data.focusScore * 100)}%</span>
            </div>
            <div className="h-1.5 bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${data.focusScore * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground/30 mt-0.5">
              <span>Broad</span>
              <span>Deep</span>
            </div>
          </div>

          {/* Patterns */}
          {data.patterns.length > 0 && (
            <div className="space-y-1.5">
              {data.patterns.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-foreground/70">{p.label}</span>
                    <span className="text-muted-foreground/40">{Math.round(p.score * 100)}%</span>
                  </div>
                  <div className="h-1 bg-muted overflow-hidden">
                    <div
                      className={cn('h-full transition-all', VALENCE_COLORS[p.valence])}
                      style={{ width: `${p.score * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">{p.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Thinking Biases */}
          {data.thinkingBiases.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/40 mb-1">Thinking Biases</p>
              <div className="flex flex-wrap gap-1">
                {data.thinkingBiases.map((bias, i) => (
                  <span key={i} className="px-1.5 py-0.5 text-[10px] rounded-lg bg-destructive/10 text-destructive/70 border border-destructive/20">
                    {bias}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Observation */}
          <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed">{data.observation}</p>

          {/* Blind spot + recommendation */}
          <div className="space-y-1.5">
            <div className="p-2 border border-amber-500/20 bg-amber-500/5 rounded-lg">
              <p className="text-[10px] font-medium text-amber-500/60 mb-0.5">Blind Spot</p>
              <p className="text-[10px] text-foreground/70">{data.blindSpot}</p>
            </div>
            <div className="p-2 border border-primary/20 bg-primary/5 rounded-lg">
              <p className="text-[10px] font-medium text-primary/60 mb-0.5">Recommendation</p>
              <p className="text-[10px] text-foreground/70">{data.recommendation}</p>
            </div>
          </div>
        </CardContent>
      )}

      {!data && !loading && (
        <CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground/40 text-center py-4">
            Click "Analyze" to reveal your cognitive patterns.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
