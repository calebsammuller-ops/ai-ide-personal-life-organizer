'use client'

import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Brain, Sparkles, RefreshCw, Network, Zap, X, ArrowRight, MessageCircle, Lightbulb, Link2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SeismicWave } from '@/components/ui/SeismicWave'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { openModal } from '@/state/slices/uiSlice'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'
import {
  fetchNotes, fetchBriefing, generateBriefing,
  fetchPredictions, generatePredictions, dismissPrediction,
  selectAllNotes, selectAllLinks, selectBriefing, selectBriefingAge, selectKnowledgeGenerating,
  selectPredictions,
} from '@/state/slices/knowledgeSlice'
import { fetchCognitiveMirror, selectCognitiveMirrorData } from '@/state/slices/cognitiveMirrorSlice'
import { fetchTrajectory, selectTrajectoryData } from '@/state/slices/trajectorySlice'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const dispatch = useAppDispatch()

  const knowledgeNotes = useAppSelector(selectAllNotes)
  const knowledgeLinks = useAppSelector(selectAllLinks)
  const briefing = useAppSelector(selectBriefing)
  const briefingAge = useAppSelector(selectBriefingAge)
  const isBriefingGenerating = useAppSelector(selectKnowledgeGenerating)
  const predictions = useAppSelector(selectPredictions)
  const cognitiveData = useAppSelector(selectCognitiveMirrorData)
  const trajectoryData = useAppSelector(selectTrajectoryData)

  useRegisterPageContext({
    pageTitle: 'Home',
    visibleContent: {
      type: 'dashboard',
      noteCount: knowledgeNotes.length,
      linkCount: knowledgeLinks.length,
    },
  })

  useEffect(() => {
    dispatch(fetchNotes() as any)
    dispatch(fetchBriefing() as any)
    dispatch(fetchPredictions() as any)
    dispatch(fetchCognitiveMirror() as any)
    dispatch(fetchTrajectory() as any)
  }, [dispatch])

  const stats = [
    { label: 'IDEAS CAPTURED', value: knowledgeNotes.filter(n => !n.tags?.includes('ai-insight')).length, href: '/knowledge' },
    { label: 'CONNECTIONS', value: knowledgeLinks.length, href: '/knowledge/graph' },
    { label: 'INSIGHTS GENERATED', value: knowledgeNotes.filter(n => n.tags?.includes('ai-insight')).length, href: '/insights' },
    { label: 'CONCEPTS DEVELOPED', value: predictions.length, href: '/insights' },
  ]

  // TODAY'S FOCUS: top 3 non-ai-insight notes by importance desc
  const todaysFocus = useMemo(() => {
    return knowledgeNotes
      .filter(n => !n.tags?.includes('ai-insight'))
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
      .slice(0, 3)
  }, [knowledgeNotes])

  // CURIOSITY TRIGGER: find an orphan note (no links) updated most recently
  const orphanNote = useMemo(() => {
    if (knowledgeNotes.length < 5) return null
    const linkedIds = new Set(
      knowledgeLinks.flatMap(l => [l.sourceNoteId, l.targetNoteId])
    )
    return knowledgeNotes
      .filter(n => !n.tags?.includes('ai-insight') && !linkedIds.has(n.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null
  }, [knowledgeNotes, knowledgeLinks])

  return (
    <main className="flex flex-col h-[calc(100vh-3rem)] md:h-[calc(100vh-0px)] p-3 md:p-4 pb-16 md:pb-4 overflow-y-auto gap-3">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-primary" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-primary">COMMAND CENTER</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 bg-primary"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">ACTIVE</span>
        </div>
      </div>

      <SeismicWave height={40} className="opacity-50 flex-shrink-0" />

      {/* Stats strip */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="border border-border/50 bg-card p-2 hover:border-primary/30 hover:bg-primary/5 transition-colors">
              <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-1 leading-tight">{stat.label}</p>
              <p className="text-lg font-mono font-bold text-primary leading-none">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-2">
        <Link href="/knowledge">
          <Button variant="outline" size="sm" className="w-full h-8 text-[10px] font-mono justify-start gap-2">
            <Brain className="h-3 w-3" /> New Idea
          </Button>
        </Link>
        <Link href="/knowledge/graph">
          <Button variant="outline" size="sm" className="w-full h-8 text-[10px] font-mono justify-start gap-2">
            <Network className="h-3 w-3" /> Graph
          </Button>
        </Link>
        <Link href="/live-assistant">
          <Button variant="outline" size="sm" className="w-full h-8 text-[10px] font-mono justify-start gap-2">
            <MessageCircle className="h-3 w-3" /> Think
          </Button>
        </Link>
      </div>

      {/* AI OBSERVATIONS */}
      <Card className="rounded-sm border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/80">AI OBSERVATIONS</p>
            <span className="text-[9px] font-mono text-muted-foreground/40">{knowledgeNotes.length} ideas · {knowledgeLinks.length} links</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost" size="sm"
              onClick={() => dispatch(generateBriefing() as any)}
              disabled={isBriefingGenerating}
              className="h-6 px-2 text-[10px] font-mono text-amber-400 hover:bg-amber-500/10"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isBriefingGenerating && 'animate-spin')} />
              {isBriefingGenerating ? '...' : 'Refresh'}
            </Button>
            <Link href="/knowledge">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-mono text-muted-foreground hover:text-primary">
                OPEN <ArrowRight className="h-3 w-3 ml-0.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {briefing ? (
            <div className="space-y-2">
              {briefing.briefing && (
                <p className="text-xs text-muted-foreground/80 font-mono leading-relaxed">{briefing.briefing}</p>
              )}
              {briefing.insights?.slice(0, 2).map((insight: { title: string; content: string }, i: number) => (
                <div key={i} className="flex items-start gap-2 p-1.5 bg-amber-500/5 border border-amber-500/20 rounded">
                  <span className="text-[10px] font-mono font-bold text-amber-500/60 shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="text-[10px] font-mono font-bold text-amber-400">{insight.title}</p>
                    <p className="text-[9px] text-muted-foreground/70">{insight.content?.slice(0, 120)}</p>
                  </div>
                </div>
              ))}
              {briefingAge && (
                <p className="text-[8px] font-mono text-muted-foreground/30">
                  Last updated: {new Date(briefingAge).toLocaleTimeString()}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="grid grid-cols-3 gap-4 flex-1">
                <div className="text-center">
                  <p className="text-xl font-mono font-bold text-primary">{knowledgeNotes.length}</p>
                  <p className="text-[9px] font-mono text-muted-foreground/50">Ideas</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-mono font-bold text-primary">{knowledgeLinks.length}</p>
                  <p className="text-[9px] font-mono text-muted-foreground/50">Links</p>
                </div>
                <div className="text-center">
                  <Link href="/knowledge/graph">
                    <div className="flex flex-col items-center hover:text-primary transition-colors text-muted-foreground/50">
                      <Network className="h-5 w-5" />
                      <p className="text-[9px] font-mono">Graph</p>
                    </div>
                  </Link>
                </div>
              </div>
              <Button
                onClick={() => dispatch(generateBriefing() as any)}
                disabled={isBriefingGenerating}
                size="sm"
                className="font-mono text-[10px] shrink-0"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Brief Me
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* COGNITIVE PROFILE */}
      {cognitiveData && (
        <Card className="rounded-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/80">COGNITIVE PROFILE</p>
            </div>
            <Link href="/insights">
              <span className="text-[9px] font-mono text-muted-foreground/40 hover:text-primary transition-colors">Full analysis →</span>
            </Link>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/30">
                {cognitiveData.dominantStyle}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/50">{cognitiveData.learningStyle} Learner</span>
              <span className="ml-auto text-[9px] font-mono text-muted-foreground/30">
                Focus: {Math.round(cognitiveData.focusScore * 100)}%
              </span>
            </div>
            <div className="h-1 bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${cognitiveData.focusScore * 100}%` }} />
            </div>
            <div className="space-y-1">
              {cognitiveData.patterns.slice(0, 2).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-foreground/60 flex-1 truncate">{p.label}</span>
                  <div className="w-16 h-1 bg-muted overflow-hidden">
                    <div
                      className={cn('h-full transition-all', p.valence === 'strength' ? 'bg-primary/70' : p.valence === 'weakness' ? 'bg-destructive/60' : 'bg-muted-foreground/40')}
                      style={{ width: `${p.score * 100}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-muted-foreground/30 w-6 text-right">{Math.round(p.score * 100)}%</span>
                </div>
              ))}
            </div>
            {trajectoryData?.narrative?.headline && (
              <p className="text-[9px] font-mono text-muted-foreground/50 italic border-t border-border/30 pt-1.5">
                {trajectoryData.narrative.headline}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* CURIOSITY TRIGGER */}
      {orphanNote && (
        <Link href={`/knowledge?noteId=${orphanNote.id}`}>
          <div className="curiosity-pulse border border-primary/25 bg-primary/[0.03] rounded-sm px-3 py-2 flex items-center gap-2 hover:bg-primary/[0.06] transition-colors">
            <Link2 className="h-3 w-3 text-primary/60 shrink-0" />
            <p className="text-[10px] font-mono text-muted-foreground/70 flex-1">
              <span className="text-primary/70">This idea is waiting to connect:</span> {orphanNote.title}
            </p>
            <ArrowRight className="h-3 w-3 text-primary/40 shrink-0" />
          </div>
        </Link>
      )}

      {/* TODAY'S FOCUS */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-0.5 h-4 bg-primary" />
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/80">TODAY'S FOCUS</p>
        </div>
        {todaysFocus.length === 0 ? (
          <p className="text-[10px] font-mono text-muted-foreground/40 px-3">Add ideas to build your focus list.</p>
        ) : (
          <div className="space-y-1.5">
            {todaysFocus.map((note) => (
              <Link key={note.id} href={`/knowledge?noteId=${note.id}`}>
                <div className="flex items-center gap-2 border border-border/50 bg-card px-3 py-2 hover:border-primary/30 hover:bg-primary/5 transition-colors group">
                  <Lightbulb className="h-3 w-3 text-muted-foreground/40 shrink-0 group-hover:text-primary/60 transition-colors" />
                  <p className="text-xs font-mono text-foreground/80 flex-1 truncate">{note.title}</p>
                  <span className="text-[9px] font-mono text-muted-foreground/40 uppercase shrink-0">{note.type}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary/40 shrink-0 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* AI Predictions */}
      {(predictions.length > 0 || knowledgeNotes.length >= 3) && (
        <Card className="rounded-sm border-purple-500/20 bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-purple-400" />
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400/80">AI PREDICTIONS</p>
              {predictions.length > 0 && (
                <span className="text-[9px] font-mono text-muted-foreground/40">{predictions.length} active</span>
              )}
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => dispatch(generatePredictions() as any)}
              disabled={isBriefingGenerating}
              className="h-6 px-2 text-[10px] font-mono text-purple-400 hover:bg-purple-500/10"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isBriefingGenerating && 'animate-spin')} />
              {isBriefingGenerating ? '...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            {predictions.length === 0 ? (
              <div className="text-center py-2">
                <p className="text-[10px] font-mono text-muted-foreground/40">No predictions yet</p>
                <button
                  onClick={() => dispatch(generatePredictions() as any)}
                  disabled={isBriefingGenerating}
                  className="text-[10px] font-mono text-purple-400 hover:underline mt-1"
                >
                  Generate predictions →
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {predictions.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-start gap-2 p-1.5 bg-purple-500/5 border border-purple-500/20 rounded group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded bg-purple-500/20 text-purple-400">
                          {p.predictionType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[8px] font-mono text-muted-foreground/30">{Math.round(p.confidence * 100)}%</span>
                      </div>
                      <p className="text-[10px] font-mono text-foreground/80 leading-relaxed">{p.description}</p>
                      {p.predictionType === 'next_topic' && (
                        <Link href="/knowledge/research" className="text-[9px] font-mono text-purple-400 hover:underline">
                          Explore this topic →
                        </Link>
                      )}
                    </div>
                    <button
                      onClick={() => dispatch(dismissPrediction(p.id) as any)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-muted-foreground transition-all shrink-0 mt-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {predictions.length > 3 && (
                  <p className="text-[9px] font-mono text-muted-foreground/30 text-center">+{predictions.length - 3} more predictions</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
