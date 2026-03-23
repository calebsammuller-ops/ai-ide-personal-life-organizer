import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

interface Contradiction { noteA: string; noteB: string }

interface CognitiveMemoryState {
  beliefs: string[]
  recurringPatterns: string[]
  blindSpots: string[]
  strengths: string[]
  contradictions: Contradiction[]
  loading: boolean
  generatedAt: string | null
}

const initialState: CognitiveMemoryState = {
  beliefs: [],
  recurringPatterns: [],
  blindSpots: [],
  strengths: [],
  contradictions: [],
  loading: false,
  generatedAt: null,
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

export const fetchCognitiveMemory = createAsyncThunk(
  'cognitiveMemory/fetch',
  async (_, { getState }) => {
    const state = getState() as RootState
    const { generatedAt } = state.cognitiveMemory
    if (generatedAt) {
      const age = Date.now() - new Date(generatedAt).getTime()
      if (age < CACHE_DURATION_MS) return null
    }
    const res = await fetch('/api/knowledge/memory-evolve', { method: 'POST' })
    if (!res.ok) throw new Error('Failed to fetch cognitive memory')
    return res.json()
  }
)

const cognitiveMemorySlice = createSlice({
  name: 'cognitiveMemory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCognitiveMemory.pending, (state) => { state.loading = true })
      .addCase(fetchCognitiveMemory.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload === null) return
        const p = action.payload
        state.beliefs = Array.isArray(p.beliefs) ? p.beliefs : []
        state.recurringPatterns = Array.isArray(p.recurringPatterns) ? p.recurringPatterns : []
        state.blindSpots = Array.isArray(p.blindSpots) ? p.blindSpots : []
        state.strengths = Array.isArray(p.strengths) ? p.strengths : []
        state.contradictions = Array.isArray(p.contradictions) ? p.contradictions : []
        state.generatedAt = new Date().toISOString()
      })
      .addCase(fetchCognitiveMemory.rejected, (state) => { state.loading = false })
  },
})

export const selectCognitiveMemoryBeliefs = (state: RootState) => state.cognitiveMemory.beliefs
export const selectRecurringPatterns = (state: RootState) => state.cognitiveMemory.recurringPatterns
export const selectMemoryBlindSpots = (state: RootState) => state.cognitiveMemory.blindSpots
export const selectMemoryStrengths = (state: RootState) => state.cognitiveMemory.strengths
export const selectCognitiveContradictions = (state: RootState) => state.cognitiveMemory.contradictions
export const selectCognitiveMemoryLoading = (state: RootState) => state.cognitiveMemory.loading

export default cognitiveMemorySlice.reducer
