'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/ui/animated'
import {
  ScrollText,
  Brain,
  Calendar,
  Bell,
  Zap,
  ChevronDown,
  ChevronUp,
  Undo2,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRegisterPageContext } from '@/hooks/useRegisterPageContext'

interface AIDecision {
  id: string
  action: string
  reason: string
  agent: 'planner' | 'analyzer' | 'notifier' | 'executor' | 'strategist'
  dataUsed: string[]
  confidence: number
  undoInstructions: string | null
  wasReversed: boolean
  wasAccepted: boolean
  createdAt: string
}

const agentConfig: Record<string, { label: string; icon: typeof Brain; color: string; bg: string }> = {
  strategist: { label: 'Strategist', icon: MessageSquare, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  planner: { label: 'Planner', icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  analyzer: { label: 'Analyzer', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  notifier: { label: 'Notifier', icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  executor: { label: 'Executor', icon: Zap, color: 'text-green-400', bg: 'bg-green-500/10' },
}

export default function AIDecisionsPage() {
  const [decisions, setDecisions] = useState<AIDecision[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useRegisterPageContext({
    pageTitle: 'AI Decision Journal',
    visibleContent: {
      type: 'ai_decisions',
      decisionCount: decisions.length,
      totalDecisions: total,
      activeFilter: filter,
    },
  })

  const fetchDecisions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filter) params.set('agent', filter)

      const res = await fetch(`/api/decisions?${params}`)
      const json = await res.json()

      if (json.data) {
        setDecisions(json.data)
        setTotal(json.total || json.data.length)
      }
    } catch (error) {
      console.error('Failed to fetch decisions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchDecisions()
  }, [fetchDecisions])

  const handleReverse = async (id: string) => {
    try {
      await fetch(`/api/decisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wasReversed: true }),
      })
      setDecisions(prev =>
        prev.map(d => d.id === id ? { ...d, wasReversed: true } : d)
      )
    } catch (error) {
      console.error('Failed to reverse decision:', error)
    }
  }

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.5) return 'text-amber-400'
    return 'text-red-400'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto py-6 px-4 max-w-4xl"
    >
      {/* Header */}
      <FadeIn className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ScrollText className="h-6 w-6 text-purple-400" />
              AI Decision Journal
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Every AI decision is transparent, explainable, and reversible
            </p>
          </div>

          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground mr-1">
              <Filter className="h-4 w-4 inline mr-1" />
              Filter:
            </span>
            <Button
              variant={filter === null ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(null)}
              className="h-7 text-xs"
            >
              All
            </Button>
            {Object.entries(agentConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={filter === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(key)}
                className="h-7 text-xs"
              >
                <config.icon className="h-3 w-3 mr-1" />
                {config.label}
              </Button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(agentConfig).map(([key, config], index) => {
          const count = decisions.filter(d => d.agent === key).length
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
                      <config.icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-[10px] text-muted-foreground">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Decision List */}
      {isLoading ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              <p className="text-sm text-muted-foreground">Loading decisions...</p>
            </div>
          </CardContent>
        </Card>
      ) : decisions.length === 0 ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <ScrollText className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No AI decisions recorded yet. Start chatting with the AI assistant to see decisions here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {decisions.map((decision, index) => {
              const config = agentConfig[decision.agent] || agentConfig.executor
              const isExpanded = expandedId === decision.id

              return (
                <motion.div
                  key={decision.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className={cn(
                      'border-border/50 bg-card/80 backdrop-blur-sm transition-colors',
                      decision.wasReversed && 'opacity-60',
                      'hover:border-border/80'
                    )}
                  >
                    <CardContent className="p-4">
                      {/* Main row */}
                      <div
                        className="flex items-start gap-3 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', config.bg)}>
                          <config.icon className={cn('h-4 w-4', config.color)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', config.bg, config.color)}>
                              {config.label}
                            </span>
                            <span className={cn('text-[10px] font-mono', confidenceColor(decision.confidence))}>
                              {Math.round(decision.confidence * 100)}%
                            </span>
                            {decision.wasReversed && (
                              <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                Reversed
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {formatDate(decision.createdAt)}
                            </span>
                          </div>

                          <p className="text-sm font-medium truncate">
                            {decision.agent === 'strategist' ? `You: ${decision.action}` : decision.action}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{decision.reason}</p>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                              {/* Reason / AI Response */}
                              {decision.agent === 'strategist' ? (
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                      You said
                                    </p>
                                    <p className="text-sm bg-primary/10 px-3 py-2 border-l-2 border-primary">{decision.action}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                      AI responded
                                    </p>
                                    <p className="text-sm whitespace-pre-wrap">{decision.reason}</p>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                    Why this decision was made
                                  </p>
                                  <p className="text-sm">{decision.reason}</p>
                                </div>
                              )}

                              {/* Data Used */}
                              {decision.dataUsed && decision.dataUsed.length > 0 && (
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                    Data sources used
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {decision.dataUsed.map((source, i) => (
                                      <span key={i} className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full">
                                        {source}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Undo Instructions */}
                              {decision.undoInstructions && !decision.wasReversed && (
                                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                                  <div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                                      How to undo
                                    </p>
                                    <p className="text-xs">{decision.undoInstructions}</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleReverse(decision.id)
                                    }}
                                    className="shrink-0 ml-3"
                                  >
                                    <Undo2 className="h-3 w-3 mr-1" />
                                    Reverse
                                  </Button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Total count */}
          <p className="text-center text-xs text-muted-foreground pt-2">
            Showing {decisions.length} of {total} decisions
          </p>
        </div>
      )}
    </motion.div>
  )
}
