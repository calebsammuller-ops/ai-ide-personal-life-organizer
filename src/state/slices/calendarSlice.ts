import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { CalendarEvent, Calendar } from '@/types'
import type { RootState } from '../store'
import type { ConflictInfo, ResolutionSuggestion } from '@/lib/calendar/conflictDetection'

interface CalendarState {
  events: CalendarEvent[]
  calendars: Calendar[]
  selectedDate: string
  selectedView: 'month' | 'week' | 'day'
  selectedCalendarIds: string[]
  isLoading: boolean
  error: string | null
  eventBeingEdited: CalendarEvent | null
  dateRange: { start: string; end: string }
  // Conflict detection state
  conflictInfo: ConflictInfo | null
  showConflictModal: boolean
  pendingEvent: Partial<CalendarEvent> | null
  isCheckingConflicts: boolean
}

const today = new Date().toISOString().split('T')[0]

const initialState: CalendarState = {
  events: [],
  calendars: [],
  selectedDate: today,
  selectedView: 'month',
  selectedCalendarIds: [],
  isLoading: false,
  error: null,
  eventBeingEdited: null,
  dateRange: { start: today, end: today },
  // Conflict detection state
  conflictInfo: null,
  showConflictModal: false,
  pendingEvent: null,
  isCheckingConflicts: false,
}

export const fetchEvents = createAsyncThunk(
  'calendar/fetchEvents',
  async (dateRange: { start: string; end: string }) => {
    const response = await fetch(
      `/api/calendar?start=${dateRange.start}&end=${dateRange.end}`
    )
    if (!response.ok) throw new Error('Failed to fetch events')
    const data = await response.json()
    return data.data as CalendarEvent[]
  }
)

export const fetchCalendars = createAsyncThunk(
  'calendar/fetchCalendars',
  async () => {
    const response = await fetch('/api/calendar/calendars')
    if (!response.ok) throw new Error('Failed to fetch calendars')
    const data = await response.json()
    return data.data as Calendar[]
  }
)

export const checkConflicts = createAsyncThunk(
  'calendar/checkConflicts',
  async (event: { startTime: string; endTime: string; title?: string; excludeEventId?: string }) => {
    const response = await fetch('/api/calendar/check-conflicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    if (!response.ok) throw new Error('Failed to check conflicts')
    const data = await response.json()
    return data.data as ConflictInfo
  }
)

export const createEvent = createAsyncThunk(
  'calendar/createEvent',
  async (event: Partial<CalendarEvent> & { skipConflictCheck?: boolean }, { rejectWithValue }) => {
    const response = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })

    const data = await response.json()

    if (response.status === 409) {
      // Conflict detected
      return rejectWithValue({
        type: 'conflict',
        conflictInfo: data.conflictInfo,
        pendingEvent: event,
      })
    }

    if (!response.ok) throw new Error(data.error || 'Failed to create event')
    return data.data as CalendarEvent
  }
)

export const updateEvent = createAsyncThunk(
  'calendar/updateEvent',
  async ({ id, updates }: { id: string; updates: Partial<CalendarEvent> }) => {
    const response = await fetch(`/api/calendar/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update event')
    const data = await response.json()
    return data.data as CalendarEvent
  }
)

export const deleteEvent = createAsyncThunk(
  'calendar/deleteEvent',
  async (id: string) => {
    const response = await fetch(`/api/calendar/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete event')
    return id
  }
)

export const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload
    },
    setSelectedView: (state, action: PayloadAction<'month' | 'week' | 'day'>) => {
      state.selectedView = action.payload
    },
    setSelectedCalendars: (state, action: PayloadAction<string[]>) => {
      state.selectedCalendarIds = action.payload
    },
    setEventBeingEdited: (state, action: PayloadAction<CalendarEvent | null>) => {
      state.eventBeingEdited = action.payload
    },
    setDateRange: (state, action: PayloadAction<{ start: string; end: string }>) => {
      state.dateRange = action.payload
    },
    // Conflict detection reducers
    setConflictInfo: (state, action: PayloadAction<ConflictInfo | null>) => {
      state.conflictInfo = action.payload
    },
    setShowConflictModal: (state, action: PayloadAction<boolean>) => {
      state.showConflictModal = action.payload
    },
    setPendingEvent: (state, action: PayloadAction<Partial<CalendarEvent> | null>) => {
      state.pendingEvent = action.payload
    },
    applyResolution: (state, action: PayloadAction<ResolutionSuggestion>) => {
      if (state.pendingEvent && action.payload.newStartTime) {
        state.pendingEvent.startTime = action.payload.newStartTime
      }
      if (state.pendingEvent && action.payload.newEndTime) {
        state.pendingEvent.endTime = action.payload.newEndTime
      }
    },
    clearConflict: (state) => {
      state.conflictInfo = null
      state.showConflictModal = false
      state.pendingEvent = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.isLoading = false
        state.events = action.payload
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch events'
      })
      .addCase(fetchCalendars.fulfilled, (state, action) => {
        state.calendars = action.payload
        state.selectedCalendarIds = action.payload.map((c) => c.id)
      })
      .addCase(checkConflicts.pending, (state) => {
        state.isCheckingConflicts = true
      })
      .addCase(checkConflicts.fulfilled, (state, action) => {
        state.isCheckingConflicts = false
        state.conflictInfo = action.payload
      })
      .addCase(checkConflicts.rejected, (state) => {
        state.isCheckingConflicts = false
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.events.push(action.payload)
        state.conflictInfo = null
        state.showConflictModal = false
        state.pendingEvent = null
      })
      .addCase(createEvent.rejected, (state, action) => {
        const payload = action.payload as { type?: string; conflictInfo?: ConflictInfo; pendingEvent?: Partial<CalendarEvent> } | undefined
        if (payload?.type === 'conflict') {
          state.conflictInfo = payload.conflictInfo ?? null
          state.pendingEvent = payload.pendingEvent ?? null
          state.showConflictModal = true
        }
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex((e) => e.id === action.payload.id)
        if (index !== -1) state.events[index] = action.payload
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter((e) => e.id !== action.payload)
      })
  },
})

export const {
  setSelectedDate,
  setSelectedView,
  setSelectedCalendars,
  setEventBeingEdited,
  setDateRange,
  setConflictInfo,
  setShowConflictModal,
  setPendingEvent,
  applyResolution,
  clearConflict,
} = calendarSlice.actions

export const selectAllEvents = (state: RootState) => state.calendar.events
export const selectCalendars = (state: RootState) => state.calendar.calendars
export const selectSelectedDate = (state: RootState) => state.calendar.selectedDate
export const selectSelectedView = (state: RootState) => state.calendar.selectedView
export const selectEventBeingEdited = (state: RootState) => state.calendar.eventBeingEdited
export const selectCalendarLoading = (state: RootState) => state.calendar.isLoading
export const selectConflictInfo = (state: RootState) => state.calendar.conflictInfo
export const selectShowConflictModal = (state: RootState) => state.calendar.showConflictModal
export const selectPendingEvent = (state: RootState) => state.calendar.pendingEvent
export const selectIsCheckingConflicts = (state: RootState) => state.calendar.isCheckingConflicts

export const selectEventsByDate = (date: string) => (state: RootState) =>
  state.calendar.events.filter((event) => {
    const eventDate = new Date(event.startTime as string).toISOString().split('T')[0]
    return eventDate === date
  })

export default calendarSlice.reducer
