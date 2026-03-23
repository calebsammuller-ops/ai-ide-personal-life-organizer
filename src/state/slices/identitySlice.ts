import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

export type IdentityTitle = 'Seeker' | 'Explorer' | 'Builder' | 'Operator'

interface IdentityState {
  title: IdentityTitle
  level: number
  traits: string[]
  lastEvolved: string | null
  futureProjection: string | null
  committedIdentity: IdentityTitle | null
  commitmentDate: string | null
}

const initialState: IdentityState = {
  title: 'Seeker',
  level: 1,
  traits: [],
  lastEvolved: null,
  futureProjection: null,
  committedIdentity: null,
  commitmentDate: null,
}

const identitySlice = createSlice({
  name: 'identity',
  initialState,
  reducers: {
    evolveIdentity: (state, action: PayloadAction<{ title: IdentityTitle; level: number; traits: string[] }>) => {
      if (state.title !== action.payload.title) {
        state.lastEvolved = new Date().toISOString()
      }
      state.title = action.payload.title
      state.level = action.payload.level
      state.traits = action.payload.traits
    },
    setFutureProjection: (state, action: PayloadAction<string>) => {
      state.futureProjection = action.payload
    },
    commitIdentity: (state, action: PayloadAction<IdentityTitle>) => {
      state.committedIdentity = action.payload
      state.commitmentDate = new Date().toISOString()
    },
  },
})

export const { evolveIdentity, setFutureProjection, commitIdentity } = identitySlice.actions

export const selectIdentityTitle = (state: RootState) => state.identity.title
export const selectIdentityLevel = (state: RootState) => state.identity.level
export const selectIdentityTraits = (state: RootState) => state.identity.traits
export const selectFutureProjection = (state: RootState) => state.identity.futureProjection
export const selectLastEvolved = (state: RootState) => state.identity.lastEvolved
export const selectCommittedIdentity = (state: RootState) => state.identity.committedIdentity
export const selectCommitmentDate = (state: RootState) => state.identity.commitmentDate

export default identitySlice.reducer
