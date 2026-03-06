'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchNotes, extractUrl, importSkillTree,
  fetchMissions, createMission, updateMissionStatus, deleteMission,
  selectKnowledgeGenerating, selectKnowledgeError,
  selectAllNotes, selectMissions,
} from '@/state/slices/knowledgeSlice'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Search, Globe, ChevronLeft, Brain, AlertCircle, Check,
  TreePine, Link2, X, Rocket, Loader2, CheckCircle2, PauseCircle, Trash2,
} from 'lucide-react'

interface ExtractedNote {
  title: string
  type: string
  content: string
  tags: string[]
  confidence: number
}

interface ExtractResult {
  sourceTitle: string
  summary: string
  notes: ExtractedNote[]
  keyTakeaway: string
  notesCreated: number
}

const MISSION_STATUS_ICON: Record<string, React.ReactNode> = {
  active: <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />,
  completed: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
  paused: <PauseCircle className="h-3 w-3 text-amber-400" />,
}

const MISSION_STATUS_COLOR: Record<string, string> = {
  active: 'border-blue-500/30 bg-blue-500/5',
  completed: 'border-emerald-500/30 bg-emerald-500/5',
  paused: 'border-amber-500/30 bg-amber-500/5',
}

export default function ResearchPage() {
  const dispatch = useAppDispatch()
  const isGenerating = useAppSelector(selectKnowledgeGenerating)
  const error = useAppSelector(selectKnowledgeError)
  const notes = useAppSelector(selectAllNotes)
  const missions = useAppSelector(selectMissions)

  const [activeTab, setActiveTab] = useState<'url' | 'skillTree' | 'missions'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null)
  const [skillTreeInput, setSkillTreeInput] = useState('')
  const [skillFormat, setSkillFormat] = useState<'json' | 'text'>('text')
  const [importResult, setImportResult] = useState<{ notesCreated: number; linksCreated: number; summary: string } | null>(null)
  const [recentSources, setRecentSources] = useState<{ title: string; url: string; type: string }[]>([])
  const [missionTopic, setMissionTopic] = useState('')
  const [missionDesc, setMissionDesc] = useState('')

  useEffect(() => {
    dispatch(fetchNotes())
    dispatch(fetchMissions())
    fetchRecentSources()
  }, [dispatch])

  const fetchRecentSources = async () => {
    try {
      const res = await fetch('/api/knowledge/notes?type=reference&limit=10')
      const data = await res.json()
      if (data.data) {
        setRecentSources(data.data.map((n: { title: string; sourceUrl?: string; type: string }) => ({
          title: n.title,
          url: n.sourceUrl || '',
          type: n.type,
        })))
      }
    } catch { /* noop */ }
  }

  const handleExtractUrl = async () => {
    if (!urlInput.trim()) return
    try {
      const result = await dispatch(extractUrl({ url: urlInput.trim(), save: true })).unwrap()
      setExtractResult(result)
      await dispatch(fetchNotes())
      await fetchRecentSources()
    } catch { /* handled by Redux */ }
  }

  const handleImportSkillTree = async () => {
    if (!skillTreeInput.trim()) return
    try {
      let parsed: unknown = skillTreeInput
      if (skillFormat === 'json') {
        try { parsed = JSON.parse(skillTreeInput) } catch { /* treat as text */ }
      }
      const result = await dispatch(importSkillTree({ skillTree: parsed, format: skillFormat })).unwrap()
      setImportResult(result)
      await dispatch(fetchNotes())
    } catch { /* handled by Redux */ }
  }

  const handleLaunchMission = async () => {
    if (!missionTopic.trim()) return
    try {
      await dispatch(createMission({ topic: missionTopic.trim(), description: missionDesc.trim() || undefined })).unwrap()
      setMissionTopic('')
      setMissionDesc('')
      await dispatch(fetchNotes())
    } catch { /* handled by Redux */ }
  }

  const EXAMPLE_SKILL_TREE = `Machine Learning
- Fundamentals
  - Linear Algebra
  - Statistics
- Supervised Learning
  - Regression
  - Neural Networks`

  const TYPE_BADGE: Record<string, string> = {
    reference: 'bg-gray-500/10 text-gray-400 border-gray-400',
    concept: 'bg-blue-500/10 text-blue-400 border-blue-500',
    permanent: 'bg-amber-500/10 text-amber-400 border-amber-500',
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <a href="/knowledge" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            <Brain className="h-4 w-4 text-primary" />
          </a>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Research Extractor</span>
          <span className="text-[10px] font-mono text-muted-foreground/40">{notes.length} notes in brain</span>
        </div>
      </div>

      <div className="flex border-b border-border/50">
        <button
          onClick={() => setActiveTab('url')}
          className={cn('flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold uppercase transition-colors', activeTab === 'url' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
        >
          <Globe className="h-3.5 w-3.5" />URL Extractor
        </button>
        <button
          onClick={() => setActiveTab('skillTree')}
          className={cn('flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold uppercase transition-colors', activeTab === 'skillTree' ? 'border-b-2 border-emerald-400 text-emerald-400' : 'text-muted-foreground hover:text-foreground')}
        >
          <TreePine className="h-3.5 w-3.5" />Skill Tree
        </button>
        <button
          onClick={() => setActiveTab('missions')}
          className={cn('flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold uppercase transition-colors', activeTab === 'missions' ? 'border-b-2 border-purple-400 text-purple-400' : 'text-muted-foreground hover:text-foreground')}
        >
          <Rocket className="h-3.5 w-3.5" />Missions
          {missions.filter(m => m.status === 'active').length > 0 && (
            <span className="ml-1 text-[8px] font-mono bg-purple-500/20 text-purple-400 px-1 rounded">
              {missions.filter(m => m.status === 'active').length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded mb-4 text-red-400 text-xs font-mono">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* URL Extractor Tab */}
        {activeTab === 'url' && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="text-sm font-mono font-bold text-foreground mb-1">Extract Knowledge from Any URL</h2>
              <p className="text-xs text-muted-foreground/60 font-mono">AI reads articles, papers, and websites — then extracts atomic Zettelkasten notes</p>
              <p className="text-[10px] text-muted-foreground/40 font-mono mt-1">Works with: articles, blog posts, research papers, Wikipedia, YouTube videos</p>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                className="flex-1 bg-muted/30 border border-border/50 rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="https://..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleExtractUrl()}
              />
              <Button onClick={handleExtractUrl} disabled={!urlInput.trim() || isGenerating} className="font-mono text-xs shrink-0">
                <Search className="h-3.5 w-3.5 mr-1.5" />{isGenerating ? 'Extracting...' : 'Extract'}
              </Button>
            </div>
            {isGenerating && (
              <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded mb-4">
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary animate-spin rounded-full shrink-0" />
                <div>
                  <p className="text-xs font-mono text-foreground">AI is fetching and analyzing the content...</p>
                  <p className="text-[10px] font-mono text-muted-foreground/50">This may take 10-20 seconds</p>
                </div>
              </div>
            )}
            {extractResult && !isGenerating && (
              <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-mono font-bold text-emerald-400">{extractResult.notesCreated} notes extracted and saved</span>
                </div>
                <h3 className="text-sm font-mono font-bold text-foreground mb-1">{extractResult.sourceTitle}</h3>
                <p className="text-xs text-muted-foreground/70 mb-3">{extractResult.summary}</p>
                {extractResult.keyTakeaway && (
                  <div className="p-2 bg-primary/10 border border-primary/30 rounded mb-3">
                    <p className="text-[9px] font-mono font-bold uppercase text-primary/60 mb-0.5">Key Takeaway</p>
                    <p className="text-xs text-foreground font-mono">{extractResult.keyTakeaway}</p>
                  </div>
                )}
                <div className="space-y-2">
                  {extractResult.notes?.map((note, i) => (
                    <div key={i} className="border border-border/30 rounded p-3 bg-background/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-[9px] font-mono border rounded px-1 py-0.5', TYPE_BADGE[note.type] || 'bg-muted/30 text-muted-foreground border-border')}>{note.type}</span>
                        <span className="text-[9px] font-mono text-muted-foreground/40">conf: {Math.round((note.confidence || 0.7) * 100)}%</span>
                      </div>
                      <p className="text-xs font-mono font-bold text-foreground">{note.title}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5 leading-relaxed">{note.content?.slice(0, 200)}</p>
                      {note.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {note.tags.map((t, j) => <span key={j} className="text-[8px] font-mono text-primary/50 bg-primary/5 px-1 rounded">#{t}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => { setExtractResult(null); setUrlInput('') }} className="mt-3 text-[10px] font-mono text-muted-foreground/40 hover:text-muted-foreground flex items-center gap-1">
                  <X className="h-3 w-3" />Clear
                </button>
              </div>
            )}
            {recentSources.length > 0 && !extractResult && (
              <div>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">Recent Extractions</h3>
                <div className="space-y-1">
                  {recentSources.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border border-border/30 rounded bg-background/30 hover:bg-background/60 transition-colors">
                      <Link2 className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                      <span className="text-xs font-mono text-foreground truncate flex-1">{s.title}</span>
                      {s.url && <span className="text-[8px] font-mono text-muted-foreground/30 truncate max-w-32">{s.url}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skill Tree Tab */}
        {activeTab === 'skillTree' && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="text-sm font-mono font-bold text-foreground mb-1">Import a Skill Tree</h2>
              <p className="text-xs text-muted-foreground/60 font-mono">Convert any skill tree or learning roadmap into an interconnected Zettelkasten knowledge graph</p>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setSkillFormat('text')} className={cn('text-xs font-mono px-3 py-1.5 rounded border transition-colors', skillFormat === 'text' ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground')}>Indented Text</button>
              <button onClick={() => setSkillFormat('json')} className={cn('text-xs font-mono px-3 py-1.5 rounded border transition-colors', skillFormat === 'json' ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground')}>JSON</button>
              <button onClick={() => setSkillTreeInput(EXAMPLE_SKILL_TREE)} className="text-xs font-mono px-3 py-1.5 rounded border border-border/30 text-muted-foreground hover:text-foreground ml-auto">Use Example</button>
            </div>
            <textarea
              className="w-full h-64 mb-4 bg-muted/20 border border-border/50 rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Programming\n- Python\n  - Data Science"
              value={skillTreeInput}
              onChange={e => setSkillTreeInput(e.target.value)}
            />
            <Button onClick={handleImportSkillTree} disabled={!skillTreeInput.trim() || isGenerating} className="font-mono text-xs">
              <TreePine className="h-3.5 w-3.5 mr-1.5" />{isGenerating ? 'Importing...' : 'Import to Knowledge Graph'}
            </Button>
            {importResult && !isGenerating && (
              <div className="mt-4 p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-mono font-bold text-emerald-400">Import complete</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-background/50 rounded">
                    <p className="text-2xl font-mono font-bold text-foreground">{importResult.notesCreated}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60">Notes Created</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded">
                    <p className="text-2xl font-mono font-bold text-foreground">{importResult.linksCreated}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60">Links Created</p>
                  </div>
                </div>
                {importResult.summary && <p className="text-xs text-muted-foreground/70 font-mono mt-2">{importResult.summary}</p>}
                <div className="flex gap-2 mt-3">
                  <a href="/knowledge" className="text-[10px] font-mono text-primary hover:underline">View notes →</a>
                  <a href="/knowledge/graph" className="text-[10px] font-mono text-primary hover:underline">View graph →</a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Missions Tab */}
        {activeTab === 'missions' && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <h2 className="text-sm font-mono font-bold text-foreground mb-1">Autonomous Research Missions</h2>
              <p className="text-xs text-muted-foreground/60 font-mono">Launch an AI agent to research any topic — it finds sources, extracts notes, and builds your knowledge graph automatically</p>
              <p className="text-[10px] text-muted-foreground/40 font-mono mt-1">Each mission discovers 3 high-quality sources and creates atomic Zettelkasten notes from them</p>
            </div>

            <div className="border border-purple-500/30 bg-purple-500/5 rounded-lg p-4 mb-6">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-purple-400 mb-3">Launch New Mission</h3>
              <input
                className="w-full mb-2 bg-background/50 border border-border/50 rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-purple-400"
                placeholder="Research topic (e.g. 'Reinforcement Learning from Human Feedback')"
                value={missionTopic}
                onChange={e => setMissionTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isGenerating && handleLaunchMission()}
              />
              <input
                className="w-full mb-3 bg-background/50 border border-border/50 rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-purple-400"
                placeholder="Optional context or focus area..."
                value={missionDesc}
                onChange={e => setMissionDesc(e.target.value)}
              />
              <Button
                onClick={handleLaunchMission}
                disabled={!missionTopic.trim() || isGenerating}
                className="font-mono text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isGenerating
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Researching...</>
                  : <><Rocket className="h-3.5 w-3.5 mr-1.5" />Launch Mission</>
                }
              </Button>
              {isGenerating && (
                <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">
                  AI is finding sources and extracting knowledge — this takes 30-60 seconds...
                </p>
              )}
            </div>

            {missions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Rocket className="h-10 w-10 text-muted-foreground/10 mb-2" />
                <p className="text-xs font-mono text-muted-foreground/40">No missions launched yet</p>
                <p className="text-[10px] font-mono text-muted-foreground/30">Launch a mission above to start autonomous research</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">Mission History ({missions.length})</h3>
                {missions.map(m => (
                  <div key={m.id} className={cn('border rounded-lg p-3', MISSION_STATUS_COLOR[m.status] || 'border-border/30 bg-background/30')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {MISSION_STATUS_ICON[m.status]}
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-foreground truncate">{m.topic}</p>
                          {m.description && <p className="text-[9px] font-mono text-muted-foreground/50 truncate">{m.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-[9px] font-mono text-muted-foreground/50">{m.sourcesProcessed} sources · {m.notesGenerated} notes</p>
                          <p className="text-[8px] font-mono text-muted-foreground/30">{new Date(m.createdAt).toLocaleDateString()}</p>
                        </div>
                        {m.status === 'active' && (
                          <button onClick={() => dispatch(updateMissionStatus({ id: m.id, status: 'paused' }))} className="text-muted-foreground/30 hover:text-amber-400 transition-colors" title="Pause mission">
                            <PauseCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => dispatch(deleteMission(m.id))} className="text-muted-foreground/30 hover:text-red-400 transition-colors" title="Delete mission">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
