import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'

export type WidgetType =
  | 'task_list'
  | 'habit_streak'
  | 'quick_actions'
  | 'calendar'
  | 'stats'

export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  config: Record<string, unknown>
  column: number
  order: number
}

interface DashboardsState {
  widgets: DashboardWidget[]
  isEditing: boolean
}

const defaultWidgets: DashboardWidget[] = [
  { id: 'w1', type: 'quick_actions', title: 'Quick Actions', config: {}, column: 0, order: 0 },
  { id: 'w2', type: 'task_list', title: 'Upcoming Tasks', config: { limit: 5 }, column: 1, order: 0 },
  { id: 'w3', type: 'habit_streak', title: 'Habit Streaks', config: { limit: 5 }, column: 2, order: 0 },
]

const initialState: DashboardsState = {
  widgets: defaultWidgets,
  isEditing: false,
}

export const dashboardsSlice = createSlice({
  name: 'dashboards',
  initialState,
  reducers: {
    addWidget: (state, action: PayloadAction<DashboardWidget>) => {
      state.widgets.push(action.payload)
    },
    removeWidget: (state, action: PayloadAction<string>) => {
      state.widgets = state.widgets.filter((w) => w.id !== action.payload)
    },
    updateWidgetConfig: (
      state,
      action: PayloadAction<{ id: string; config: Record<string, unknown> }>
    ) => {
      const widget = state.widgets.find((w) => w.id === action.payload.id)
      if (widget) widget.config = action.payload.config
    },
    setIsEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload
    },
    reorderWidgets: (state, action: PayloadAction<DashboardWidget[]>) => {
      state.widgets = action.payload
    },
  },
})

export const { addWidget, removeWidget, updateWidgetConfig, setIsEditing, reorderWidgets } =
  dashboardsSlice.actions

export const selectAllWidgets = (state: RootState) => state.dashboards.widgets
export const selectIsEditing = (state: RootState) => state.dashboards.isEditing
export const selectWidgetsByColumn = (column: number) => (state: RootState) =>
  state.dashboards.widgets
    .filter((w) => w.column === column)
    .sort((a, b) => a.order - b.order)

export default dashboardsSlice.reducer
