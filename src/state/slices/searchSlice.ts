import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

interface SearchTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  projectId: string | null
  createdAt: string
}

interface SearchDocument {
  id: string
  title: string
  plainText: string | null
  projectId: string | null
  isPinned: boolean
  updatedAt: string
}

interface SearchHabit {
  id: string
  name: string
  frequency: string
  currentStreak: number
  createdAt: string
}

interface SearchResults {
  tasks: SearchTask[]
  documents: SearchDocument[]
  habits: SearchHabit[]
}

interface SearchState {
  query: string
  results: SearchResults
  isSearching: boolean
  error: string | null
  isOpen: boolean
}

const initialState: SearchState = {
  query: '',
  results: { tasks: [], documents: [], habits: [] },
  isSearching: false,
  error: null,
  isOpen: false,
}

export const searchAll = createAsyncThunk(
  'search/searchAll',
  async (query: string) => {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error('Search failed')
    const data = await response.json()
    return data.data as SearchResults
  }
)

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload
    },
    setIsOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload
    },
    clearSearch: (state) => {
      state.query = ''
      state.results = { tasks: [], documents: [], habits: [] }
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchAll.pending, (state) => {
        state.isSearching = true
        state.error = null
      })
      .addCase(searchAll.fulfilled, (state, action) => {
        state.isSearching = false
        state.results = action.payload
      })
      .addCase(searchAll.rejected, (state, action) => {
        state.isSearching = false
        state.error = action.error.message ?? 'Search failed'
      })
  },
})

export const { setQuery, setIsOpen, clearSearch } = searchSlice.actions

// Selectors
export const selectSearchQuery = (state: RootState) => state.search.query
export const selectSearchResults = (state: RootState) => state.search.results
export const selectIsSearching = (state: RootState) => state.search.isSearching
export const selectSearchError = (state: RootState) => state.search.error
export const selectSearchIsOpen = (state: RootState) => state.search.isOpen
export const selectSearchTasks = (state: RootState) => state.search.results.tasks
export const selectSearchDocuments = (state: RootState) => state.search.results.documents
export const selectSearchHabits = (state: RootState) => state.search.results.habits

export default searchSlice.reducer
