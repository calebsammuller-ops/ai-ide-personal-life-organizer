import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type {
  FocusBlock,
  CreateFocusBlockInput,
  UpdateFocusBlockInput,
} from '@/types/scheduling'

interface FocusBlocksState {
  focusBlocks: FocusBlock[]
  selectedFocusBlock: FocusBlock | null
  activeFocusBlock: FocusBlock | null // Currently active (time-wise)
  isLoading: boolean
  error: string | null
  showFocusBlockModal: boolean
  editingFocusBlock: FocusBlock | null
}

const initialState: FocusBlocksState = {
  focusBlocks: [],
  selectedFocusBlock: null,
  activeFocusBlock: null,
  isLoading: false,
  error: null,
  showFocusBlockModal: false,
  editingFocusBlock: null,
}

// Async thunks
export const fetchFocusBlocks = createAsyncThunk(
  'focusBlocks/fetchFocusBlocks',
  async () => {
    const response = await fetch('/api/focus-blocks')
    if (!response.ok) throw new Error('Failed to fetch focus blocks')
    const data = await response.json()
    return data.data as FocusBlock[]
  }
)

export const createFocusBlock = createAsyncThunk(
  'focusBlocks/createFocusBlock',
  async (focusBlock: CreateFocusBlockInput) => {
    const response = await fetch('/api/focus-blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(focusBlock),
    })
    if (!response.ok) throw new Error('Failed to create focus block')
    const data = await response.json()
    return data.data as FocusBlock
  }
)

export const updateFocusBlock = createAsyncThunk(
  'focusBlocks/updateFocusBlock',
  async ({ id, updates }: { id: string; updates: UpdateFocusBlockInput }) => {
    const response = await fetch(`/api/focus-blocks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update focus block')
    const data = await response.json()
    return data.data as FocusBlock
  }
)

export const deleteFocusBlock = createAsyncThunk(
  'focusBlocks/deleteFocusBlock',
  async (id: string) => {
    const response = await fetch(`/api/focus-blocks/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete focus block')
    return id
  }
)

export const toggleFocusBlock = createAsyncThunk(
  'focusBlocks/toggleFocusBlock',
  async (id: string, { getState }) => {
    const state = getState() as RootState
    const focusBlock = state.focusBlocks.focusBlocks.find(fb => fb.id === id)
    if (!focusBlock) throw new Error('Focus block not found')

    const response = await fetch(`/api/focus-blocks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !focusBlock.isActive }),
    })
    if (!response.ok) throw new Error('Failed to toggle focus block')
    const data = await response.json()
    return data.data as FocusBlock
  }
)

export const focusBlocksSlice = createSlice({
  name: 'focusBlocks',
  initialState,
  reducers: {
    setSelectedFocusBlock: (state, action: PayloadAction<FocusBlock | null>) => {
      state.selectedFocusBlock = action.payload
    },
    setActiveFocusBlock: (state, action: PayloadAction<FocusBlock | null>) => {
      state.activeFocusBlock = action.payload
    },
    setShowFocusBlockModal: (state, action: PayloadAction<boolean>) => {
      state.showFocusBlockModal = action.payload
    },
    setEditingFocusBlock: (state, action: PayloadAction<FocusBlock | null>) => {
      state.editingFocusBlock = action.payload
    },
    openCreateFocusBlockModal: (state) => {
      state.editingFocusBlock = null
      state.showFocusBlockModal = true
    },
    openEditFocusBlockModal: (state, action: PayloadAction<FocusBlock>) => {
      state.editingFocusBlock = action.payload
      state.showFocusBlockModal = true
    },
    closeFocusBlockModal: (state) => {
      state.showFocusBlockModal = false
      state.editingFocusBlock = null
    },
    checkActiveFocusBlock: (state) => {
      // Check if current time falls within any active focus block
      const now = new Date()
      const currentDayOfWeek = now.getDay()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

      const activeFocusBlock = state.focusBlocks.find(fb => {
        if (!fb.isActive) return false
        if (!fb.daysOfWeek.includes(currentDayOfWeek)) return false

        const startMinutes = parseTime(fb.startTime)
        const endMinutes = parseTime(fb.endTime)
        const currentMinutes = parseTime(currentTime)

        return currentMinutes >= startMinutes && currentMinutes < endMinutes
      })

      state.activeFocusBlock = activeFocusBlock || null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch focus blocks
      .addCase(fetchFocusBlocks.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchFocusBlocks.fulfilled, (state, action) => {
        state.isLoading = false
        state.focusBlocks = action.payload
      })
      .addCase(fetchFocusBlocks.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch focus blocks'
      })
      // Create focus block
      .addCase(createFocusBlock.fulfilled, (state, action) => {
        state.focusBlocks.push(action.payload)
        state.showFocusBlockModal = false
        state.editingFocusBlock = null
      })
      // Update focus block
      .addCase(updateFocusBlock.fulfilled, (state, action) => {
        const index = state.focusBlocks.findIndex(fb => fb.id === action.payload.id)
        if (index !== -1) {
          state.focusBlocks[index] = action.payload
        }
        if (state.selectedFocusBlock?.id === action.payload.id) {
          state.selectedFocusBlock = action.payload
        }
        state.showFocusBlockModal = false
        state.editingFocusBlock = null
      })
      // Delete focus block
      .addCase(deleteFocusBlock.fulfilled, (state, action) => {
        state.focusBlocks = state.focusBlocks.filter(fb => fb.id !== action.payload)
        if (state.selectedFocusBlock?.id === action.payload) {
          state.selectedFocusBlock = null
        }
        if (state.activeFocusBlock?.id === action.payload) {
          state.activeFocusBlock = null
        }
      })
      // Toggle focus block
      .addCase(toggleFocusBlock.fulfilled, (state, action) => {
        const index = state.focusBlocks.findIndex(fb => fb.id === action.payload.id)
        if (index !== -1) {
          state.focusBlocks[index] = action.payload
        }
      })
  },
})

// Helper function for time parsing
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

export const {
  setSelectedFocusBlock,
  setActiveFocusBlock,
  setShowFocusBlockModal,
  setEditingFocusBlock,
  openCreateFocusBlockModal,
  openEditFocusBlockModal,
  closeFocusBlockModal,
  checkActiveFocusBlock,
} = focusBlocksSlice.actions

// Selectors
export const selectAllFocusBlocks = (state: RootState) => state.focusBlocks.focusBlocks
export const selectSelectedFocusBlock = (state: RootState) => state.focusBlocks.selectedFocusBlock
export const selectActiveFocusBlock = (state: RootState) => state.focusBlocks.activeFocusBlock
export const selectFocusBlocksLoading = (state: RootState) => state.focusBlocks.isLoading
export const selectFocusBlocksError = (state: RootState) => state.focusBlocks.error
export const selectShowFocusBlockModal = (state: RootState) => state.focusBlocks.showFocusBlockModal
export const selectEditingFocusBlock = (state: RootState) => state.focusBlocks.editingFocusBlock

export const selectActiveFocusBlocks = (state: RootState) =>
  state.focusBlocks.focusBlocks.filter(fb => fb.isActive)

export const selectFocusBlocksForDay = (dayOfWeek: number) => (state: RootState) =>
  state.focusBlocks.focusBlocks.filter(
    fb => fb.isActive && fb.daysOfWeek.includes(dayOfWeek)
  )

export const selectFocusBlocksForToday = (state: RootState) => {
  const today = new Date().getDay()
  return state.focusBlocks.focusBlocks.filter(
    fb => fb.isActive && fb.daysOfWeek.includes(today)
  )
}

export const selectTotalFocusMinutesForDay = (dayOfWeek: number) => (state: RootState) => {
  const dayBlocks = state.focusBlocks.focusBlocks.filter(
    fb => fb.isActive && fb.daysOfWeek.includes(dayOfWeek)
  )

  return dayBlocks.reduce((total, fb) => {
    const startMinutes = parseTime(fb.startTime)
    const endMinutes = parseTime(fb.endTime)
    return total + (endMinutes - startMinutes)
  }, 0)
}

export const selectWeeklyFocusSchedule = (state: RootState) => {
  const schedule: Record<number, FocusBlock[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  }

  for (const fb of state.focusBlocks.focusBlocks) {
    if (!fb.isActive) continue
    for (const day of fb.daysOfWeek) {
      schedule[day].push(fb)
    }
  }

  return schedule
}

export const selectIsInFocusTime = (state: RootState): boolean => {
  return state.focusBlocks.activeFocusBlock !== null
}

export default focusBlocksSlice.reducer
