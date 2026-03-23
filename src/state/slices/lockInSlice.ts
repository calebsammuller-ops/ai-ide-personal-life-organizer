import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

interface LockInProgress {
  ideasExpanded: number
  connectionsMade: number
  notesCreated: number
}

interface LockInState {
  active: boolean
  focus: string | null
  allowedTags: string[]
  durationDays: number
  startedAt: string | null
  driftCount: number
  progress: LockInProgress
}

const initialState: LockInState = {
  active: false,
  focus: null,
  allowedTags: [],
  durationDays: 7,
  startedAt: null,
  driftCount: 0,
  progress: { ideasExpanded: 0, connectionsMade: 0, notesCreated: 0 },
}

const lockInSlice = createSlice({
  name: 'lockIn',
  initialState,
  reducers: {
    activateLockIn: (state, action: PayloadAction<{ focus: string; allowedTags: string[]; durationDays: number }>) => {
      state.active = true
      state.focus = action.payload.focus
      state.allowedTags = action.payload.allowedTags
      state.durationDays = action.payload.durationDays
      state.startedAt = new Date().toISOString()
      state.driftCount = 0
      state.progress = { ideasExpanded: 0, connectionsMade: 0, notesCreated: 0 }
    },
    deactivateLockIn: (state) => {
      state.active = false
      state.focus = null
      state.allowedTags = []
      state.startedAt = null
      state.driftCount = 0
    },
    incrementDrift: (state) => {
      state.driftCount += 1
    },
    incrementLockInProgress: (state, action: PayloadAction<keyof LockInProgress>) => {
      state.progress[action.payload] += 1
    },
  },
})

export const { activateLockIn, deactivateLockIn, incrementDrift, incrementLockInProgress } = lockInSlice.actions

export const selectLockInActive = (state: RootState) => state.lockIn.active
export const selectLockInFocus = (state: RootState) => state.lockIn.focus
export const selectLockInAllowedTags = (state: RootState) => state.lockIn.allowedTags
export const selectLockInDriftCount = (state: RootState) => state.lockIn.driftCount
export const selectLockInProgress = (state: RootState) => state.lockIn.progress
export const selectLockInStartedAt = (state: RootState) => state.lockIn.startedAt
export const selectLockInDurationDays = (state: RootState) => state.lockIn.durationDays

export default lockInSlice.reducer
