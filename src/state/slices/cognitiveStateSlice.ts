import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

export type CognitiveState = 'exploring' | 'focused' | 'executing' | 'drifting' | 'overwhelmed'

interface CognitiveStateSliceState {
  current: CognitiveState
  detectedAt: string | null
  predictedNextState: CognitiveState | null
}

const initialState: CognitiveStateSliceState = {
  current: 'focused',
  detectedAt: null,
  predictedNextState: null,
}

const cognitiveStateSlice = createSlice({
  name: 'cognitiveState',
  initialState,
  reducers: {
    setCognitiveState: (state, action: PayloadAction<CognitiveState>) => {
      state.current = action.payload
      state.detectedAt = new Date().toISOString()
    },
    setPredictedNextState: (state, action: PayloadAction<CognitiveState | null>) => {
      state.predictedNextState = action.payload
    },
  },
})

export const { setCognitiveState, setPredictedNextState } = cognitiveStateSlice.actions

export const selectCognitiveState = (state: RootState) => state.cognitiveState.current
export const selectPredictedNextState = (state: RootState) => state.cognitiveState.predictedNextState

// Client-side computation helpers
export function computeCognitiveState(
  notes: Array<{ updatedAt: string; tags?: string[] }>,
  missedCount: number,
  ignoredCount: number,
  lockInActive: boolean
): CognitiveState {
  const now = Date.now()
  const recentNotes = notes.filter(n => (now - new Date(n.updatedAt).getTime()) < 24 * 60 * 60 * 1000)
  const uniqueTags = new Set(recentNotes.flatMap(n => n.tags || [])).size
  if (missedCount > 3 || ignoredCount > 5) return 'drifting'
  if (recentNotes.length > 8) return 'overwhelmed'
  if (lockInActive && uniqueTags <= 2) return 'focused'
  if (uniqueTags <= 1 && recentNotes.length > 0) return 'executing'
  if (uniqueTags > 5) return 'exploring'
  return 'focused'
}

export function predictNextState(
  momentum: number,
  missedCount: number,
  recentNoteCount: number
): CognitiveState {
  if (momentum < 30 && missedCount > 2) return 'drifting'
  if (momentum > 70 && missedCount === 0) return 'executing'
  if (recentNoteCount > 8 && missedCount > 1) return 'overwhelmed'
  return 'focused'
}

export default cognitiveStateSlice.reducer
