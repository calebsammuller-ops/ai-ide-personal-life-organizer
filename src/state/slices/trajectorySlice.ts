import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { RootState } from '@/state/store'
import type { TrajectoryResult } from '@/types/knowledge'

interface TrajectoryState {
  data: TrajectoryResult | null
  loading: boolean
  error: string | null
}

const initialState: TrajectoryState = {
  data: null,
  loading: false,
  error: null,
}

export const fetchTrajectory = createAsyncThunk(
  'trajectory/fetch',
  async () => {
    const res = await fetch('/api/knowledge/trajectory')
    if (!res.ok) throw new Error('Failed to fetch trajectory')
    return res.json()
  }
)

const trajectorySlice = createSlice({
  name: 'trajectory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrajectory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTrajectory.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.data
      })
      .addCase(fetchTrajectory.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed'
      })
  },
})

export default trajectorySlice.reducer

export const selectTrajectoryData = (state: RootState) => state.trajectory.data
export const selectTrajectoryLoading = (state: RootState) => state.trajectory.loading
