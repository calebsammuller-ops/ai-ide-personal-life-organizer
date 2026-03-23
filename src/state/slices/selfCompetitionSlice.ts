import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'

interface WeeklyMetrics {
  notesCreated: number
  linksCreated: number
  actionsCompleted: number
}

interface SelfCompetitionState {
  thisWeek: WeeklyMetrics
  lastWeek: WeeklyMetrics
}

const initialState: SelfCompetitionState = {
  thisWeek: { notesCreated: 0, linksCreated: 0, actionsCompleted: 0 },
  lastWeek: { notesCreated: 0, linksCreated: 0, actionsCompleted: 0 },
}

const selfCompetitionSlice = createSlice({
  name: 'selfCompetition',
  initialState,
  reducers: {
    setWeeklyMetrics: (state, action: PayloadAction<{ thisWeek: WeeklyMetrics; lastWeek: WeeklyMetrics }>) => {
      state.thisWeek = action.payload.thisWeek
      state.lastWeek = action.payload.lastWeek
    },
  },
})

export const { setWeeklyMetrics } = selfCompetitionSlice.actions

export const selectThisWeekMetrics = (state: RootState) => state.selfCompetition.thisWeek
export const selectLastWeekMetrics = (state: RootState) => state.selfCompetition.lastWeek
export const selectVelocityDelta = (state: RootState) => {
  const tw = state.selfCompetition.thisWeek
  const lw = state.selfCompetition.lastWeek
  return {
    notes: lw.notesCreated > 0 ? Math.round(((tw.notesCreated - lw.notesCreated) / lw.notesCreated) * 100) : tw.notesCreated > 0 ? 100 : 0,
    links: lw.linksCreated > 0 ? Math.round(((tw.linksCreated - lw.linksCreated) / lw.linksCreated) * 100) : tw.linksCreated > 0 ? 100 : 0,
    actions: lw.actionsCompleted > 0 ? Math.round(((tw.actionsCompleted - lw.actionsCompleted) / lw.actionsCompleted) * 100) : tw.actionsCompleted > 0 ? 100 : 0,
  }
}

// Client-side computation helper
export function computeWeeklyMetrics(
  notes: Array<{ createdAt: string }>,
  links: Array<{ createdAt?: string }>,
  completedActions: number
): { thisWeek: WeeklyMetrics; lastWeek: WeeklyMetrics } {
  const now = Date.now()
  const day7 = now - 7 * 24 * 60 * 60 * 1000
  const day14 = now - 14 * 24 * 60 * 60 * 1000

  const notesThisWeek = notes.filter(n => new Date(n.createdAt).getTime() > day7).length
  const notesLastWeek = notes.filter(n => {
    const t = new Date(n.createdAt).getTime()
    return t > day14 && t <= day7
  }).length

  const linksThisWeek = links.filter(l => l.createdAt && new Date(l.createdAt).getTime() > day7).length
  const linksLastWeek = links.filter(l => {
    if (!l.createdAt) return false
    const t = new Date(l.createdAt).getTime()
    return t > day14 && t <= day7
  }).length

  return {
    thisWeek: { notesCreated: notesThisWeek, linksCreated: linksThisWeek, actionsCompleted: completedActions },
    lastWeek: { notesCreated: notesLastWeek, linksCreated: linksLastWeek, actionsCompleted: 0 },
  }
}

export default selfCompetitionSlice.reducer
