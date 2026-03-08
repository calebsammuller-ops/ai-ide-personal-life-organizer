'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Sparkles, RefreshCw, Network, Zap, X, ArrowRight, MessageCircle } from 'lucide-react'
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
  }, [dispatch])

  const stats = [
    { label: 'IDEAS', value: knowledgeNotes.length, href: '/knowledge' },
    { label: 'CONNECTIONS', value: knowledgeLinks.length, href: '/knowledge/graph' },
    { label: 'AI INSIGHTS', value: predictions.length, href: '/insights' },
  ]

  return (
    <main className="flex flex-col h-[calc(100vh-3rem)] md:h-[calc(100vh-0px)] p-3 md:p-4 pb-16 md:pb-4 overflow-y-auto gap-3">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-primary" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-primary">THINKING PARTNER</h2>
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

      {/* Stats */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="border border-border/50 bg-card p-2 hover:border-primary/30 hover:bg-primary/5 transition-colors">
              <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-1">{stat.label}</p>
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

      {/* Knowledge Brain Briefing */}
      <Card className="rounded-sm border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/80">KNOWLEDGE BRIEFING</p>
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
                  <Sparkles className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
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
