'use client'

import { useEffect, useState } from 'react'
import { Brain, RefreshCw, Lightbulb, Network, Sparkles, Share2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchNotes, fetchBriefing, generateBriefing,
  fetchPredictions, generatePredictions,
  selectAllNotes, selectAllLinks, selectBriefing, selectKnowledgeGenerating,
  selectPredictions,
} from '@/state/slices/knowledgeSlice'
import { fetchCognitiveMirror } from '@/state/slices/cognitiveMirrorSlice'
import { fetchStrategy } from '@/state/slices/strategySlice'
import { fetchTrajectory } from '@/state/slices/trajectorySlice'
import { fetchWeeklyReview } from '@/state/slices/weeklyReviewSlice'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { CognitiveMirrorCard } from './CognitiveMirrorCard'
import { StrategyEngineCard } from './StrategyEngineCard'
import { LifeTrajectoryCard } from './LifeTrajectoryCard'
import { ShareableInsightCard } from './ShareableInsightCard'
import { WhatIfSimulator } from './WhatIfSimulator'
import { WeeklyReviewCard } from './WeeklyReviewCard'
import { DecisionEngineCard } from './DecisionEngineCard'

interface SharingNote {
  title: string
  content: string
  tags: string[]
}

export function InsightsDashboard() {
  const dispatch = useAppDispatch()
  const notes = useAppSelector(selectAllNotes)
  const links = useAppSelector(selectAllLinks)
  const briefing = useAppSelector(selectBriefing)
  const isGenerating = useAppSelector(selectKnowledgeGenerating)
  const predictions = useAppSelector(selectPredictions)
  const [sharingNote, setSharingNote] = useState<SharingNote | null>(null)

  useEffect(() => {
    dispatch(fetchNotes() as any)
    dispatch(fetchBriefing() as any)
    dispatch(fetchPredictions() as any)
    dispatch(fetchCognitiveMirror() as any)
    dispatch(fetchStrategy() as any)
    dispatch(fetchTrajectory() as any)
    dispatch(fetchWeeklyReview() as any)
  }, [dispatch])

  const insightNotes = notes.filter(n => n.tags?.includes('ai-insight'))

  return (
    <div className="space-y-3">
      <div className="flex-shrink-0 flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-primary" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-primary">INTELLIGENCE HUB</h2>
          <span className="text-[9px] font-mono text-muted-foreground/40">{notes.length} ideas · {links.length} links · {insightNotes.length} insights</span>
        </div>
        <Button
          onClick={() => dispatch(generateBriefing() as any)}
          disabled={isGenerating}
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] font-mono text-amber-400 hover:bg-amber-500/10"
        >
          <RefreshCw className={cn('h-3 w-3 mr-1', isGenerating && 'animate-spin')} />
          {isGenerating ? '...' : 'Refresh'}
        </Button>
      </div>

      {/* Cognitive Mirror */}
      <CognitiveMirrorCard />

      {/* Strategy Engine */}
      <StrategyEngineCard />

      {/* Life Trajectory */}
      <LifeTrajectoryCard />

      {/* Weekly Review */}
      <WeeklyReviewCard />

      {/* Decision Engine */}
      <DecisionEngineCard />

      {/* Knowledge Briefing */}
      {briefing && (
        <Card className="rounded-sm border-amber-500/20 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-amber-500/20">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/80">AI BRIEFING</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {briefing.briefing && (
              <p className="text-xs text-muted-foreground/80 font-mono leading-relaxed">{briefing.briefing}</p>
            )}
            {briefing.insights?.map((insight: { title: string; content: string }, i: number) => (
              <div key={i} className="flex items-start gap-2 p-1.5 bg-amber-500/5 border border-amber-500/20 rounded-sm group">
                <span className="text-[10px] font-mono font-bold text-amber-500/60 shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono font-bold text-amber-400">{insight.title}</p>
                  <p className="text-[9px] text-muted-foreground/70">{insight.content}</p>
                </div>
                <button
                  onClick={() => setSharingNote({ title: insight.title, content: insight.content, tags: [] })}
                  className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Share2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Predictions */}
      {predictions.length > 0 && (
        <Card className="rounded-sm border-purple-500/20 bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-purple-500/20">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400/80">AI PREDICTIONS</span>
              <span className="text-[9px] font-mono text-muted-foreground/40">{predictions.length} active</span>
            </CardTitle>
            <Button
              variant="ghost" size="sm"
              onClick={() => dispatch(generatePredictions() as any)}
              disabled={isGenerating}
              className="h-6 px-2 text-[10px] font-mono text-purple-400 hover:bg-purple-500/10"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isGenerating && 'animate-spin')} />
              {isGenerating ? '...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-1.5">
              {predictions.map(p => (
                <div key={p.id} className="flex items-start gap-2 p-1.5 bg-purple-500/5 border border-purple-500/20 rounded-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded-sm bg-purple-500/20 text-purple-400">
                        {p.predictionType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[8px] font-mono text-muted-foreground/30">{Math.round(p.confidence * 100)}%</span>
                    </div>
                    <p className="text-[10px] font-mono text-foreground/80 leading-relaxed">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI-Generated Insight Notes */}
      {insightNotes.length > 0 && (
        <Card className="rounded-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-border/50">
            <CardTitle className="flex items-center gap-2">
              <Network className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/80">AUTONOMOUS INSIGHTS</span>
              <span className="text-[9px] font-mono text-muted-foreground/40">{insightNotes.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-1.5">
              {insightNotes.slice(0, 5).map(note => (
                <div key={note.id} className="flex items-start gap-2 p-2 border border-border/40 bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-colors group rounded-sm">
                  <Link href={`/knowledge?noteId=${note.id}`} className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-foreground/80 truncate">{note.title}</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5 line-clamp-2 leading-relaxed">{note.content}</p>
                    <p className="text-[8px] font-mono text-muted-foreground/30 mt-0.5">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                  <button
                    onClick={() => setSharingNote({ title: note.title, content: note.content, tags: note.tags || [] })}
                    className="shrink-0 text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Share2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {insightNotes.length > 5 && (
                <Link href="/knowledge" className="text-[9px] font-mono text-primary/60 hover:text-primary block text-center pt-1">
                  View all {insightNotes.length} insights →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What If Simulator */}
      <WhatIfSimulator />

      {/* Empty state */}
      {!briefing && predictions.length === 0 && insightNotes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-2">No insights yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Add ideas to your knowledge base and generate your first AI briefing.
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/knowledge">
                <Button variant="outline">Add Ideas</Button>
              </Link>
              <Button onClick={() => dispatch(generateBriefing() as any)} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Briefing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Shareable Insight Card Modal */}
      {sharingNote && (
        <ShareableInsightCard
          title={sharingNote.title}
          content={sharingNote.content}
          tags={sharingNote.tags}
          onClose={() => setSharingNote(null)}
        />
      )}
    </div>
  )
}
