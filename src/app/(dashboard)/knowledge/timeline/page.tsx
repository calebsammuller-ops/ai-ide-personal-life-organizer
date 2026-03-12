'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchTimeline, fetchNotes, generateReport,
  selectCognitiveEvents, selectVelocity, selectAllNotes,
  selectKnowledgeLoading, selectKnowledgeGenerating, selectKnowledgeReport,
} from '@/state/slices/knowledgeSlice'
import { cn } from '@/lib/utils'
import {
  Brain, ChevronLeft, Sparkles, Lightbulb, Link2,
  BookOpen, Search, AlertCircle, Plus, BarChart2, FileText, X, Loader2,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'

const EVENT_ICONS: Record<string, React.ReactNode> = {
  note_created: <Plus className="h-3 w-3 text-emerald-400" />,
  note_updated: <BookOpen className="h-3 w-3 text-blue-400" />,
  insight_generated: <Sparkles className="h-3 w-3 text-amber-400" />,
  idea_generated: <Lightbulb className="h-3 w-3 text-purple-400" />,
  knowledge_gap_detected: <AlertCircle className="h-3 w-3 text-orange-400" />,
  research_added: <Search className="h-3 w-3 text-cyan-400" />,
  link_created: <Link2 className="h-3 w-3 text-primary" />,
}

const EVENT_COLORS: Record<string, string> = {
  note_created: 'border-emerald-500/30 bg-emerald-500/5',
  note_updated: 'border-blue-500/30 bg-blue-500/5',
  insight_generated: 'border-amber-500/30 bg-amber-500/5',
  idea_generated: 'border-purple-500/30 bg-purple-500/5',
  knowledge_gap_detected: 'border-orange-500/30 bg-orange-500/5',
  research_added: 'border-cyan-500/30 bg-cyan-500/5',
  link_created: 'border-primary/30 bg-primary/5',
}

function groupEventsByDate(events: { createdAt: string; [key: string]: unknown }[]) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]

  const groups: Record<string, typeof events> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'This Month': [],
    'Earlier': [],
  }

  for (const event of events) {
    const date = event.createdAt.split('T')[0]
    if (date === today) groups['Today'].push(event)
    else if (date === yesterday) groups['Yesterday'].push(event)
    else if (date >= weekAgo) groups['This Week'].push(event)
    else if (event.createdAt >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString()) groups['This Month'].push(event)
    else groups['Earlier'].push(event)
  }

  return Object.entries(groups).filter(([, v]) => v.length > 0)
}

function MarkdownReport({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-base font-mono font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h1>
        if (line.startsWith('## ')) return <h2 key={i} className="text-sm font-mono font-bold text-primary mt-3 mb-1 border-b border-primary/20 pb-1">{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-xs font-mono font-bold text-amber-400 mt-2 mb-0.5">{line.slice(4)}</h3>
        if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="text-xs font-mono text-foreground/70 ml-3">· {line.slice(2)}</p>
        if (line.trim() === '') return <div key={i} className="h-1.5" />
        return <p key={i} className="text-xs font-mono text-foreground/70 leading-relaxed">{line}</p>
      })}
    </div>
  )
}

export default function TimelinePage() {
  const dispatch = useAppDispatch()
  const events = useAppSelector(selectCognitiveEvents)
  const velocity = useAppSelector(selectVelocity)
  const notes = useAppSelector(selectAllNotes)
  const isLoading = useAppSelector(selectKnowledgeLoading)
  const isGenerating = useAppSelector(selectKnowledgeGenerating)
  const report = useAppSelector(selectKnowledgeReport)

  const [showReport, setShowReport] = useState(false)
  const [filterType, setFilterType] = useState('ALL')

  const EVENT_FILTER_TYPES: Record<string, string[]> = {
    NOTES: ['note_created', 'note_updated'],
    LINKS: ['link_created'],
    INSIGHTS: ['insight_generated', 'idea_generated'],
    RESEARCH: ['research_added', 'knowledge_gap_detected'],
  }

  const filteredEvents = filterType === 'ALL'
    ? events
    : events.filter(e => EVENT_FILTER_TYPES[filterType]?.includes((e as { eventType: string }).eventType))

  useEffect(() => {
    dispatch(fetchTimeline())
    dispatch(fetchNotes())
  }, [dispatch])

  const handleGenerateReport = async () => {
    await dispatch(generateReport())
    setShowReport(true)
  }

  const groupedEvents = groupEventsByDate(filteredEvents as { createdAt: string; [key: string]: unknown }[])

  const eventTypeCount = events.reduce((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <a href="/knowledge" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <Brain className="h-4 w-4 text-primary" />
          </a>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Cognitive Timeline</span>
          <span className="text-[10px] font-mono text-muted-foreground/40">{events.length} events · {notes.length} notes</span>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating || notes.length === 0}
          size="sm"
          variant="outline"
          className="font-mono text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 h-7"
        >
          {isGenerating
            ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Generating...</>
            : <><FileText className="h-3 w-3 mr-1.5" />Monthly Report</>
          }
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Velocity Chart */}
        {velocity.length > 0 && (
          <div className="p-4 border-b border-border/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-3.5 w-3.5 text-primary/60" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/50">Note Velocity (30 days)</span>
              </div>
              <div className="flex gap-3">
                {Object.entries(eventTypeCount).slice(0, 4).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-1">
                    {EVENT_ICONS[type]}
                    <span className="text-[9px] font-mono text-muted-foreground/50">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocity} margin={{ top: 5, right: 10, left: -30, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(17, 100%, 56%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(17, 100%, 56%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 4, fontSize: 10, fontFamily: 'monospace' }}
                    labelFormatter={d => `Date: ${d}`}
                    formatter={(v: number) => [`${v} notes`, 'Created']}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(17, 100%, 56%)" fill="url(#velocityGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Event Filter Pills */}
        <div className="px-4 pt-3 pb-0 flex gap-1.5 flex-wrap">
          {['ALL', 'NOTES', 'LINKS', 'INSIGHTS', 'RESEARCH'].map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={cn(
                'text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border rounded-sm transition-colors',
                filterType === f
                  ? 'border-primary/50 text-primary bg-primary/10'
                  : 'border-border/40 text-muted-foreground/40 hover:border-primary/25 hover:text-muted-foreground/60'
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Events */}
        <div className="p-4 space-y-6 max-w-3xl">
          {isLoading && (
            <div className="flex items-center justify-center h-24">
              <div className="h-5 w-5 border border-primary/30 border-t-primary animate-spin rounded-full" />
            </div>
          )}

          {!isLoading && events.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48">
              <Brain className="h-12 w-12 text-muted-foreground/10 mb-3" />
              <p className="text-sm font-mono text-muted-foreground/40">No cognitive events yet</p>
              <p className="text-xs font-mono text-muted-foreground/30 mt-1">Start creating notes to build your cognitive timeline</p>
              <a href="/knowledge" className="mt-3 text-xs font-mono text-primary hover:underline">Create your first note →</a>
            </div>
          )}

          {groupedEvents.map(([label, groupEvents]) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40">{label}</span>
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[9px] font-mono text-muted-foreground/30">{groupEvents.length}</span>
              </div>
              <div className="space-y-2 pl-3 border-l border-border/30">
                {groupEvents.map((event) => {
                  const e = event as { id: string; eventType: string; description: string; createdAt: string; relatedNoteIds?: string[] }
                  return (
                    <div
                      key={e.id}
                      className={cn('flex items-start gap-2.5 p-2.5 rounded border transition-colors', EVENT_COLORS[e.eventType] || 'border-border/30 bg-background/30')}
                    >
                      <div className="mt-0.5 shrink-0">
                        {EVENT_ICONS[e.eventType] || <BookOpen className="h-3 w-3 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-foreground/80 leading-relaxed">{e.description}</p>
                        <p className="text-[9px] font-mono text-muted-foreground/40 mt-0.5">
                          {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          <span className="uppercase">{e.eventType.replace(/_/g, ' ')}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Report Modal */}
      {showReport && report && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border/50 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-mono font-bold text-foreground">Monthly Cognitive Report</span>
              </div>
              <button onClick={() => setShowReport(false)} className="text-muted-foreground/50 hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <MarkdownReport content={report} />
            </div>
            <div className="px-4 py-3 border-t border-border/30 flex justify-end">
              <Button onClick={() => setShowReport(false)} variant="outline" size="sm" className="font-mono text-xs">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
