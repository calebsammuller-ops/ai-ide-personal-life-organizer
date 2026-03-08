import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'
import type { StrategyResult } from '@/types/knowledge'

interface StrategyState {
  data: StrategyResult | null
  loading: boolean
  error: string | null
  generatedAt: string | null
  cached: boolean
}

const initialState: StrategyState = {
  data: null,
  loading: false,
  error: null,
  generatedAt: null,
  cached: false,
}

export const fetchStrategy = createAsyncThunk(
  'strategy/fetch',
  async () => {
    const res = await fetch('/api/knowledge/strategy')
    if (!res.ok) throw new Error('Failed to fetch strategy')
    return res.json()
  }
)

export const generateStrategy = createAsyncThunk(
  'strategy/generate',
  async () => {
    const res = await fetch('/api/knowledge/strategy?refresh=true')
    if (!res.ok) throw new Error('Failed to generate strategy')
    return res.json()
  }
)

const strategySlice = createSlice({
  name: 'strategy',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStrategy.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStrategy.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.data
        state.cached = action.payload.cached
        state.generatedAt = new Date().toISOString()
      })
      .addCase(fetchStrategy.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed'
      })
      .addCase(generateStrategy.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(generateStrategy.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.data
        state.cached = false
        state.generatedAt = new Date().toISOString()
      })
      .addCase(generateStrategy.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed'
      })
  },
})

export default strategySlice.reducer

export const selectStrategyData = (state: RootState) => state.strategy.data
export const selectStrategyLoading = (state: RootState) => state.strategy.loading
export const selectStrategyCached = (state: RootState) => state.strategy.cached
export const selectStrategyGeneratedAt = (state: RootState) => state.strategy.generatedAt
