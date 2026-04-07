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
import { CognitiveSignature } from './CognitiveSignature'
import { CognitiveHeatmap } from './CognitiveHeatmap'
import { CognitiveDNA } from './CognitiveDNA'
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
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="text-base font-semibold text-foreground">Intelligence Hub</h2>
          <span className="text-xs text-muted-foreground/40">{notes.length} ideas · {links.length} links</span>
        </div>
        <Button
          onClick={() => dispatch(generateBriefing() as any)}
          disabled={isGenerating}
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs text-amber-400 hover:bg-amber-500/10 rounded-lg"
        >
          <RefreshCw className={cn('h-3 w-3 mr-1', isGenerating && 'animate-spin')} />
          {isGenerating ? '...' : 'Refresh'}
        </Button>
      </div>

      {/* Cognitive Signature */}
      <CognitiveSignature />

      {/* Cognitive Heatmap */}
      <CognitiveHeatmap notes={notes} />

      {/* Cognitive DNA */}
      <CognitiveDNA />

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
        <Card className="rounded-xl card-gradient-amber border-l-[3px] border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-amber-500/15">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-primary/10">
                <Brain className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground/80">AI Briefing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {briefing.briefing && (
              <p className="text-sm text-muted-foreground/80 leading-relaxed">{briefing.briefing}</p>
            )}
            {briefing.insights?.map((insight: { title: string; content: string }, i: number) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg group">
                <div className="p-1 rounded-md bg-amber-500/10 mt-0.5">
                  <Sparkles className="h-3 w-3 text-amber-400/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-400">{insight.title}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">{insight.content}</p>
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
        <Card className="rounded-xl card-gradient-purple border-l-[3px] border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-purple-500/15">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-purple-500/10">
                <Lightbulb className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <span className="text-xs font-semibold text-foreground/80">AI Predictions</span>
              <span className="text-[10px] text-muted-foreground/40">{predictions.length} active</span>
            </CardTitle>
            <Button
              variant="ghost" size="sm"
              onClick={() => dispatch(generatePredictions() as any)}
              disabled={isGenerating}
              className="h-7 px-2.5 text-xs text-purple-400 hover:bg-purple-500/10 rounded-lg"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isGenerating && 'animate-spin')} />
              {isGenerating ? '...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-1.5">
              {predictions.map(p => (
                <div key={p.id} className="flex items-start gap-2.5 p-2.5 bg-purple-500/5 border border-purple-500/15 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                        {p.predictionType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground/30">{Math.round(p.confidence * 100)}%</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI-Generated Insight Notes */}
      {insightNotes.length > 0 && (
        <Card className="rounded-xl border-border/30">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-primary/10">
                <Network className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground/80">Autonomous Insights</span>
              <span className="text-[10px] text-muted-foreground/40">{insightNotes.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {insightNotes.slice(0, 5).map(note => (
                <div key={note.id} className="flex items-start gap-2.5 p-3 border border-border/30 bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-all group rounded-xl hover-lift">
                  <Link href={`/knowledge?noteId=${note.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/80 truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-2 leading-relaxed">{note.content}</p>
                    <p className="text-[10px] text-muted-foreground/30 mt-1">
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
                <Link href="/knowledge" className="text-xs text-primary/60 hover:text-primary block text-center pt-1">
                  View all {insightNotes.length} insights →
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What If Simulator */}
      <WhatIfSimulator />

      {/* Loop continuation CTA — pulls back into the capture cycle */}
      <div className="mt-4 p-5 border border-border/30 rounded-xl bg-primary/[0.03] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground/70">Keep the loop going</p>
          <p className="text-xs text-muted-foreground/50 mt-0.5">Every idea you add sharpens the next insight.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a href="/knowledge" className="text-xs font-medium text-primary border border-primary/30 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors">
            Capture →
          </a>
          <a href="/live-assistant" className="text-xs text-muted-foreground/60 border border-border/40 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors">
            Think with AI →
          </a>
        </div>
      </div>

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
