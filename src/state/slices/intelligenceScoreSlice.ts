import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

interface ScoreBreakdown {
  notes: number
  links: number
  insights: number
  evolutions: number
}

interface IntelligenceScoreState {
  score: number
  breakdown: ScoreBreakdown
  weekGrowthPct: number | null
  thisWeekNotes: number
  loading: boolean
  error: string | null
}

const initialState: IntelligenceScoreState = {
  score: 0,
  breakdown: { notes: 0, links: 0, insights: 0, evolutions: 0 },
  weekGrowthPct: null,
  thisWeekNotes: 0,
  loading: false,
  error: null,
}

export const fetchIntelligenceScore = createAsyncThunk(
  'intelligenceScore/fetch',
  async () => {
    const res = await fetch('/api/knowledge/intelligence-score')
    if (!res.ok) throw new Error('Failed to fetch score')
    return res.json()
  }
)

const intelligenceScoreSlice = createSlice({
  name: 'intelligenceScore',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIntelligenceScore.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchIntelligenceScore.fulfilled, (state, action) => {
        state.loading = false
        state.score = action.payload.score
        state.breakdown = action.payload.breakdown
        state.weekGrowthPct = action.payload.weekGrowthPct
        state.thisWeekNotes = action.payload.thisWeekNotes
      })
      .addCase(fetchIntelligenceScore.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch score'
      })
  },
})

export default intelligenceScoreSlice.reducer

export const selectIntelligenceScore = (state: RootState) => state.intelligenceScore.score
export const selectScoreBreakdown = (state: RootState) => state.intelligenceScore.breakdown
export const selectWeekGrowthPct = (state: RootState) => state.intelligenceScore.weekGrowthPct
export const selectThisWeekNotes = (state: RootState) => state.intelligenceScore.thisWeekNotes
export const selectScoreLoading = (state: RootState) => state.intelligenceScore.loading
