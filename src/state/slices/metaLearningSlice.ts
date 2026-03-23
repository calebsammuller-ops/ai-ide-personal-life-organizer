import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

export interface FailurePattern {
  trigger: string
  outcome: string
  frequency: number
}

interface MetaLearningState {
  completedActionTypes: Record<string, number>
  ignoredActionTypes: Record<string, number>
  bestActionTypes: string[]
  worstActionTypes: string[]
  adaptationScore: number
  respondsToPressure: boolean
  prefersStructure: boolean
  failurePatterns: FailurePattern[]
}

const initialState: MetaLearningState = {
  completedActionTypes: {},
  ignoredActionTypes: {},
  bestActionTypes: [],
  worstActionTypes: [],
  adaptationScore: 0,
  respondsToPressure: true,
  prefersStructure: false,
  failurePatterns: [],
}

function getTopTypes(record: Record<string, number>, n = 2): string[] {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([type]) => type)
}

const metaLearningSlice = createSlice({
  name: 'metaLearning',
  initialState,
  reducers: {
    recordCompletion: (state, action: PayloadAction<string | undefined>) => {
      const type = action.payload || 'unknown'
      state.completedActionTypes[type] = (state.completedActionTypes[type] || 0) + 1
      state.bestActionTypes = getTopTypes(state.completedActionTypes)
      // If user completes when pressure was high, they respond to pressure
      const completions = Object.values(state.completedActionTypes).reduce((a, b) => a + b, 0)
      if (completions >= 3) state.respondsToPressure = true
    },
    recordIgnored: (state, action: PayloadAction<string | undefined>) => {
      const type = action.payload || 'unknown'
      state.ignoredActionTypes[type] = (state.ignoredActionTypes[type] || 0) + 1
      state.worstActionTypes = getTopTypes(state.ignoredActionTypes)
      // If user ignores many times, they may not respond to pressure
      const ignores = Object.values(state.ignoredActionTypes).reduce((a, b) => a + b, 0)
      if (ignores > 5) state.respondsToPressure = false
    },
    addFailurePattern: (state, action: PayloadAction<FailurePattern>) => {
      const existing = state.failurePatterns.find(p => p.trigger === action.payload.trigger)
      if (existing) {
        existing.frequency += 1
      } else {
        state.failurePatterns.push(action.payload)
      }
    },
    incrementAdaptationScore: (state) => {
      state.adaptationScore = Math.min(100, state.adaptationScore + 1)
    },
  },
})

export const { recordCompletion, recordIgnored, addFailurePattern, incrementAdaptationScore } = metaLearningSlice.actions

export const selectBestActionTypes = (state: RootState) => state.metaLearning.bestActionTypes
export const selectWorstActionTypes = (state: RootState) => state.metaLearning.worstActionTypes
export const selectRespondsToPressure = (state: RootState) => state.metaLearning.respondsToPressure
export const selectAdaptationScore = (state: RootState) => state.metaLearning.adaptationScore
export const selectFailurePatterns = (state: RootState) => state.metaLearning.failurePatterns

export default metaLearningSlice.reducer
