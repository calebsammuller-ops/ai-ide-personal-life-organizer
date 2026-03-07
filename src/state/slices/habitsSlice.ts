import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'
import type { Habit, HabitCompletion } from '@/types'
import type { RootState } from '../store'

interface HabitStats {
  totalHabits: number
  completedToday: number
  currentStreak: number
  longestStreak: number
  completionRate: number
}

interface HabitsState {
  habits: Habit[]
  completions: Record<string, HabitCompletion[]>
  stats: HabitStats | null
  isLoading: boolean
  error: string | null
  selectedHabit: Habit | null
  filterCategory: string | null
}

const initialState: HabitsState = {
  habits: [],
  completions: {},
  stats: null,
  isLoading: false,
  error: null,
  selectedHabit: null,
  filterCategory: null,
}

export const fetchHabits = createAsyncThunk('habits/fetchHabits', async () => {
  const response = await fetch('/api/habits')
  if (!response.ok) throw new Error('Failed to fetch habits')
  const data = await response.json()
  return data.data as Habit[]
})

export const createHabit = createAsyncThunk(
  'habits/createHabit',
  async (habit: Partial<Habit>, { dispatch }) => {
    const response = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habit),
    })
    if (!response.ok) throw new Error('Failed to create habit')
    const data = await response.json()
    const createdHabit = data.data as Habit

    // Auto-generate Atomic Habits plan in the background
    dispatch(generateHabitPlan(createdHabit.id))

    return createdHabit
  }
)

export const generateHabitPlan = createAsyncThunk(
  'habits/generateHabitPlan',
  async (habitId: string) => {
    const response = await fetch(`/api/habits/${habitId}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceRegenerate: false }),
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate habit plan')
    }
    const data = await response.json()
    return { habitId, plan: data.data }
  }
)

export const updateHabit = createAsyncThunk(
  'habits/updateHabit',
  async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
    const response = await fetch(`/api/habits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update habit')
    const data = await response.json()
    return data.data as Habit
  }
)

export const deleteHabit = createAsyncThunk(
  'habits/deleteHabit',
  async (id: string) => {
    const response = await fetch(`/api/habits/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete habit')
    return id
  }
)

export const completeHabit = createAsyncThunk(
  'habits/completeHabit',
  async ({ habitId, date, count = 1 }: { habitId: string; date: string; count?: number }) => {
    const response = await fetch(`/api/habits/${habitId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, count }),
    })
    if (!response.ok) throw new Error('Failed to complete habit')
    const data = await response.json()
    return { habitId, completion: data.data as HabitCompletion }
  }
)

export const uncompleteHabit = createAsyncThunk(
  'habits/uncompleteHabit',
  async ({ habitId, date }: { habitId: string; date: string }) => {
    const response = await fetch(`/api/habits/${habitId}/complete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    })
    if (!response.ok) throw new Error('Failed to uncomplete habit')
    return { habitId, date }
  }
)

export const fetchCompletions = createAsyncThunk(
  'habits/fetchCompletions',
  async ({ habitId, startDate, endDate }: { habitId: string; startDate: string; endDate: string }) => {
    const response = await fetch(
      `/api/habits/${habitId}/completions?start=${startDate}&end=${endDate}`
    )
    if (!response.ok) throw new Error('Failed to fetch completions')
    const data = await response.json()
    return { habitId, completions: data.data as HabitCompletion[] }
  }
)

export const habitsSlice = createSlice({
  name: 'habits',
  initialState,
  reducers: {
    setSelectedHabit: (state, action: PayloadAction<Habit | null>) => {
      state.selectedHabit = action.payload
    },
    setFilterCategory: (state, action: PayloadAction<string | null>) => {
      state.filterCategory = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHabits.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchHabits.fulfilled, (state, action) => {
        state.isLoading = false
        state.habits = action.payload
      })
      .addCase(fetchHabits.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch habits'
      })
      .addCase(createHabit.fulfilled, (state, action) => {
        state.habits.push(action.payload)
      })
      .addCase(updateHabit.fulfilled, (state, action) => {
        const index = state.habits.findIndex((h) => h.id === action.payload.id)
        if (index !== -1) state.habits[index] = action.payload
      })
      .addCase(deleteHabit.fulfilled, (state, action) => {
        state.habits = state.habits.filter((h) => h.id !== action.payload)
      })
      .addCase(createHabit.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to create habit'
      })
      .addCase(completeHabit.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to complete habit'
      })
      .addCase(completeHabit.fulfilled, (state, action) => {
        const { habitId, completion } = action.payload
        if (!state.completions[habitId]) {
          state.completions[habitId] = []
        }
        const existingIndex = state.completions[habitId].findIndex(
          (c) => c.completedDate === completion.completedDate
        )
        if (existingIndex !== -1) {
          state.completions[habitId][existingIndex] = completion
        } else {
          state.completions[habitId].push(completion)
        }
      })
      .addCase(uncompleteHabit.fulfilled, (state, action) => {
        const { habitId, date } = action.payload
        if (state.completions[habitId]) {
          state.completions[habitId] = state.completions[habitId].filter(
            (c) => c.completedDate !== date
          )
        }
      })
      .addCase(uncompleteHabit.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to uncomplete habit'
      })
      .addCase(fetchCompletions.fulfilled, (state, action) => {
        const { habitId, completions } = action.payload
        state.completions[habitId] = completions
      })
      .addCase(fetchCompletions.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to fetch completions'
      })
      .addCase(generateHabitPlan.fulfilled, (state, action) => {
        const { habitId, plan } = action.payload
        const habitIndex = state.habits.findIndex((h) => h.id === habitId)
        if (habitIndex !== -1) {
          state.habits[habitIndex].plan = plan
        }
      })
  },
})

export const { setSelectedHabit, setFilterCategory } = habitsSlice.actions

// Base selectors
export const selectAllHabits = (state: RootState) => state.habits.habits
export const selectAllCompletions = (state: RootState) => state.habits.completions
export const selectSelectedHabit = (state: RootState) => state.habits.selectedHabit
export const selectHabitsLoading = (state: RootState) => state.habits.isLoading

// Memoized selectors
export const selectActiveHabits = createSelector(
  selectAllHabits,
  habits => habits.filter(h => h.isActive)
)

export const selectHabitById = (id: string) => createSelector(
  selectAllHabits,
  habits => habits.find(h => h.id === id)
)

export const selectHabitCompletions = (habitId: string) => createSelector(
  selectAllCompletions,
  completions => completions[habitId] ?? []
)

export const selectTodayCompletions = createSelector(
  selectAllCompletions,
  completions => {
    const today = new Date().toISOString().split('T')[0]
    return Object.entries(completions)
      .filter(([, habitCompletions]) => habitCompletions.some(c => c.completedDate === today))
      .map(([habitId]) => habitId)
  }
)

export default habitsSlice.reducer
