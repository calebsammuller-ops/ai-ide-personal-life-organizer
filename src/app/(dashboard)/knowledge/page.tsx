'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '@/state/hooks'
import {
  fetchNotes, createNote, updateNote, deleteNote,
  fetchLinks, createLink, deleteLink,
  generateInsights, generateIdeas, detectGaps, autoLink,
  setSelectedNoteId, setSearchQuery, setTypeFilter,
  selectFilteredNotes, selectAllNotes, selectAllLinks, selectSelectedNote, selectSelectedNoteId,
  selectKnowledgeLoading, selectKnowledgeGenerating, selectKnowledgeError,
  selectLastInsightSummary, selectNoteLinks,
} from '@/state/slices/knowledgeSlice'
import { triggerMicroReward } from '@/components/ui/MicroReward'
import { playCapture } from '@/lib/sounds'
import {
  fetchIntelligenceScore,
  selectIntelligenceScore, selectScoreBreakdown, selectWeekGrowthPct,
} from '@/state/slices/intelligenceScoreSlice'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Brain, Link2, Unlink, Plus, Search, Sparkles, Lightbulb,
  Network, X, Save, Eye, EyeOff, Zap, ChevronDown,
  Tag, AlertCircle, GitBranch, Trash2, Archive, RotateCcw,
  MessageSquare, Send,
} from 'lucide-react'
import type { NoteType, RelationshipType, KnowledgeNote, KnowledgeChatMessage } from '@/types/knowledge'

const NOTE_TYPES: NoteType[] = ['fleeting', 'permanent', 'concept', 'experience', 'project', 'hub', 'reference']


const RELATIONSHIP_TYPES: RelationshipType[] = ['supports', 'contradicts', 'extends', 'applies_to', 'derived_from', 'related']

const TYPE_COLORS: Record<NoteType, string> = {
  fleeting: 'border-slate-400 text-slate-400',
  permanent: 'border-amber-400 text-amber-400',
  concept: 'border-blue-500 text-blue-500',
  experience: 'border-emerald-500 text-emerald-500',
  project: 'border-purple-500 text-purple-500',
  hub: 'border-orange-500 text-orange-500',
  reference: 'border-gray-400 text-gray-400',
}

const TYPE_BG: Record<NoteType, string> = {
  fleeting: 'bg-slate-500/10',
  permanent: 'bg-amber-500/10',
  concept: 'bg-blue-500/10',
  experience: 'bg-emerald-500/10',
  project: 'bg-purple-500/10',
  hub: 'bg-orange-500/10',
  reference: 'bg-gray-500/10',
}

function NoteCard({ note, isSelected, onClick }: { note: KnowledgeNote; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3.5 py-3 min-h-[52px] border-l-2 transition-all hover:bg-primary/5',
        TYPE_COLORS[note.type],
        isSelected ? 'bg-primary/10 border-primary' : 'border-opacity-50 hover:border-opacity-100'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={cn('text-[9px] font-medium uppercase px-1.5 py-0.5 rounded-full', TYPE_BG[note.type], TYPE_COLORS[note.type])}>
              {note.type}
            </span>
            {note.source === 'AI' && (
              <span className="text-[9px] font-medium text-amber-400">AI</span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{note.title}</p>
          {note.zettelId && (
            <p className="text-[10px] text-muted-foreground/40 mt-0.5">{note.zettelId}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
          <div className="h-1 w-10 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full"
              style={{ width: `${(note.confidence || 0) * 100}%` }}
            />
          </div>
        </div>
      </div>
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {note.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[9px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded-full">
              #{t}
            </span>
          ))}
          {note.tags.length > 3 && <span className="text-[9px] text-muted-foreground/40">+{note.tags.length - 3}</span>}
        </div>
      )}
    </button>
  )
}

function LinkModal({
  notes,
  onClose,
  onLink,
}: {
  notes: KnowledgeNote[]
  onClose: () => void
  onLink: (targetId: string, relationship: RelationshipType) => void
}) {
  const [search, setSearch] = useState('')
  const [relationship, setRelationship] = useState<RelationshipType>('related')
  const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase())).slice(0, 20)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border/50 rounded-xl w-[480px] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Link Note</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6"><X className="h-3 w-3" /></Button>
        </div>
        <select
          className="w-full mb-3 bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          value={relationship}
          onChange={e => setRelationship(e.target.value as RelationshipType)}
        >
          {RELATIONSHIP_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input
          className="w-full mb-3 bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {filtered.map(n => (
            <button
              key={n.id}
              onClick={() => onLink(n.id, relationship)}
              className={cn('w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-primary/10 transition-colors border-l-2', TYPE_COLORS[n.type])}
            >
              <span className="text-foreground">{n.title}</span>
              <span className="text-muted-foreground/50 ml-2 text-[10px]">{n.type}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground/50 text-center py-4">No notes found</p>
          )}
        </div>
      </div>
    </div>
  )
}


export default function KnowledgePage() {
  const dispatch = useAppDispatch()
  const notes = useAppSelector(selectFilteredNotes)
  const allNotes = useAppSelector(state => state.knowledge.notes)
  const links = useAppSelector(selectAllLinks)
  const selectedNoteId = useAppSelector(selectSelectedNoteId)
  const selectedNote = useAppSelector(selectSelectedNote)
  const isLoading = useAppSelector(selectKnowledgeLoading)
  const isGenerating = useAppSelector(selectKnowledgeGenerating)
  const insightSummary = useAppSelector(selectLastInsightSummary)
  const noteLinks = useAppSelector(selectNoteLinks(selectedNoteId || ''))
  const error = useAppSelector(selectKnowledgeError)
  const intelligenceScore = useAppSelector(selectIntelligenceScore)
  const scoreBreakdown = useAppSelector(selectScoreBreakdown)
  const weekGrowthPct = useAppSelector(selectWeekGrowthPct)

  const [searchInput, setSearchInput] = useState('')
  const [typeFilter, setTypeFilterLocal] = useState('all')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [tagInput, setTagInput] = useState('')

  // Editor state
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editType, setEditType] = useState<NoteType>('permanent')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editConfidence, setEditConfidence] = useState(0.8)
  const [isDirty, setIsDirty] = useState(false)

  // Wikilink autocomplete
  const [wikilinkQuery, setWikilinkQuery] = useState<string | null>(null)
  const [wikilinkOpen, setWikilinkOpen] = useState(false)
  const [wikilinkRangeStart, setWikilinkRangeStart] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Knowledge chat
  const [showChat, setShowChat] = useState(false)
  const [chatHistory, setChatHistory] = useState<KnowledgeChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  // Idea evolution timeline
  const [evolutionTimeline, setEvolutionTimeline] = useState<{ id: string; evolutionType: string; summary: string; createdAt: string }[]>([])

  // Loop hint after capture
  const [loopHint, setLoopHint] = useState<string | null>(null)

  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    dispatch(fetchNotes())
    dispatch(fetchLinks())
    dispatch(fetchIntelligenceScore())
  }, [dispatch])

  useEffect(() => {
    if (!selectedNoteId) return
    setEvolutionTimeline([])
    fetch(`/api/knowledge/notes/${selectedNoteId}/evolution`)
      .then(r => r.json())
      .then(d => { if (d.timeline) setEvolutionTimeline(d.timeline) })
      .catch(() => {})
  }, [selectedNoteId])

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title)
      setEditContent(selectedNote.content)
      setEditType(selectedNote.type)
      setEditTags(selectedNote.tags)
      setEditConfidence(selectedNote.confidence)
      setIsDirty(false)
    }
  }, [selectedNote?.id])

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    dispatch(setSearchQuery(value))
  }, [dispatch])

  const handleTypeFilter = (type: string) => {
    setTypeFilterLocal(type)
    dispatch(setTypeFilter(type))
  }

  const handleNewNote = () => {
    // Note appears instantly via optimistic insert in createNote.pending
    dispatch(createNote({ title: 'New Note', type: 'fleeting', content: '' }))
    playCapture()
    triggerMicroReward('Captured.')
  }

  const handleSave = useCallback(async () => {
    if (!selectedNoteId || !isDirty) return
    if (selectedNoteId.startsWith('temp-')) return // don't save until server confirms
    await dispatch(updateNote({
      id: selectedNoteId,
      updates: { title: editTitle, content: editContent, type: editType, tags: editTags, confidence: editConfidence },
    }))
    setIsDirty(false)
  }, [selectedNoteId, isDirty, editTitle, editContent, editType, editTags, editConfidence, dispatch])

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!isDirty) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(handleSave, 2000)
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current) }
  }, [isDirty, handleSave])

  const handleContentChange = (val: string) => {
    setEditContent(val)
    setIsDirty(true)
    // Detect [[partial wikilink before cursor
    const cursorPos = textareaRef.current?.selectionStart ?? val.length
    const textBeforeCursor = val.slice(0, cursorPos)
    const match = textBeforeCursor.match(/\[\[([^\]\n]*)$/)
    if (match) {
      setWikilinkQuery(match[1])
      setWikilinkRangeStart(cursorPos - match[1].length)
      setWikilinkOpen(true)
    } else {
      setWikilinkOpen(false)
    }
  }

  const wikilinkSuggestions = wikilinkOpen && wikilinkQuery !== null
    ? allNotes
        .filter(n => n.id !== selectedNoteId && n.title.toLowerCase().includes(wikilinkQuery.toLowerCase()))
        .slice(0, 5)
    : []

  const handleInsertWikilink = (title: string) => {
    const before = editContent.slice(0, wikilinkRangeStart)
    const after = editContent.slice(textareaRef.current?.selectionStart ?? editContent.length)
    const newContent = `${before}${title}]]${after}`
    setEditContent(newContent)
    setIsDirty(true)
    setWikilinkOpen(false)
    // Restore focus
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return
    const question = chatInput.trim()
    setChatInput('')
    const newHistory: KnowledgeChatMessage[] = [...chatHistory, { role: 'user', content: question }]
    setChatHistory(newHistory)
    setIsChatLoading(true)
    try {
      const res = await fetch('/api/knowledge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          history: newHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setChatHistory(h => [...h, {
        role: 'assistant',
        content: data.answer || 'No answer generated.',
        relatedNotes: data.relatedNotes || [],
      }])
    } catch {
      setChatHistory(h => [...h, { role: 'assistant', content: 'Error: could not reach knowledge chat.' }])
    } finally {
      setIsChatLoading(false)
    }
  }


  const handleLink = async (targetId: string, relationship: RelationshipType) => {
    if (!selectedNoteId) return
    await dispatch(createLink({ sourceNoteId: selectedNoteId, targetNoteId: targetId, relationship }))
    await dispatch(fetchLinks())
    setShowLinkModal(false)
    triggerMicroReward('Connected.')
  }

  const handleUnlink = async (linkId: string) => {
    await dispatch(deleteLink(linkId))
  }

  const handleAutoLink = async () => {
    if (!selectedNoteId) return
    await dispatch(autoLink({ noteId: selectedNoteId }))
    await dispatch(fetchLinks())
  }

  const handleGenerateInsights = async () => {
    await dispatch(generateInsights(selectedNoteId || undefined))
    await dispatch(fetchNotes())
    await dispatch(fetchLinks())
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().replace(/^#/, '').toLowerCase()
      if (!editTags.includes(tag)) {
        setEditTags([...editTags, tag])
        setIsDirty(true)
      }
      setTagInput('')
    }
  }

  const handleDeleteNote = async () => {
    if (!selectedNoteId) return
    if (!confirm('Delete this note? This cannot be undone.')) return
    await dispatch(deleteNote(selectedNoteId))
  }

  const handleArchiveNote = async () => {
    if (!selectedNoteId) return
    await dispatch(updateNote({ id: selectedNoteId, updates: { isArchived: true } }))
  }

  // Get linked note details
  const outgoingLinks = noteLinks.filter(l => l.sourceNoteId === selectedNoteId)
  const incomingLinks = noteLinks.filter(l => l.targetNoteId === selectedNoteId)

  const getLinkedNote = (id: string) => allNotes.find(n => n.id === id)


  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* LEFT PANEL — Note List */}
      <div className={cn('flex-col border-r border-border/50 bg-background/50', selectedNoteId ? 'hidden md:flex md:w-72' : 'flex w-full md:w-72')}>
        {/* Header */}
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Ideas</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleNewNote}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
            <input
              className="w-full pl-7 pr-2 py-1.5 bg-muted/30 border border-border/50 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search notes..."
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1 p-2 overflow-x-auto scrollbar-none border-b border-border/30" style={{ WebkitOverflowScrolling: 'touch' }}>
          {['all', ...NOTE_TYPES].map(t => (
            <button
              key={t}
              onClick={() => handleTypeFilter(t)}
              className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors capitalize',
                typeFilter === t
                  ? 'bg-primary text-white'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
              )}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {isLoading && (
            <div className="flex items-center justify-center h-24">
              <div className="h-4 w-4 border border-primary/50 border-t-primary animate-spin rounded-full" />
            </div>
          )}
          {!isLoading && notes.length === 0 && (
            <div className="p-4 text-center">
              <Brain className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/50">Nothing here yet.</p>
              <p className="text-[10px] text-muted-foreground/30 mt-1">Tap + to add your first idea</p>
            </div>
          )}
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isSelected={selectedNoteId === note.id}
              onClick={() => dispatch(setSelectedNoteId(note.id))}
            />
          ))}
        </div>

        {/* Intelligence Score widget */}
        {intelligenceScore > 0 && (
          <div className="p-3 border-t border-border/30 bg-primary/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground/50">Intelligence Score</span>
              {weekGrowthPct !== null && (
                <span className={`text-[10px] font-medium ${weekGrowthPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {weekGrowthPct >= 0 ? '+' : ''}{weekGrowthPct}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-primary leading-none mb-1.5">{intelligenceScore}</p>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div>
                <p className="text-xs font-semibold text-foreground/80">{scoreBreakdown.notes}</p>
                <p className="text-[9px] text-muted-foreground/40">notes</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-400">{scoreBreakdown.links}</p>
                <p className="text-[9px] text-muted-foreground/40">links</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-400">{scoreBreakdown.insights}</p>
                <p className="text-[9px] text-muted-foreground/40">insights</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-400">{scoreBreakdown.evolutions}</p>
                <p className="text-[9px] text-muted-foreground/40">evols</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats footer */}
        <div className="p-2 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/40">{allNotes.length} notes · {links.length} links</span>
          <a href="/knowledge/graph" className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1">
            <Network className="h-3 w-3" />Graph
          </a>
        </div>
      </div>

      {/* CENTER — Note Editor */}
      <div className={cn('flex-col overflow-hidden', !selectedNoteId ? 'hidden md:flex md:flex-1' : 'flex flex-1')}>
        {selectedNote ? (
          <>
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {/* Mobile back button */}
                <button
                  className="md:hidden flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mr-1"
                  onClick={() => dispatch(setSelectedNoteId(null))}
                >
                  ← Back
                </button>
                {/* Type selector */}
                <div className="relative">
                  <select
                    value={editType}
                    onChange={e => { setEditType(e.target.value as NoteType); setIsDirty(true) }}
                    className={cn(
                      'appearance-none bg-transparent border rounded-lg px-2.5 py-1 text-[10px] font-medium uppercase cursor-pointer focus:outline-none pr-5',
                      TYPE_COLORS[editType],
                      TYPE_BG[editType]
                    )}
                  >
                    {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 pointer-events-none text-muted-foreground/50" />
                </div>

                {selectedNote.zettelId && (
                  <span className="text-[10px] text-muted-foreground/40 bg-muted/20 px-2 py-0.5 rounded-full">
                    {selectedNote.zettelId}
                  </span>
                )}

                {/* Confidence slider */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/50">conf</span>
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={editConfidence}
                    onChange={e => { setEditConfidence(parseFloat(e.target.value)); setIsDirty(true) }}
                    className="w-16 h-1 accent-primary"
                  />
                  <span className="text-[10px] text-primary/70">{Math.round(editConfidence * 100)}%</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Expand this idea — persistent next-step link */}
                <a
                  href={`/knowledge/ideas?tab=expand&seed=${selectedNote.id}`}
                  className="hidden md:flex items-center h-7 px-2.5 text-xs font-medium text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors"
                >
                  Expand →
                </a>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6"
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  title={isPreviewMode ? 'Edit' : 'Preview'}
                >
                  {isPreviewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                {isDirty && (
                  <Button variant="ghost" size="sm" onClick={handleSave} className="h-7 text-xs font-medium text-primary">
                    <Save className="h-3 w-3 mr-1" />Save
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={handleArchiveNote}>
                  <Archive className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-400" onClick={handleDeleteNote}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Editor body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Title */}
              <input
                className="w-full text-2xl font-semibold text-foreground bg-transparent border-none outline-none mb-4 placeholder:text-muted-foreground/30"
                placeholder="Note title..."
                value={editTitle}
                onChange={e => { setEditTitle(e.target.value); setIsDirty(true) }}
              />

              {/* Mobile next-step strip */}
              <div className="md:hidden flex items-center justify-between mb-4 py-2 border-b border-primary/15">
                <span className="text-xs text-muted-foreground/50">What's next?</span>
                <a
                  href={`/knowledge/ideas?tab=expand&seed=${selectedNote.id}`}
                  className="text-xs font-medium text-cyan-400 flex items-center gap-1"
                >
                  Expand this idea →
                </a>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4 min-h-6">
                {editTags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-[10px] text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    onClick={() => { setEditTags(editTags.filter(t => t !== tag)); setIsDirty(true) }}
                  >
                    <Tag className="h-2 w-2" />#{tag}
                    <X className="h-2 w-2" />
                  </span>
                ))}
                <input
                  className="text-[10px] text-muted-foreground/60 bg-transparent border-none outline-none min-w-24 placeholder:text-muted-foreground/30"
                  placeholder="+ add tag, press Enter"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                />
              </div>

              {/* Content editor / preview */}
              {isPreviewMode ? (
                <div
                  className="prose prose-invert prose-sm max-w-none text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: editContent.replace(/\n/g, '<br>').replace(/\[\[([^\]]+)\]\]/g, '<span class="text-primary font-bold">[[<u>$1</u>]]</span>') }}
                />
              ) : (
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    className="w-full min-h-[400px] bg-transparent border-none outline-none text-sm text-foreground/80 leading-relaxed resize-none placeholder:text-muted-foreground/30"
                    placeholder="Write your atomic note here... Use [[Note Title]] to link other notes."
                    value={editContent}
                    onChange={e => handleContentChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setWikilinkOpen(false)
                      if (wikilinkOpen && e.key === 'Enter' && wikilinkSuggestions.length > 0) {
                        e.preventDefault()
                        handleInsertWikilink(wikilinkSuggestions[0].title)
                      }
                    }}
                  />
                  {/* Wikilink autocomplete dropdown */}
                  {wikilinkOpen && wikilinkSuggestions.length > 0 && (
                    <div className="absolute left-0 z-50 mt-1 w-72 bg-background border border-primary/30 rounded-xl shadow-xl overflow-hidden" style={{ top: '100%' }}>
                      <div className="px-3 py-1.5 text-[10px] text-muted-foreground/40 border-b border-border/50 bg-muted/20">
                        Link note — Enter to select, Esc to cancel
                      </div>
                      {wikilinkSuggestions.map(note => (
                        <button
                          key={note.id}
                          onMouseDown={e => { e.preventDefault(); handleInsertWikilink(note.title) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary/10 transition-colors group"
                        >
                          <span className={cn('text-[9px] font-medium uppercase px-1.5 py-0.5 rounded-full shrink-0', TYPE_BG[note.type], TYPE_COLORS[note.type])}>
                            {note.type}
                          </span>
                          <span className="text-xs text-foreground/90 truncate flex-1">{note.title}</span>
                          {note.zettelId && (
                            <span className="text-[9px] text-muted-foreground/30 shrink-0">{note.zettelId}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Brain className="h-16 w-16 text-muted-foreground/10 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground/30">Select a note or create a new one</p>
              <Button onClick={handleNewNote} className="mt-4 text-xs" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />New Note
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL — Brain Panel (desktop only) */}
      <div className="hidden md:flex w-72 flex-col border-l border-border/50 bg-background/50 overflow-hidden">
        <div className="p-3 border-b border-border/50">
          <span className="text-xs font-semibold text-muted-foreground/60">Brain Panel</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedNote && (
            <>
              {/* AI Actions */}
              <div className="p-3 border-b border-border/30 space-y-1.5">
                {isGenerating && (
                  <div className="flex items-center gap-2 py-1.5 px-1">
                    <div className="h-3 w-3 border border-primary/40 border-t-primary animate-spin rounded-full shrink-0" />
                    <span className="text-xs text-muted-foreground/50">AI thinking...</span>
                  </div>
                )}
                <Button
                  onClick={handleGenerateInsights}
                  disabled={isGenerating}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Insights'}
                </Button>
                <Button
                  onClick={() => { dispatch(generateIdeas()); }}
                  disabled={isGenerating}
                  variant="ghost" size="sm"
                  className="w-full justify-start text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                >
                  <Lightbulb className="h-3.5 w-3.5 mr-2" />Generate Ideas
                </Button>
                <Button
                  onClick={handleAutoLink}
                  disabled={isGenerating}
                  variant="ghost" size="sm"
                  className="w-full justify-start text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                >
                  <Zap className="h-3.5 w-3.5 mr-2" />Auto-Link (AI)
                </Button>
                <Button
                  onClick={() => setShowLinkModal(true)}
                  variant="ghost" size="sm"
                  className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
                >
                  <Link2 className="h-3.5 w-3.5 mr-2" />Link Note
                </Button>
                <Button
                  onClick={() => setShowChat(true)}
                  variant="ghost" size="sm"
                  className="w-full justify-start text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-2" />Ask Your Brain
                </Button>
              </div>


              {insightSummary && (
                <div className="p-3 m-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300/80">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-semibold text-[10px]">Last Insight</span>
                    </div>
                    <a href="/insights" className="text-[10px] text-primary/60 hover:text-primary transition-colors">
                      View all →
                    </a>
                  </div>
                  {insightSummary.slice(0, 150)}{insightSummary.length > 150 ? '...' : ''}
                </div>
              )}

              {/* Outgoing Links */}
              {outgoingLinks.length > 0 && (
                <div className="p-3 border-b border-border/30">
                  <div className="flex items-center gap-1 mb-2">
                    <GitBranch className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-[10px] font-medium text-muted-foreground/50">Links to</span>
                  </div>
                  <div className="space-y-1">
                    {outgoingLinks.map(link => {
                      const target = getLinkedNote(link.targetNoteId)
                      return target ? (
                        <div key={link.id} className="flex items-center justify-between group">
                          <button
                            onClick={() => dispatch(setSelectedNoteId(target.id))}
                            className={cn('text-xs truncate flex-1 text-left hover:text-primary transition-colors border-l pl-1.5', TYPE_COLORS[target.type])}
                          >
                            {target.title}
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] text-muted-foreground/40">{link.relationship}</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleUnlink(link.id)}>
                              <Unlink className="h-2.5 w-2.5 text-red-400/50" />
                            </Button>
                          </div>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {/* Incoming Links (Backlinks) */}
              {incomingLinks.length > 0 && (
                <div className="p-3 border-b border-border/30">
                  <div className="flex items-center gap-1 mb-2">
                    <RotateCcw className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-[10px] font-medium text-muted-foreground/50">Backlinks</span>
                  </div>
                  <div className="space-y-1">
                    {incomingLinks.map(link => {
                      const source = getLinkedNote(link.sourceNoteId)
                      return source ? (
                        <button
                          key={link.id}
                          onClick={() => dispatch(setSelectedNoteId(source.id))}
                          className={cn('block text-xs truncate w-full text-left hover:text-primary transition-colors border-l pl-1.5', TYPE_COLORS[source.type])}
                        >
                          {source.title}
                        </button>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {outgoingLinks.length === 0 && incomingLinks.length === 0 && (
                <div className="p-4 text-center">
                  <AlertCircle className="h-6 w-6 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/40">Orphan note — no connections yet</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">Use Auto-Link or Link Note to connect it</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Evolution Timeline */}
        {evolutionTimeline.length > 0 && (
          <div className="p-3 border-t border-border/30">
            <p className="text-[10px] font-medium text-muted-foreground/50 mb-2">Idea Evolution</p>
            <div className="relative pl-3 space-y-2">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-border/40" />
              {evolutionTimeline.map((ev) => (
                <div key={ev.id} className="relative">
                  <div className={`absolute -left-[15px] top-1 h-2 w-2 rounded-full border ${
                    ev.evolutionType === 'expansion' ? 'border-purple-400 bg-purple-500/30' :
                    ev.evolutionType === 'connection' ? 'border-blue-400 bg-blue-500/30' :
                    'border-amber-400 bg-amber-500/30'
                  }`} />
                  <p className={`text-[9px] font-medium uppercase mb-0.5 ${
                    ev.evolutionType === 'expansion' ? 'text-purple-400' :
                    ev.evolutionType === 'connection' ? 'text-blue-400' :
                    'text-amber-400'
                  }`}>{ev.evolutionType}</p>
                  <p className="text-[9px] text-muted-foreground/60 leading-tight">{ev.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Echo — "You thought this before" */}
        {selectedNote && (() => {
          const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
          const echoes = allNotes.filter(n =>
            n.id !== selectedNote.id &&
            new Date(n.createdAt).getTime() < threeDaysAgo &&
            n.tags.some((t: string) => selectedNote.tags.includes(t))
          ).slice(0, 2)
          if (echoes.length === 0) return null
          return (
            <div className="p-3 border-t border-border/20">
              <p className="text-[9px] text-muted-foreground/30 mb-1">You thought this before</p>
              {echoes.map((n: { id: string; title: string }) => (
                <button key={n.id} onClick={() => dispatch(setSelectedNoteId(n.id))}
                  className="block text-[10px] text-primary/40 hover:text-primary/70 text-left mt-0.5">
                  → {n.title}
                </button>
              ))}
            </div>
          )
        })()}

        {/* Graph link */}
        <div className="p-3 border-t border-border/50">
          <a
            href="/knowledge/graph"
            className="flex items-center justify-center gap-2 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors"
          >
            <Network className="h-3.5 w-3.5" />View Knowledge Graph
          </a>
        </div>
      </div>

      {/* Modals */}
      {showLinkModal && (
        <LinkModal
          notes={allNotes.filter(n => n.id !== selectedNoteId)}
          onClose={() => setShowLinkModal(false)}
          onLink={handleLink}
        />
      )}
      {/* Knowledge Chat Drawer */}
      {showChat && (
        <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border/50 shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border/50 bg-background/90">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold">Ask Your Brain</span>
            </div>
            <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatHistory.length === 0 && (
              <div className="text-center py-8">
                <Brain className="h-10 w-10 text-muted-foreground/10 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground/40">Ask anything about your knowledge base</p>
                <div className="mt-4 space-y-1">
                  {["What have I written about AI?", "Show me my startup ideas", "What are my strongest knowledge clusters?"].map(q => (
                    <button key={q} onClick={() => { setChatInput(q) }} className="block w-full text-left text-xs text-muted-foreground/50 hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-primary/5 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={cn('text-xs', msg.role === 'user' ? 'text-right' : 'text-left')}>
                <div className={cn('inline-block max-w-[90%] px-3 py-2 rounded-xl text-left leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary/20 text-foreground'
                    : 'bg-muted/30 border border-border/50 text-foreground/90'
                )}>
                  {msg.content}
                  {msg.relatedNotes && msg.relatedNotes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30 space-y-0.5">
                      <p className="text-[8px] text-muted-foreground/40">Sources:</p>
                      {msg.relatedNotes.map(n => (
                        <button
                          key={n.id}
                          onClick={() => { dispatch(setSelectedNoteId(n.id)); setShowChat(false) }}
                          className="block text-[9px] text-cyan-400/80 hover:text-cyan-400 truncate max-w-full text-left"
                        >
                          [{n.zettelId || n.id.slice(0,8)}] {n.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
                <div className="h-3 w-3 border border-cyan-500/30 border-t-cyan-500 animate-spin rounded-full" />
                Searching your brain...
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border/50">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-muted/20 border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-cyan-500/50"
                placeholder="Ask your second brain..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleChatSend() }}
              />
              <button
                onClick={handleChatSend}
                disabled={isChatLoading || !chatInput.trim()}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Loop hint */}
      <AnimatePresence>
        {loopHint && (
          <motion.p
            className="fixed bottom-10 left-1/2 -translate-x-1/2 text-xs text-primary/40 pointer-events-none z-30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {loopHint}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-500/50 text-red-300 text-xs p-3 rounded-lg shadow-xl max-w-sm">
          <AlertCircle className="inline h-3 w-3 mr-1.5" />
          {error}
        </div>
      )}
    </div>
  )
}
