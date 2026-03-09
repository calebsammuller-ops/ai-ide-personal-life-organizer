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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Insights</h2>
          <p className="text-muted-foreground">
            {notes.length} ideas · {links.length} connections · {insightNotes.length} AI-generated insights
          </p>
        </div>
        <Button
          onClick={() => dispatch(generateBriefing() as any)}
          disabled={isGenerating}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isGenerating && 'animate-spin')} />
          {isGenerating ? 'Generating...' : 'Refresh Briefing'}
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" />
              Knowledge Briefing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {briefing.briefing && (
              <p className="text-sm text-muted-foreground leading-relaxed">{briefing.briefing}</p>
            )}
            {briefing.insights?.map((insight: { title: string; content: string }, i: number) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-amber-600">{insight.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{insight.content}</p>
                </div>
                <button
                  onClick={() => setSharingNote({ title: insight.title, content: insight.content, tags: [] })}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  title="Share this insight"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Predictions */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-purple-500" />
                AI Predictions
              </CardTitle>
              <Button
                variant="ghost" size="sm"
                onClick={() => dispatch(generatePredictions() as any)}
                disabled={isGenerating}
              >
                <RefreshCw className={cn('h-3 w-3 mr-1', isGenerating && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predictions.map(p => (
                <div key={p.id} className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {p.predictionType.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{Math.round(p.confidence * 100)}% confidence</span>
                  </div>
                  <p className="text-sm">{p.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI-Generated Insight Notes */}
      {insightNotes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="h-4 w-4 text-primary" />
              Autonomous Insights
              <Badge variant="secondary" className="ml-auto">{insightNotes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insightNotes.slice(0, 5).map(note => (
                <div key={note.id} className="flex items-start gap-2 p-3 border border-border/50 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors group">
                  <Link href={`/knowledge?noteId=${note.id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{note.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                  <button
                    onClick={() => setSharingNote({ title: note.title, content: note.content, tags: note.tags || [] })}
                    className="shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                    title="Share this insight"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {insightNotes.length > 5 && (
                <Link href="/knowledge" className="text-sm text-primary hover:underline block text-center pt-1">
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
