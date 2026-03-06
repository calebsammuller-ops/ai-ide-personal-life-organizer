import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { DailyPlan, TimeBlock } from '@/types'
import type { RootState } from '../store'

interface DailyPlanState {
  currentPlan: DailyPlan | null
  isLoading: boolean
  isGenerating: boolean
  error: string | null
}

const initialState: DailyPlanState = {
  currentPlan: null,
  isLoading: false,
  isGenerating: false,
  error: null,
}

export const fetchDailyPlan = createAsyncThunk(
  'dailyPlan/fetchDailyPlan',
  async (date: string) => {
    const response = await fetch(`/api/daily-plan?date=${date}`)
    if (!response.ok) throw new Error('Failed to fetch daily plan')
    const data = await response.json()
    return data.data as DailyPlan | null
  }
)

export const generateDailyPlan = createAsyncThunk(
  'dailyPlan/generateDailyPlan',
  async (date: string) => {
    const response = await fetch('/api/daily-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate daily plan')
    }
    const data = await response.json()
    return data.data as DailyPlan
  }
)

export const updateDailyPlan = createAsyncThunk(
  'dailyPlan/updateDailyPlan',
  async ({ date, planData, notes, isLocked }: {
    date: string
    planData?: TimeBlock[]
    notes?: string
    isLocked?: boolean
  }) => {
    const response = await fetch('/api/daily-plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, planData, notes, isLocked }),
    })
    if (!response.ok) throw new Error('Failed to update daily plan')
    const data = await response.json()
    return data.data as DailyPlan
  }
)

export const dailyPlanSlice = createSlice({
  name: 'dailyPlan',
  initialState,
  reducers: {
    clearPlan: (state) => {
      state.currentPlan = null
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailyPlan.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDailyPlan.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentPlan = action.payload
      })
      .addCase(fetchDailyPlan.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch plan'
      })
      .addCase(generateDailyPlan.pending, (state) => {
        state.isGenerating = true
        state.error = null
      })
      .addCase(generateDailyPlan.fulfilled, (state, action) => {
        state.isGenerating = false
        state.currentPlan = action.payload
      })
      .addCase(generateDailyPlan.rejected, (state, action) => {
        state.isGenerating = false
        state.error = action.error.message ?? 'Failed to generate plan'
      })
      .addCase(updateDailyPlan.fulfilled, (state, action) => {
        state.currentPlan = action.payload
      })
  },
})

export const { clearPlan, clearError } = dailyPlanSlice.actions

export const selectCurrentPlan = (state: RootState) => state.dailyPlan.currentPlan
export const selectDailyPlanLoading = (state: RootState) => state.dailyPlan.isLoading
export const selectDailyPlanGenerating = (state: RootState) => state.dailyPlan.isGenerating
export const selectDailyPlanError = (state: RootState) => state.dailyPlan.error
export const selectPlanBlocks = (state: RootState) =>
  (state.dailyPlan.currentPlan?.planData as TimeBlock[]) ?? []

export default dailyPlanSlice.reducer
