import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

export interface NextMove {
  text: string
  source: 'right-panel' | 'assistant' | 'system'
  createdAt: string
  actionType?: 'write' | 'connect' | 'build' | 'decide' | 'expand'
  estimatedMinutes?: number
  difficulty?: 'low' | 'medium' | 'high'
  completedAt?: string
}

interface NextMoveState {
  current: NextMove | null
  history: NextMove[]
  missedCount: number
  ignoredCount: number
  lastSessionMove: NextMove | null
}

const initialState: NextMoveState = {
  current: null,
  history: [],
  missedCount: 0,
  ignoredCount: 0,
  lastSessionMove: null,
}

const nextMoveSlice = createSlice({
  name: 'nextMove',
  initialState,
  reducers: {
    setNextMove: (state, action: PayloadAction<Omit<NextMove, 'createdAt'> & { createdAt?: string }>) => {
      if (state.current) {
        // Replacing without completing = missed
        state.missedCount += 1
      }
      state.current = {
        ...action.payload,
        createdAt: action.payload.createdAt || new Date().toISOString(),
      }
    },
    completeNextMove: (state) => {
      if (!state.current) return
      const completed: NextMove = { ...state.current, completedAt: new Date().toISOString() }
      state.history = [completed, ...state.history].slice(0, 10)
      state.current = null
      state.lastSessionMove = null
    },
    dismissNextMove: (state) => {
      if (!state.current) return
      state.lastSessionMove = state.current
      state.ignoredCount += 1
      state.current = null
    },
    setLastSessionMove: (state, action: PayloadAction<NextMove | null>) => {
      state.lastSessionMove = action.payload
    },
    resetMissedCount: (state) => {
      state.missedCount = 0
    },
  },
})

export const { setNextMove, completeNextMove, dismissNextMove, setLastSessionMove, resetMissedCount } = nextMoveSlice.actions

export const selectCurrentNextMove = (state: RootState) => state.nextMove.current
export const selectNextMoveHistory = (state: RootState) => state.nextMove.history
export const selectMissedCount = (state: RootState) => state.nextMove.missedCount
export const selectIgnoredCount = (state: RootState) => state.nextMove.ignoredCount
export const selectLastSessionMove = (state: RootState) => state.nextMove.lastSessionMove

export default nextMoveSlice.reducer
