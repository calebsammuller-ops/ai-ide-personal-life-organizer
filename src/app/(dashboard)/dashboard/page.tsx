'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, CheckSquare, ListTodo, Plus, ArrowRight, Brain, Sparkles, RefreshCw, Network, Zap, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SeismicWave } from '@/components/ui/SeismicWave'
import { LevelUpModal } from '@/components/gamification/LevelUpModal'
import { CelebrationToast } from '@/components/ui/celebration'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { selectAllEvents, fetchEvents } from '@/state/slices/calendarSlice'
import { selectActiveHabits, selectTodayCompletions, fetchHabits } from '@/state/slices/habitsSlice'
import { selectPendingTasks, fetchTasks } from '@/state/slices/tasksSlice'
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
  const today = new Date().toISOString().split('T')[0]
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationMessage, setCelebrationMessage] = useState('')

  const events = useAppSelector(selectAllEvents)
  const habits = useAppSelector(selectActiveHabits)
  const todayCompletions = useAppSelector(selectTodayCompletions)
  const pendingTasks = useAppSelector(selectPendingTasks)
  const knowledgeNotes = useAppSelector(selectAllNotes)
  const knowledgeLinks = useAppSelector(selectAllLinks)
  const briefing = useAppSelector(selectBriefing)
  const briefingAge = useAppSelector(selectBriefingAge)
  const isBriefingGenerating = useAppSelector(selectKnowledgeGenerating)
  const predictions = useAppSelector(selectPredictions)

  useRegisterPageContext({
    pageTitle: 'Dashboard',
    visibleContent: {
      type: 'dashboard',
      eventCount: events.length,
      activeHabitCount: habits.length,
      habitsCompletedToday: todayCompletions.length,
      pendingTaskCount: pendingTasks.length,
    },
  })

  useEffect(() => {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)
    dispatch(fetchEvents({ start: today, end: endDate.toISOString().split('T')[0] }))
    dispatch(fetchHabits())
    dispatch(fetchTasks())
    dispatch(fetchNotes() as any)
    dispatch(fetchBriefing() as any)
    dispatch(fetchPredictions() as any)
  }, [dispatch, today])

  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.startTime).toISOString().split('T')[0]
    return eventDate === today
  })

  const habitCompletionRate = habits.length > 0
    ? Math.round((todayCompletions.length / habits.length) * 100)
    : 0

  useEffect(() => {
    if (habits.length > 0 && todayCompletions.length === habits.length) {
      setCelebrationMessage('All protocols complete!')
      setShowCelebration(true)
    }
  }, [todayCompletions.length, habits.length])

  const stats = [
    {
      label: 'OPS TODAY',
      value: todayEvents.length,
      href: '/calendar',
    },
    {
      label: 'PROTOCOLS',
      value: `${todayCompletions.length}/${habits.length}`,
      href: '/habits',
      progress: habitCompletionRate,
    },
    {
      label: 'MISSIONS',
      value: pendingTasks.length,
      href: '/tasks',
    },
    {
      label: 'DISCIPLINE %',
      value: `${habitCompletionRate}%`,
      href: '/progress',
    },
  ]

  return (
    <main className="flex flex-col h-[calc(100vh-3rem)] md:h-[calc(100vh-0px)] p-3 md:p-4 pb-16 md:pb-4 overflow-hidden">
      <LevelUpModal />
      <CelebrationToast
        show={showCelebration}
        message={celebrationMessage}
        xp={10}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Lock-In Status Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-5 bg-primary" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-primary">LOCK-IN STATUS</h2>
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

      {/* SeismicWave ambient */}
      <div className="flex-shrink-0 mb-3">
        <SeismicWave height={48} className="opacity-60" />
      </div>

      {/* Stats Grid */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-2 mb-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="border border-border/50 bg-card p-2 hover:border-primary/30 hover:bg-primary/5 transition-colors">
              <p className="text-[8px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-1">{stat.label}</p>
              <p className="text-lg font-mono font-bold text-primary leading-none">{stat.value}</p>
              {stat.progress !== undefined && (
                <div className="mt-1.5 h-0.5 bg-border/50">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Main 2-col grid */}
      <div className="flex-1 grid gap-3 md:grid-cols-2 min-h-0 overflow-hidden">

        {/* TODAY'S OPS */}
        <Card className="flex flex-col overflow-hidden rounded-sm">
          <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between py-2 px-3 border-b border-border/50">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">TODAY&apos;S OPS</p>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-mono text-muted-foreground hover:text-primary">
                ALL <ArrowRight className="h-3 w-3 ml-0.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-3">
            {todayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
                <Calendar className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">NO OPS SCHEDULED</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] font-mono text-primary"
                  onClick={() => dispatch(openModal({ modalName: 'createEvent' }))}
                >
                  <Plus className="h-3 w-3 mr-1" /> ADD OP
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {todayEvents.slice(0, 8).map((event) => (
                  <div key={event.id} className="flex items-center gap-2 py-1">
                    <div className="w-0.5 h-6 bg-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {new Date(event.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {todayEvents.length > 8 && (
                  <Link href="/calendar" className="text-[10px] text-primary font-mono block text-center pt-1">
                    +{todayEvents.length - 8} MORE
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: PROTOCOLS + MISSION QUEUE */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">

          {/* PROTOCOLS */}
          <Card className="flex-1 flex flex-col overflow-hidden rounded-sm min-h-0">
            <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between py-2 px-3 border-b border-border/50">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">PROTOCOLS</p>
              <Link href="/habits">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-mono text-muted-foreground hover:text-primary">
                  ALL <ArrowRight className="h-3 w-3 ml-0.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3">
              {habits.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <CheckSquare className="h-5 w-5 text-muted-foreground/30" />
                  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">NO PROTOCOLS</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-mono text-primary"
                    onClick={() => dispatch(openModal({ modalName: 'createHabit' }))}
                  >
                    <Plus className="h-3 w-3 mr-1" /> ADD
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {habits.slice(0, 6).map((habit) => {
                    const isCompleted = todayCompletions.includes(habit.id)
                    return (
                      <div key={habit.id} className="flex items-center gap-2 py-0.5">
                        <div className={cn(
                          'w-3 h-3 border flex-shrink-0 flex items-center justify-center',
                          isCompleted ? 'bg-primary border-primary' : 'border-muted-foreground/50'
                        )}>
                          {isCompleted && <div className="w-1.5 h-1.5 bg-primary-foreground" />}
                        </div>
                        <p className={cn(
                          'text-xs font-mono truncate',
                          isCompleted && 'line-through text-muted-foreground/50'
                        )}>
                          {habit.name}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* MISSION QUEUE */}
          <Card className="flex-1 flex flex-col overflow-hidden rounded-sm min-h-0">
            <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between py-2 px-3 border-b border-border/50">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">MISSION QUEUE</p>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] font-mono text-muted-foreground hover:text-primary">
                  ALL <ArrowRight className="h-3 w-3 ml-0.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3">
              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <ListTodo className="h-5 w-5 text-muted-foreground/30" />
                  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">QUEUE CLEAR</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-mono text-primary"
                    onClick={() => dispatch(openModal({ modalName: 'createTask' }))}
                  >
                    <Plus className="h-3 w-3 mr-1" /> ADD
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {pendingTasks.slice(0, 6).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 py-0.5">
                      <div className={cn(
                        'w-1.5 h-1.5 flex-shrink-0',
                        task.priority === 1 ? 'bg-destructive' :
                        task.priority === 2 ? 'bg-warning' :
                        'bg-primary/50'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono truncate">{task.title}</p>
                        {task.deadline && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {new Date(task.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {pendingTasks.length > 6 && (
                    <Link href="/tasks" className="text-[10px] text-primary font-mono block text-center pt-1">
                      +{pendingTasks.length - 6} MORE
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* KNOWLEDGE BRAIN WIDGET */}
      {knowledgeNotes.length > 0 || briefing ? (
        <div className="flex-shrink-0 mt-3">
          <Card className="rounded-sm border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b border-primary/20">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/80">KNOWLEDGE BRAIN</p>
                <span className="text-[9px] font-mono text-muted-foreground/40">{knowledgeNotes.length} notes · {knowledgeLinks.length} links</span>
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
                        <p className="text-[9px] text-muted-foreground/70">{insight.content?.slice(0, 100)}</p>
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
                      <p className="text-[9px] font-mono text-muted-foreground/50">Notes</p>
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
        </div>
      ) : null}

      {/* AI PREDICTIONS WIDGET */}
      {(predictions.length > 0 || knowledgeNotes.length >= 3) && (
        <div className="flex-shrink-0 mt-2">
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
        </div>
      )}
    </main>
  )
}
