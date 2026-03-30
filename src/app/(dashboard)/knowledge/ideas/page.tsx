'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import { triggerMicroReward } from '@/components/ui/MicroReward'
import {
  fetchNotes, generateIdeas, detectGaps, createNote,
  selectAllNotes, selectLastIdeas, selectLastGaps,
  selectKnowledgeGenerating, selectKnowledgeError,
} from '@/state/slices/knowledgeSlice'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Lightbulb, Search, ChevronLeft, Brain, AlertCircle, ExternalLink, Zap, Save, ChevronDown, ChevronUp, Atom, RefreshCw } from 'lucide-react'
import type { IdeaExpansion, KnowledgeCollision } from '@/types/knowledge'

const EFFORT_COLORS = { low: 'text-emerald-400', medium: 'text-amber-400', high: 'text-red-400' }
const IMPACT_COLORS = { low: 'text-gray-400', medium: 'text-blue-400', high: 'text-purple-400' }
const TYPE_COLORS: Record<string, string> = {
  startup: 'border-purple-500 bg-purple-500/10 text-purple-400',
  project: 'border-blue-500 bg-blue-500/10 text-blue-400',
  research: 'border-amber-500 bg-amber-500/10 text-amber-400',
  'life-optimization': 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
  creative: 'border-pink-500 bg-pink-500/10 text-pink-400',
}

export default function IdeasPage() {
  const dispatch = useAppDispatch()
  const notes = useAppSelector(selectAllNotes)
  const ideas = useAppSelector(selectLastIdeas)
  const gaps = useAppSelector(selectLastGaps)
  const isGenerating = useAppSelector(selectKnowledgeGenerating)
  const error = useAppSelector(selectKnowledgeError)

  const [activeTab, setActiveTab] = useState<'ideas' | 'gaps' | 'expand' | 'collide'>('ideas')
  const [collision, setCollision] = useState<KnowledgeCollision | null>(null)
  const [colliding, setColliding] = useState(false)
  const [collideError, setCollideError] = useState<string | null>(null)
  const [seedIdea, setSeedIdea] = useState('')
  const [expansion, setExpansion] = useState<IdeaExpansion | null>(null)
  const [isExpanding, setIsExpanding] = useState(false)
  const [expandError, setExpandError] = useState<string | null>(null)
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ features: true, nextSteps: true })

  useEffect(() => {
    dispatch(fetchNotes())
  }, [dispatch])

  const handleGenerateIdeas = () => dispatch(generateIdeas())
  const handleDetectGaps = () => dispatch(detectGaps())

  const handleExpandIdea = async () => {
    if (!seedIdea.trim()) return
    setIsExpanding(true)
    setExpandError(null)
    setExpansion(null)
    setSavedNoteId(null)
    try {
      const res = await fetch('/api/knowledge/ideas/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedIdea }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Expansion failed')
      setExpansion(data.data)
    } catch (e) {
      setExpandError(e instanceof Error ? e.message : 'Failed to expand idea')
    } finally {
      setIsExpanding(false)
    }
  }

  const handleSaveAsNote = async () => {
    if (!expansion) return
    const res = await fetch('/api/knowledge/ideas/expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seedIdea, save: true }),
    })
    const data = await res.json()
    if (data.savedNoteId) {
      setSavedNoteId(data.savedNoteId)
      triggerMicroReward('Expanded.')
    }
  }

  const handleCollide = async () => {
    setColliding(true)
    setCollideError(null)
    try {
      const res = await fetch('/api/knowledge/collide', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Collision failed')
      setCollision(data.data)
    } catch (e) {
      setCollideError(e instanceof Error ? e.message : 'Failed to generate collision')
    } finally {
      setColliding(false)
    }
  }

  const toggleSection = (key: string) => setExpandedSections(s => ({ ...s, [key]: !s[key] }))

  const PRIORITY_COLORS = { critical: 'text-red-400 border-red-500 bg-red-500/10', high: 'text-orange-400 border-orange-500 bg-orange-500/10', medium: 'text-blue-400 border-blue-500 bg-blue-500/10' }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <a href="/knowledge" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <Brain className="h-4 w-4 text-primary" />
          </a>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Idea Engine</span>
          <span className="text-[10px] font-mono text-muted-foreground/40">{notes.length} notes in brain</span>
        </div>
        <div className="flex gap-2">
          {activeTab === 'ideas' && (
            <Button onClick={handleGenerateIdeas} disabled={isGenerating} size="sm" className="font-mono text-xs bg-purple-600 hover:bg-purple-700 text-white">
              <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
              {isGenerating ? 'Thinking...' : 'Generate Ideas'}
            </Button>
          )}
          {activeTab === 'gaps' && (
            <Button onClick={handleDetectGaps} disabled={isGenerating} size="sm" variant="outline" className="font-mono text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
              <Search className="h-3.5 w-3.5 mr-1.5" />
              Detect Gaps
            </Button>
          )}
          {activeTab === 'collide' && collision && (
            <Button onClick={handleCollide} disabled={colliding} size="sm" variant="outline" className="font-mono text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', colliding && 'animate-spin')} />
              {colliding ? 'Colliding...' : 'New Collision'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50">
        <button onClick={() => setActiveTab('ideas')} className={cn('px-4 py-2 text-xs font-mono font-bold uppercase transition-colors', activeTab === 'ideas' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}>
          Ideas ({ideas.length})
        </button>
        <button onClick={() => setActiveTab('gaps')} className={cn('px-4 py-2 text-xs font-mono font-bold uppercase transition-colors', activeTab === 'gaps' ? 'border-b-2 border-amber-400 text-amber-400' : 'text-muted-foreground hover:text-foreground')}>
          Knowledge Gaps ({gaps.length})
        </button>
        <button onClick={() => setActiveTab('expand')} className={cn('px-4 py-2 text-xs font-mono font-bold uppercase transition-colors', activeTab === 'expand' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-muted-foreground hover:text-foreground')}>
          Expand Idea
        </button>
        <button onClick={() => setActiveTab('collide')} className={cn('px-4 py-2 text-xs font-mono font-bold uppercase transition-colors flex items-center gap-1.5', activeTab === 'collide' ? 'border-b-2 border-orange-400 text-orange-400' : 'text-muted-foreground hover:text-foreground')}>
          <Atom className="h-3 w-3" />
          Collide
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isGenerating && (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary animate-spin rounded-full mx-auto mb-3" />
              <p className="text-xs font-mono text-muted-foreground/60">AI is analyzing your knowledge graph...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded mb-4 text-red-400 text-xs font-mono">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {activeTab === 'ideas' && !isGenerating && (
          <>
            {ideas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Lightbulb className="h-16 w-16 text-muted-foreground/10 mb-4" />
                <p className="text-sm font-mono text-muted-foreground/40">No ideas generated yet</p>
                <p className="text-xs font-mono text-muted-foreground/30 mt-1">Add at least 3 notes to your knowledge base first</p>
                <Button onClick={handleGenerateIdeas} className="mt-4" size="sm">Generate Ideas</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {ideas.map((idea, i) => (
                  <div key={i} className={cn('border rounded-lg p-4 hover:shadow-lg transition-all', TYPE_COLORS[idea.type ?? ''] || TYPE_COLORS.project)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className={cn('text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border', TYPE_COLORS[idea.type ?? ''] || TYPE_COLORS.project)}>
                          {idea.type}
                        </span>
                        <h3 className="text-sm font-mono font-bold text-foreground mt-1.5">{idea.title}</h3>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground/80 leading-relaxed mb-3">{idea.description}</p>

                    {idea.opportunity && (
                      <div className="mb-3 p-2 bg-primary/5 border border-primary/20 rounded">
                        <p className="text-[9px] font-mono font-bold uppercase text-muted-foreground/50 mb-0.5">Opportunity</p>
                        <p className="text-xs text-foreground/80">{idea.opportunity}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className={cn('text-[10px] font-mono', EFFORT_COLORS[idea.effort as keyof typeof EFFORT_COLORS] || 'text-muted-foreground')}>
                          effort: {idea.effort}
                        </span>
                        <span className={cn('text-[10px] font-mono', IMPACT_COLORS[idea.impact as keyof typeof IMPACT_COLORS] || 'text-muted-foreground')}>
                          impact: {idea.impact}
                        </span>
                      </div>
                    </div>

                    {idea.derivedFrom?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <p className="text-[8px] font-mono text-muted-foreground/40 mb-1">Derived from:</p>
                        <div className="flex flex-wrap gap-1">
                          {idea.derivedFrom.slice(0, 4).map((title, j) => (
                            <span key={j} className="text-[8px] font-mono bg-muted/30 px-1 py-0.5 rounded text-muted-foreground/60 truncate max-w-32">
                              {title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t border-border/20">
                      <button
                        onClick={() => { setSeedIdea(idea.title + ': ' + idea.description); setActiveTab('expand') }}
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Build This →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'expand' && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="text-sm font-mono font-bold text-foreground mb-1">Expand a Seed Idea</h2>
              <p className="text-xs text-muted-foreground/60 mb-3">Describe any idea — AI will build a full market analysis, features list, business model, and action plan.</p>
              <div className="flex gap-2">
                <textarea
                  value={seedIdea}
                  onChange={e => setSeedIdea(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleExpandIdea() }}
                  placeholder="e.g. AI-powered fitness coaching subscription platform..."
                  className="flex-1 bg-muted/20 border border-border/50 rounded p-3 text-sm font-mono text-foreground/90 placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-cyan-500/50 min-h-[80px]"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button onClick={handleExpandIdea} disabled={isExpanding || !seedIdea.trim()} size="sm" className="font-mono text-xs bg-cyan-600 hover:bg-cyan-700 text-white">
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  {isExpanding ? 'Expanding...' : 'Expand Idea'}
                </Button>
                <span className="text-[10px] font-mono text-muted-foreground/40">⌘+Enter to expand</span>
              </div>
            </div>

            {isExpanding && (
              <div className="flex items-center gap-3 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded">
                <div className="h-4 w-4 border-2 border-cyan-500/30 border-t-cyan-500 animate-spin rounded-full shrink-0" />
                <p className="text-xs font-mono text-cyan-400/80">Building full breakdown from your knowledge context...</p>
              </div>
            )}

            {expandError && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs font-mono">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {expandError}
              </div>
            )}

            {expansion && (
              <div className="space-y-3">
                {/* Header */}
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/30 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-mono font-bold text-foreground mb-1">{expansion.title}</h3>
                      <p className="text-sm text-cyan-300/80 italic">{expansion.oneLiner}</p>
                    </div>
                    {savedNoteId ? (
                      <div className="flex items-center gap-2">
                        <a href="/knowledge" className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded hover:bg-emerald-500/10">
                          <ExternalLink className="h-3 w-3" /> View Note
                        </a>
                        <a href="/knowledge/graph" className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 border border-cyan-500/40 px-2 py-1 rounded hover:bg-cyan-500/10">
                          Connect in Graph →
                        </a>
                      </div>
                    ) : (
                      <Button onClick={handleSaveAsNote} size="sm" variant="outline" className="font-mono text-[10px] border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
                        <Save className="h-3 w-3 mr-1" /> Save as Note
                      </Button>
                    )}
                  </div>
                </div>

                {/* Market */}
                <div className="p-3 bg-background/50 border border-border/50 rounded">
                  <p className="text-[9px] font-mono font-bold uppercase text-muted-foreground/40 mb-1">Market Opportunity</p>
                  <p className="text-xs text-foreground/80">{expansion.market}</p>
                </div>

                {/* Features */}
                <div className="border border-border/50 rounded overflow-hidden">
                  <button onClick={() => toggleSection('features')} className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20">
                    <span className="text-[9px] font-mono font-bold uppercase text-muted-foreground/40">Core Features ({expansion.features.length})</span>
                    {expandedSections.features ? <ChevronUp className="h-3 w-3 text-muted-foreground/40" /> : <ChevronDown className="h-3 w-3 text-muted-foreground/40" />}
                  </button>
                  {expandedSections.features && (
                    <ul className="px-3 pb-3 space-y-1">
                      {expansion.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                          <span className="text-cyan-400 mt-0.5">•</span>{f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Business Model + Competitors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-background/50 border border-border/50 rounded">
                    <p className="text-[9px] font-mono font-bold uppercase text-muted-foreground/40 mb-1">Business Model</p>
                    <p className="text-xs text-foreground/80">{expansion.businessModel}</p>
                  </div>
                  <div className="p-3 bg-background/50 border border-border/50 rounded">
                    <p className="text-[9px] font-mono font-bold uppercase text-muted-foreground/40 mb-1">Competitors / Analogs</p>
                    <ul className="space-y-0.5">
                      {expansion.competitors.map((c, i) => <li key={i} className="text-xs text-foreground/80">• {c}</li>)}
                    </ul>
                  </div>
                </div>

                {/* Unique Advantage */}
                <div className="p-3 bg-purple-500/5 border border-purple-500/30 rounded">
                  <p className="text-[9px] font-mono font-bold uppercase text-purple-400/60 mb-1">Your Unique Advantage</p>
                  <p className="text-xs text-foreground/80">{expansion.uniqueAdvantage}</p>
                </div>

                {/* Next Steps */}
                <div className="border border-border/50 rounded overflow-hidden">
                  <button onClick={() => toggleSection('nextSteps')} className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/20">
                    <span className="text-[9px] font-mono font-bold uppercase text-muted-foreground/40">Next Steps</span>
                    {expandedSections.nextSteps ? <ChevronUp className="h-3 w-3 text-muted-foreground/40" /> : <ChevronDown className="h-3 w-3 text-muted-foreground/40" />}
                  </button>
                  {expandedSections.nextSteps && (
                    <ol className="px-3 pb-3 space-y-1">
                      {expansion.nextSteps.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                          <span className="text-emerald-400 shrink-0 font-mono">{i + 1}.</span>{s}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Risks */}
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded">
                  <p className="text-[9px] font-mono font-bold uppercase text-red-400/60 mb-1">Key Risks</p>
                  <ul className="space-y-0.5">
                    {expansion.risks.map((r, i) => <li key={i} className="text-xs text-foreground/80">⚠ {r}</li>)}
                  </ul>
                </div>

                {/* Create Project */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => dispatch(createNote({
                      title: expansion.title,
                      type: 'project',
                      content: `# ${expansion.title}\n\n${expansion.oneLiner}\n\n## First Steps\n${expansion.nextSteps?.map(s => `- ${s}`).join('\n')}`,
                      tags: ['project'],
                      source: 'AI',
                    }) as any)}
                    className="text-[10px] font-mono border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 px-3 py-1.5 transition-colors"
                  >
                    Create Project →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gaps' && !isGenerating && (
          <>
            {gaps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Search className="h-16 w-16 text-muted-foreground/10 mb-4" />
                <p className="text-sm font-mono text-muted-foreground/40">No gaps detected yet</p>
                <Button onClick={handleDetectGaps} className="mt-4" size="sm">Detect Knowledge Gaps</Button>
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl">
                {gaps.map((gap, i) => (
                  <div key={i} className="border border-border/50 rounded-lg p-4 bg-background/50 hover:border-border/80 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border',
                          PRIORITY_COLORS[gap.priority as keyof typeof PRIORITY_COLORS] || 'text-blue-400 border-blue-500 bg-blue-500/10')}>
                          {(gap as { priority?: string }).priority || 'medium'}
                        </span>
                        <span className="text-[9px] font-mono border border-border/50 bg-muted/20 px-1.5 py-0.5 rounded text-muted-foreground/60">
                          {(gap as { type?: string }).type || 'concept'}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-sm font-mono font-bold text-foreground mb-1">{gap.topic}</h3>
                    <p className="text-xs text-muted-foreground/70 mb-2">{gap.reason}</p>
                    {gap.suggestedLearning && (
                      <div className="flex items-start gap-1.5 p-2 bg-blue-500/5 border border-blue-500/20 rounded">
                        <ExternalLink className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-400/80 font-mono">{gap.suggestedLearning}</p>
                      </div>
                    )}
                    {gap.relatedNotes?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {gap.relatedNotes.slice(0, 5).map((note, j) => (
                          <span key={j} className="text-[8px] font-mono bg-muted/30 px-1 py-0.5 rounded text-muted-foreground/60">
                            {note}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {activeTab === 'collide' && (
          <div className="max-w-3xl">
            {collideError && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded mb-4 text-red-400 text-xs font-mono">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {collideError}
              </div>
            )}

            {!collision && !colliding && (
              <div className="flex flex-col items-center justify-center h-64">
                <Atom className="h-16 w-16 text-muted-foreground/10 mb-4" />
                <p className="text-sm font-mono text-muted-foreground/40 mb-1">Idea Collision Engine</p>
                <p className="text-xs font-mono text-muted-foreground/30 mb-4 text-center max-w-xs">
                  {notes.length < 6
                    ? `Add at least 6 ideas to enable collision detection (${notes.length}/6)`
                    : 'Collides two unrelated knowledge clusters to generate a breakthrough concept'}
                </p>
                <Button
                  onClick={handleCollide}
                  disabled={colliding || notes.length < 6}
                  size="sm"
                  className="font-mono text-xs bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Atom className="h-3.5 w-3.5 mr-1.5" />
                  Collide Ideas
                </Button>
              </div>
            )}

            {colliding && (
              <div className="flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded">
                <div className="h-4 w-4 border-2 border-orange-500/30 border-t-orange-500 animate-spin rounded-full shrink-0" />
                <p className="text-xs font-mono text-orange-400/80">Scanning knowledge clusters for hidden connections...</p>
              </div>
            )}

            {collision && !colliding && (
              <div className="space-y-4">
                {/* Cluster badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[9px] font-mono font-bold uppercase px-2 py-1 border border-blue-500/40 bg-blue-500/10 text-blue-400 rounded-sm">
                    {collision.clusterA.theme}
                  </span>
                  <span className="text-base">⚡</span>
                  <span className="text-[9px] font-mono font-bold uppercase px-2 py-1 border border-purple-500/40 bg-purple-500/10 text-purple-400 rounded-sm">
                    {collision.clusterB.theme}
                  </span>
                </div>

                {/* Collision result card */}
                <div className="p-4 bg-orange-500/5 border border-orange-500/30 rounded">
                  <div className="flex items-start gap-2 mb-3">
                    <Zap className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-mono font-bold text-foreground">{collision.collision.title}</h3>
                      <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{collision.collision.concept}</p>
                    </div>
                  </div>

                  {collision.collision.applications.length > 0 && (
                    <div className="mb-3 p-2.5 bg-background/40 border border-border/40 rounded-sm">
                      <p className="text-[9px] font-mono font-bold uppercase text-muted-foreground/40 mb-1.5">Applications</p>
                      <ul className="space-y-1">
                        {collision.collision.applications.map((app, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/80">
                            <span className="text-orange-400 mt-0.5 shrink-0">•</span>{app}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mb-3 p-2.5 bg-background/40 border border-border/40 rounded-sm">
                    <p className="text-[9px] font-mono font-bold uppercase text-muted-foreground/40 mb-1">Tech Approach</p>
                    <p className="text-xs text-foreground/80">{collision.collision.techApproach}</p>
                  </div>

                  <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-sm">
                    <p className="text-[9px] font-mono font-bold uppercase text-emerald-400/60 mb-1">First Step</p>
                    <p className="text-xs text-foreground/80">{collision.collision.firstStep}</p>
                  </div>
                </div>

                {/* Source notes */}
                <div className="grid grid-cols-2 gap-3">
                  {[collision.clusterA, collision.clusterB].map((cluster, ci) => (
                    <div key={ci} className="p-2.5 border border-border/40 bg-background/30 rounded-sm">
                      <p className={cn('text-[9px] font-mono font-bold uppercase mb-1.5', ci === 0 ? 'text-blue-400/60' : 'text-purple-400/60')}>{cluster.theme}</p>
                      <div className="flex flex-wrap gap-1">
                        {cluster.notes.slice(0, 4).map((n, i) => (
                          <span key={i} className="text-[8px] font-mono bg-muted/30 px-1 py-0.5 rounded text-muted-foreground/60">{n}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
