import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type {
  KnowledgeNote,
  KnowledgeLink,
  CognitiveEvent,
  KnowledgeBriefing,
  CreateNoteInput,
  UpdateNoteInput,
  CreateLinkInput,
  KnowledgeIdea,
  KnowledgeGap,
  KnowledgePrediction,
  ResearchMission,
  DuplicatePair,
} from '@/types/knowledge'

interface GraphAnalysis {
  clusters: { name: string; notes: string[]; strength: number; description: string }[]
  orphanInsights: string
  weakAreas: string[]
  contradictions: { noteA: string; noteB: string; issue: string }[]
  topHubs: string[]
  structuralHealth: number
  recommendations: string[]
  evolutionPhase: string
  stats: { totalNotes: number; totalLinks: number; orphanCount: number; avgDegree: string }
}

interface SocraticResponse {
  assumptions: { assumption: string; challenge: string }[]
  counterArguments: { point: string; implication: string }[]
  deeperQuestions: string[]
  blindSpots: string[]
  relatedConcepts: string[]
  knowledgeGapsRevealed: string[]
  provocativeThesis: string
  synthesis: string
}

interface KnowledgeState {
  notes: KnowledgeNote[]
  links: KnowledgeLink[]
  events: CognitiveEvent[]
  velocity: { date: string; count: number }[]
  selectedNoteId: string | null
  isLoading: boolean
  isGenerating: boolean
  error: string | null
  // AI results (transient)
  lastInsightSummary: string | null
  lastIdeas: KnowledgeIdea[]
  lastGaps: KnowledgeGap[]
  lastAnalysis: GraphAnalysis | null
  lastSocratic: SocraticResponse | null
  briefing: KnowledgeBriefing | null
  briefingAge: string | null
  // Phase 2 additions
  predictions: KnowledgePrediction[]
  missions: ResearchMission[]
  duplicates: DuplicatePair[]
  report: string | null
  isEvolving: boolean
  // Search/filter
  searchQuery: string
  typeFilter: string
}

const initialState: KnowledgeState = {
  notes: [],
  links: [],
  events: [],
  velocity: [],
  selectedNoteId: null,
  isLoading: false,
  isGenerating: false,
  error: null,
  lastInsightSummary: null,
  lastIdeas: [],
  lastGaps: [],
  lastAnalysis: null,
  lastSocratic: null,
  briefing: null,
  briefingAge: null,
  predictions: [],
  missions: [],
  duplicates: [],
  report: null,
  isEvolving: false,
  searchQuery: '',
  typeFilter: 'all',
}

// ---- Thunks ----

export const fetchNotes = createAsyncThunk(
  'knowledge/fetchNotes',
  async (params?: { type?: string; search?: string; archived?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.type && params.type !== 'all') q.set('type', params.type)
    if (params?.search) q.set('search', params.search)
    if (params?.archived) q.set('archived', 'true')
    const res = await fetch(`/api/knowledge/notes${q.toString() ? `?${q}` : ''}`)
    if (!res.ok) throw new Error('Failed to fetch notes')
    const data = await res.json()
    return data.data as KnowledgeNote[]
  }
)

export const createNote = createAsyncThunk(
  'knowledge/createNote',
  async (input: CreateNoteInput) => {
    const res = await fetch('/api/knowledge/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create note')
    const data = await res.json()
    return data.data as KnowledgeNote
  }
)

export const updateNote = createAsyncThunk(
  'knowledge/updateNote',
  async ({ id, updates }: { id: string; updates: UpdateNoteInput }) => {
    const res = await fetch(`/api/knowledge/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update note')
    const data = await res.json()
    return data.data as KnowledgeNote
  }
)

export const deleteNote = createAsyncThunk(
  'knowledge/deleteNote',
  async (id: string) => {
    const res = await fetch(`/api/knowledge/notes/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete note')
    return id
  }
)

export const fetchLinks = createAsyncThunk(
  'knowledge/fetchLinks',
  async (noteId?: string) => {
    const url = noteId ? `/api/knowledge/links?noteId=${noteId}` : '/api/knowledge/links'
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch links')
    const data = await res.json()
    return data.data as KnowledgeLink[]
  }
)

export const createLink = createAsyncThunk(
  'knowledge/createLink',
  async (input: CreateLinkInput) => {
    const res = await fetch('/api/knowledge/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error('Failed to create link')
    const data = await res.json()
    return data.data as KnowledgeLink
  }
)

export const deleteLink = createAsyncThunk(
  'knowledge/deleteLink',
  async (id: string) => {
    const res = await fetch(`/api/knowledge/links/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete link')
    return id
  }
)

export const generateInsights = createAsyncThunk(
  'knowledge/generateInsights',
  async (noteId?: string) => {
    const res = await fetch('/api/knowledge/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    if (!res.ok) throw new Error('Failed to generate insights')
    const data = await res.json()
    return data.data
  }
)

export const generateIdeas = createAsyncThunk(
  'knowledge/generateIdeas',
  async () => {
    const res = await fetch('/api/knowledge/ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) throw new Error('Failed to generate ideas')
    const data = await res.json()
    return data.data
  }
)

export const analyzeGraph = createAsyncThunk(
  'knowledge/analyzeGraph',
  async () => {
    const res = await fetch('/api/knowledge/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) throw new Error('Failed to analyze graph')
    const data = await res.json()
    return data.data as GraphAnalysis
  }
)

export const detectGaps = createAsyncThunk(
  'knowledge/detectGaps',
  async () => {
    const res = await fetch('/api/knowledge/gaps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) throw new Error('Failed to detect gaps')
    const data = await res.json()
    return data.data
  }
)

export const askSocratic = createAsyncThunk(
  'knowledge/askSocratic',
  async ({ question, noteIds }: { question: string; noteIds?: string[] }) => {
    const res = await fetch('/api/knowledge/socratic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, noteIds }),
    })
    if (!res.ok) throw new Error('Failed to get Socratic response')
    const data = await res.json()
    return data.data as SocraticResponse
  }
)

export const fetchTimeline = createAsyncThunk(
  'knowledge/fetchTimeline',
  async () => {
    const res = await fetch('/api/knowledge/timeline')
    if (!res.ok) throw new Error('Failed to fetch timeline')
    const data = await res.json()
    return data.data as { events: CognitiveEvent[]; velocity: { date: string; count: number }[] }
  }
)

export const fetchBriefing = createAsyncThunk(
  'knowledge/fetchBriefing',
  async () => {
    const res = await fetch('/api/knowledge/briefing')
    if (!res.ok) throw new Error('Failed to fetch briefing')
    const data = await res.json()
    return data.data
  }
)

export const generateBriefing = createAsyncThunk(
  'knowledge/generateBriefing',
  async () => {
    const res = await fetch('/api/knowledge/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) throw new Error('Failed to generate briefing')
    const data = await res.json()
    return data.data
  }
)

export const importSkillTree = createAsyncThunk(
  'knowledge/importSkillTree',
  async ({ skillTree, format }: { skillTree: unknown; format?: string }) => {
    const res = await fetch('/api/knowledge/import-skill-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillTree, format }),
    })
    if (!res.ok) throw new Error('Failed to import skill tree')
    const data = await res.json()
    return data.data
  }
)

export const extractUrl = createAsyncThunk(
  'knowledge/extractUrl',
  async ({ url, save }: { url: string; save?: boolean }) => {
    const res = await fetch('/api/knowledge/extract-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, save }),
    })
    if (!res.ok) throw new Error('Failed to extract URL')
    const data = await res.json()
    return data.data
  }
)

export const autoLink = createAsyncThunk(
  'knowledge/autoLink',
  async ({ noteId, threshold }: { noteId: string; threshold?: number }) => {
    const res = await fetch('/api/knowledge/auto-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, threshold }),
    })
    if (!res.ok) throw new Error('Failed to auto-link')
    const data = await res.json()
    return data.data
  }
)

// ---- Phase 2 Thunks: Predictions, Missions, Evolve, Deduplicate, Report ----

export const fetchPredictions = createAsyncThunk(
  'knowledge/fetchPredictions',
  async () => {
    const res = await fetch('/api/knowledge/predictions')
    if (!res.ok) throw new Error('Failed to fetch predictions')
    const data = await res.json()
    return data.data as KnowledgePrediction[]
  }
)

export const generatePredictions = createAsyncThunk(
  'knowledge/generatePredictions',
  async () => {
    const res = await fetch('/api/knowledge/predictions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) throw new Error('Failed to generate predictions')
    const data = await res.json()
    return data.data as KnowledgePrediction[]
  }
)

export const dismissPrediction = createAsyncThunk(
  'knowledge/dismissPrediction',
  async (id: string) => {
    const res = await fetch(`/api/knowledge/predictions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDismissed: true }),
    })
    if (!res.ok) throw new Error('Failed to dismiss prediction')
    return id
  }
)

export const fetchMissions = createAsyncThunk(
  'knowledge/fetchMissions',
  async () => {
    const res = await fetch('/api/knowledge/missions')
    if (!res.ok) throw new Error('Failed to fetch missions')
    const data = await res.json()
    return data.data as ResearchMission[]
  }
)

export const createMission = createAsyncThunk(
  'knowledge/createMission',
  async ({ topic, description }: { topic: string; description?: string }) => {
    const res = await fetch('/api/knowledge/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, description }),
    })
    if (!res.ok) throw new Error('Failed to create mission')
    const data = await res.json()
    return data.data as ResearchMission
  }
)

export const updateMissionStatus = createAsyncThunk(
  'knowledge/updateMissionStatus',
  async ({ id, status }: { id: string; status: string }) => {
    const res = await fetch(`/api/knowledge/missions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error('Failed to update mission')
    const data = await res.json()
    return { id, ...data }
  }
)

export const deleteMission = createAsyncThunk(
  'knowledge/deleteMission',
  async (id: string) => {
    await fetch(`/api/knowledge/missions/${id}`, { method: 'DELETE' })
    return id
  }
)

export const evolveKnowledge = createAsyncThunk(
  'knowledge/evolve',
  async () => {
    const res = await fetch('/api/knowledge/evolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) throw new Error('Failed to evolve knowledge graph')
    return await res.json()
  }
)

export const deduplicateNotes = createAsyncThunk(
  'knowledge/deduplicate',
  async (merge: boolean = false) => {
    const res = await fetch('/api/knowledge/deduplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merge }),
    })
    if (!res.ok) throw new Error('Failed to deduplicate notes')
    const data = await res.json()
    return data.data as DuplicatePair[]
  }
)

export const generateReport = createAsyncThunk(
  'knowledge/generateReport',
  async () => {
    const res = await fetch('/api/knowledge/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) throw new Error('Failed to generate report')
    const data = await res.json()
    return data.report as string
  }
)

// ---- Slice ----

export const knowledgeSlice = createSlice({
  name: 'knowledge',
  initialState,
  reducers: {
    setSelectedNoteId: (state, action: PayloadAction<string | null>) => {
      state.selectedNoteId = action.payload
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    setTypeFilter: (state, action: PayloadAction<string>) => {
      state.typeFilter = action.payload
    },
    clearAiResults: (state) => {
      state.lastInsightSummary = null
      state.lastIdeas = []
      state.lastGaps = []
      state.lastAnalysis = null
      state.lastSocratic = null
    },
    optimisticAddNote: (state, action: PayloadAction<KnowledgeNote>) => {
      state.notes.unshift(action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notes
      .addCase(fetchNotes.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(fetchNotes.fulfilled, (state, action) => { state.isLoading = false; state.notes = action.payload })
      .addCase(fetchNotes.rejected, (state, action) => { state.isLoading = false; state.error = action.error.message ?? 'Error' })
      // Create note
      .addCase(createNote.fulfilled, (state, action) => {
        state.notes.unshift(action.payload)
        state.selectedNoteId = action.payload.id
      })
      // Update note
      .addCase(updateNote.fulfilled, (state, action) => {
        const idx = state.notes.findIndex(n => n.id === action.payload.id)
        if (idx !== -1) state.notes[idx] = action.payload
      })
      // Delete note
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.notes = state.notes.filter(n => n.id !== action.payload)
        if (state.selectedNoteId === action.payload) state.selectedNoteId = null
      })
      // Fetch links
      .addCase(fetchLinks.fulfilled, (state, action) => { state.links = action.payload })
      // Create link
      .addCase(createLink.fulfilled, (state, action) => { state.links.push(action.payload) })
      // Delete link
      .addCase(deleteLink.fulfilled, (state, action) => {
        state.links = state.links.filter(l => l.id !== action.payload)
      })
      // Generate insights
      .addCase(generateInsights.pending, (state) => { state.isGenerating = true })
      .addCase(generateInsights.fulfilled, (state, action) => {
        state.isGenerating = false
        state.lastInsightSummary = action.payload.summary || null
        // Refresh notes to show newly created AI notes
      })
      .addCase(generateInsights.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      // Generate ideas
      .addCase(generateIdeas.pending, (state) => { state.isGenerating = true })
      .addCase(generateIdeas.fulfilled, (state, action) => {
        state.isGenerating = false
        state.lastIdeas = action.payload.ideas || []
      })
      .addCase(generateIdeas.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      // Analyze graph
      .addCase(analyzeGraph.pending, (state) => { state.isGenerating = true })
      .addCase(analyzeGraph.fulfilled, (state, action) => {
        state.isGenerating = false
        state.lastAnalysis = action.payload
      })
      .addCase(analyzeGraph.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      // Detect gaps
      .addCase(detectGaps.pending, (state) => { state.isGenerating = true })
      .addCase(detectGaps.fulfilled, (state, action) => {
        state.isGenerating = false
        state.lastGaps = action.payload.gaps || []
      })
      .addCase(detectGaps.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      // Ask socratic
      .addCase(askSocratic.pending, (state) => { state.isGenerating = true })
      .addCase(askSocratic.fulfilled, (state, action) => {
        state.isGenerating = false
        state.lastSocratic = action.payload
      })
      .addCase(askSocratic.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      // Timeline
      .addCase(fetchTimeline.fulfilled, (state, action) => {
        state.events = action.payload.events
        state.velocity = action.payload.velocity
      })
      // Briefing
      .addCase(fetchBriefing.fulfilled, (state, action) => {
        if (action.payload) {
          state.briefing = action.payload
          state.briefingAge = action.payload.createdAt || null
        }
      })
      .addCase(generateBriefing.pending, (state) => { state.isGenerating = true })
      .addCase(generateBriefing.fulfilled, (state, action) => {
        state.isGenerating = false
        state.briefing = action.payload
        state.briefingAge = new Date().toISOString()
      })
      .addCase(generateBriefing.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      // Import skill tree
      .addCase(importSkillTree.pending, (state) => { state.isGenerating = true })
      .addCase(importSkillTree.fulfilled, (state) => { state.isGenerating = false })
      .addCase(importSkillTree.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      // Extract URL
      .addCase(extractUrl.pending, (state) => { state.isGenerating = true })
      .addCase(extractUrl.fulfilled, (state) => { state.isGenerating = false })
      .addCase(extractUrl.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      // Predictions
      .addCase(fetchPredictions.fulfilled, (state, action) => { state.predictions = action.payload })
      .addCase(generatePredictions.pending, (state) => { state.isGenerating = true })
      .addCase(generatePredictions.fulfilled, (state, action) => { state.isGenerating = false; state.predictions = action.payload })
      .addCase(generatePredictions.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      .addCase(dismissPrediction.fulfilled, (state, action) => {
        state.predictions = state.predictions.filter(p => p.id !== action.payload)
      })
      // Missions
      .addCase(fetchMissions.fulfilled, (state, action) => { state.missions = action.payload })
      .addCase(createMission.pending, (state) => { state.isGenerating = true })
      .addCase(createMission.fulfilled, (state, action) => {
        state.isGenerating = false
        state.missions = [action.payload, ...state.missions]
      })
      .addCase(createMission.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
      .addCase(updateMissionStatus.fulfilled, (state, action) => {
        const idx = state.missions.findIndex(m => m.id === action.payload.id)
        if (idx >= 0) state.missions[idx] = { ...state.missions[idx], status: action.payload.status }
      })
      .addCase(deleteMission.fulfilled, (state, action) => {
        state.missions = state.missions.filter(m => m.id !== action.payload)
      })
      // Evolve
      .addCase(evolveKnowledge.pending, (state) => { state.isEvolving = true })
      .addCase(evolveKnowledge.fulfilled, (state) => { state.isEvolving = false })
      .addCase(evolveKnowledge.rejected, (state) => { state.isEvolving = false })
      // Deduplicate
      .addCase(deduplicateNotes.fulfilled, (state, action) => { state.duplicates = action.payload })
      // Report
      .addCase(generateReport.pending, (state) => { state.isGenerating = true })
      .addCase(generateReport.fulfilled, (state, action) => { state.isGenerating = false; state.report = action.payload })
      .addCase(generateReport.rejected, (state, action) => { state.isGenerating = false; state.error = action.error.message ?? 'Error' })
  },
})

export const {
  setSelectedNoteId,
  setSearchQuery,
  setTypeFilter,
  clearAiResults,
  optimisticAddNote,
} = knowledgeSlice.actions

// Selectors
export const selectAllNotes = (state: RootState) => state.knowledge.notes
export const selectAllLinks = (state: RootState) => state.knowledge.links
export const selectSelectedNoteId = (state: RootState) => state.knowledge.selectedNoteId
export const selectSelectedNote = (state: RootState) =>
  state.knowledge.notes.find(n => n.id === state.knowledge.selectedNoteId) || null
export const selectKnowledgeLoading = (state: RootState) => state.knowledge.isLoading
export const selectKnowledgeGenerating = (state: RootState) => state.knowledge.isGenerating
export const selectKnowledgeError = (state: RootState) => state.knowledge.error
export const selectLastInsightSummary = (state: RootState) => state.knowledge.lastInsightSummary
export const selectLastIdeas = (state: RootState) => state.knowledge.lastIdeas
export const selectLastGaps = (state: RootState) => state.knowledge.lastGaps
export const selectLastAnalysis = (state: RootState) => state.knowledge.lastAnalysis
export const selectLastSocratic = (state: RootState) => state.knowledge.lastSocratic
export const selectBriefing = (state: RootState) => state.knowledge.briefing
export const selectBriefingAge = (state: RootState) => state.knowledge.briefingAge
export const selectCognitiveEvents = (state: RootState) => state.knowledge.events
export const selectVelocity = (state: RootState) => state.knowledge.velocity
export const selectSearchQuery = (state: RootState) => state.knowledge.searchQuery
export const selectTypeFilter = (state: RootState) => state.knowledge.typeFilter

export const selectNoteLinks = (noteId: string) => (state: RootState) =>
  state.knowledge.links.filter(l => l.sourceNoteId === noteId || l.targetNoteId === noteId)

export const selectPredictions = (state: RootState) => state.knowledge.predictions
export const selectMissions = (state: RootState) => state.knowledge.missions
export const selectDuplicates = (state: RootState) => state.knowledge.duplicates
export const selectKnowledgeReport = (state: RootState) => state.knowledge.report
export const selectIsEvolving = (state: RootState) => state.knowledge.isEvolving

export const selectFilteredNotes = (state: RootState) => {
  let notes = state.knowledge.notes
  const { searchQuery, typeFilter } = state.knowledge
  if (typeFilter && typeFilter !== 'all') notes = notes.filter(n => n.type === typeFilter)
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    )
  }
  return notes
}

export default knowledgeSlice.reducer
