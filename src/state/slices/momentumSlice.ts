import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

interface MomentumState {
  score: number
  trend: 'up' | 'down' | 'stable'
  streak: number
  lastActionAt: string | null
  peakScore: number
  lastSessionQuality: number
}

const initialState: MomentumState = {
  score: 40,
  trend: 'stable',
  streak: 0,
  lastActionAt: null,
  peakScore: 40,
  lastSessionQuality: 0,
}

function clamp(val: number) { return Math.max(0, Math.min(100, val)) }

const momentumSlice = createSlice({
  name: 'momentum',
  initialState,
  reducers: {
    increaseMomentum: (state, action: PayloadAction<number>) => {
      const prev = state.score
      state.score = clamp(state.score + action.payload)
      state.trend = state.score > prev ? 'up' : 'stable'
      if (state.score > state.peakScore) state.peakScore = state.score
      state.streak += 1
      state.lastActionAt = new Date().toISOString()
    },
    decreaseMomentum: (state, action: PayloadAction<number>) => {
      const prev = state.score
      state.score = clamp(state.score - action.payload)
      state.trend = state.score < prev ? 'down' : 'stable'
    },
    applyDecay: (state) => {
      if (!state.lastActionAt) return
      const hoursElapsed = (Date.now() - new Date(state.lastActionAt).getTime()) / (1000 * 60 * 60)
      const missedDays = Math.floor(hoursElapsed / 24)
      if (missedDays > 0) {
        state.score = clamp(state.score - missedDays * 5)
        state.trend = 'down'
        if (missedDays > 1) state.streak = 0
      }
    },
    resetStreak: (state) => {
      state.streak = 0
    },
    setLastSessionQuality: (state, action: PayloadAction<number>) => {
      state.lastSessionQuality = clamp(action.payload)
    },
  },
})

export const { increaseMomentum, decreaseMomentum, applyDecay, resetStreak, setLastSessionQuality } = momentumSlice.actions

export const selectMomentumScore = (state: RootState) => state.momentum.score
export const selectMomentumTrend = (state: RootState) => state.momentum.trend
export const selectMomentumStreak = (state: RootState) => state.momentum.streak
export const selectPeakScore = (state: RootState) => state.momentum.peakScore
export const selectLastSessionQuality = (state: RootState) => state.momentum.lastSessionQuality

export default momentumSlice.reducer
