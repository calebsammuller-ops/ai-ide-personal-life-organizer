'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  toggleRightPanel,
  selectIsRightPanelOpen,
} from '@/state/slices/uiSlice'
import {
  fetchRightPanel,
  selectRightPanelInsight,
  selectRightPanelWhyThisMatters,
  selectRightPanelPattern,
  selectRightPanelConnections,
  selectRightPanelNextActions,
  selectRightPanelPriority,
  selectRightPanelConfidence,
  selectRightPanelConfidenceReason,
  selectRightPanelPatternShift,
  selectRightPanelLoading,
  type RightPanelNextAction,
} from '@/state/slices/rightPanelSlice'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { cn } from '@/lib/utils'

function getContext(pathname: string): string {
  if (pathname.includes('/knowledge/ideas')) return 'ideas'
  if (pathname.includes('/knowledge/graph')) return 'graph'
  if (pathname.includes('/insights')) return 'insights'
  return 'general'
}

function getActionRoute(action: RightPanelNextAction): string {
  if (action.type === 'connect') return '/knowledge/graph'
  if (action.type === 'expand' || action.type === 'research') {
    return action.targetId
      ? `/knowledge/ideas?expand=${encodeURIComponent(action.targetId)}`
      : '/knowledge/ideas'
  }
  return '/knowledge/ideas'
}

function StrengthBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <div className="h-px w-10 bg-border/40 overflow-hidden">
        <div className="h-full bg-primary/50" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="text-[8px] font-mono text-muted-foreground/30">{Math.round(value * 100)}%</span>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[8px] font-mono uppercase tracking-widest text-primary/40 mb-1">{label}</p>
  )
}

function SkeletonBlock() {
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full rounded-sm bg-muted/60 animate-pulse" />
      <div className="h-1.5 w-4/5 rounded-sm bg-muted/60 animate-pulse" />
      <div className="h-1.5 w-3/5 rounded-sm bg-muted/60 animate-pulse" />
    </div>
  )
}

const ACTION_PRIORITY_COLOR: Record<string, string> = {
  high: 'border-primary/50 text-primary',
  medium: 'border-primary/25 text-primary/70',
  low: 'border-border/50 text-muted-foreground',
}

export function RightPanel() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = useAppSelector(selectIsRightPanelOpen)
  const insight = useAppSelector(selectRightPanelInsight)
  const whyThisMatters = useAppSelector(selectRightPanelWhyThisMatters)
  const pattern = useAppSelector(selectRightPanelPattern)
  const connections = useAppSelector(selectRightPanelConnections)
  const nextActions = useAppSelector(selectRightPanelNextActions)
  const priority = useAppSelector(selectRightPanelPriority)
  const confidence = useAppSelector(selectRightPanelConfidence)
  const confidenceReason = useAppSelector(selectRightPanelConfidenceReason)
  const patternShift = useAppSelector(selectRightPanelPatternShift)
  const loading = useAppSelector(selectRightPanelLoading)

  const context = getContext(pathname)

  useEffect(() => {
    dispatch(fetchRightPanel({ context }))
  }, [dispatch, context])

  useAutoRefresh(() => {
    dispatch(fetchRightPanel({ context }))
  }, 3 * 60 * 1000)

  const hasData = !!(insight && confidence > 0)

  const priorityGlow = {
    high: 'shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]',
    medium: '',
    low: '',
  }[priority]

  return (
    <div
      className={cn(
        'hidden md:flex flex-col shrink-0 border-l border-border/30 bg-background/60 backdrop-blur-sm transition-all duration-200',
        isOpen ? 'w-56' : 'w-8'
      )}
    >
      {/* Collapsed strip */}
      {!isOpen && (
        <button
          onClick={() => dispatch(toggleRightPanel())}
          className="flex flex-1 items-center justify-center text-muted-foreground/30 hover:text-primary/60 transition-colors"
          aria-label="Open intelligence panel"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      )}

      {/* Expanded panel */}
      {isOpen && (
        <div className={cn('flex flex-col h-full overflow-hidden', priorityGlow)}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border/20">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn(
                'text-[7px] shrink-0 transition-colors',
                priority === 'high' ? 'text-primary' : priority === 'medium' ? 'text-primary/40' : 'text-muted-foreground/20'
              )}>●</span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary/60 truncate">
                Intelligence
              </span>
              {hasData && (
                <span className={cn(
                  'text-[8px] font-mono font-bold uppercase shrink-0',
                  priority === 'high' ? 'text-primary' : priority === 'medium' ? 'text-primary/40' : 'text-muted-foreground/30'
                )}>
                  {priority}
                </span>
              )}
            </div>
            <button
              onClick={() => dispatch(toggleRightPanel())}
              className="text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0 ml-1"
              aria-label="Collapse panel"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 scrollbar-hide">
            <AnimatePresence mode="wait">
              {loading && !hasData ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 pt-1"
                >
                  <SkeletonBlock />
                  <SkeletonBlock />
                  <SkeletonBlock />
                </motion.div>
              ) : !hasData ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="pt-6 text-center"
                >
                  <p className="text-[9px] font-mono text-muted-foreground/40 leading-loose">
                    Your intelligence<br />system is empty.<br /><br />
                    Start by capturing<br />your first idea.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={insight}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Insight */}
                  <div>
                    <SectionLabel label="Insight" />
                    <p className="text-[10px] font-mono text-foreground/80 leading-relaxed">{insight}</p>
                  </div>

                  {/* Why this matters */}
                  {whyThisMatters && (
                    <div>
                      <SectionLabel label="Why This Matters" />
                      <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">{whyThisMatters}</p>
                    </div>
                  )}

                  {/* Pattern */}
                  {pattern && (
                    <div>
                      <SectionLabel label="Pattern" />
                      <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">{pattern}</p>
                    </div>
                  )}

                  {/* Connections */}
                  {connections.length > 0 && (
                    <div>
                      <SectionLabel label="Connections" />
                      <div className="space-y-2">
                        {connections.map((c, i) => (
                          <div key={i} className="border-l border-primary/15 pl-2 space-y-0.5">
                            <p className="text-[9px] font-mono text-foreground/60 leading-tight">
                              {c.noteA} <span className="text-primary/40">↔</span> {c.noteB}
                            </p>
                            <p className="text-[8px] font-mono text-muted-foreground/50 leading-tight">{c.reason}</p>
                            {typeof c.strength === 'number' && <StrengthBar value={c.strength} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Actions */}
                  {nextActions.length > 0 && (
                    <div>
                      <SectionLabel label="Next Actions" />
                      <div className="space-y-1.5">
                        {nextActions.map((a, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[9px] font-mono text-muted-foreground/80 leading-relaxed">{i + 1}. {a.text}</p>
                            <button
                              onClick={() => router.push(getActionRoute(a))}
                              className={cn(
                                'text-[8px] font-mono font-bold uppercase tracking-wider border rounded-sm px-1.5 py-px hover:bg-primary/10 transition-colors',
                                ACTION_PRIORITY_COLOR[a.priority] || ACTION_PRIORITY_COLOR.low
                              )}
                            >
                              Execute →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pattern shift */}
                  {patternShift && (
                    <div>
                      <SectionLabel label="Pattern Shift" />
                      <p className="text-[9px] font-mono text-primary/50 leading-relaxed">{patternShift}</p>
                    </div>
                  )}

                  {/* Confidence */}
                  <div className="space-y-0.5 pt-1 border-t border-border/10">
                    <p className="text-[8px] font-mono text-muted-foreground/30">
                      confidence: {Math.round(confidence * 100)}%
                    </p>
                    {confidenceReason && (
                      <p className="text-[8px] font-mono text-muted-foreground/20 leading-tight">{confidenceReason}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/20 space-y-1.5">
            <button
              onClick={() => dispatch(fetchRightPanel({ force: true, context }))}
              disabled={loading}
              className="flex items-center gap-1 text-[8px] font-mono text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors disabled:opacity-30"
            >
              <RefreshCw className={cn('h-2.5 w-2.5', loading && 'animate-spin')} />
              refresh
            </button>
            <Link
              href="/live-assistant"
              className="block text-[8px] font-mono text-primary/40 hover:text-primary/70 transition-colors"
            >
              Open Assistant →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
