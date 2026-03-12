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
  Search, Globe, Brain, AlertCircle, Check,
  TreePine, Link2, X, Rocket, Loader2, CheckCircle2, PauseCircle, Trash2,
  Network,
} from 'lucide-react'
import type { KnowledgeNote } from '@/types/knowledge'

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

const TYPE_BADGE: Record<string, string> = {
  reference: 'bg-gray-500/10 text-gray-400 border-gray-500/40',
  concept: 'bg-blue-500/10 text-blue-400 border-blue-500/40',
  permanent: 'bg-amber-500/10 text-amber-400 border-amber-500/40',
}

function getRelated(note: KnowledgeNote, allNotes: KnowledgeNote[]): KnowledgeNote[] {
  if (!note.tags.length) return []
  return allNotes
    .filter(n => n.id !== note.id && n.tags.some(t => note.tags.includes(t)))
    .sort((a, b) => {
      const ao = a.tags.filter(t => note.tags.includes(t)).length
      const bo = b.tags.filter(t => note.tags.includes(t)).length
      return bo - ao
    })
    .slice(0, 4)
}

export default function ResearchPage() {
  const dispatch = useAppDispatch()
  const isGenerating = useAppSelector(selectKnowledgeGenerating)
  const error = useAppSelector(selectKnowledgeError)
  const notes = useAppSelector(selectAllNotes)
  const missions = useAppSelector(selectMissions)

  const [activeTool, setActiveTool] = useState<'url' | 'skillTree' | 'missions'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null)
  const [skillTreeInput, setSkillTreeInput] = useState('')
  const [skillFormat, setSkillFormat] = useState<'json' | 'text'>('text')
  const [importResult, setImportResult] = useState<{ notesCreated: number; linksCreated: number; summary: string } | null>(null)
  const [missionTopic, setMissionTopic] = useState('')
  const [missionDesc, setMissionDesc] = useState('')
  const [selectedSource, setSelectedSource] = useState<KnowledgeNote | null>(null)
  const [lastExtractedNotes, setLastExtractedNotes] = useState<KnowledgeNote[]>([])

  useEffect(() => {
    dispatch(fetchNotes())
    dispatch(fetchMissions())
  }, [dispatch])

  const sourcesLibrary = notes.filter(n => n.type === 'reference' || n.tags.includes('research'))

  const handleExtractUrl = async () => {
    if (!urlInput.trim()) return
    try {
      const result = await dispatch(extractUrl({ url: urlInput.trim(), save: true })).unwrap()
      setExtractResult(result)
      await dispatch(fetchNotes())
      // After re-fetching, find new reference notes to show in connections
      setLastExtractedNotes([])
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

  const EXAMPLE_SKILL_TREE = `Machine Learning\n- Fundamentals\n  - Linear Algebra\n  - Statistics\n- Supervised Learning\n  - Regression\n  - Neural Networks`

  const relatedNotes = selectedSource
    ? getRelated(selectedSource, notes)
    : lastExtractedNotes.length > 0
      ? getRelated(lastExtractedNotes[0], notes)
      : []

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-0.5 h-4 bg-primary" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest">RESEARCH</span>
          <span className="text-[10px] font-mono text-muted-foreground/40">{notes.length} notes in brain</span>
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-mono">
            <AlertCircle className="h-3 w-3" />{error}
          </div>
        )}
      </div>

      {/* 3-Panel layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT — Source Library */}
        <div className="w-56 flex-shrink-0 border-r border-border/50 flex flex-col bg-background/50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
            <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/50">SOURCE LIBRARY</p>
            <span className="text-[9px] font-mono text-muted-foreground/30">{sourcesLibrary.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sourcesLibrary.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-3 pb-8">
                <Link2 className="h-6 w-6 text-muted-foreground/10 mb-2" />
                <p className="text-[9px] font-mono text-muted-foreground/30">No sources yet.</p>
                <p className="text-[8px] font-mono text-muted-foreground/20 mt-1">Extract a URL to add your first source.</p>
              </div>
            ) : (
              sourcesLibrary.map(note => (
                <button
                  key={note.id}
                  onClick={() => setSelectedSource(note)}
                  className={cn(
                    'w-full text-left p-2.5 border-b border-border/20 hover:bg-primary/5 transition-colors',
                    selectedSource?.id === note.id && 'bg-primary/10 border-l-2 border-l-primary'
                  )}
                >
                  <p className="text-[10px] font-mono font-bold text-foreground/90 leading-tight line-clamp-2">{note.title}</p>
                  {note.sourceUrl && (
                    <p className="text-[8px] font-mono text-muted-foreground/30 mt-0.5 truncate">
                      {(() => { try { return new URL(note.sourceUrl).hostname } catch { return note.sourceUrl } })()}
                    </p>
                  )}
                  <p className="text-[8px] font-mono text-muted-foreground/25 mt-0.5">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* CENTER — Active Tool */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Tool selector */}
          <div className="flex gap-1 px-3 py-2 border-b border-border/30 flex-shrink-0">
            {([
              { id: 'url',       label: 'URL EXTRACTOR', icon: Globe },
              { id: 'skillTree', label: 'SKILL TREE',    icon: TreePine },
              { id: 'missions',  label: 'MISSIONS',      icon: Rocket,
                badge: missions.filter(m => m.status === 'active').length },
            ] as const).map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wide transition-colors',
                  activeTool === tool.id
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground/50 hover:text-muted-foreground border border-transparent'
                )}
              >
                <tool.icon className="h-3 w-3" />
                {tool.label}
                {'badge' in tool && tool.badge > 0 && (
                  <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded">{tool.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tool content */}
          <div className="flex-1 overflow-y-auto p-4">

            {/* URL Extractor */}
            {activeTool === 'url' && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground/40 mb-3">AI reads articles, papers, and websites — extracts atomic Zettelkasten notes</p>
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
                      <p className="text-xs font-mono text-foreground">AI is analyzing the content...</p>
                      <p className="text-[10px] font-mono text-muted-foreground/50">This may take 10–20 seconds</p>
                    </div>
                  </div>
                )}
                {extractResult && !isGenerating && (
                  <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-mono font-bold text-emerald-400">{extractResult.notesCreated} notes extracted</span>
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
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{note.content?.slice(0, 160)}</p>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setExtractResult(null); setUrlInput('') }} className="mt-3 text-[10px] font-mono text-muted-foreground/40 hover:text-muted-foreground flex items-center gap-1">
                      <X className="h-3 w-3" /> Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Skill Tree */}
            {activeTool === 'skillTree' && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground/40 mb-3">Convert any skill tree or learning roadmap into an interconnected knowledge graph</p>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setSkillFormat('text')} className={cn('text-xs font-mono px-3 py-1.5 rounded border transition-colors', skillFormat === 'text' ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground')}>Indented Text</button>
                  <button onClick={() => setSkillFormat('json')} className={cn('text-xs font-mono px-3 py-1.5 rounded border transition-colors', skillFormat === 'json' ? 'border-primary bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground')}>JSON</button>
                  <button onClick={() => setSkillTreeInput(EXAMPLE_SKILL_TREE)} className="text-xs font-mono px-3 py-1.5 rounded border border-border/30 text-muted-foreground hover:text-foreground ml-auto">Use Example</button>
                </div>
                <textarea
                  className="w-full h-48 mb-4 bg-muted/20 border border-border/50 rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
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
                    <div className="flex gap-3 mt-3">
                      <a href="/knowledge" className="text-[10px] font-mono text-primary hover:underline">View notes →</a>
                      <a href="/knowledge/graph" className="text-[10px] font-mono text-primary hover:underline">View graph →</a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Missions */}
            {activeTool === 'missions' && (
              <div>
                <div className="border border-purple-500/30 bg-purple-500/5 rounded-lg p-4 mb-4">
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-purple-400 mb-3">LAUNCH MISSION</p>
                  <input
                    className="w-full mb-2 bg-background/50 border border-border/50 rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="Research topic (e.g. 'RLHF')"
                    value={missionTopic}
                    onChange={e => setMissionTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isGenerating && handleLaunchMission()}
                  />
                  <input
                    className="w-full mb-3 bg-background/50 border border-border/50 rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="Optional focus area..."
                    value={missionDesc}
                    onChange={e => setMissionDesc(e.target.value)}
                  />
                  <Button onClick={handleLaunchMission} disabled={!missionTopic.trim() || isGenerating} className="font-mono text-xs bg-purple-600 hover:bg-purple-700 text-white">
                    {isGenerating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Researching...</> : <><Rocket className="h-3.5 w-3.5 mr-1.5" />Launch Mission</>}
                  </Button>
                  {isGenerating && <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">Finding sources and extracting knowledge (30–60s)...</p>}
                </div>
                {missions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">HISTORY ({missions.length})</p>
                    {missions.map(m => (
                      <div key={m.id} className={cn('border rounded-lg p-3', MISSION_STATUS_COLOR[m.status] || 'border-border/30 bg-background/30')}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {MISSION_STATUS_ICON[m.status]}
                            <div className="min-w-0">
                              <p className="text-xs font-mono font-bold text-foreground truncate">{m.topic}</p>
                              <p className="text-[9px] font-mono text-muted-foreground/40">{m.sourcesProcessed} sources · {m.notesGenerated} notes</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {m.status === 'active' && (
                              <button onClick={() => dispatch(updateMissionStatus({ id: m.id, status: 'paused' }))} className="text-muted-foreground/30 hover:text-amber-400 transition-colors">
                                <PauseCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => dispatch(deleteMission(m.id))} className="text-muted-foreground/30 hover:text-red-400 transition-colors">
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

        {/* RIGHT — AI Connections */}
        <div className="w-64 flex-shrink-0 border-l border-border/50 flex flex-col bg-background/30">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
            <Network className="h-3 w-3 text-primary/60" />
            <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/50">CONNECTIONS</p>
          </div>

          {!selectedSource && lastExtractedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center px-4 pb-8">
              <Brain className="h-8 w-8 text-muted-foreground/10 mb-3" />
              <p className="text-[9px] font-mono text-muted-foreground/30 leading-relaxed">Select a source or extract a URL to see AI-generated knowledge connections.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {selectedSource && (
                <div className="border border-border/40 rounded-sm p-2.5">
                  <p className="text-[8px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">SELECTED SOURCE</p>
                  <p className="text-xs font-mono font-bold text-foreground/90 line-clamp-2">{selectedSource.title}</p>
                  {selectedSource.content && (
                    <p className="text-[9px] font-mono text-muted-foreground/50 mt-1 line-clamp-3">{selectedSource.content.slice(0, 120)}</p>
                  )}
                  {selectedSource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selectedSource.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[8px] font-mono text-primary/50 bg-primary/5 px-1 rounded">#{t}</span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setSelectedSource(null)} className="mt-1.5 text-[8px] font-mono text-muted-foreground/30 hover:text-muted-foreground flex items-center gap-0.5">
                    <X className="h-2.5 w-2.5" /> Clear
                  </button>
                </div>
              )}

              {relatedNotes.length > 0 && (
                <div>
                  <p className="text-[8px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-1.5">RELATED IN YOUR BRAIN</p>
                  <div className="space-y-1.5">
                    {relatedNotes.map(n => (
                      <a key={n.id} href={`/knowledge?noteId=${n.id}`}
                        className="block border border-border/30 rounded-sm p-2 hover:border-primary/30 hover:bg-primary/5 transition-colors">
                        <p className="text-[10px] font-mono font-bold text-foreground/80 line-clamp-2">{n.title}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {n.tags.filter(t => selectedSource?.tags.includes(t)).slice(0, 2).map(t => (
                            <span key={t} className="text-[8px] font-mono text-primary/50 bg-primary/5 px-1 rounded">#{t}</span>
                          ))}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {relatedNotes.length === 0 && selectedSource && (
                <p className="text-[9px] font-mono text-muted-foreground/30 text-center py-4">No related notes found yet. Add more ideas to build connections.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
