import { createSlice, createAsyncThunk, createSelector, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../store'
import type {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  SchedulingSuggestion,
  BatchScheduleResult,
} from '@/types/scheduling'

interface TasksState {
  tasks: Task[]
  selectedTask: Task | null
  isLoading: boolean
  isScheduling: boolean
  error: string | null
  // Scheduling state
  schedulingSuggestions: SchedulingSuggestion[]
  showSchedulingModal: boolean
  pendingScheduleTask: Task | null
  // Filters
  statusFilter: TaskStatus | 'all'
  priorityFilter: number | null
  dateFilter: string | null
}

const initialState: TasksState = {
  tasks: [],
  selectedTask: null,
  isLoading: false,
  isScheduling: false,
  error: null,
  schedulingSuggestions: [],
  showSchedulingModal: false,
  pendingScheduleTask: null,
  statusFilter: 'all',
  priorityFilter: null,
  dateFilter: null,
}

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (params?: { status?: TaskStatus; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.set('status', params.status)
    if (params?.startDate) queryParams.set('startDate', params.startDate)
    if (params?.endDate) queryParams.set('endDate', params.endDate)

    const url = `/api/tasks${queryParams.toString() ? `?${queryParams}` : ''}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch tasks')
    const data = await response.json()
    return data.data as Task[]
  }
)

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (task: CreateTaskInput) => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    })
    if (!response.ok) throw new Error('Failed to create task')
    const data = await response.json()
    return data.data as Task
  }
)

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, updates }: { id: string; updates: UpdateTaskInput }) => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update task')
    const data = await response.json()
    return data.data as Task
  }
)

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id: string) => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete task')
    return id
  }
)

export const autoScheduleTask = createAsyncThunk(
  'tasks/autoScheduleTask',
  async (taskId: string, { rejectWithValue }) => {
    const response = await fetch(`/api/tasks/${taskId}/schedule`, {
      method: 'POST',
    })

    const data = await response.json()

    if (!response.ok) {
      return rejectWithValue(data.error || 'Failed to schedule task')
    }

    return data.data as SchedulingSuggestion
  }
)

export const batchScheduleTasks = createAsyncThunk(
  'tasks/batchScheduleTasks',
  async (taskIds: string[], { rejectWithValue }) => {
    const response = await fetch('/api/tasks/batch-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds }),
    })

    const data = await response.json()

    if (!response.ok) {
      return rejectWithValue(data.error || 'Failed to batch schedule tasks')
    }

    return data.data as BatchScheduleResult
  }
)

export const completeTask = createAsyncThunk(
  'tasks/completeTask',
  async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}/complete`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to complete task')
    const data = await response.json()
    return data.data as Task
  }
)

export const deferTask = createAsyncThunk(
  'tasks/deferTask',
  async ({ taskId, targetDate }: { taskId: string; targetDate: string }) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'deferred',
        scheduledStart: null,
        scheduledEnd: null,
      }),
    })
    if (!response.ok) throw new Error('Failed to defer task')
    const data = await response.json()
    return data.data as Task
  }
)

export const rescheduleIncompleteTasks = createAsyncThunk(
  'tasks/rescheduleIncompleteTasks',
  async (date: string) => {
    const response = await fetch('/api/tasks/reschedule-incomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    })
    if (!response.ok) throw new Error('Failed to reschedule tasks')
    const data = await response.json()
    return data.data as Task[]
  }
)

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload
    },
    setStatusFilter: (state, action: PayloadAction<TaskStatus | 'all'>) => {
      state.statusFilter = action.payload
    },
    setPriorityFilter: (state, action: PayloadAction<number | null>) => {
      state.priorityFilter = action.payload
    },
    setDateFilter: (state, action: PayloadAction<string | null>) => {
      state.dateFilter = action.payload
    },
    setSchedulingSuggestions: (state, action: PayloadAction<SchedulingSuggestion[]>) => {
      state.schedulingSuggestions = action.payload
    },
    setShowSchedulingModal: (state, action: PayloadAction<boolean>) => {
      state.showSchedulingModal = action.payload
    },
    setPendingScheduleTask: (state, action: PayloadAction<Task | null>) => {
      state.pendingScheduleTask = action.payload
    },
    clearSchedulingState: (state) => {
      state.schedulingSuggestions = []
      state.showSchedulingModal = false
      state.pendingScheduleTask = null
    },
    optimisticUpdateTaskStatus: (state, action: PayloadAction<{ id: string; status: TaskStatus }>) => {
      const task = state.tasks.find(t => t.id === action.payload.id)
      if (task) {
        task.status = action.payload.status
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false
        state.tasks = action.payload
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message ?? 'Failed to fetch tasks'
      })
      // Create task
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload)
      })
      // Update task
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id)
        if (index !== -1) {
          state.tasks[index] = action.payload
        }
        if (state.selectedTask?.id === action.payload.id) {
          state.selectedTask = action.payload
        }
      })
      // Delete task
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t.id !== action.payload)
        if (state.selectedTask?.id === action.payload) {
          state.selectedTask = null
        }
      })
      // Auto schedule task
      .addCase(autoScheduleTask.pending, (state) => {
        state.isScheduling = true
      })
      .addCase(autoScheduleTask.fulfilled, (state, action) => {
        state.isScheduling = false
        state.schedulingSuggestions = [action.payload]
        state.showSchedulingModal = true
      })
      .addCase(autoScheduleTask.rejected, (state, action) => {
        state.isScheduling = false
        state.error = action.payload as string || 'Failed to schedule task'
      })
      // Batch schedule
      .addCase(batchScheduleTasks.pending, (state) => {
        state.isScheduling = true
      })
      .addCase(batchScheduleTasks.fulfilled, (state, action) => {
        state.isScheduling = false
        state.schedulingSuggestions = action.payload.scheduled
        if (action.payload.scheduled.length > 0) {
          state.showSchedulingModal = true
        }
      })
      .addCase(batchScheduleTasks.rejected, (state, action) => {
        state.isScheduling = false
        state.error = action.payload as string || 'Failed to batch schedule'
      })
      // Complete task
      .addCase(completeTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id)
        if (index !== -1) {
          state.tasks[index] = action.payload
        }
      })
      // Defer task
      .addCase(deferTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(t => t.id === action.payload.id)
        if (index !== -1) {
          state.tasks[index] = action.payload
        }
      })
      // Reschedule incomplete
      .addCase(rescheduleIncompleteTasks.fulfilled, (state, action) => {
        // Update tasks with new schedule
        for (const updatedTask of action.payload) {
          const index = state.tasks.findIndex(t => t.id === updatedTask.id)
          if (index !== -1) {
            state.tasks[index] = updatedTask
          }
        }
      })
  },
})

export const {
  setSelectedTask,
  setStatusFilter,
  setPriorityFilter,
  setDateFilter,
  setSchedulingSuggestions,
  setShowSchedulingModal,
  setPendingScheduleTask,
  clearSchedulingState,
  optimisticUpdateTaskStatus,
} = tasksSlice.actions

// Base selectors (cheap field access — no memoization needed)
export const selectAllTasks = (state: RootState) => state.tasks.tasks
export const selectSelectedTask = (state: RootState) => state.tasks.selectedTask
export const selectTasksLoading = (state: RootState) => state.tasks.isLoading
export const selectTasksScheduling = (state: RootState) => state.tasks.isScheduling
export const selectTasksError = (state: RootState) => state.tasks.error
export const selectSchedulingSuggestions = (state: RootState) => state.tasks.schedulingSuggestions
export const selectShowSchedulingModal = (state: RootState) => state.tasks.showSchedulingModal
const selectStatusFilter = (state: RootState) => state.tasks.statusFilter
const selectPriorityFilter = (state: RootState) => state.tasks.priorityFilter
const selectDateFilter = (state: RootState) => state.tasks.dateFilter

// Memoized selectors — only recompute when their inputs change
export const selectPendingTasks = createSelector(
  selectAllTasks,
  tasks => tasks.filter(t => t.status === 'pending')
)

export const selectScheduledTasks = createSelector(
  selectAllTasks,
  tasks => tasks.filter(t => t.status === 'scheduled')
)

export const selectCompletedTasks = createSelector(
  selectAllTasks,
  tasks => tasks.filter(t => t.status === 'completed')
)

export const selectOverdueTasks = createSelector(
  selectAllTasks,
  tasks => {
    const now = new Date()
    return tasks.filter(task => {
      if (task.status === 'completed' || task.status === 'cancelled') return false
      if (!task.deadline) return false
      return new Date(task.deadline) < now
    })
  }
)

export const selectTasksDueToday = createSelector(
  selectAllTasks,
  tasks => {
    const today = new Date().toISOString().split('T')[0]
    return tasks.filter(task => {
      if (task.status === 'completed' || task.status === 'cancelled') return false
      if (!task.deadline) return false
      return new Date(task.deadline).toISOString().split('T')[0] === today
    })
  }
)

export const selectHighPriorityTasks = createSelector(
  selectAllTasks,
  tasks => tasks.filter(t => t.priority <= 2 && t.status !== 'completed' && t.status !== 'cancelled')
)

export const selectFilteredTasks = createSelector(
  selectAllTasks,
  selectStatusFilter,
  selectPriorityFilter,
  selectDateFilter,
  (tasks, statusFilter, priorityFilter, dateFilter) => {
    let filtered = tasks
    if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter)
    if (priorityFilter !== null) filtered = filtered.filter(t => t.priority === priorityFilter)
    if (dateFilter) {
      filtered = filtered.filter(task => {
        if (!task.scheduledStart) return false
        return new Date(task.scheduledStart).toISOString().split('T')[0] === dateFilter
      })
    }
    return filtered
  }
)

export const selectTasksByDate = (date: string) => createSelector(
  selectAllTasks,
  tasks => tasks.filter(task => {
    if (!task.scheduledStart) return false
    return new Date(task.scheduledStart).toISOString().split('T')[0] === date
  })
)

export const selectTasksByStatus = (status: TaskStatus) => createSelector(
  selectAllTasks,
  tasks => tasks.filter(t => t.status === status)
)

export default tasksSlice.reducer
