import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

export interface Dashboard {
  id: string
  userId: string
  name: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface DashboardWidget {
  id: string
  dashboardId: string
  widgetType: string
  config: Record<string, unknown>
  position: { x: number; y: number; w: number; h: number }
  createdAt: string
  updatedAt: string
}

export interface CreateDashboardInput {
  name: string
  isDefault?: boolean
}

export interface CreateWidgetInput {
  dashboardId: string
  widgetType: string
  config?: Record<string, unknown>
  position?: { x: number; y: number; w: number; h: number }
}

export interface UpdateWidgetInput {
  dashboardId: string
  widgetId: string
  config?: Record<string, unknown>
  position?: { x: number; y: number; w: number; h: number }
  widgetType?: string
}

interface DashboardState {
  dashboards: Dashboard[]
  widgets: DashboardWidget[]
  currentDashboardId: string | null
  isLoading: boolean
  error: string | null
}

const initialState: DashboardState = {
  dashboards: [],
  widgets: [],
  currentDashboardId: null,
  isLoading: false,
  error: null,
}

export const fetchDashboards = createAsyncThunk(
  'dashboard/fetchDashboards',
  async () => {
    const response = await fetch('/api/dashboards')
    if (!response.ok) throw new Error('Failed to fetch dashboards')
    const data = await response.json()
    return data.data as Dashboard[]
  }
)

export const createDashboard = createAsyncThunk(
  'dashboard/createDashboard',
  async (input: CreateDashboardInput) => {
    const response = await fetch('/api/dashboards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error('Failed to create dashboard')
    const data = await response.json()
    return data.data as Dashboard
  }
)

export const fetchWidgets = createAsyncThunk(
  'dashboard/fetchWidgets',
  async (dashboardId: string) => {
    const response = await fetch(`/api/dashboards/${dashboardId}/widgets`)
    if (!response.ok) throw new Error('Failed to fetch widgets')
    const data = await response.json()
    return data.data as DashboardWidget[]
  }
)

export const createWidget = createAsyncThunk(
  'dashboard/createWidget',
  async (input: CreateWidgetInput) => {
    const response = await fetch(`/api/dashboards/${input.dashboardId}/widgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetType: input.widgetType,
        config: input.config,
        position: input.position,
      }),
    })
    if (!response.ok) throw new Error('Failed to create widget')
    const data = await response.json()
    return data.data as DashboardWidget
  }
)

export const updateWidget = createAsyncThunk(
  'dashboard/updateWidget',
  async (input: UpdateWidgetInput) => {
    const response = await fetch(`/api/dashboards/${input.dashboardId}/widgets`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetId: input.widgetId,
        config: input.config,
        position: input.position,
        widgetType: input.widgetType,
      }),
    })
    if (!response.ok) throw new Error('Failed to update widget')
    const data = await response.json()
    return data.data as DashboardWidget
  }
)

export const deleteWidget = createAsyncThunk(
  'dashboard/deleteWidget',
  async ({ dashboardId, widgetId }: { dashboardId: string; widgetId: string }) => {
    const response = await fetch(`/api/dashboards/${dashboardId}/widgets`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgetId }),
    })
    if (!response.ok) throw new Error('Failed to delete widget')
    return widgetId
  }
)

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setCurrentDashboardId: (state, action: PayloadAction<string | null>) => {
      state.currentDashboardId = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboards
      .addCase(fetchDashboards.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDashboards.fulfilled, (state, action) => {
        state.isLoading = false
        state.dashboards = action.payload
      })
      .addCase(fetchDashboards.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch dashboards'
      })
      // Create dashboard
      .addCase(createDashboard.fulfilled, (state, action) => {
        state.dashboards.push(action.payload)
      })
      // Fetch widgets
      .addCase(fetchWidgets.fulfilled, (state, action) => {
        state.widgets = action.payload
      })
      // Create widget
      .addCase(createWidget.fulfilled, (state, action) => {
        state.widgets.push(action.payload)
      })
      // Update widget
      .addCase(updateWidget.fulfilled, (state, action) => {
        const index = state.widgets.findIndex(w => w.id === action.payload.id)
        if (index !== -1) {
          state.widgets[index] = action.payload
        }
      })
      // Delete widget
      .addCase(deleteWidget.fulfilled, (state, action) => {
        state.widgets = state.widgets.filter(w => w.id !== action.payload)
      })
  },
})

export const { setCurrentDashboardId } = dashboardSlice.actions

// Selectors
export const selectDashboards = (state: RootState) => state.dashboard.dashboards
export const selectCurrentDashboardId = (state: RootState) => state.dashboard.currentDashboardId
export const selectCurrentDashboard = (state: RootState) => {
  if (!state.dashboard.currentDashboardId) return null
  return state.dashboard.dashboards.find(d => d.id === state.dashboard.currentDashboardId) ?? null
}
export const selectWidgets = (state: RootState) => state.dashboard.widgets
export const selectDashboardLoading = (state: RootState) => state.dashboard.isLoading
export const selectDashboardError = (state: RootState) => state.dashboard.error

export default dashboardSlice.reducer
