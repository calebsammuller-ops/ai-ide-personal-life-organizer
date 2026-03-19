import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

interface RightPanelConnection {
  noteA: string
  noteB: string
  reason: string
  strength: number
}

interface RightPanelNextAction {
  text: string
  type: 'expand' | 'research' | 'connect'
  targetId?: string
}

interface RightPanelState {
  insight: string | null
  connections: RightPanelConnection[]
  nextAction: RightPanelNextAction | null
  priority: 'low' | 'medium' | 'high'
  confidence: number
  loading: boolean
  generatedAt: string | null
}

const initialState: RightPanelState = {
  insight: null,
  connections: [],
  nextAction: null,
  priority: 'low',
  confidence: 0,
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
        state.insight = action.payload.insight ?? null
        state.connections = action.payload.connections ?? []
        state.nextAction = action.payload.nextAction ?? null
        state.priority = action.payload.priority ?? 'low'
        state.confidence = action.payload.confidence ?? 0
        state.generatedAt = new Date().toISOString()
      })
      .addCase(fetchRightPanel.rejected, (state) => {
        state.loading = false
      })
  },
})

export default rightPanelSlice.reducer

export const selectRightPanelInsight = (state: RootState) => state.rightPanel.insight
export const selectRightPanelConnections = (state: RootState) => state.rightPanel.connections
export const selectRightPanelNextAction = (state: RootState) => state.rightPanel.nextAction
export const selectRightPanelPriority = (state: RootState) => state.rightPanel.priority
export const selectRightPanelConfidence = (state: RootState) => state.rightPanel.confidence
export const selectRightPanelLoading = (state: RootState) => state.rightPanel.loading
export const selectRightPanelGeneratedAt = (state: RootState) => state.rightPanel.generatedAt
