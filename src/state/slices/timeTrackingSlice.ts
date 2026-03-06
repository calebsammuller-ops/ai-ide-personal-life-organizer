import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type { TimeEntry, CreateTimeEntryInput } from '@/types/timeTracking'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface TimeReport {
  totalDuration: number
  entries: TimeEntry[]
  byProject: Record<string, number>
  byDate: Record<string, number>
}

interface TimeTrackingState {
  entries: TimeEntry[]
  activeTimer: TimeEntry | null
  isLoading: boolean
  error: string | null
  reports: TimeReport | null
}

const initialState: TimeTrackingState = {
  entries: [],
  activeTimer: null,
  isLoading: false,
  error: null,
  reports: null,
}

// Async thunks
export const fetchTimeEntries = createAsyncThunk(
  'timeTracking/fetchTimeEntries',
  async (params?: { startDate?: string; endDate?: string; projectId?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.set('startDate', params.startDate)
    if (params?.endDate) queryParams.set('endDate', params.endDate)
    if (params?.projectId) queryParams.set('projectId', params.projectId)

    const url = `/api/time-tracking${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    if (!response.ok) throw new Error('Failed to fetch time entries')
    const data = await response.json()
    return data.data as TimeEntry[]
  }
)

export const startTimer = createAsyncThunk(
  'timeTracking/startTimer',
  async (input: CreateTimeEntryInput) => {
    const response = await fetchWithAuth('/api/time-tracking/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error('Failed to start timer')
    const data = await response.json()
    return data.data as TimeEntry
  }
)

export const stopTimer = createAsyncThunk(
  'timeTracking/stopTimer',
  async (entryId?: string) => {
    const response = await fetchWithAuth('/api/time-tracking/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId }),
    })
    if (!response.ok) throw new Error('Failed to stop timer')
    const data = await response.json()
    return data.data as TimeEntry
  }
)

export const deleteTimeEntry = createAsyncThunk(
  'timeTracking/deleteTimeEntry',
  async (id: string) => {
    const response = await fetchWithAuth(`/api/time-tracking/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete time entry')
    return id
  }
)

export const fetchTimeReports = createAsyncThunk(
  'timeTracking/fetchTimeReports',
  async (params?: { startDate?: string; endDate?: string; projectId?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.startDate) queryParams.set('startDate', params.startDate)
    if (params?.endDate) queryParams.set('endDate', params.endDate)
    if (params?.projectId) queryParams.set('projectId', params.projectId)

    const url = `/api/time-tracking/reports${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetchWithAuth(url)
    if (!response.ok) throw new Error('Failed to fetch time reports')
    const data = await response.json()
    return data.data as TimeReport
  }
)

export const timeTrackingSlice = createSlice({
  name: 'timeTracking',
  initialState,
  reducers: {
    setActiveTimer: (state, action: PayloadAction<TimeEntry | null>) => {
      state.activeTimer = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch time entries
      .addCase(fetchTimeEntries.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTimeEntries.fulfilled, (state, action) => {
        state.isLoading = false
        state.entries = action.payload
      })
      .addCase(fetchTimeEntries.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch time entries'
      })
      // Start timer
      .addCase(startTimer.fulfilled, (state, action) => {
        state.activeTimer = action.payload
        state.entries.push(action.payload)
      })
      .addCase(startTimer.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to start timer'
      })
      // Stop timer
      .addCase(stopTimer.fulfilled, (state, action) => {
        state.activeTimer = null
        const index = state.entries.findIndex(e => e.id === action.payload.id)
        if (index !== -1) {
          state.entries[index] = action.payload
        }
      })
      .addCase(stopTimer.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to stop timer'
      })
      // Delete time entry
      .addCase(deleteTimeEntry.fulfilled, (state, action) => {
        state.entries = state.entries.filter(e => e.id !== action.payload)
      })
      // Fetch time reports
      .addCase(fetchTimeReports.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTimeReports.fulfilled, (state, action) => {
        state.isLoading = false
        state.reports = action.payload
      })
      .addCase(fetchTimeReports.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch time reports'
      })
  },
})

export const { setActiveTimer } = timeTrackingSlice.actions

// Selectors
export const selectTimeEntries = (state: RootState) => state.timeTracking.entries
export const selectActiveTimer = (state: RootState) => state.timeTracking.activeTimer
export const selectTimeReports = (state: RootState) => state.timeTracking.reports
export const selectTimeTrackingLoading = (state: RootState) => state.timeTracking.isLoading
export const selectTimeTrackingError = (state: RootState) => state.timeTracking.error

export default timeTrackingSlice.reducer
