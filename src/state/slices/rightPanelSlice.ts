import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

interface RightPanelConnection {
  noteA: string
  noteB: string
  reason: string
  strength: number
}

export interface RightPanelNextAction {
  text: string
  type: 'expand' | 'research' | 'connect'
  priority: 'high' | 'medium' | 'low'
  targetId?: string
}

interface RightPanelState {
  insight: string | null
  whyThisMatters: string | null
  pattern: string | null
  connections: RightPanelConnection[]
  nextActions: RightPanelNextAction[]
  priority: 'low' | 'medium' | 'high'
  confidence: number
  confidenceReason: string | null
  patternShift: string | null
  loading: boolean
  generatedAt: string | null
}

const initialState: RightPanelState = {
  insight: null,
  whyThisMatters: null,
  pattern: null,
  connections: [],
  nextActions: [],
  priority: 'low',
  confidence: 0,
  confidenceReason: null,
  patternShift: null,
  loading: false,
  generatedAt: null,
}

const CACHE_DURATION_MS = 5 * 60 * 1000

export const fetchRightPanel = createAsyncThunk(
  'rightPanel/fetch',
  async ({ force = false, context = 'general' }: { force?: boolean; context?: string } = {}, { getState }) => {
    const state = getState() as RootState
    const { generatedAt } = state.rightPanel
    if (!force && generatedAt) {
      const age = Date.now() - new Date(generatedAt).getTime()
      if (age < CACHE_DURATION_MS) {
        return null
      }
    }
    const res = await fetch('/api/knowledge/right-panel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    })
    if (!res.ok) throw new Error('Failed to fetch right panel')
    return res.json()
  }
)

const rightPanelSlice = createSlice({
  name: 'rightPanel',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRightPanel.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchRightPanel.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload === null) return // cache hit, no update
        const p = action.payload
        state.insight = p.insight ?? null
        state.whyThisMatters = p.whyThisMatters ?? null
        state.pattern = p.pattern ?? null
        state.connections = Array.isArray(p.connections) ? p.connections : []
        state.nextActions = Array.isArray(p.nextActions) ? p.nextActions : []
        state.priority = p.priority ?? 'low'
        state.confidence = typeof p.confidence === 'number' ? p.confidence : 0
        state.confidenceReason = p.confidenceReason ?? null
        state.patternShift = p.patternShift ?? null
        state.generatedAt = new Date().toISOString()
      })
      .addCase(fetchRightPanel.rejected, (state) => {
        state.loading = false
      })
  },
})

export default rightPanelSlice.reducer

export const selectRightPanelInsight = (state: RootState) => state.rightPanel.insight
export const selectRightPanelWhyThisMatters = (state: RootState) => state.rightPanel.whyThisMatters
export const selectRightPanelPattern = (state: RootState) => state.rightPanel.pattern
export const selectRightPanelConnections = (state: RootState) => state.rightPanel.connections
export const selectRightPanelNextActions = (state: RootState) => state.rightPanel.nextActions
export const selectRightPanelPriority = (state: RootState) => state.rightPanel.priority
export const selectRightPanelConfidence = (state: RootState) => state.rightPanel.confidence
export const selectRightPanelConfidenceReason = (state: RootState) => state.rightPanel.confidenceReason
export const selectRightPanelPatternShift = (state: RootState) => state.rightPanel.patternShift
export const selectRightPanelLoading = (state: RootState) => state.rightPanel.loading
export const selectRightPanelGeneratedAt = (state: RootState) => state.rightPanel.generatedAt
