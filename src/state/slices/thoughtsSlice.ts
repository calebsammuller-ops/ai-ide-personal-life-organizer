import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { Thought, ExtractedTask } from '@/types'
import type { RootState } from '../store'

interface ThoughtsState {
  thoughts: Thought[]
  extractedTasks: ExtractedTask[]
  isLoading: boolean
  isProcessing: boolean
  error: string | null
  filterCategory: string | null
  sortBy: 'date' | 'priority'
}

const initialState: ThoughtsState = {
  thoughts: [],
  extractedTasks: [],
  isLoading: false,
  isProcessing: false,
  error: null,
  filterCategory: null,
  sortBy: 'date',
}

export const fetchThoughts = createAsyncThunk('thoughts/fetchThoughts', async () => {
  const response = await fetch('/api/thought-organization')
  if (!response.ok) throw new Error('Failed to fetch thoughts')
  const data = await response.json()
  return data.data as Thought[]
})

export const createThought = createAsyncThunk(
  'thoughts/createThought',
  async (content: string) => {
    const response = await fetch('/api/thought-organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawContent: content }),
    })
    if (!response.ok) throw new Error('Failed to create thought')
    const data = await response.json()
    return data.data as Thought
  }
)

export const updateThought = createAsyncThunk(
  'thoughts/updateThought',
  async ({ id, updates }: { id: string; updates: Partial<Thought> }) => {
    const response = await fetch(`/api/thought-organization/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update thought')
    const data = await response.json()
    return data.data as Thought
  }
)

export const deleteThought = createAsyncThunk(
  'thoughts/deleteThought',
  async (id: string) => {
    const response = await fetch(`/api/thought-organization/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete thought')
    return id
  }
)

export const processThoughts = createAsyncThunk(
  'thoughts/processThoughts',
  async (thoughtIds: string[]) => {
    const response = await fetch('/api/thought-organization/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thoughtIds }),
    })
    if (!response.ok) throw new Error('Failed to process thoughts')
    const data = await response.json()
    return data.data as Thought[]
  }
)

export const archiveThought = createAsyncThunk(
  'thoughts/archiveThought',
  async (id: string) => {
    const response = await fetch(`/api/thought-organization/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: true }),
    })
    if (!response.ok) throw new Error('Failed to archive thought')
    return id
  }
)

export const thoughtsSlice = createSlice({
  name: 'thoughts',
  initialState,
  reducers: {
    setFilterCategory: (state, action: PayloadAction<string | null>) => {
      state.filterCategory = action.payload
    },
    setSortBy: (state, action: PayloadAction<'date' | 'priority'>) => {
      state.sortBy = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchThoughts.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchThoughts.fulfilled, (state, action) => {
        state.isLoading = false
        state.thoughts = action.payload
        state.extractedTasks = action.payload
          .filter((t) => t.isProcessed)
          .flatMap((t) => t.extractedTasks)
      })
      .addCase(fetchThoughts.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch thoughts'
      })
      .addCase(createThought.fulfilled, (state, action) => {
        state.thoughts.unshift(action.payload)
      })
      .addCase(updateThought.fulfilled, (state, action) => {
        const index = state.thoughts.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) state.thoughts[index] = action.payload
      })
      .addCase(deleteThought.fulfilled, (state, action) => {
        state.thoughts = state.thoughts.filter((t) => t.id !== action.payload)
      })
      .addCase(processThoughts.pending, (state) => {
        state.isProcessing = true
      })
      .addCase(processThoughts.fulfilled, (state, action) => {
        state.isProcessing = false
        action.payload.forEach((processed) => {
          const index = state.thoughts.findIndex((t) => t.id === processed.id)
          if (index !== -1) state.thoughts[index] = processed
        })
        state.extractedTasks = state.thoughts
          .filter((t) => t.isProcessed)
          .flatMap((t) => t.extractedTasks)
      })
      .addCase(processThoughts.rejected, (state) => {
        state.isProcessing = false
      })
      .addCase(archiveThought.fulfilled, (state, action) => {
        state.thoughts = state.thoughts.filter((t) => t.id !== action.payload)
      })
  },
})

export const { setFilterCategory, setSortBy } = thoughtsSlice.actions

export const selectAllThoughts = (state: RootState) => state.thoughts.thoughts
export const selectUnprocessedThoughts = (state: RootState) =>
  state.thoughts.thoughts.filter((t) => !t.isProcessed && !t.isArchived)
export const selectProcessedThoughts = (state: RootState) =>
  state.thoughts.thoughts.filter((t) => t.isProcessed && !t.isArchived)
export const selectExtractedTasks = (state: RootState) => state.thoughts.extractedTasks
export const selectThoughtsLoading = (state: RootState) => state.thoughts.isLoading
export const selectThoughtsProcessing = (state: RootState) => state.thoughts.isProcessing

export const selectThoughtsByPriority = (state: RootState) =>
  [...state.thoughts.thoughts].sort((a, b) => a.priority - b.priority)

export default thoughtsSlice.reducer
