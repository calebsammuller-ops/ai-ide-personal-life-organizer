'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, RefreshCw, Network, Zap, X, ArrowRight, MessageCircle, Lightbulb, Link2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SeismicWave } from '@/components/ui/SeismicWave'
import { AnimatedStat, GlowProgress } from '@/components/ui/animated'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'
import {
  fetchNotes, fetchBriefing, generateBriefing,
  fetchPredictions, generatePredictions, dismissPrediction,
  selectAllNotes, selectAllLinks, selectBriefing, selectBriefingAge, selectKnowledgeGenerating,
  selectPredictions,
} from '@/state/slices/knowledgeSlice'
import { fetchCognitiveMirror, selectCognitiveMirrorData } from '@/state/slices/cognitiveMirrorSlice'
import { fetchTrajectory, selectTrajectoryData } from '@/state/slices/trajectorySlice'
import { selectIntelligenceScore } from '@/state/slices/intelligenceScoreSlice'
import { selectMomentumScore, selectMomentumTrend, selectMomentumStreak, applyDecay } from '@/state/slices/momentumSlice'
import { selectCognitiveState, setCognitiveState, setPredictedNextState, computeCognitiveState, predictNextState } from '@/state/slices/cognitiveStateSlice'
import { selectIdentityTitle, selectIdentityTraits, evolveIdentity, setFutureProjection, commitIdentity, selectCommittedIdentity, selectLastEvolved } from '@/state/slices/identitySlice'
import { selectCurrentNextMove, selectMissedCount, selectIgnoredCount, selectNextMoveHistory, selectLastSessionMove, setNextMove } from '@/state/slices/nextMoveSlice'
import { setWeeklyMetrics, computeWeeklyMetrics } from '@/state/slices/selfCompetitionSlice'
import { selectLockInActive } from '@/state/slices/lockInSlice'
import { selectFailurePatterns } from '@/state/slices/metaLearningSlice'
import { SelfCompetitionCard } from '@/components/dashboard/SelfCompetitionCard'
import { FutureSelfCard } from '@/components/dashboard/FutureSelfCard'
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
  const intelligenceScore = useAppSelector(selectIntelligenceScore)
  const momentumScore = useAppSelector(selectMomentumScore)
  const momentumTrend = useAppSelector(selectMomentumTrend)
  const momentumStreak = useAppSelector(selectMomentumStreak)
  const cognitiveState = useAppSelector(selectCognitiveState)
  const identityTitle = useAppSelector(selectIdentityTitle)
  const identityTraits = useAppSelector(selectIdentityTraits)
  const committedIdentity = useAppSelector(selectCommittedIdentity)
  const currentNextMove = useAppSelector(selectCurrentNextMove)
  const missedCount = useAppSelector(selectMissedCount)
  const ignoredCount = useAppSelector(selectIgnoredCount)
  const nextMoveHistory = useAppSelector(selectNextMoveHistory)
  const lastSessionMove = useAppSelector(selectLastSessionMove)
  const lockInActive = useAppSelector(selectLockInActive)
  const failurePatterns = useAppSelector(selectFailurePatterns)
  const lastEvolved = useAppSelector(selectLastEvolved)

  const [showSessionRitual, setShowSessionRitual] = useState(false)
  const [showDailyMirror, setShowDailyMirror] = useState(false)
  const [showCommitmentModal, setShowCommitmentModal] = useState(false)
  const [showEvolution, setShowEvolution] = useState(false)
  const [evolvedTo, setEvolvedTo] = useState<string | null>(null)

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
    dispatch(applyDecay())
  }, [dispatch])

  // Behavioral OS orchestration
  useEffect(() => {
    if (knowledgeNotes.length === 0) return

    const recentCount = knowledgeNotes.filter(n => {
      const now = Date.now()
      return (now - new Date(n.updatedAt).getTime()) < 24 * 60 * 60 * 1000
    }).length

    dispatch(setCognitiveState(computeCognitiveState(knowledgeNotes, missedCount, ignoredCount, lockInActive)))
    dispatch(setPredictedNextState(predictNextState(momentumScore, missedCount, recentCount)))

    // Identity evolution
    const expandedCount = knowledgeNotes.filter(n => n.source === 'AI' && n.type === 'permanent').length
    const executionRate = knowledgeNotes.length > 0 ? expandedCount / knowledgeNotes.length : 0
    const score = intelligenceScore || 0
    const newTitle =
      score >= 100 && executionRate >= 0.30 ? 'Operator' :
      score >= 50 && executionRate >= 0.15 ? 'Builder' :
      knowledgeNotes.length >= 10 ? 'Explorer' : 'Seeker'

    const prevTitle = identityTitle
    dispatch(evolveIdentity({
      title: newTitle as any,
      level: Math.min(100, score),
      traits: cognitiveData?.thinkingBiases || [],
    }))

    if ((newTitle === 'Builder' || newTitle === 'Operator') &&
        prevTitle !== newTitle &&
        committedIdentity === null) {
      setShowCommitmentModal(true)
    }

    dispatch(setWeeklyMetrics(computeWeeklyMetrics(knowledgeNotes, knowledgeLinks, nextMoveHistory.length)))

    if (trajectoryData?.narrative?.headline) {
      dispatch(setFutureProjection(trajectoryData.narrative.headline.slice(0, 80)))
    }
  }, [knowledgeNotes, cognitiveData, trajectoryData, missedCount, ignoredCount, lockInActive, momentumScore, intelligenceScore])

  // Identity evolution moment
  useEffect(() => {
    if (!lastEvolved) return
    const key = `evolution_seen_${lastEvolved}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      setEvolvedTo(identityTitle)
      setShowEvolution(true)
      setTimeout(() => setShowEvolution(false), 2500)
    }
  }, [lastEvolved, identityTitle])

  // Zeigarnik: restore last session move
  useEffect(() => {
    const unfinished = localStorage.getItem('lastSessionMove')
    if (unfinished && !currentNextMove) {
      try {
        const parsed = JSON.parse(unfinished)
        dispatch(setNextMove({ ...parsed, source: 'system' }))
      } catch {}
    }
  }, [])

  // Once-per-day session ritual + mirror
  useEffect(() => {
    const today = new Date().toDateString()
    if (localStorage.getItem('lastSessionDate') !== today) {
      setShowSessionRitual(true)
    }
    if (cognitiveData && localStorage.getItem('lastMirrorDate') !== today) {
      setShowDailyMirror(true)
    }
  }, [cognitiveData])

  const stats = [
    { label: 'IDEAS CAPTURED', value: knowledgeNotes.filter(n => !n.tags?.includes('ai-insight')).length, href: '/knowledge' },
    { label: 'CONNECTIONS', value: knowledgeLinks.length, href: '/knowledge/graph' },
    { label: 'INSIGHTS GENERATED', value: knowledgeNotes.filter(n => n.tags?.includes('ai-insight')).length, href: '/insights' },
    { label: 'CONCEPTS DEVELOPED', value: predictions.length, href: '/insights' },
  ]

  const todaysFocus = useMemo(() => {
    return knowledgeNotes
      .filter(n => !n.tags?.includes('ai-insight'))
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
      .slice(0, 3)
  }, [knowledgeNotes])

  const orphanNote = useMemo(() => {
    if (knowledgeNotes.length < 5) return null
    const linkedIds = new Set(knowledgeLinks.flatMap(l => [l.sourceNoteId, l.targetNoteId]))
    return knowledgeNotes
      .filter(n => !n.tags?.includes('ai-insight') && !linkedIds.has(n.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null
  }, [knowledgeNotes, knowledgeLinks])

  const expandedCount = knowledgeNotes.filter(n => n.source === 'AI' && n.type === 'permanent').length
  const executionRate = knowledgeNotes.length > 0 ? expandedCount / knowledgeNotes.length : 0
  const topFailurePattern = failurePatterns?.[0] || null

  return (
    <main className="flex flex-col h-[calc(100vh-3rem)] md:h-[calc(100vh-0px)] p-3 md:p-4 pb-16 md:pb-4 overflow-y-auto gap-3">

      {/* Identity Evolution Moment */}
      <AnimatePresence>
        {showEvolution && evolvedTo && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <motion.div className="text-center" initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 1.05 }}>
              <p className="text-[9px] font-mono text-primary/50 uppercase tracking-widest mb-3">You are now becoming</p>
              <p className="text-5xl font-mono font-bold text-primary">{evolvedTo}</p>
              <motion.div className="h-px bg-primary/50 mt-4 mx-auto" initial={{ width: 0 }} animate={{ width: 160 }} transition={{ delay: 0.3, duration: 0.7 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity Commitment Modal */}
      {showCommitmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="rounded-sm border-primary/40 bg-card w-[280px]">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs font-mono font-bold text-primary">You are operating at {identityTitle} level.</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">
                Commit? This increases pressure and removes passive suggestions.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { dispatch(commitIdentity(identityTitle as any)); setShowCommitmentModal(false) }}
                  className="flex-1 text-[10px] font-mono border border-primary/40 text-primary hover:bg-primary/10 py-1.5 transition-colors"
                >
                  Commit →
                </button>
                <button
                  onClick={() => setShowCommitmentModal(false)}
                  className="flex-1 text-[10px] font-mono border border-border/40 text-muted-foreground hover:bg-muted/10 py-1.5 transition-colors"
                >
                  Not yet
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
      <div className="flex-shrink-0 grid grid-cols-4 gap-2 secondary-content">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="card-glow border border-border/50 bg-card p-2 hover:border-primary/30 hover:bg-primary/5 transition-colors">
              <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-1 leading-tight">{stat.label}</p>
              <p className="text-lg font-mono font-bold text-primary leading-none stat-glow">
                <AnimatedStat value={stat.value} />
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-2 secondary-content">
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

      {/* Identity Gap Alert */}
      {identityTitle === 'Builder' && executionRate < 0.15 && knowledgeNotes.length >= 5 && (
        <Card className="rounded-sm border-destructive/20 bg-destructive/5">
          <CardContent className="pt-3 pb-2">
            <p className="text-[9px] font-mono text-destructive/70 uppercase tracking-widest">IDENTITY GAP</p>
            <p className="text-[10px] font-mono text-foreground/70 mt-1">
              You identify as <strong>Builder</strong> but act like Explorer.
            </p>
            <p className="text-[9px] font-mono text-destructive/50 mt-1">Execution rate {Math.round(executionRate * 100)}% — target 15%.</p>
          </CardContent>
        </Card>
      )}

      {/* Failure Pattern Detected */}
      {topFailurePattern && topFailurePattern.frequency > 2 && (
        <Card className="rounded-sm border-destructive/20 bg-destructive/5">
          <CardContent className="pt-3 pb-2">
            <p className="text-[8px] font-mono uppercase text-destructive/50 tracking-widest">Failure Pattern Detected</p>
            <p className="text-[10px] font-mono text-foreground/70 mt-1">
              You repeatedly: {topFailurePattern.trigger}
            </p>
            <p className="text-[9px] font-mono text-destructive/40">Detected {topFailurePattern.frequency} times</p>
          </CardContent>
        </Card>
      )}

      {/* Identity + Momentum Card */}
      {knowledgeNotes.length > 0 && (
        <Card className="card-glow rounded-sm border-border/40 primary-content">
          <CardContent className="pt-3 pb-2 flex items-center justify-between">
            <div>
              <p className="text-[8px] font-mono text-muted-foreground/30 uppercase tracking-widest">You are becoming</p>
              <p className="text-xl font-mono font-bold text-primary">{identityTitle}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {identityTraits.slice(0, 3).map(t => (
                  <span key={t} className="text-[8px] font-mono text-primary/40 border border-primary/15 rounded-sm px-1">{t}</span>
                ))}
              </div>
              {/* Identity Mirror */}
              {identityTitle === 'Operator' && (
                <p className="text-[8px] font-mono text-primary/35 pl-1 mt-1">You are acting with precision today.</p>
              )}
              {identityTitle === 'Builder' && executionRate >= 0.15 && (
                <p className="text-[8px] font-mono text-primary/35 pl-1 mt-1">You are building, not just thinking.</p>
              )}
              {identityTitle === 'Explorer' && (
                <p className="text-[8px] font-mono text-primary/35 pl-1 mt-1">Your curiosity is active.</p>
              )}
              {/* Identity Challenge */}
              {identityTitle === 'Builder' && executionRate < 0.10 && (
                <p className="text-[8px] font-mono text-destructive/40 pl-1 mt-1">This isn't how Builders work.</p>
              )}
              {identityTitle === 'Operator' && missedCount > 3 && (
                <p className="text-[8px] font-mono text-destructive/40 pl-1 mt-1">Operators don't leave actions incomplete.</p>
              )}
              {/* Identity Streak */}
              {momentumStreak > 0 && (
                <p className="text-[8px] font-mono text-muted-foreground/25 mt-1">
                  {momentumStreak} day{momentumStreak > 1 ? 's' : ''} acting as {identityTitle}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[8px] font-mono text-muted-foreground/30">momentum</p>
              <p className="text-2xl font-mono font-bold text-foreground stat-glow">{momentumScore}</p>
              <p className="text-[8px] font-mono text-muted-foreground/25">
                {momentumTrend === 'up' ? '↑ rising' : momentumTrend === 'down' ? '↓ falling' : '→ stable'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unfinished Tension */}
      {(() => {
        const unexpandedIdeas = knowledgeNotes.filter(n => n.type === 'fleeting' && n.source !== 'AI').length
        const missingConnections = knowledgeNotes.filter(n => !knowledgeLinks.some(l => l.sourceNoteId === n.id || l.targetNoteId === n.id)).length
        if (unexpandedIdeas === 0 && missingConnections <= 5) return null
        return (
          <div className="secondary-content space-y-0.5 border-l-2 border-primary/20 pl-3">
            {unexpandedIdeas > 0 && (
              <Link href="/knowledge/ideas" className="flex items-center justify-between group">
                <p className="text-[9px] font-mono text-muted-foreground/50">
                  → {unexpandedIdeas} idea{unexpandedIdeas > 1 ? 's' : ''} unexpanded
                </p>
                <span className="text-[8px] font-mono text-primary/40 group-hover:text-primary/70">BUILD →</span>
              </Link>
            )}
            {missingConnections > 5 && (
              <Link href="/knowledge/graph" className="flex items-center justify-between group">
                <p className="text-[9px] font-mono text-muted-foreground/50">
                  → {missingConnections} notes without connections
                </p>
                <span className="text-[8px] font-mono text-primary/40 group-hover:text-primary/70">MAP →</span>
              </Link>
            )}
          </div>
        )
      })()}

      {/* Session Ritual (once per day) */}
      {showSessionRitual && (
        <Card className="card-glow rounded-sm border-primary/20 bg-primary/[0.03] primary-content">
          <CardContent className="pt-3 pb-2">
            <p className="text-[9px] font-mono text-primary/50 uppercase tracking-widest mb-1">SESSION START</p>
            <p className="text-[10px] font-mono text-foreground/70">
              State: <span className={cn('font-bold',
                cognitiveState === 'drifting' ? 'text-destructive/70' :
                cognitiveState === 'executing' ? 'text-green-500/70' :
                'text-primary/70'
              )}>{cognitiveState}</span>
              {momentumStreak > 0 && <span className="ml-2 text-muted-foreground/40">· {momentumStreak}d streak</span>}
            </p>
            {lastSessionMove && (
              <p className="text-[10px] font-mono text-primary/60 mt-2">
                You left mid-execution yesterday.
                <br />→ {lastSessionMove.text}
              </p>
            )}
            <button
              onClick={() => {
                localStorage.setItem('lastSessionDate', new Date().toDateString())
                setShowSessionRitual(false)
              }}
              className="mt-2 text-[9px] font-mono text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            >
              dismiss ×
            </button>
          </CardContent>
        </Card>
      )}

      {/* Execution Gap Card */}
      {knowledgeNotes.length >= 5 && executionRate < 0.20 && (
        <Card className="card-glow rounded-sm border-border/40 primary-content">
          <CardContent className="pt-3 pb-2">
            <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">EXECUTION GAP</p>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-mono text-foreground/60">{Math.round(executionRate * 100)}% of ideas expanded</p>
              <p className="text-[9px] font-mono text-muted-foreground/30">target: 20%</p>
            </div>
            <GlowProgress value={Math.round(executionRate * 500)} className="mt-2" />
            <p className="text-[9px] font-mono text-muted-foreground/40 mt-1">
              {executionRate < 0.05
                ? 'You are collecting. Build something.'
                : executionRate < 0.10
                ? 'You have ideas. Start expanding them.'
                : 'Close to execution threshold. Push through.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Self Competition */}
      <SelfCompetitionCard />

      {/* Future Self */}
      <FutureSelfCard />

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

      {/* Daily Mirror (once per day) */}
      {showDailyMirror && cognitiveData && (
        <Card className="rounded-sm border-border/40">
          <CardContent className="pt-3 pb-2">
            <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-2">DAILY MIRROR</p>
            <p className="text-[10px] font-mono text-foreground/70">
              Pattern: <span className="text-primary/70">{cognitiveData.dominantStyle}</span>
            </p>
            {cognitiveData.thinkingBiases?.[0] && (
              <p className="text-[9px] font-mono text-muted-foreground/50 mt-1">
                Watch: {cognitiveData.thinkingBiases[0]}
              </p>
            )}
            <button
              onClick={() => {
                localStorage.setItem('lastMirrorDate', new Date().toDateString())
                setShowDailyMirror(false)
              }}
              className="mt-2 text-[9px] font-mono text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            >
              dismiss ×
            </button>
          </CardContent>
        </Card>
      )}

      {/* COGNITIVE PROFILE */}
      {cognitiveData && (
        <Card className="rounded-sm border-border/50 secondary-content">
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
        <Card className="rounded-sm border-purple-500/20 bg-purple-500/5 secondary-content">
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
