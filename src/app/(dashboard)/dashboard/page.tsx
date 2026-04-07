'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, RefreshCw, Network, Zap, X, ArrowRight, MessageCircle, Lightbulb, Link2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
    { label: 'Ideas captured', value: knowledgeNotes.filter(n => !n.tags?.includes('ai-insight')).length, href: '/knowledge' },
    { label: 'Connections', value: knowledgeLinks.length, href: '/knowledge/graph' },
    { label: 'Insights generated', value: knowledgeNotes.filter(n => n.tags?.includes('ai-insight')).length, href: '/insights' },
    { label: 'Concepts developed', value: predictions.length, href: '/insights' },
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
    <main className="flex flex-col h-[calc(100vh-3rem)] md:h-[calc(100vh-0px)] p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto gap-5">

      {/* Identity Evolution Moment */}
      <AnimatePresence>
        {showEvolution && evolvedTo && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <motion.div className="text-center" initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 1.05 }}>
              <p className="text-xs text-primary/50 tracking-wide mb-3">You are now becoming</p>
              <p className="text-5xl font-bold text-primary">{evolvedTo}</p>
              <motion.div className="h-px bg-primary/50 mt-4 mx-auto rounded-full" initial={{ width: 0 }} animate={{ width: 160 }} transition={{ delay: 0.3, duration: 0.7 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity Commitment Modal */}
      {showCommitmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="border-primary/30 bg-card w-[300px]">
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-sm font-semibold text-primary">You are operating at {identityTitle} level.</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Commit? This increases pressure and removes passive suggestions.
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { dispatch(commitIdentity(identityTitle as any)); setShowCommitmentModal(false) }}
                  className="flex-1 text-xs font-medium border border-primary/40 text-primary hover:bg-primary/10 py-2 rounded-md transition-colors"
                >
                  Commit
                </button>
                <button
                  onClick={() => setShowCommitmentModal(false)}
                  className="flex-1 text-xs font-medium border border-border/40 text-muted-foreground hover:bg-muted/10 py-2 rounded-md transition-colors"
                >
                  Not yet
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header — greeting + status */}
      <div className="flex-shrink-0">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {knowledgeNotes.length > 0
            ? `${knowledgeNotes.length} ideas captured · ${knowledgeLinks.length} connections`
            : 'Start capturing ideas to build your knowledge graph'}
        </p>
      </div>

      {/* Stats strip */}
      <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3 secondary-content">
        {stats.map((stat, i) => {
          const configs = [
            { icon: <Lightbulb key="i" className="h-4 w-4 text-violet-400" />, gradient: 'card-gradient-purple', accent: 'border-l-violet-500' },
            { icon: <Link2 key="l" className="h-4 w-4 text-sky-400" />, gradient: 'card-gradient-blue', accent: 'border-l-sky-500' },
            { icon: <Sparkles key="s" className="h-4 w-4 text-emerald-400" />, gradient: 'card-gradient-green', accent: 'border-l-emerald-500' },
            { icon: <Brain key="b" className="h-4 w-4 text-pink-400" />, gradient: 'card-gradient-rose', accent: 'border-l-pink-500' },
          ]
          return (
            <Link key={stat.label} href={stat.href}>
              <div className={cn('group rounded-xl p-4 hover-lift border-l-[3px] transition-all', configs[i].gradient, configs[i].accent)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-white/5">{configs[i].icon}</div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                </div>
                <p className="text-3xl font-bold text-foreground leading-none mb-1">
                  <AnimatedStat value={stat.value} />
                </p>
                <p className="text-xs text-muted-foreground/60">{stat.label}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="flex-shrink-0 grid grid-cols-3 gap-3 secondary-content">
        <Link href="/knowledge">
          <div className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all hover-lift">
            <Brain className="h-4 w-4" /> New Idea
          </div>
        </Link>
        <Link href="/knowledge/graph">
          <div className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all hover-lift">
            <Network className="h-4 w-4" /> Graph
          </div>
        </Link>
        <Link href="/live-assistant">
          <div className="w-full h-12 flex items-center justify-center gap-2 text-sm font-medium rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all hover-lift">
            <MessageCircle className="h-4 w-4" /> Think
          </div>
        </Link>
      </div>

      {/* Identity Gap Alert */}
      {identityTitle === 'Builder' && executionRate < 0.15 && knowledgeNotes.length >= 5 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-semibold text-destructive/80 mb-1">Identity Gap</p>
            <p className="text-sm text-foreground/70">
              You identify as <strong>Builder</strong> but act like Explorer.
            </p>
            <p className="text-xs text-destructive/50 mt-1">Execution rate {Math.round(executionRate * 100)}% — target 15%.</p>
          </CardContent>
        </Card>
      )}

      {/* Failure Pattern Detected */}
      {topFailurePattern && topFailurePattern.frequency > 2 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-semibold text-destructive/70 mb-1">Failure Pattern Detected</p>
            <p className="text-sm text-foreground/70">
              You repeatedly: {topFailurePattern.trigger}
            </p>
            <p className="text-xs text-destructive/40 mt-1">Detected {topFailurePattern.frequency} times</p>
          </CardContent>
        </Card>
      )}

      {/* Identity + Momentum Card */}
      {knowledgeNotes.length > 0 && (
        <Card className="card-glow card-gradient-purple border-l-[3px] border-l-violet-500 primary-content overflow-hidden rounded-xl">
          <CardContent className="pt-5 pb-4 px-5 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground/50 mb-1">You are becoming</p>
              <p className="text-2xl font-bold text-primary tracking-tight">{identityTitle}</p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {identityTraits.slice(0, 3).map(t => (
                  <span key={t} className="text-[10px] text-primary/50 bg-primary/8 rounded-full px-2 py-0.5">{t}</span>
                ))}
              </div>
              {identityTitle === 'Operator' && (
                <p className="text-xs text-muted-foreground/40 mt-2">Acting with precision today.</p>
              )}
              {identityTitle === 'Builder' && executionRate >= 0.15 && (
                <p className="text-xs text-muted-foreground/40 mt-2">Building, not just thinking.</p>
              )}
              {identityTitle === 'Explorer' && (
                <p className="text-xs text-muted-foreground/40 mt-2">Your curiosity is active.</p>
              )}
              {momentumStreak > 0 && (
                <p className="text-[11px] text-muted-foreground/30 mt-1.5">
                  {momentumStreak} day{momentumStreak > 1 ? 's' : ''} streak
                </p>
              )}
            </div>
            {/* Circular momentum gauge */}
            <div className="relative flex-shrink-0 ml-4">
              <svg width="88" height="88" viewBox="0 0 88 88">
                <circle
                  cx="44" cy="44" r="34"
                  fill="none"
                  stroke="hsl(240 12% 12%)"
                  strokeWidth="5"
                  strokeDasharray="160.2 213.6"
                  strokeLinecap="round"
                  transform="rotate(135 44 44)"
                />
                <circle
                  cx="44" cy="44" r="34"
                  fill="none"
                  stroke="hsl(258 89% 66%)"
                  strokeWidth="5"
                  strokeDasharray={`${Math.max(0, (momentumScore / 100) * 160.2)} 213.6`}
                  strokeLinecap="round"
                  transform="rotate(135 44 44)"
                  style={{ filter: 'drop-shadow(0 0 8px hsl(258 89% 66% / 0.5))', transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-foreground leading-none">{momentumScore}</p>
                <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                  {momentumTrend === 'up' ? 'Rising' : momentumTrend === 'down' ? 'Falling' : 'Stable'}
                </p>
              </div>
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
          <Card className="secondary-content border-border/30 bg-card/50">
            <CardContent className="pt-4 pb-3 px-4 space-y-2">
              {unexpandedIdeas > 0 && (
                <Link href="/knowledge/ideas" className="flex items-center justify-between group">
                  <p className="text-xs text-muted-foreground/60">
                    {unexpandedIdeas} idea{unexpandedIdeas > 1 ? 's' : ''} to expand
                  </p>
                  <span className="text-xs text-primary/50 group-hover:text-primary transition-colors">Expand</span>
                </Link>
              )}
              {missingConnections > 5 && (
                <Link href="/knowledge/graph" className="flex items-center justify-between group">
                  <p className="text-xs text-muted-foreground/60">
                    {missingConnections} unconnected notes
                  </p>
                  <span className="text-xs text-primary/50 group-hover:text-primary transition-colors">Connect</span>
                </Link>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Session Ritual (once per day) */}
      {showSessionRitual && (
        <Card className="card-glow border-primary/20 bg-primary/[0.03] primary-content">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-semibold text-primary/70 mb-1">Session Start</p>
            <p className="text-sm text-foreground/70">
              State: <span className={cn('font-semibold',
                cognitiveState === 'drifting' ? 'text-destructive/70' :
                cognitiveState === 'executing' ? 'text-green-500/70' :
                'text-primary/70'
              )}>{cognitiveState}</span>
              {momentumStreak > 0 && <span className="ml-2 text-muted-foreground/40">· {momentumStreak}d streak</span>}
            </p>
            {lastSessionMove && (
              <p className="text-xs text-primary/60 mt-2 leading-relaxed">
                You left mid-execution yesterday: {lastSessionMove.text}
              </p>
            )}
            <button
              onClick={() => {
                localStorage.setItem('lastSessionDate', new Date().toDateString())
                setShowSessionRitual(false)
              }}
              className="mt-3 text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
            >
              Dismiss
            </button>
          </CardContent>
        </Card>
      )}

      {/* Execution Gap Card */}
      {knowledgeNotes.length >= 5 && executionRate < 0.20 && (
        <Card className="card-glow border-border/30 primary-content">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs font-semibold text-muted-foreground/50 mb-2">Execution Gap</p>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-foreground/60">{Math.round(executionRate * 100)}% of ideas expanded</p>
              <p className="text-xs text-muted-foreground/30">target: 20%</p>
            </div>
            <GlowProgress value={Math.round(executionRate * 500)} className="mt-2" />
            <p className="text-xs text-muted-foreground/40 mt-1.5">
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
      <Card className="card-gradient-blue border-l-[3px] border-l-sky-500 rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90">AI Observations</p>
              <p className="text-[11px] text-muted-foreground/40">{knowledgeNotes.length} ideas · {knowledgeLinks.length} links</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="ghost" size="sm"
              onClick={() => dispatch(generateBriefing() as any)}
              disabled={isBriefingGenerating}
              className="h-8 px-2.5 text-xs text-primary/70 hover:bg-primary/10 rounded-lg"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isBriefingGenerating && 'animate-spin')} />
              {isBriefingGenerating ? '...' : 'Refresh'}
            </Button>
            <Link href="/knowledge">
              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-muted-foreground hover:text-primary rounded-lg">
                Open <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {briefing ? (
            <div className="space-y-2.5">
              {briefing.briefing && (
                <p className="text-sm text-muted-foreground/80 leading-relaxed">{briefing.briefing}</p>
              )}
              {briefing.insights?.slice(0, 2).map((insight: { title: string; content: string }, i: number) => (
                <div key={i} className="flex items-start gap-2.5 p-2.5 bg-primary/5 border border-primary/15 rounded-lg">
                  <div className="p-1 rounded-md bg-primary/10 mt-0.5">
                    <Sparkles className="h-3 w-3 text-primary/70" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground/80">{insight.title}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">{insight.content?.slice(0, 120)}</p>
                  </div>
                </div>
              ))}
              {briefingAge && (
                <p className="text-[10px] text-muted-foreground/30">
                  Updated {new Date(briefingAge).toLocaleTimeString()}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="grid grid-cols-3 gap-4 flex-1">
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">{knowledgeNotes.length}</p>
                  <p className="text-[10px] text-muted-foreground/50">Ideas</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">{knowledgeLinks.length}</p>
                  <p className="text-[10px] text-muted-foreground/50">Links</p>
                </div>
                <div className="text-center">
                  <Link href="/knowledge/graph">
                    <div className="flex flex-col items-center hover:text-primary transition-colors text-muted-foreground/50">
                      <Network className="h-5 w-5" />
                      <p className="text-[10px]">Graph</p>
                    </div>
                  </Link>
                </div>
              </div>
              <Button
                onClick={() => dispatch(generateBriefing() as any)}
                disabled={isBriefingGenerating}
                size="sm"
                className="text-xs shrink-0"
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
        <Card className="rounded-xl border-border/30">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide mb-2">Daily Mirror</p>
            <p className="text-sm text-foreground/70">
              Pattern: <span className="text-primary font-medium">{cognitiveData.dominantStyle}</span>
            </p>
            {cognitiveData.thinkingBiases?.[0] && (
              <p className="text-xs text-muted-foreground/50 mt-1">
                Watch: {cognitiveData.thinkingBiases[0]}
              </p>
            )}
            <button
              onClick={() => {
                localStorage.setItem('lastMirrorDate', new Date().toDateString())
                setShowDailyMirror(false)
              }}
              className="mt-2.5 text-xs text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            >
              Dismiss
            </button>
          </CardContent>
        </Card>
      )}

      {/* COGNITIVE PROFILE */}
      {cognitiveData && (
        <Card className="rounded-xl card-gradient-cyan border-l-[3px] border-l-cyan-500 secondary-content">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-primary/10">
                <Brain className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xs font-semibold text-foreground/80">Cognitive Profile</p>
            </div>
            <Link href="/insights">
              <span className="text-xs text-muted-foreground/40 hover:text-primary transition-colors">Full analysis →</span>
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                {cognitiveData.dominantStyle}
              </span>
              <span className="text-xs text-muted-foreground/50">{cognitiveData.learningStyle} Learner</span>
              <span className="ml-auto text-xs text-muted-foreground/40">
                {Math.round(cognitiveData.focusScore * 100)}% Focus
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${cognitiveData.focusScore * 100}%` }} />
            </div>
            <div className="space-y-1.5">
              {cognitiveData.patterns.slice(0, 2).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-foreground/60 flex-1 truncate">{p.label}</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', p.valence === 'strength' ? 'bg-primary/70' : p.valence === 'weakness' ? 'bg-destructive/60' : 'bg-muted-foreground/40')}
                      style={{ width: `${p.score * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/40 w-7 text-right">{Math.round(p.score * 100)}%</span>
                </div>
              ))}
            </div>
            {trajectoryData?.narrative?.headline && (
              <p className="text-xs text-muted-foreground/50 italic border-t border-border/20 pt-2">
                {trajectoryData.narrative.headline}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* CURIOSITY TRIGGER */}
      {orphanNote && (
        <Link href={`/knowledge?noteId=${orphanNote.id}`}>
          <div className="curiosity-pulse border border-primary/20 bg-primary/[0.03] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-primary/[0.06] transition-all hover-lift">
            <div className="p-1 rounded-lg bg-primary/10 shrink-0">
              <Link2 className="h-3 w-3 text-primary/70" />
            </div>
            <p className="text-xs text-muted-foreground/70 flex-1">
              <span className="text-primary/80 font-medium">Waiting to connect:</span> {orphanNote.title}
            </p>
            <ArrowRight className="h-3.5 w-3.5 text-primary/40 shrink-0" />
          </div>
        </Link>
      )}

      {/* TODAY'S FOCUS */}
      <div>
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-1 h-4 bg-primary rounded-full" />
          <p className="text-xs font-semibold text-foreground/80">Today's Focus</p>
        </div>
        {todaysFocus.length === 0 ? (
          <p className="text-xs text-muted-foreground/40 px-3">Add ideas to build your focus list.</p>
        ) : (
          <div className="space-y-2">
            {todaysFocus.map((note) => (
              <Link key={note.id} href={`/knowledge?noteId=${note.id}`}>
                <div className="flex items-center gap-2.5 border border-border/40 bg-card/80 rounded-xl px-3.5 py-2.5 hover:border-primary/30 hover:bg-primary/5 transition-all group hover-lift">
                  <Lightbulb className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-primary/60 transition-colors" />
                  <p className="text-sm text-foreground/80 flex-1 truncate">{note.title}</p>
                  <span className="text-[10px] text-muted-foreground/40 shrink-0">{note.type}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-primary/40 shrink-0 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* AI Predictions */}
      {(predictions.length > 0 || knowledgeNotes.length >= 3) && (
        <Card className="rounded-xl card-gradient-purple border-l-[3px] border-l-purple-500 secondary-content">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-purple-500/15">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-purple-500/10">
                <Zap className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <p className="text-xs font-semibold text-foreground/80">AI Predictions</p>
              {predictions.length > 0 && (
                <span className="text-[10px] text-muted-foreground/40">{predictions.length} active</span>
              )}
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => dispatch(generatePredictions() as any)}
              disabled={isBriefingGenerating}
              className="h-7 px-2.5 text-xs text-purple-400 hover:bg-purple-500/10 rounded-lg"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isBriefingGenerating && 'animate-spin')} />
              {isBriefingGenerating ? '...' : 'Refresh'}
            </Button>
          </CardHeader>
          <CardContent className="p-3.5">
            {predictions.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-xs text-muted-foreground/40">No predictions yet</p>
                <button
                  onClick={() => dispatch(generatePredictions() as any)}
                  disabled={isBriefingGenerating}
                  className="text-xs text-purple-400 hover:underline mt-1.5"
                >
                  Generate predictions →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {predictions.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-start gap-2.5 p-2.5 bg-purple-500/5 border border-purple-500/15 rounded-lg group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                          {p.predictionType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-muted-foreground/30">{Math.round(p.confidence * 100)}%</span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{p.description}</p>
                      {p.predictionType === 'next_topic' && (
                        <Link href="/knowledge/research" className="text-xs text-purple-400 hover:underline mt-0.5 inline-block">
                          Explore this topic →
                        </Link>
                      )}
                    </div>
                    <button
                      onClick={() => dispatch(dismissPrediction(p.id) as any)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-muted-foreground transition-all shrink-0 mt-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {predictions.length > 3 && (
                  <p className="text-[10px] text-muted-foreground/30 text-center">+{predictions.length - 3} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
