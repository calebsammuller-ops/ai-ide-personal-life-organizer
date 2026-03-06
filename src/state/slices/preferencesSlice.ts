import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { UserPreferences } from '@/types'
import type { RootState } from '../store'

export interface LearnedPatterns {
  mostProductiveHours: string[]
  preferredEventDurations: Record<string, number>
  habitSuccessDays: string[]
  commonMealTypes: string[]
  peakEnergyTimes: string[]
  preferredWorkBlocks: { start: string; end: string; avgDuration: number }[]
  habitCorrelations: { habit1: string; habit2: string; correlation: number }[]
  optimalScheduleSuggestions: string[]
  insights: string[]
  analyzedAt: string
}

interface PreferencesState {
  preferences: UserPreferences | null
  learnedPatterns: LearnedPatterns | null
  isLoading: boolean
  isAnalyzing: boolean
  lastAnalyzedAt: string | null
  error: string | null
}

const initialState: PreferencesState = {
  preferences: null,
  learnedPatterns: null,
  isLoading: false,
  isAnalyzing: false,
  lastAnalyzedAt: null,
  error: null,
}

export const fetchPreferences = createAsyncThunk(
  'preferences/fetchPreferences',
  async () => {
    const response = await fetch('/api/personal-learning/preferences')
    if (!response.ok) throw new Error('Failed to fetch preferences')
    const data = await response.json()
    return data.data as UserPreferences
  }
)

export const updatePreferences = createAsyncThunk(
  'preferences/updatePreferences',
  async (updates: Partial<UserPreferences>) => {
    const response = await fetch('/api/personal-learning/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update preferences')
    const data = await response.json()
    return data.data as UserPreferences
  }
)

export const fetchLearnedPatterns = createAsyncThunk(
  'preferences/fetchLearnedPatterns',
  async () => {
    const response = await fetch('/api/personal-learning')
    if (!response.ok) throw new Error('Failed to fetch learned patterns')
    const data = await response.json()
    return data.data as LearnedPatterns
  }
)

export const triggerPatternAnalysis = createAsyncThunk(
  'preferences/triggerPatternAnalysis',
  async () => {
    const response = await fetch('/api/personal-learning/analyze', {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to analyze patterns')
    const data = await response.json()
    return data.data as LearnedPatterns
  }
)

export const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setPreferences: (state, action: PayloadAction<UserPreferences>) => {
      state.preferences = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPreferences.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.isLoading = false
        state.preferences = action.payload
      })
      .addCase(fetchPreferences.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch preferences'
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = action.payload
      })
      .addCase(fetchLearnedPatterns.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchLearnedPatterns.fulfilled, (state, action) => {
        state.isLoading = false
        state.learnedPatterns = action.payload
        if (action.payload?.analyzedAt) {
          state.lastAnalyzedAt = action.payload.analyzedAt
        }
      })
      .addCase(fetchLearnedPatterns.rejected, (state) => {
        state.isLoading = false
      })
      .addCase(triggerPatternAnalysis.pending, (state) => {
        state.isAnalyzing = true
        state.error = null
      })
      .addCase(triggerPatternAnalysis.fulfilled, (state, action) => {
        state.isAnalyzing = false
        state.learnedPatterns = action.payload
        state.lastAnalyzedAt = action.payload.analyzedAt
      })
      .addCase(triggerPatternAnalysis.rejected, (state, action) => {
        state.isAnalyzing = false
        state.error = action.error.message ?? 'Failed to analyze patterns'
      })
  },
})

export const { setPreferences, clearError } = preferencesSlice.actions

export const selectPreferences = (state: RootState) => state.preferences.preferences
export const selectLearnedPatterns = (state: RootState) => state.preferences.learnedPatterns
export const selectPreferencesLoading = (state: RootState) => state.preferences.isLoading
export const selectIsAnalyzing = (state: RootState) => state.preferences.isAnalyzing
export const selectLastAnalyzedAt = (state: RootState) => state.preferences.lastAnalyzedAt
export const selectPreferencesError = (state: RootState) => state.preferences.error

export const selectPreferredMealTimes = (state: RootState) =>
  state.preferences.preferences?.preferredMealTimes ?? {
    breakfast: '08:00',
    lunch: '12:30',
    dinner: '19:00',
  }

export const selectWorkHours = (state: RootState) => ({
  start: state.preferences.preferences?.workStartTime ?? '09:00',
  end: state.preferences.preferences?.workEndTime ?? '17:00',
})

export const selectNotificationSettings = (state: RootState) =>
  state.preferences.preferences?.notificationPreferences ?? {
    push: true,
    email: false,
    sms: false,
  }

export default preferencesSlice.reducer
