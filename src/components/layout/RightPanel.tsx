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
  selectRightPanelConnections,
  selectRightPanelNextAction,
  selectRightPanelPriority,
  selectRightPanelConfidence,
  selectRightPanelLoading,
} from '@/state/slices/rightPanelSlice'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import { cn } from '@/lib/utils'

function getContext(pathname: string): string {
  if (pathname.includes('/knowledge/ideas')) return 'ideas'
  if (pathname.includes('/knowledge/graph')) return 'graph'
  if (pathname.includes('/insights')) return 'insights'
  return 'general'
}

function getActionRoute(type: string, targetId?: string): string {
  if (type === 'connect') return '/knowledge/graph'
  if (type === 'expand' || type === 'research') {
    return targetId ? `/knowledge/ideas?expand=${encodeURIComponent(targetId)}` : '/knowledge/ideas'
  }
  return '/knowledge/ideas'
}

function StrengthBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="h-0.5 w-10 bg-border/40 rounded-full overflow-hidden">
        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="text-[8px] font-mono text-muted-foreground/40">{Math.round(value * 100)}%</span>
    </div>
  )
}

function SkeletonLines() {
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 w-full rounded-sm bg-muted animate-pulse" />
      <div className="h-1.5 w-4/5 rounded-sm bg-muted animate-pulse" />
      <div className="h-1.5 w-3/5 rounded-sm bg-muted animate-pulse" />
    </div>
  )
}

export function RightPanel() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = useAppSelector(selectIsRightPanelOpen)
  const insight = useAppSelector(selectRightPanelInsight)
  const connections = useAppSelector(selectRightPanelConnections)
  const nextAction = useAppSelector(selectRightPanelNextAction)
  const priority = useAppSelector(selectRightPanelPriority)
  const confidence = useAppSelector(selectRightPanelConfidence)
  const loading = useAppSelector(selectRightPanelLoading)

  const context = getContext(pathname)

  useEffect(() => {
    dispatch(fetchRightPanel({ context }))
  }, [dispatch, context])

  useAutoRefresh(() => {
    dispatch(fetchRightPanel({ context }))
  }, 3 * 60 * 1000)

  const priorityColor = {
    high: 'text-primary',
    medium: 'text-primary/50',
    low: 'text-muted-foreground/30',
  }[priority]

  const hasData = !!(insight && confidence > 0)

  return (
    <div
      className={cn(
        'hidden md:flex flex-col shrink-0 border-l border-border/30 bg-background/50 backdrop-blur-sm transition-all duration-200',
        isOpen ? 'w-52' : 'w-8'
      )}
    >
      {/* Collapsed strip */}
      {!isOpen && (
        <button
          onClick={() => dispatch(toggleRightPanel())}
          className="flex flex-1 items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          aria-label="Open intelligence panel"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      )}

      {/* Expanded panel */}
      {isOpen && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border/20">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn('text-[7px] shrink-0', priorityColor)}>●</span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary/70 truncate">
                Intelligence
              </span>
              {hasData && (
                <span className={cn('text-[8px] font-mono font-bold uppercase shrink-0', priorityColor)}>
                  {priority}
                </span>
              )}
            </div>
            <button
              onClick={() => dispatch(toggleRightPanel())}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 ml-1"
              aria-label="Collapse panel"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 scrollbar-hide">
            <AnimatePresence mode="wait">
              {loading && !hasData ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 pt-1"
                >
                  <SkeletonLines />
                  <SkeletonLines />
                  <SkeletonLines />
                </motion.div>
              ) : !hasData ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="pt-4 text-center"
                >
                  <p className="text-[9px] font-mono text-muted-foreground/50 leading-relaxed">
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
                  <div className="space-y-1">
                    <p className="text-[8px] font-mono uppercase tracking-widest text-primary/50">Insight</p>
                    <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">{insight}</p>
                  </div>

                  {/* Connections */}
                  {connections.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-primary/50">Connections</p>
                      {connections.map((c, i) => (
                        <div key={i} className="space-y-0.5 border-l border-primary/20 pl-2">
                          <p className="text-[9px] font-mono text-foreground/70 leading-tight">
                            {c.noteA} <span className="text-primary/50">↔</span> {c.noteB}
                          </p>
                          <p className="text-[8px] font-mono text-muted-foreground/60 leading-tight">{c.reason}</p>
                          {typeof c.strength === 'number' && <StrengthBar value={c.strength} />}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Next Action */}
                  {nextAction && (
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-primary/50">Next Action</p>
                      <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">{nextAction.text}</p>
                      <button
                        onClick={() => router.push(getActionRoute(nextAction.type, nextAction.targetId))}
                        className="text-[9px] font-mono font-bold uppercase tracking-wider text-primary border border-primary/30 rounded-sm px-2 py-0.5 hover:bg-primary/10 transition-colors"
                      >
                        Execute →
                      </button>
                    </div>
                  )}

                  {/* Confidence */}
                  {confidence > 0 && (
                    <p className="text-[8px] font-mono text-muted-foreground/30">
                      confidence: {Math.round(confidence * 100)}%
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/20 space-y-1.5">
            <button
              onClick={() => dispatch(fetchRightPanel({ force: true, context }))}
              disabled={loading}
              className="flex items-center gap-1 text-[8px] font-mono text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors disabled:opacity-30"
            >
              <RefreshCw className={cn('h-2.5 w-2.5', loading && 'animate-spin')} />
              refresh
            </button>
            <Link
              href="/live-assistant"
              className="block text-[8px] font-mono text-primary/50 hover:text-primary transition-colors"
            >
              Open Assistant →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
