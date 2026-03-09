import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'
import type { WeeklyReviewResult } from '@/types/knowledge'

interface WeeklyReviewState {
  data: WeeklyReviewResult | null
  loading: boolean
  error: string | null
  generatedAt: string | null
}

const initialState: WeeklyReviewState = {
  data: null,
  loading: false,
  error: null,
  generatedAt: null,
}

export const fetchWeeklyReview = createAsyncThunk(
  'weeklyReview/fetch',
  async () => {
    const res = await fetch('/api/knowledge/weekly-review')
    if (!res.ok) throw new Error('Failed to fetch weekly review')
    return res.json()
  }
)

const weeklyReviewSlice = createSlice({
  name: 'weeklyReview',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeeklyReview.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWeeklyReview.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.data
        state.generatedAt = new Date().toISOString()
      })
      .addCase(fetchWeeklyReview.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed'
      })
  },
})

export default weeklyReviewSlice.reducer

export const selectWeeklyReviewData = (state: RootState) => state.weeklyReview.data
export const selectWeeklyReviewLoading = (state: RootState) => state.weeklyReview.loading
export const selectWeeklyReviewGeneratedAt = (state: RootState) => state.weeklyReview.generatedAt
