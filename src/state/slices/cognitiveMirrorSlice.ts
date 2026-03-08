import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'
import type { CognitiveMirrorResult } from '@/types/knowledge'

interface CognitiveMirrorState {
  data: CognitiveMirrorResult | null
  loading: boolean
  error: string | null
  generatedAt: string | null
  cached: boolean
}

const initialState: CognitiveMirrorState = {
  data: null,
  loading: false,
  error: null,
  generatedAt: null,
  cached: false,
}

export const fetchCognitiveMirror = createAsyncThunk(
  'cognitiveMirror/fetch',
  async () => {
    const res = await fetch('/api/knowledge/cognitive-mirror')
    if (!res.ok) throw new Error('Failed to fetch cognitive mirror')
    return res.json()
  }
)

const cognitiveMirrorSlice = createSlice({
  name: 'cognitiveMirror',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCognitiveMirror.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCognitiveMirror.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.data
        state.cached = action.payload.cached
        state.generatedAt = new Date().toISOString()
      })
      .addCase(fetchCognitiveMirror.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed'
      })
  },
})

export default cognitiveMirrorSlice.reducer

export const selectCognitiveMirrorData = (state: RootState) => state.cognitiveMirror.data
export const selectCognitiveMirrorLoading = (state: RootState) => state.cognitiveMirror.loading
export const selectCognitiveMirrorCached = (state: RootState) => state.cognitiveMirror.cached
export const selectCognitiveMirrorGeneratedAt = (state: RootState) => state.cognitiveMirror.generatedAt
