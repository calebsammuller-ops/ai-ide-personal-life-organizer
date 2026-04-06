'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { fetchCognitiveMemory, selectCognitiveMemoryBeliefs, selectRecurringPatterns, selectMemoryBlindSpots, selectMemoryStrengths, selectCognitiveMemoryLoading } from '@/state/slices/cognitiveMemorySlice'

export function CognitiveDNA() {
  const dispatch = useAppDispatch()
  const beliefs = useAppSelector(selectCognitiveMemoryBeliefs)
  const patterns = useAppSelector(selectRecurringPatterns)
  const blindSpots = useAppSelector(selectMemoryBlindSpots)
  const strengths = useAppSelector(selectMemoryStrengths)
  const loading = useAppSelector(selectCognitiveMemoryLoading)

  useEffect(() => {
    dispatch(fetchCognitiveMemory())
  }, [dispatch])

  const hasData = beliefs.length > 0 || patterns.length > 0

  if (loading && !hasData) {
    return (
      <div className="rounded-lg border border-border/40 bg-card p-3">
        <div className="h-1.5 w-24 bg-muted/60 animate-pulse rounded-lg mb-2" />
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-1.5 bg-muted/40 animate-pulse rounded-lg" style={{ width: `${70 + i * 10}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!hasData) return null

  return (
    <div className="rounded-lg border border-border/40 bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
        <div className="w-0.5 h-3 bg-primary" />
        <p className="text-[10px] font-semibold text-primary/70">Cognitive DNA</p>
      </div>
      <div className="p-3 space-y-3">
        {beliefs.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-primary/40 mb-1">Core Beliefs</p>
            <ul className="space-y-0.5">
              {beliefs.map((b, i) => (
                <li key={i} className="text-[10px] text-foreground/70 flex gap-1.5">
                  <span className="text-primary/30 shrink-0">·</span>{b}
                </li>
              ))}
            </ul>
          </div>
        )}
        {patterns.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-primary/40 mb-1">Recurring Patterns</p>
            <ul className="space-y-0.5">
              {patterns.map((p, i) => (
                <li key={i} className="text-[10px] text-foreground/70 flex gap-1.5">
                  <span className="text-primary/30 shrink-0">·</span>{p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {blindSpots.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-destructive/40 mb-1">Blind Spots</p>
            <ul className="space-y-0.5">
              {blindSpots.map((b, i) => (
                <li key={i} className="text-[10px] text-destructive/60 flex gap-1.5">
                  <span className="shrink-0">⚠</span>{b}
                </li>
              ))}
            </ul>
          </div>
        )}
        {strengths.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-primary/40 mb-1">Strengths</p>
            <ul className="space-y-0.5">
              {strengths.map((s, i) => (
                <li key={i} className="text-[10px] text-foreground/70 flex gap-1.5">
                  <span className="text-primary/40 shrink-0">✓</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
